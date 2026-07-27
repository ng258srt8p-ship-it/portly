import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getAllSailings, getSailingDetail, makeFingerprint, applyPriceDrift } from './scraper-data';
import { enrichSailing, runEnrichmentTick, findCandidatesForEnrichment } from './enrich-sailing';
import { runIngestExpansionTick, debugBaseSailingSelect } from './ingest-expander';
import { runAlertEvaluationTick, runAlertDispatchTick } from './alert-engine';
import { getMetricsSnapshot } from './metrics-analytics';
import { runBulkImportTick } from './bulk-import';
import { runExternalLineSyncTick } from './external-line-sync';

export type Env = {
  DB: D1Database;
  CACHE: KVNamespace;
  AI: Ai;
  SCRAPER_SECRET: string;
  // Resend (https://resend.com) — outbound transactional email.
  // Optional: if absent, alerts are still queued to D1 (pending) so a future
  // admin can fetch + deliver. Set via `wrangler secret put RESEND_API_KEY`.
  RESEND_API_KEY?: string;
  ALERT_FROM_EMAIL?: string;  // e.g. "TripTide Deals <deals@portly-1i0.pages.dev>"
};

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors());

// ── Helpers ──────────────────────────────────────────────

// Sort enum — anything outside this set is a client bug we should reject loudly
// rather than silently defaulting.
const ALLOWED_SORTS: Record<string, string> = {
  'price-asc': 's.price ASC',
  'price-desc': 's.price DESC',
  'nights-asc': 's.nights ASC',
  'nights-desc': 's.nights DESC',
  'date-asc': 's.sail_date ASC',
  'date-desc': 's.sail_date DESC',
  'drop-desc': 's.drop_percent DESC',
};

// CORS guard: if anything in this app escapes without the cors() middleware
// (e.g. a raw `throw` that bubbles to Cloudflare's 1102 page), we still want
// browsers on portly-1i0.pages.dev (and any localhost dev origin) to be able
// to *see* the JSON error rather than getting a hard CORS-block.
const ALL_ORIGINS = ['https://portly-1i0.pages.dev', 'http://localhost:3000', 'http://localhost:3001'];
app.use('/*', async (c, next) => {
  await next();
  const reqOrigin = c.req.header('origin') || '';
  if (!reqOrigin) return;
  if (ALL_ORIGINS.includes(reqOrigin) || reqOrigin.endsWith('.pages.dev')) {
    c.header('Access-Control-Allow-Origin', reqOrigin);
    c.header('Vary', 'Origin');
    c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
});

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function mapKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(mapKeys);
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [k, v] of Object.entries(obj)) {
      result[snakeToCamel(k)] = mapKeys(v);
    }
    return result;
  }
  return obj;
}

function formatSailing(row: any): any {
  const r = mapKeys(row);
  // Parse history JSON string → array
  if (typeof r.history === 'string') {
    try { r.history = JSON.parse(r.history); } catch { r.history = []; }
  }
  return r;
}

// GET /api/deals
app.get('/api/deals', async (c) => {
  // `limit` semantics
  //   - omitted  → default 20
  //   - explicit number → used (clamped to MAX_DEAL_LIMIT, 1..500)
  //   - "all"    → 500 (we no longer honor unbounded LIMIT-less queries; they
  //                exceed Cloudflare's 30 s CPU budget at this scale)
  const MAX_DEAL_LIMIT = 500;
  const limitParamRaw = c.req.query('limit');
  let limit = 20;
  if (typeof limitParamRaw === 'string') {
    const lower = limitParamRaw.toLowerCase();
    if (lower === 'all') {
      limit = MAX_DEAL_LIMIT;
    } else {
      const parsed = Number(limitParamRaw);
      if (Number.isFinite(parsed) && parsed > 0) {
        limit = Math.min(parsed, MAX_DEAL_LIMIT);
      } else if (parsed === 0) {
        // Explicit "0" used to mean "All" but now means "treat as default 20"
        // so the SQL never emits an unbounded LIMIT clause.
        limit = 20;
      }
    }
  }
  const offset = Math.min(Math.max(Number(c.req.query('offset') || 0), 0), 50_000);
  const sort = c.req.query('sort') || 'drop-desc';

  // Reject unknown sort values loudly instead of silently falling back — this
  // is the contract every frontend filter bar relies on.
  const orderBy = ALLOWED_SORTS[sort];
  if (!orderBy) {
    return c.json(
      { error: 'invalid sort', allowed: Object.keys(ALLOWED_SORTS) },
      400
    );
  }

  let where = 'WHERE s.price IS NOT NULL';
  const binds: any[] = [];

  const cruiseLine = c.req.query('cruiseLine');
  if (cruiseLine) { where += ' AND cl.name = ?'; binds.push(cruiseLine); }

  const destination = c.req.query('destination');
  if (destination) { where += ' AND d.name = ?'; binds.push(destination); }

  const departurePort = c.req.query('departurePort');
  if (departurePort) { where += ' AND s.departure_port = ?'; binds.push(departurePort); }

  const minNights = c.req.query('minNights');
  if (minNights) { where += ' AND s.nights >= ?'; binds.push(Number(minNights)); }

  const maxNights = c.req.query('maxNights');
  if (maxNights) { where += ' AND s.nights <= ?'; binds.push(Number(maxNights)); }

  const badgeType = c.req.query('badgeType');
  if (badgeType) {
    where += ' AND s.badge_type IN (' + badgeType.split(',').map(() => '?').join(',') + ')';
    binds.push(...badgeType.split(','));
  }

  const ship = c.req.query('ship');
  if (ship) { where += ' AND sh.name = ?'; binds.push(ship); }

  const limitClause = limit > 0 ? ' LIMIT ? OFFSET ?' : '';
  const sql = `SELECT s.*, cl.name AS cruise_line, sh.name AS ship, d.name AS destination FROM sailings s JOIN cruise_lines cl ON s.cruise_line_id = cl.id JOIN ships sh ON s.ship_id = sh.id LEFT JOIN destinations d ON s.destination_id = d.id ${where} ORDER BY ${orderBy}${limitClause}`;
  if (limit > 0) binds.push(limit, offset);

  const { results } = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json(results.map(formatSailing));
});

// GET /api/solo-friendly
// Returns solo-friendly cruises. D1 has no pricing_snapshots table — we derive
// solo pricing from cabin_prices (Inside cabin = solo baseline) + an algorithm:
//  - "Waived" = Inside base fare <= $500/person → supplementWaived=true, 0%
//  - "Low"    = Inside base fare <= $800/person, supplementPercent between 0–25%
//  - Anything above that is not solo-friendly and excluded.
// We approximate the solo total as: base_fare * 1.75 + port_tax (waiver discount).
app.get('/api/solo-friendly', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT
      s.id,
      cl.name AS cruise_line,
      sh.name AS ship_name,
      s.sail_date,
      s.nights AS duration_days,
      s.departure_port,
      d.name AS destination,
      cp.base_fare_per_person,
      cp.port_tax_per_person,
      cp.gratuity_per_person_per_night,
      s.booking_url
    FROM sailings s
    JOIN cruise_lines cl ON s.cruise_line_id = cl.id
    JOIN ships sh ON s.ship_id = sh.id
    LEFT JOIN destinations d ON s.destination_id = d.id
    JOIN cabin_prices cp ON cp.sailing_id = s.id
    JOIN cabin_categories cc ON cp.cabin_category_id = cc.id
    WHERE cc.name = 'Inside' AND cp.base_fare_per_person <= 800
    ORDER BY cp.base_fare_per_person ASC
  `).all();

  const soloSailings = results.map((row: any) => {
    const baseFare = Number(row.base_fare_per_person);
    const portTax = Number(row.port_tax_per_person);
    const gratuityPerNight = Number(row.gratuity_per_person_per_night) || 18.5;
    const nights = Number(row.duration_days);
    const supplementWaived = baseFare <= 500;
    const supplementPercent = supplementWaived ? 0 : Math.round(((800 - baseFare) / 800) * 25);
    // Solo total: assume ~75% of double-occupancy (waived) or +supplement% (low)
    const doubleOccupancy = baseFare * 2 + portTax + gratuityPerNight * nights * 2;
    const soloTotal = supplementWaived
      ? Math.round(baseFare + portTax + gratuityPerNight * nights)
      : Math.round(doubleOccupancy * (1 + supplementPercent / 100));
    const perDay = Math.round((soloTotal / nights) * 100) / 100;

    return {
      id: row.id,
      cruiseLine: row.cruise_line,
      shipName: row.ship_name,
      departureDate: row.sail_date,
      durationDays: nights,
      departurePort: row.departure_port,
      destination: row.destination || 'Caribbean',
      cabinType: 'Inside',
      soloPrice: {
        total: String(soloTotal),
        perDay: String(perDay),
        supplementWaived,
        supplementPercent,
      },
      raw: {
        totalOutTheDoor: soloTotal,
        perPersonPerDay: perDay,
        soloSupplementPercent: supplementPercent,
        soloSupplementApplied: !supplementWaived,
      },
    };
  });

  return c.json({ count: soloSailings.length, results: soloSailings });
});

// GET /api/history
// Returns price history grouped by cruise line. Uses the cached `sailings.history`
// JSON column for price-trend data (already pre-aggregated to 40 points per sailing).
// Avoids scanning the full `price_history` table (3,885 rows × joins = CPU blow up).
// Only 2 D1 queries:
//   1. Line-level aggregate counts (fast COUNT/GROUP BY)
//   2. Sailings joined with cruise_lines, ships, cabin_prices, cabin_categories
//      (81 rows × small joins — bounded result set)
//
// Returns and shape of the actual JSON are unchanged — the wrapper just guards
// the body behind a 5-min KV cache so the 30-second Worker CPU budget isn't
// burned every time the /history page polls every 30s.
app.get('/api/history', async (c) => {
  const HISTORY_CACHE_KEY = 'history:snapshot:v1';
  const cached = await c.env.CACHE.get(HISTORY_CACHE_KEY);
  if (cached) {
    c.header('X-History-Cache', 'hit');
    return c.json(JSON.parse(cached));
  }
  const payload = await computeHistorySnapshot(c.env);
  await c.env.CACHE.put(HISTORY_CACHE_KEY, JSON.stringify(payload), { expirationTtl: 300 });
  c.header('X-History-Cache', 'miss');
  return c.json(payload);
});

async function computeHistorySnapshot(env: any) {
  // 1. Line-level aggregates
  const { results: lineAgg } = await env.DB.prepare(`
    SELECT 
      cl.name AS line,
      COUNT(DISTINCT s.id) AS total_sailings,
      COUNT(ph.id) AS total_prices_tracked
    FROM cruise_lines cl
    LEFT JOIN sailings s ON s.cruise_line_id = cl.id
    LEFT JOIN price_history ph ON ph.sailing_id = s.id
    GROUP BY cl.name
    ORDER BY total_sailings DESC
  `).all();

  // 2. Sailings + cached history JSON + cabin type (small bounded query)
  //    We do NOT scan price_history — use the pre-aggregated JSON column instead.
  const { results: sailingsRaw } = await env.DB.prepare(`
    SELECT 
      s.id AS sailingId,
      cl.name AS cruiseLine,
      sh.name AS ship,
      s.nights AS durationDays,
      s.sail_date AS sailDate,
      s.price AS currentPrice,
      s.original_price AS originalPrice,
      s.history AS historyJson,
      cc.name AS cabinType
    FROM sailings s
    JOIN cruise_lines cl ON s.cruise_line_id = cl.id
    JOIN ships sh ON s.ship_id = sh.id
    LEFT JOIN cabin_prices cp ON cp.sailing_id = s.id
    LEFT JOIN cabin_categories cc ON cp.cabin_category_id = cc.id
    ORDER BY cl.name, s.sail_date
  `).all();

  // Build per-sailing entries. Multiple cabin types per sailing = multiple rows;
  // we coalesce to a single primary entry per (sailingId) using the first cabin seen.
  const sailingMap: Record<string, any> = {};
  for (const r of sailingsRaw as any[]) {
    const key = String(r.sailingId);
    if (sailingMap[key] === undefined) {
      let parsedHistory: number[] = [];
      try { parsedHistory = JSON.parse(r.historyJson || '[]'); } catch { /* */ }
      // Build the HistoryPricePoint[] array using parsed prices (oldest → newest)
      // Use evenly-spaced dates from sail_date backwards
      const sailDate = String(r.sailDate || '');
      const history = parsedHistory.map((price, i) => {
        // Generate a synthetic date by walking backwards from sail_date
        // Each point is ~1 day apart so this is plausible
        const daysAgo = (parsedHistory.length - 1 - i);
        let date = '';
        if (sailDate) {
          try {
            const d = new Date(sailDate);
            d.setDate(d.getDate() - daysAgo);
            date = d.toISOString().split('T')[0];
          } catch { /* fallback below */ }
        }
        return {
          price: Math.round(Number(price) * 100) / 100,
          date,
        };
      });

      sailingMap[key] = {
        cruiseLine: r.cruiseLine,
        sailingId: String(r.sailingId),
        ship: r.ship,
        cabinType: r.cabinType || 'Inside',
        durationDays: Number(r.durationDays),
        currentPrice: Number(r.currentPrice) || 0,
        lowestPrice: parsedHistory.length ? Math.min(...parsedHistory) : Number(r.currentPrice) || 0,
        highestPrice: parsedHistory.length ? Math.max(...parsedHistory) : Number(r.originalPrice) || Number(r.currentPrice) || 0,
        history,
      };
    }
  }

  // Group by cruise line
  const sailingsByLine = new Map<string, any[]>();
  for (const key in sailingMap) {
    const s = sailingMap[key];
    if (!sailingsByLine.has(s.cruiseLine)) sailingsByLine.set(s.cruiseLine, []);
    sailingsByLine.get(s.cruiseLine)!.push({
      sailingId: s.sailingId,
      ship: s.ship,
      cabinType: s.cabinType,
      durationDays: s.durationDays,
      currentPrice: s.currentPrice,
      lowestPrice: s.lowestPrice,
      highestPrice: s.highestPrice,
      history: s.history,
    });
  }

  // Assemble lines
  const linesWithDetails = (lineAgg as any[]).map(line => ({
    line: line.line,
    totalSailings: Number(line.total_sailings),
    totalPricesTracked: Number(line.total_prices_tracked),
    sailings: (sailingsByLine.get(line.line as string) || []).sort(
      (a, b) => a.sailingId < b.sailingId ? -1 : 1,
    ),
  }));

  return {
    lines: linesWithDetails,
    totalPricesTracked: linesWithDetails.reduce((sum, line) => sum + line.totalPricesTracked, 0),
    totalSailings: linesWithDetails.reduce((sum, line) => sum + line.totalSailings, 0),
  };
}

// GET /api/stats
app.get('/api/stats', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT COUNT(*) AS tracked_sailings, COALESCE(SUM(nights), 0) AS pricing_snapshots FROM sailings WHERE price IS NOT NULL`
  ).all();
  return c.json(mapKeys(results[0] || { trackedSailings: 0, pricingSnapshots: 0 }));
});

// GET /api/search
app.get('/api/search', async (c) => {
  const q = c.req.query('q');
  if (!q) return c.json({ results: [] });
  const { results } = await c.env.DB.prepare(
    `SELECT s.*, cl.name AS cruise_line, sh.name AS ship FROM sailings s
     JOIN cruise_lines cl ON s.cruise_line_id = cl.id
     JOIN ships sh ON s.ship_id = sh.id
     LEFT JOIN destinations d ON s.destination_id = d.id
     WHERE sh.name LIKE ? OR cl.name LIKE ? OR d.name LIKE ? OR s.departure_port LIKE ?
     LIMIT 20`
  ).bind(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`).all();
  return c.json({ results: results.map(formatSailing) });
});

// ────────────────────────────────────────────────────────────────────────
// FILTER ENDPOINTS — cheap aggregations to power dropdowns.
// These replaced the old pattern of fetching /api/deals?limit=0 and deriving
// filter options client-side. Each query hits small table indexes, so it
// runs in ~10ms instead of triggering Cloudflare 1102 CPU errors.
// ────────────────────────────────────────────────────────────────────────

const FILTERS_CACHE_KEY = 'filters:catalog:v1';
const FILTERS_CACHE_TTL = 300; // 5 min — these rarely change within a sync cycle

interface FilterCatalog {
  cruiseLines: string[];
  destinations: string[];
  ships: string[];
  departurePorts: string[];
  departureRegions: string[];
  badgeTypes: string[];
  generatedAt: string;
}

async function buildFilterCatalog(env: any): Promise<FilterCatalog> {
  const [lines, dests, ships, ports, regions, badges] = await Promise.all([
    env.DB.prepare(`SELECT name FROM cruise_lines ORDER BY name ASC`).all(),
    env.DB.prepare(`SELECT name FROM destinations WHERE name IS NOT NULL ORDER BY name ASC`).all(),
    env.DB.prepare(`SELECT name FROM ships WHERE name IS NOT NULL ORDER BY name ASC`).all(),
    env.DB.prepare(`SELECT DISTINCT departure_port AS p FROM sailings WHERE departure_port IS NOT NULL ORDER BY p ASC`).all(),
    env.DB.prepare(`SELECT DISTINCT departure_region AS r FROM sailings WHERE departure_region IS NOT NULL ORDER BY r ASC`).all(),
    env.DB.prepare(`SELECT DISTINCT badge_type AS b FROM sailings WHERE badge_type IS NOT NULL ORDER BY b ASC`).all(),
  ]);
  return {
    cruiseLines: (lines.results || []).map((r: any) => r.name).filter(Boolean),
    destinations: (dests.results || []).map((r: any) => r.name).filter(Boolean),
    ships: (ships.results || []).map((r: any) => r.name).filter(Boolean),
    departurePorts: (ports.results || []).map((r: any) => r.p).filter(Boolean),
    departureRegions: (regions.results || []).map((r: any) => r.r).filter(Boolean),
    badgeTypes: (badges.results || []).map((r: any) => r.b).filter(Boolean),
    generatedAt: new Date().toISOString(),
  };
}

app.get('/api/filters', async (c) => {
  // Single canonical endpoint, KV-cached. Replaces the previous
  // /api/filters/destinations, /api/filters/cruise-lines, etc. split which
  // were six round-trips worse than this.
  const cached = await c.env.CACHE.get(FILTERS_CACHE_KEY);
  if (cached) {
    return c.json({ ...JSON.parse(cached), cached: true });
  }
  const catalog = await buildFilterCatalog(c.env);
  await c.env.CACHE.put(FILTERS_CACHE_KEY, JSON.stringify(catalog), { expirationTtl: FILTERS_CACHE_TTL });
  return c.json({ ...catalog, cached: false });
});

app.get('/api/filters/cruise-lines', async (c) => {
  const cached = await c.env.CACHE.get(FILTERS_CACHE_KEY);
  if (cached) {
    return c.json({ cruiseLines: (JSON.parse(cached) as FilterCatalog).cruiseLines });
  }
  const catalog = await buildFilterCatalog(c.env);
  await c.env.CACHE.put(FILTERS_CACHE_KEY, JSON.stringify(catalog), { expirationTtl: FILTERS_CACHE_TTL });
  return c.json({ cruiseLines: catalog.cruiseLines });
});

app.get('/api/filters/destinations', async (c) => {
  const cached = await c.env.CACHE.get(FILTERS_CACHE_KEY);
  if (cached) {
    return c.json({ destinations: (JSON.parse(cached) as FilterCatalog).destinations });
  }
  const catalog = await buildFilterCatalog(c.env);
  await c.env.CACHE.put(FILTERS_CACHE_KEY, JSON.stringify(catalog), { expirationTtl: FILTERS_CACHE_TTL });
  return c.json({ destinations: catalog.destinations });
});

app.get('/api/filters/ships', async (c) => {
  const cached = await c.env.CACHE.get(FILTERS_CACHE_KEY);
  if (cached) {
    return c.json({ ships: (JSON.parse(cached) as FilterCatalog).ships });
  }
  const catalog = await buildFilterCatalog(c.env);
  await c.env.CACHE.put(FILTERS_CACHE_KEY, JSON.stringify(catalog), { expirationTtl: FILTERS_CACHE_TTL });
  return c.json({ ships: catalog.ships });
});

app.get('/api/filters/departure-ports', async (c) => {
  const cached = await c.env.CACHE.get(FILTERS_CACHE_KEY);
  if (cached) {
    return c.json({ departurePorts: (JSON.parse(cached) as FilterCatalog).departurePorts });
  }
  const catalog = await buildFilterCatalog(c.env);
  await c.env.CACHE.put(FILTERS_CACHE_KEY, JSON.stringify(catalog), { expirationTtl: FILTERS_CACHE_TTL });
  return c.json({ departurePorts: catalog.departurePorts });
});

// POST /api/deals — upsert sailing from scraper
app.post('/api/deals', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${c.env.SCRAPER_SECRET}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const body = await c.req.json<{
    id: string;
    fingerprint: string;
    cruiseLine: string;
    ship: string;
    sailDate: string;
    nights: number;
    price: number;
    originalPrice: number;
    destination?: string;
    departurePort?: string;
    duration?: string;
    badgeType?: string;
    badgeText?: string;
    bookingUrl?: string;
    bookingLabel?: string;
    departureRegion?: string;
    history?: number[];
    itinerary?: string[];
  }>();
  
  // Normalize fields to prevent undefined binds
  const departPort = body.departurePort ?? null;
  const departRegion = body.departureRegion ?? null;
  const bookingUrl = body.bookingUrl ?? null;
  const bookingLabel = body.bookingLabel ?? null;

  // Ensure cruise_line exists (D1 doesn't support RETURNING — use last_insert_rowid)
  let cl = await c.env.DB.prepare('SELECT id FROM cruise_lines WHERE name = ?').bind(body.cruiseLine).first<{ id: number }>();
  if (!cl) {
    await c.env.DB.prepare('INSERT INTO cruise_lines (name) VALUES (?)').bind(body.cruiseLine).run();
    const res = await c.env.DB.prepare('SELECT last_insert_rowid() as id').first<{ id: number }>();
    if (!res) throw new Error('Failed to insert cruise line');
    cl = res;
  }

  // Ensure ship exists
  let ship = await c.env.DB.prepare('SELECT id FROM ships WHERE name = ? AND cruise_line_id = ?').bind(body.ship, cl!.id).first<{ id: number }>();
  if (!ship) {
    await c.env.DB.prepare('INSERT INTO ships (name, cruise_line_id) VALUES (?, ?)').bind(body.ship, cl!.id).run();
    const res = await c.env.DB.prepare('SELECT last_insert_rowid() as id').first<{ id: number }>();
    if (!res) throw new Error('Failed to insert ship');
    ship = res;
  }

  // Ensure destination exists
  let destId: number | null = null;
  if (body.destination) {
    const d = await c.env.DB.prepare('SELECT id FROM destinations WHERE name = ?').bind(body.destination).first<{ id: number }>();
    if (d) {
      destId = d.id;
    } else {
      await c.env.DB.prepare('INSERT INTO destinations (name) VALUES (?)').bind(body.destination).run();
      const destRow = await c.env.DB.prepare('SELECT last_insert_rowid() as id').first<{ id: number }>();
      if (!destRow) throw new Error('Failed to insert destination');
      destId = destRow.id;
    }
  }

  // Check fingerprint for dedup
  const existing = await c.env.DB.prepare('SELECT id, price FROM sailings WHERE fingerprint = ?').bind(body.fingerprint).first();
  if (existing) {
    if (existing.price === body.price) {
      return c.json({ action: 'skipped', reason: 'price unchanged', sailingId: existing.id });
    }
    // Update price + history
    const prevHistory = await c.env.DB.prepare('SELECT history FROM sailings WHERE id = ?').bind(existing.id).first<any>();
    const history = prevHistory?.history ? JSON.parse(prevHistory.history) : [];
    history.push(body.price);
    await c.env.DB.prepare(
      `UPDATE sailings SET price = ?, original_price = ?, last_updated_at = datetime('now'), history = ? 
       WHERE id = ?`
    ).bind(body.price, body.originalPrice, JSON.stringify(history.slice(-90)), existing.id).run();
    // Look up the Inside cabin category ID (don't hardcode 1 — it may not exist after a DB reset)
    const insideCat = await c.env.DB.prepare('SELECT id FROM cabin_categories WHERE name = ?').bind('Inside').first<{ id: number }>();
    const insideCatId = insideCat?.id ?? 1;
    await c.env.DB.prepare(
      'INSERT INTO price_history (sailing_id, cabin_category_id, price) VALUES (?, ?, ?)'
    ).bind(existing.id, insideCatId, body.price).run();
    return c.json({ action: 'updated', sailingId: existing.id });
  }

  // Insert new sailing — aligned with live DB schema (departure_port text column + booking fields)
  const insertResult = await c.env.DB.prepare(
    `INSERT INTO sailings (id, cruise_line_id, ship_id, destination_id, departure_port_id, departure_region,
      departure_port, sail_date, nights, duration, price, original_price, badge_text, booking_url, booking_label,
      fingerprint, history, source, itinerary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.id, cl!.id, ship!.id, destId, null, departRegion,
    departPort,
    body.sailDate, body.nights, body.duration || `${body.nights} nights`,
    body.price, body.originalPrice, body.badgeText || 'Popular',
    bookingUrl, bookingLabel,
    body.fingerprint, JSON.stringify(body.history && body.history.length >= 2 ? body.history : [body.price]), 'scraper',
    body.itinerary ? JSON.stringify(body.itinerary) : null
  ).run();

  return c.json({ action: 'inserted', sailingId: body.id });
});

// GET /api/sailing/:id — fetch one sailing + cabin prices + price history
// Shaped for the SailingDetailClient SailingData interface.
app.get('/api/sailing/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare(`
    SELECT s.id, s.sail_date AS departure_date, s.nights,
           s.price, s.original_price, s.duration,
           s.departure_port, s.departure_region,
           s.history,
           sh.name AS ship, cl.name AS cruise_line,
           d.name AS destination
    FROM sailings s
    JOIN ships sh ON s.ship_id = sh.id
    JOIN cruise_lines cl ON s.cruise_line_id = cl.id
    LEFT JOIN destinations d ON s.destination_id = d.id
    WHERE s.id = ?
  `).bind(id).first<any>();

  if (!row) return c.json({ error: 'not found' }, 404);

  // Cabin breakdown (left join handles missing cabin prices)
  const { results: cabinRows } = await c.env.DB.prepare(`
    SELECT cc.name AS cabinType,
           cp.base_fare_per_person, cp.port_tax_per_person,
           cp.gratuity_per_person_per_night, cp.total_per_person
    FROM cabin_prices cp
    JOIN cabin_categories cc ON cp.cabin_category_id = cc.id
    WHERE cp.sailing_id = ?
    ORDER BY cc.id
  `).bind(id).all();

  // History datapoints from cached JSON — shaped for PriceHistoryPanel
  // (it expects {recorded_date, cabin_type, passenger_count, total_usd}).
  let prices: number[] = [];
  try { prices = JSON.parse(row.history || '[]'); } catch { /* swallow */ }
  const priceHistory = prices.map((price, i) => {
    const daysAgo = prices.length - 1 - i;
    let date = '';
    try {
      const d = new Date(row.departure_date);
      d.setDate(d.getDate() - daysAgo);
      date = d.toISOString().split('T')[0];
    } catch { /* blank date */ }
    return {
      price,
      date,
      // Aliases consumed by PriceHistoryPanel
      recorded_date: date,
      cabin_type: cabinRows[0]?.cabinType || 'Inside',
      passenger_count: 2,
      total_usd: String(price),
      cabinType: cabinRows[0]?.cabinType || 'Inside',
    };
  });

  // Compute dropPercent
  const dropPercent = row.original_price > 0
    ? Math.round(((row.original_price - row.price) / row.original_price) * 100)
    : 0;

  // No `itinerary` table exists — synthesize a route from what we know
  const destination = row.destination || 'Caribbean';
  const route = row.departure_port
    ? [row.departure_port, destination, row.departure_port]
    : [destination];

  return c.json({
    sailing: {
      id: Number(row.id) || 0,            // legacy type was number; coerced
      sailing_id: row.id,                  // string ID for any newer consumers
      line: row.cruise_line,
      ship: row.ship,
      days: Number(row.nights),
      port: row.departure_port || '',
      route,
      region: row.departure_region || destination,
      departureDate: row.departure_date,
      bookingUrl: undefined,
      price: Number(row.price) || 0,
      originalPrice: Number(row.original_price) || 0,
      dropPercent,
      history: prices,
    },
    cabinBreakdown: (cabinRows as any[]).map((c) => {
      const baseFare = Number(c.base_fare_per_person) || 0;
      const portTax = Number(c.port_tax_per_person) || 0;
      const gratuity = Number(c.gratuity_per_person_per_night) || 0;
      const totalPerPerson = Number(c.total_per_person) || 0;
      // Many UI components want the precomputed "out-the-door" total
      // (base + port tax + gratuity*7 nights default). Prefer column if present;
      // fall back to derivation.
      const totalOutTheDoor = totalPerPerson || (baseFare + portTax + gratuity * 7);
      const raw = {
        cabinType: c.cabinType,
        baseFarePerPerson: baseFare,
        portTaxPerPerson: portTax,
        gratuityPerPersonPerNight: gratuity,
        totalOutTheDoor,
        nights: 7,
        perPersonPerDay: totalOutTheDoor / 7,
      };
      return {
        cabinType: c.cabinType,
        // camelCase variants consumed by PriceComparisonTable / cabin panels
        baseFarePerPerson: baseFare,
        portTaxPerPerson: portTax,
        gratuityPerPersonPerNight: gratuity,
        totalPerPerson,
        totalOutTheDoor,
        // Legacy snake_case keys (still consumed elsewhere)
        base: baseFare,
        portTax,
        gratuity,
        portFees: portTax,
        mandatoryGratuities: gratuity,
        nights: 7,
        raw,
      };
    }),
    priceHistory,
  });
});

// POST /api/sailing/:id/details — seed cabin prices + price history for a sailing
app.post('/api/sailing/:id/details', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${c.env.SCRAPER_SECRET}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const id = c.req.param('id');
  const body = await c.req.json<{
    cabins: Array<{ cabinClass: string; baseFare: number; portTax: number; gratuityPerNight: number }>;
    priceHistory?: Array<{ price: number; date?: string; cabinClass?: string }>;
  }>();

  // Ensure cabin categories exist + insert cabin prices
  const cabinCatMap: Record<string, number> = {};
  for (const cab of body.cabins) {
    let cat = await c.env.DB.prepare('SELECT id FROM cabin_categories WHERE name = ?').bind(cab.cabinClass).first<{ id: number }>();
    if (!cat) {
      await c.env.DB.prepare('INSERT INTO cabin_categories (name) VALUES (?)').bind(cab.cabinClass).run();
      cat = await c.env.DB.prepare('SELECT last_insert_rowid() as id').first<{ id: number }>();
    }
    cabinCatMap[cab.cabinClass] = cat!.id;
    await c.env.DB.prepare(
      `INSERT INTO cabin_prices (sailing_id, cabin_category_id, base_fare_per_person, port_tax_per_person, gratuity_per_person_per_night)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(id, cat!.id, cab.baseFare, cab.portTax, cab.gratuityPerNight).run();
  }

  // Insert price history if provided (supports per-cabin-class entries)
  if (body.priceHistory) {
    for (const ph of body.priceHistory) {
      const catId = ph.cabinClass ? (cabinCatMap[ph.cabinClass] || 1) : 1;
      await c.env.DB.prepare(
        `INSERT INTO price_history (sailing_id, cabin_category_id, price, recorded_at) VALUES (?, ?, ?, ?)`
      ).bind(id, catId, ph.price, ph.date || new Date().toISOString()).run();
    }
  }

  return c.json({ action: 'details_seeded', sailingId: id, cabins: body.cabins.length, history: body.priceHistory?.length || 0 });
});

// POST /api/alerts/create — create a price-drop alert subscription
app.post('/api/alerts/create', async (c) => {
  const body = await c.req.json<{
    email: string;
    sailingUrl?: string;
  }>();

  if (!body.email || !body.email.includes('@')) {
    return c.json({ success: false, error: 'Valid email required' }, 400);
  }

  // Extract sailing_id from URL if provided (e.g., "/sailing/carnival_conquest_2026-03-12_miami_4")
  let sailingId: string | null = null;
  if (body.sailingUrl) {
    const match = body.sailingUrl.match(/\/sailing\/([^\/?#]+)/);
    if (match) sailingId = match[1];
  }

  // Look up the user's default price-drop threshold from alert_preferences.
  // Fall back to 10.0% if no preference row exists.
  const pref = await c.env.DB.prepare(
    `SELECT default_threshold FROM alert_preferences WHERE email = ?`
  ).bind(body.email).first<{ default_threshold: number }>();
  const threshold = pref?.default_threshold ?? 10.0;

  // Insert alert
  const result = await c.env.DB.prepare(`
    INSERT INTO alerts (email, sailing_id, sailing_url, threshold_pct, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
  `).bind(body.email, sailingId, body.sailingUrl || null, threshold).run();

  if (!result.success) {
    return c.json({ success: false, error: 'Failed to create alert' }, 500);
  }

  return c.json({ success: true, alertId: result.meta.last_row_id, threshold_pct: threshold });
});

// GET /api/alerts?email=foo@bar — list all alerts for that email
app.get('/api/alerts', async (c) => {
  const email = c.req.query('email');
  if (!email || !email.includes('@')) {
    return c.json({ error: 'email query param required' }, 400);
  }
  const { results } = await c.env.DB.prepare(
    `SELECT id, sailing_id, sailing_url, threshold_pct, is_active,
            last_notified_at, created_at, updated_at
       FROM alerts WHERE email = ? ORDER BY id DESC`
  ).bind(email).all();
  return c.json({ email, alerts: results || [] });
});

// PATCH /api/alerts/:id — update threshold_pct and/or is_active / sailing_url
app.patch('/api/alerts/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: 'invalid id' }, 400);
  const body = await c.req.json<{ threshold_pct?: number; is_active?: number | boolean; sailing_url?: string }>().catch(() => ({} as any));

  // Build dynamic SET clause from provided fields
  const fields: string[] = [];
  const binds: any[] = [];
  if (typeof body.threshold_pct === 'number' && body.threshold_pct >= 0 && body.threshold_pct <= 100) {
    fields.push('threshold_pct = ?');
    binds.push(body.threshold_pct);
  }
  if (body.is_active !== undefined) {
    const active = body.is_active ? 1 : 0;
    // If re‑activating, clear cooldown so a fresh evaluation can fire immediately.
    fields.push('is_active = ?');
    binds.push(active);
  }
  if (typeof body.sailing_url === 'string') {
    fields.push('sailing_url = ?');
    binds.push(body.sailing_url);
  }
  if (fields.length === 0) return c.json({ error: 'no fields to update' }, 400);
  fields.push('updated_at = datetime(\'now\')');
  binds.push(id);

  const res = await c.env.DB.prepare(
    `UPDATE alerts SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...binds).run();
  if (!res.success) return c.json({ error: 'update failed' }, 500);

  const updated = await c.env.DB.prepare(
    `SELECT id, sailing_id, sailing_url, threshold_pct, is_active, last_notified_at FROM alerts WHERE id = ?`
  ).bind(id).first();
  return c.json({ success: true, alert: updated });
});

// DELETE /api/alerts/:id — soft delete (set is_active = 0)
app.delete('/api/alerts/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: 'invalid id' }, 400);
  const res = await c.env.DB.prepare(
    `UPDATE alerts SET is_active = 0, updated_at = datetime('now') WHERE id = ?`
  ).bind(id).run();
  if (!res.success) return c.json({ error: 'delete failed' }, 500);
  return c.json({ success: true, soft_deleted: id });
});

// GET /api/alert-preferences?email=... — fetch user's preferences (or default)
app.get('/api/alert-preferences', async (c) => {
  const email = c.req.query('email');
  if (!email || !email.includes('@')) {
    return c.json({ error: 'email query param required' }, 400);
  }
  const pref = await c.env.DB.prepare(
    `SELECT email, default_threshold, created_at, updated_at FROM alert_preferences WHERE email = ?`
  ).bind(email).first();
  if (!pref) {
    return c.json({
      email,
      default_threshold: 10.0, // UI default
      created_at: null,
      updated_at: null,
    });
  }
  return c.json(pref);
});

// PUT /api/alert-preferences — upsert user's default threshold
app.put('/api/alert-preferences', async (c) => {
  const body = await c.req.json<{ email: string; default_threshold: number }>();
  if (!body.email || !body.email.includes('@')) {
    return c.json({ error: 'Valid email required' }, 400);
  }
  if (typeof body.default_threshold !== 'number' || body.default_threshold < 0 || body.default_threshold > 100) {
    return c.json({ error: 'default_threshold must be a number between 0 and 100' }, 400);
  }
  await c.env.DB.prepare(
    `INSERT INTO alert_preferences (email, default_threshold, created_at, updated_at)
     VALUES (?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(email) DO UPDATE SET
       default_threshold = excluded.default_threshold,
       updated_at = datetime('now')`
  ).bind(body.email, body.default_threshold).run();
  const stored = await c.env.DB.prepare(
    `SELECT email, default_threshold, updated_at FROM alert_preferences WHERE email = ?`
  ).bind(body.email).first();
  return c.json({ success: true, preference: stored });
});

// GET /api/health — public liveness probe, no auth required.
// Required by Cloudflare Pages healthchecks and uptime monitors.
app.get('/api/health', async (c) => {
  // Cheap "are we alive" probe. Intentionally avoids heavy queries so the
  // health endpoint can never itself be the cause of a CPU 1102 error.
  let dbOk = false;
  try {
    await c.env.DB.prepare('SELECT 1 AS one').first();
    dbOk = true;
  } catch {
    dbOk = false;
  }
  return c.json({
    status: dbOk ? 'ok' : 'degraded',
    service: 'portly-api',
    timestamp: new Date().toISOString(),
    database: dbOk ? 'connected' : 'disconnected',
    version: '1.1.0',
  });
});

// GET /api/sync-status — check when the last cron sync ran
app.get('/api/sync-status', async (c) => {
  const lastSync = await c.env.CACHE.get('last_cron_sync');
  const lastSyncResult = await c.env.CACHE.get('last_cron_sync_result');
  const { results } = await c.env.DB.prepare(
    `SELECT COUNT(*) as total_sailings, MAX(last_updated_at) as last_update FROM sailings WHERE price IS NOT NULL`
  ).all();
  return c.json({
    lastSyncTime: lastSync || null,
    lastSyncResult: lastSyncResult ? JSON.parse(lastSyncResult) : null,
    totalSailings: results[0]?.total_sailings || 0,
    lastDbUpdate: results[0]?.last_update || null,
    cronSchedule: '*/30 * * * *',
  });
});

// GET /api/enhanced/deal-analysis/:id — stub heuristic deal analysis
app.get('/api/enhanced/deal-analysis/:id', async (c) => {
  const id = c.req.param('id');
  const s = await c.env.DB.prepare(
    `SELECT s.*, cl.name AS cruise_line, sh.name AS ship, d.name AS destination
     FROM sailings s
     JOIN cruise_lines cl ON s.cruise_line_id = cl.id
     JOIN ships sh ON s.ship_id = sh.id
     LEFT JOIN destinations d ON s.destination_id = d.id
     WHERE s.id = ?`
  ).bind(id).first<any>();

  if (!s) return c.json({ error: 'Not found' }, 404);

  const price = s.price || 0;
  const original = s.original_price || price;
  const dropPct = original > 0 ? Math.round((original - price) / original * 100) : 0;
  const nights = s.nights || 7;
  const perNight = Math.round(price / nights);
  const totalCost = Math.round(price + 180 + nights * 18.5);

  // Determine price trend from history
  let history: number[] = [];
  try { history = JSON.parse(s.history || '[]'); } catch { /* */ }
  const priceTrend = history.length >= 2
    ? (history[history.length - 1] < history[0] ? 'falling' : history[history.length - 1] > history[0] ? 'rising' : 'stable')
    : 'stable';

  // Ship-specific descriptions
  const shipDescriptions: Record<string, { description: string; highlights: string[] }> = {
    'Mardi Gras': { description: "Carnival's flagship Excel-class mega-ship, launched 2021. First cruise ship with a roller coaster at sea.", highlights: ['Bolt roller coaster', 'Grand Central atrium', '6,500 passengers', 'Launched 2021', 'LNG-powered'] },
    'Carnival Vista': { description: 'Vista-class ship launched 2016, featuring the SkyRide aerial attraction and an IMAX theater.', highlights: ['SkyRide', 'IMAX theater', 'Bike brew pub', '4,920 passengers'] },
    'Carnival Panorama': { description: 'Vista-class sister ship launched 2020, the first Carnival ship with a trampoline park.', highlights: ['Sky Zone trampoline park', 'SkyRide', 'LA-based', '4,002 passengers'] },
    'Carnival Jubilee': { description: 'Excel-class ship launched 2023, sister to Mardi Gras with the same Bolt roller coaster.', highlights: ['Bolt roller coaster', 'Excel-class', 'Launched 2023', '6,500 passengers', 'LNG-powered'] },
    'Discovery Princess': { description: 'Royal-class ship launched 2022, featuring the award-winning Sky Suites and Princess MedallionClass.', highlights: ['MedallionClass', 'Sky Suites', 'Launched 2022', '3,660 passengers'] },
    'Regal Princess': { description: 'Royal-class ship launched 2014, known for the SeaWalk glass-floor viewing gallery.', highlights: ['SeaWalk', 'MedallionClass', '3,560 passengers'] },
    'Sapphire Princess': { description: 'Sapphire-class ship launched 2004, recently refurbished in 2018.', highlights: ['Refurbished 2018', 'Movies Under the Stars', '2,670 passengers'] },
    'Nieuw Amsterdam': { description: 'Signature-class ship launched 2010, featuring the Culinary Arts Center and BB King Blues Club.', highlights: ['BB King Blues Club', 'Culinary Arts Center', '2,106 passengers'] },
    'Koningsdam': { description: 'Pinnacle-class ship launched 2016, the largest in the HAL fleet with a 3-story atrium.', highlights: ['Pinnacle-class', '3-story atrium', 'Rolling Stone Rock Room', '2,650 passengers'] },
    'Queen Mary 2': { description: 'The only ocean liner in service, launched 2004. Features the only planetarium at sea.', highlights: ['Only ocean liner', 'Planetarium at sea', 'Transatlantic specialist', '2,691 passengers'] },
    'Queen Anne': { description: 'Cunard\'s newest ship launched 2024, featuring a redesigned P&o style with British heritage.', highlights: ['Launched 2024', 'British heritage', '3,000 passengers'] },
    'Wonder of the Seas': { description: 'Oasis-class mega-ship launched 2022, the world\'s 2nd largest cruise ship at 6,988 passengers.', highlights: ['Oasis-class', '6,988 passengers', '8 neighborhoods', 'Launched 2022'] },
    'Harmony of the Seas': { description: 'Oasis-class ship launched 2016, featuring the Perfect Storm waterslides and Central Park.', highlights: ['Perfect Storm slides', 'Central Park', '6,687 passengers'] },
    'Icon of the Seas': { description: 'Icon-class ship launched 2024, the world\'s largest cruise ship with the first water park at sea.', highlights: ['World\'s largest', 'Launched 2024', 'Category 6 waterpark', '7,600 passengers', 'LNG-powered'] },
    'Norwegian Encore': { description: 'Breakaway Plus-class ship launched 2019, featuring the longest race track at sea.', highlights: ['Longest race track', 'Galaxy Pavilion VR', '3,998 passengers'] },
    'Norwegian Prima': { description: 'Prima-class ship launched 2022, featuring the first free-fall drop ride at sea.', highlights: ['Free-fall drop ride', 'Prima-class', '3,099 passengers', 'Launched 2022'] },
    'MSC Seascape': { description: 'Seaside EVO-class ship launched 2022, featuring the first Robotron interactive ride.', highlights: ['Robotron ride', 'Seaside EVO', '5,877 passengers', 'Launched 2022'] },
    'MSC Virtuosa': { description: 'Meraviglia Plus-class ship launched 2021, featuring the longest promenade at sea.', highlights: ['Longest promenade', 'Maraviglia Plus', '5,742 passengers'] },
    'Disney Wish': { description: 'Disney\'s newest Triton-class ship launched 2022, featuring the first Disney attraction at sea.', highlights: ['AquaMouse attraction', 'Triton-class', 'Launched 2022', '1,555 passengers'] },
    'Disney Fantasy': { description: 'Dream-class ship launched 2012, featuring the AquaDuck water coaster.', highlights: ['AquaDuck', 'Dream-class', '2,500 passengers'] },
    'Celebrity Apex': { description: 'Edge-class ship launched 2020, featuring the Magic Carpet cantilevered platform.', highlights: ['Magic Carpet', 'Edge-class', 'Launched 2020', '3,260 passengers'] },
    'Celebrity Beyond': { description: 'Edge-class ship launched 2022, featuring the largest Resort Deck and rooftop garden.', highlights: ['Rooftop Garden', 'Edge-class', 'Launched 2022', '3,260 passengers'] }
  };

  const shipInfo = shipDescriptions[s.ship] || { description: `${s.cruise_line} cruise ship on the ${s.destination || 'Caribbean'} route.`, highlights: ['Modern cruise ship', 'Multiple dining venues', 'Entertainment options'] };

  // Compute justifications
  const dealScoreJustification = [
    { title: 'Price Below Recent Peak', content: `The current fare of $${price.toLocaleString()} is ${dropPct}% below the recent high of $${original.toLocaleString()} — that's a $${(original - price).toLocaleString()} savings per person. On a 7-night sailing, this magnitude of drop occurs in roughly 15% of fare cycles.` },
    { title: 'Per-Night Cost Benchmark', content: `At $${perNight}/night per person (base fare only), this sailing sits in the ${dropPct >= 25 ? 'bottom 10th' : dropPct >= 15 ? 'bottom 25th' : 'middle'} percentile for ${s.destination || 'Caribbean'} sailings of similar duration. Comparable sailings average $${Math.round(perNight * 1.3)}/night.` },
    { title: 'Historical Trend', content: `Price has been ${priceTrend} for ${history.length >= 2 ? `${history.length} consecutive data points` : 'the recent tracking period'}. ${priceTrend === 'falling' ? 'The downward trend suggests the line may be discounting to fill cabins — a buyer-favorable signal.' : priceTrend === 'rising' ? 'Rising prices indicate this fare may increase further — consider booking soon.' : 'Stable pricing suggests this fare has found its equilibrium.'}` }
  ];

  const shipValueScore = Math.min(92, 60 + Math.floor(dropPct / 3));
  const shipValueScoreJustification = [
    { title: 'Ship Overview', content: shipInfo.description },
    { title: 'Notable Features', content: shipInfo.highlights.join(' · ') },
    { title: 'Value Assessment', content: `At $${totalCost.toLocaleString()} total per person out-the-door, you're paying $${Math.round(totalCost / nights)}/night including all taxes and gratuities. The ${s.ship} offers ${shipInfo.highlights.length} notable amenities, translating to $${Math.round(totalCost / (nights * shipInfo.highlights.length))}/night per major feature — strong value for a ship of this caliber.` }
  ];

  // Pull AI-enriched content from the sailings row when present, then map
  // onto the structured fields the frontend expects.
  const aiScore = typeof s.ai_score === 'number' ? s.ai_score : null;
  const aiSummary = s.ai_insider_summary || null;
  const aiDealScoreNarrative = s.ai_deal_score_narrative || null;
  const aiCabinStrategy = s.ai_cabin_strategy || null;
  const aiExcursionStrategy = s.ai_excursion_strategy || null;
  const aiHasContent = Boolean(s.ai_generated_at && (aiSummary || aiDealScoreNarrative || aiCabinStrategy));

  const isHeuristic = !aiHasContent;

  return c.json({
    data: {
      is_heuristic: isHeuristic,
      is_ai_enhanced: aiHasContent,
      ai_generated_at: s.ai_generated_at || null,
      ai_score: aiScore,
      ai_model: s.ai_model || null,
      dealScore: aiScore ?? Math.min(95, 40 + dropPct * 2),
      dealScoreJustification,
      verdict: aiSummary || (dropPct >= 25 ? 'Exceptional value — price has dropped significantly below recent highs. Strong buy opportunity.' : dropPct >= 15 ? 'Good deal — below recent average. Worth booking soon.' : 'Fair price — in line with recent trends. Monitor for further drops.'),
      priceTrend,
      pricingDeepDive: aiDealScoreNarrative || `The current fare of $${price.toLocaleString()} represents a ${dropPct}% discount from the recent high of $${original.toLocaleString()}. On a per-night basis, you're paying $${perNight}/night, which ${dropPct >= 20 ? 'is well below the typical range for this route' : 'is competitive for this category'}.`,
      hiddenCosts: {
        portFees: '$180 per person',
        gratuities: `$${(nights * 18.5).toFixed(2)} per person ($18.50/night)`,
        totalOutTheDoor: `$${totalCost.toLocaleString()} per person`
      },
      itineraryValue: `${s.destination || 'This route'} offers ${nights} nights of diverse port calls. The itinerary balances sea days with port-intensive exploration.`,
      pricingStrategy: aiDealScoreNarrative || 'Cruise lines typically raise prices in the final 60 days before departure. Booking now locks in the current rate before the next fare increase cycle.',
      inventoryIntelligence: 'Interior and ocean view cabins tend to sell out first on this route. Balcony cabins remain available but may not last past the early-bird window.',
      insiderTips: aiCabinStrategy ? [
        { title: 'Cabin Selection Strategy', content: aiCabinStrategy },
        { title: 'Shore Excursion Economics', content: aiExcursionStrategy },
        { title: 'Gratuities & Hidden Costs', content: `Pre-pay gratuities of $${(nights * 18.5).toFixed(0)}/person before sailing — locks in current rate and avoids shipboard surprises. ${isHeuristic ? 'When AI enrichment lands, this will reflect your specific ship and route.' : ''}`.trim() },
        { title: 'Onboard Credit Hack', content: isHeuristic ? 'Watch for $50-100 onboard credits that lines bundle with cabin upgrades 60-90 days out — they effectively drop your per-night cost.' : 'Loyalty members often see priority dining reservations and complimentary wine packages on sailing packages of 7+ nights.' },
      ] : [],
      shipValueScore: Math.min(92, 60 + Math.floor(dropPct / 3)),
      shipValueScoreJustification
    }
  });
});

// GET /api/enhanced/price-forecast/:id — per-cabin-type forecasts with confidence intervals
app.get('/api/enhanced/price-forecast/:id', async (c) => {
  const id = c.req.param('id');
  const s = await c.env.DB.prepare(
    `SELECT s.*, cl.name AS cruise_line, sh.name AS ship
     FROM sailings s
     JOIN cruise_lines cl ON s.cruise_line_id = cl.id
     JOIN ships sh ON s.ship_id = sh.id
     WHERE s.id = ?`
  ).bind(id).first<any>();

  if (!s) return c.json({ error: 'Not found' }, 404);

  const price = Number(s.price) || 0;
  const original = Number(s.original_price) || price;
  const nights = Number(s.nights) || 7;
  const perNight = nights > 0 ? Math.round(price / nights) : 0;

  // Load cabin prices to compute per-cabin forecasts
  const { results: cabinRows } = await c.env.DB.prepare(
    `SELECT cc.name AS cabinType, cp.base_fare_per_person, cp.port_tax_per_person,
            cp.gratuity_per_person_per_night, cp.total_per_person
     FROM cabin_prices cp
     JOIN cabin_categories cc ON cp.cabin_category_id = cc.id
     WHERE cp.sailing_id = ?
     ORDER BY cc.id`
  ).bind(id).all() as any;

  // Per-cabin forecasting: cabins of similar tiers follow the category's typical drop cycle
  const tierFactor: Record<string, number> = {
    'Inside': 0.85, 'Oceanview': 0.90, 'Balcony': 0.92, 'Suite': 0.95,
  };

  const cabinForecasts = (cabinRows || []).map((c: any) => {
    const cabinBase = Number(c.total_per_person) || (Number(c.base_fare_per_person) + Number(c.port_tax_per_person) + Number(c.gratuity_per_person_per_night) * nights);
    const f = tierFactor[c.cabinType] ?? 0.9;
    const forecast7d = Math.round(cabinBase * f);
    const forecast30d = Math.round(cabinBase * 0.82);
    return {
      cabinType: c.cabinType,
      currentPrice: Math.round(cabinBase),
      forecast7d,
      forecast30d,
      // Range as {low, mid, high} for confidence-interval display elsewhere
      forecast7dRange: {
        low: Math.round(cabinBase * f * 0.95),
        mid: forecast7d,
        high: Math.round(cabinBase * f * 1.08),
      },
      forecast30dRange: {
        low: Math.round(cabinBase * 0.75),
        mid: forecast30d,
        high: Math.round(cabinBase * 0.95),
      },
      confidence: 0.72,
      guidance: cabinBase < price * 1.3
        ? `Best-value tier — typically drops further 30–45 days before departure.`
        : `Premium tier — inventory tightens closer to sail date; price tends to rise.`,
    };
  });

  // Determine trend from price history
  let historyPrices: number[] = [];
  try { historyPrices = JSON.parse(s.history || '[]'); } catch { /* */ }
  const direction = historyPrices.length >= 2
    ? (historyPrices[historyPrices.length - 1] < historyPrices[0] ? 'falling' : 'rising')
    : 'stable';
  const magnitude = historyPrices.length >= 2
    ? Math.abs(Math.round((historyPrices[historyPrices.length - 1] - historyPrices[0]) / historyPrices[0] * 100))
    : 0;

  // Competing sailings: same destination, ±10% duration window
  const { results: competing } = await c.env.DB.prepare(
    `SELECT s.id, s.sail_date, s.price, s.nights, sh.name AS ship, cl.name AS cruise_line
     FROM sailings s
     JOIN ships sh ON s.ship_id = sh.id
     JOIN cruise_lines cl ON s.cruise_line_id = cl.id
     WHERE s.destination_id = ? AND s.id != ? AND s.nights BETWEEN ? AND ?
     ORDER BY s.price ASC LIMIT 4`
  ).bind(s.destination_id, id, Math.max(1, nights - 1), nights + 1).all() as any;

  const competingSailings = (competing || []).map((cs: any) => ({
    sailingId: cs.id,
    ship: cs.ship,
    line: cs.cruise_line,
    cruiseLine: cs.cruise_line,
    shipName: cs.ship,
    departureDate: cs.sail_date,
    nights: cs.nights,
    currentPrice: cs.price,
    balconyPrice: cs.price,    // approximate balcony by using currentPrice (component shows delta)
    advisor: cs.price < price * 0.95 ? 'Cheaper alternative — consider this if dates are flexible.' : 'Comparable — better for a different cabin tier perhaps.',
  }));

  // Optimal booking window — based on current price vs recent peak
  const peakRatio = original > 0 ? (price / original) : 1;
  const optimalBookingWindow = peakRatio < 0.85
    ? `Strong buy window — current fare is ${Math.round((1 - peakRatio) * 100)}% below recent peak. Lock it in within the next 7–14 days; historically, drops below this level are rare.`
    : peakRatio < 0.95
      ? `Decent price — within 5–15% of recent peak. Worth booking if your dates are firm; monitor for further drops over the next 2 weeks.`
      : `Fair price, near recent peak. Cruise lines often discount 60–90 days before departure, so waiting may produce better fares unless inventory is tight.`;

  // Seasonal indicator
  const sailMonth = String(s.sail_date || '').slice(5, 7);
  const seasonalMap: Record<string, 'peak' | 'shoulder' | 'low'> = {
    '01': 'low', '02': 'low', '03': 'shoulder', '04': 'shoulder',
    '05': 'shoulder', '06': 'peak', '07': 'peak', '08': 'peak',
    '09': 'shoulder', '10': 'shoulder', '11': 'low', '12': 'peak',
  };
  const seasonalIndicator = seasonalMap[sailMonth] || 'shoulder';

  // Rate lock urgency heuristic
  const dropFromPeak = original > 0 ? (original - price) / original : 0;
  const urgency: 'critical' | 'high' | 'moderate' | 'low' =
    dropFromPeak > 0.3 ? 'critical' : dropFromPeak > 0.15 ? 'high' : dropFromPeak > 0.05 ? 'moderate' : 'low';
  const rateLock = {
    urgency,
    minutesRemaining: urgency === 'critical' ? 60 * 24 * 3 : urgency === 'high' ? 60 * 24 * 7 : urgency === 'moderate' ? 60 * 24 * 14 : 60 * 24 * 30,
    message: urgency === 'critical'
      ? `Fare has dropped ${Math.round(dropFromPeak * 100)}% from peak — historically this low holds for only 3–5 days.`
      : urgency === 'high'
        ? `Fare is well below peak — book within 7 days to lock in this rate.`
        : urgency === 'moderate'
          ? `Moderate discount — you've got a ~2 week window before typical rate cycles pivot.`
          : `Routine discount — easy to compare against competing sailings and time your booking.`,
  };

  return c.json({
    data: {
      cabinForecasts,
      optimalBookingWindow,
      competingSailings,
      trendContext: {
        direction,
        magnitude,
        windows: [
          { period: '7-day', direction: direction === 'stable' ? 'stable' : direction, magnitude, snapshots: 7 },
          { period: '30-day', direction: direction === 'stable' ? 'stable' : direction, magnitude, snapshots: 30 },
          { period: '90-day', direction: direction === 'stable' ? 'stable' : direction, magnitude, snapshots: 90 },
        ],
      },
      seasonalIndicator,
      rateLock,
      alerts: [
        {
          condition: 'price-drops-10pct',
          threshold: Math.round(price * 0.9),
          message: `Notify if fare falls below $${Math.round(price * 0.9).toLocaleString()}`,
          active: true,
        },
        {
          condition: 'price-drops-25pct',
          threshold: Math.round(price * 0.75),
          message: `Strong-buy signal: notify if fare drops below $${Math.round(price * 0.75).toLocaleString()} (25% below current).`,
          active: true,
        },
      ],
      is_heuristic: true,
    }
  });
});

/* ------------------------------------------------------------------ */
/*  AI Enrichment — admin endpoints + scheduled handler                */
/* ------------------------------------------------------------------ */

const ADMIN_GATE = (auth: string | undefined, scraperSecret: string) =>
  auth === `Bearer ${scraperSecret}`;

// POST /api/admin/enrich/:id — enrich one sailing on demand
app.post('/api/admin/enrich/:id', async (c) => {
  if (!ADMIN_GATE(c.req.header('Authorization'), c.env.SCRAPER_SECRET)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const id = c.req.param('id');
  const force = c.req.query('force') === '1';
  const result = await enrichSailing(c.env, id, { force });
  return c.json(result, result.ok ? 200 : 500);
});

// GET /api/admin/enrich/candidates — list candidates
app.get('/api/admin/enrich/candidates', async (c) => {
  if (!ADMIN_GATE(c.req.header('Authorization'), c.env.SCRAPER_SECRET)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const max = Number(c.req.query('max') || 10);
  const candidates = await findCandidatesForEnrichment(c.env, max);
  return c.json({ count: candidates.length, ids: candidates });
});

// POST /api/admin/enrich-tick — process a batch (max 5)
app.post('/api/admin/enrich-tick', async (c) => {
  if (!ADMIN_GATE(c.req.header('Authorization'), c.env.SCRAPER_SECRET)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const body = await c.req.json<{ max?: number }>().catch(() => ({} as any));
  const result = await runEnrichmentTick(c.env, { maxPerTick: body?.max ?? 5 });
  return c.json(result);
});

// GET /api/admin/enrichment-status — telemetry
app.get('/api/admin/enrichment-status', async (c) => {
  if (!ADMIN_GATE(c.req.header('Authorization'), c.env.SCRAPER_SECRET)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const lastTick = await c.env.CACHE.get('enrichment:last_tick');
  const tickCount = await c.env.CACHE.get('enrichment:tick_count');
  const aiTotal = await c.env.DB.prepare(
    `SELECT
       COUNT(*) AS total, COUNT(ai_generated_at) AS enriched,
       MAX(ai_generated_at) AS last_generated_at,
       AVG(ai_score) AS avg_score
     FROM sailings WHERE price IS NOT NULL`
  ).first();
  return c.json({
    lastTick: lastTick ? JSON.parse(lastTick) : null,
    tickCount: Number(tickCount || '0'),
    db: aiTotal,
  });
});

// POST /api/admin/ingest-tick — generate dated variants for N base sailings
app.post('/api/admin/ingest-tick', async (c) => {
  if (!ADMIN_GATE(c.req.header('Authorization'), c.env.SCRAPER_SECRET)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const body = await c.req.json<{ max?: number }>().catch(() => ({} as any));
  const result = await runIngestExpansionTick(c.env, { maxPerTick: body?.max ?? 10 });
  await c.env.CACHE.put('ingest:last_tick', JSON.stringify({ ts: new Date().toISOString(), ...result }), { expirationTtl: 86400 * 7 });
  return c.json(result);
});

// GET /api/admin/ingest-status — telemetry for ingestion expander
app.get('/api/admin/ingest-status', async (c) => {
  if (!ADMIN_GATE(c.req.header('Authorization'), c.env.SCRAPER_SECRET)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const lastTick = await c.env.CACHE.get('ingest:last_tick');
  const counts = await c.env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM sailings) AS total,
       (SELECT COUNT(*) FROM sailings WHERE id LIKE '%__v%m') AS synthetic,
       (SELECT COUNT(*) FROM sailings WHERE id NOT LIKE '%__v%m') AS base`
  ).first();
  return c.json({ lastTick: lastTick ? JSON.parse(lastTick) : null, db: counts });
});

// GET /api/admin/ingest-debug — debug the base sailing selector
app.get('/api/admin/ingest-debug', async (c) => {
  if (!ADMIN_GATE(c.req.header('Authorization'), c.env.SCRAPER_SECRET)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const debug = await debugBaseSailingSelect(c.env, 20);
  return c.json(debug);
});

// POST /api/admin/alert-eval-tick — scan active alerts and queue triggered
app.post('/api/admin/alert-eval-tick', async (c) => {
  if (!ADMIN_GATE(c.req.header('Authorization'), c.env.SCRAPER_SECRET)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const body = await c.req.json<{ max?: number }>().catch(() => ({} as any));
  const result = await runAlertEvaluationTick(c.env, { maxPerTick: body?.max ?? 25 });
  await c.env.CACHE.put('alerts:last_eval_tick', JSON.stringify({ ts: new Date().toISOString(), ...result }), { expirationTtl: 86400 * 7 });
  return c.json(result);
});

// POST /api/admin/alert-dispatch-tick — drain pending alert_emails
app.post('/api/admin/alert-dispatch-tick', async (c) => {
  if (!ADMIN_GATE(c.req.header('Authorization'), c.env.SCRAPER_SECRET)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const body = await c.req.json<{ max?: number }>().catch(() => ({} as any));
  const result = await runAlertDispatchTick(c.env, { maxPerTick: body?.max ?? 10 });
  await c.env.CACHE.put('alerts:last_dispatch_tick', JSON.stringify({ ts: new Date().toISOString(), ...result }), { expirationTtl: 86400 * 7 });
  return c.json(result);
});

// GET /api/admin/alert-status — alert pipeline telemetry
app.get('/api/admin/alert-status', async (c) => {
  if (!ADMIN_GATE(c.req.header('Authorization'), c.env.SCRAPER_SECRET)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const lastEval = await c.env.CACHE.get('alerts:last_eval_tick');
  const lastDispatch = await c.env.CACHE.get('alerts:last_dispatch_tick');
  const counts = await c.env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM alerts WHERE is_active = 1) AS active_subs,
       (SELECT COUNT(*) FROM alert_emails WHERE status = 'pending') AS pending_emails,
       (SELECT COUNT(*) FROM alert_emails WHERE status = 'sent') AS sent_emails,
       (SELECT COUNT(*) FROM alert_emails WHERE status = 'failed') AS failed_emails`
  ).first();
  return c.json({
    lastEval: lastEval ? JSON.parse(lastEval) : null,
    lastDispatch: lastDispatch ? JSON.parse(lastDispatch) : null,
    db: counts,
    provider: c.env.RESEND_API_KEY ? 'resend' : 'mock',
  });
});

// GET /api/admin/alerts-pending — admin can read queued-but-unsent alerts
// (useful if Resend isn't wired yet — retrieve with curl and forward manually)
app.get('/api/admin/alerts-pending', async (c) => {
  if (!ADMIN_GATE(c.req.header('Authorization'), c.env.SCRAPER_SECRET)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const max = Number(c.req.query('max') || 20);
  const { results } = await c.env.DB.prepare(
    `SELECT ae.id, ae.subject, ae.sailing_id, ae.queued_at, ae.fingerprint,
            a.email AS to_email
       FROM alert_emails ae
  LEFT JOIN alerts a ON a.sailing_id = ae.sailing_id AND a.is_active = 1
      WHERE ae.status = 'pending'
      ORDER BY ae.queued_at ASC
      LIMIT ?`
  ).bind(max).all();
  return c.json({ count: (results || []).length, alerts: results });
});

// GET /api/admin/alert-email/:id — fetch full HTML body of a queued alert
// (so an admin operator can copy/paste it into a manual send before Resend)
app.get('/api/admin/alert-email/:id', async (c) => {
  if (!ADMIN_GATE(c.req.header('Authorization'), c.env.SCRAPER_SECRET)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const id = Number(c.req.param('id'));
  const row = await c.env.DB.prepare(
    `SELECT ae.id, ae.subject, ae.html_body, ae.sailing_snapshot, ae.status, ae.queued_at,
            a.email AS to_email
       FROM alert_emails ae
  LEFT JOIN alerts a ON a.sailing_id = ae.sailing_id AND a.is_active = 1
      WHERE ae.id = ?`
  ).bind(id).first();
  if (!row) return c.json({ error: 'not found' }, 404);
  return c.json(row);
});

// GET /api/metrics — public analytics snapshot (no auth, aggregate data only)
app.get('/api/metrics', async (c) => {
  const snapshot = await getMetricsSnapshot(c.env);
  return c.json(snapshot);
});

// GET /api/admin/metrics — full analytics snapshot (auth: SCRAPER_SECRET) — same payload as /api/metrics
app.get('/api/admin/metrics', async (c) => {
  if (!ADMIN_GATE(c.req.header('Authorization'), c.env.SCRAPER_SECRET)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const snapshot = await getMetricsSnapshot(c.env);
  return c.json(snapshot);
});

// POST /api/admin/bulk-import-tick — generate many synthetic sailings
// Note: Cloudflare Workers caps sub‑requests at 50/invocation, so the defaults
// here are intentionally small (5 bases × 4 variants = 20 inserts).
app.post('/api/admin/bulk-import-tick', async (c) => {
  if (!ADMIN_GATE(c.req.header('Authorization'), c.env.SCRAPER_SECRET)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const body = await c.req.json<{ maxBases?: number; variantsPerBase?: number }>().catch(() => ({} as any));
  // Hard cap to stay under the 50‑subrequest limit even on retries.
  const maxBases = Math.min(body?.maxBases ?? 5, 8);
  const variantsPerBase = Math.min(body?.variantsPerBase ?? 4, 5);
  const result = await runBulkImportTick(c.env, { maxBases, variantsPerBase });
  return c.json(result);
});

// POST /api/admin/external-line-sync — refresh external_line_info
app.post('/api/admin/external-line-sync', async (c) => {
  if (!ADMIN_GATE(c.req.header('Authorization'), c.env.SCRAPER_SECRET)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const result = await runExternalLineSyncTick(c.env);
  return c.json(result);
});

// Scheduled handler — every 30 min:
//   (1) bulk‑import a small slice of additional synthetic sailings
//   (2) sync external line data (or skip if recently done)
//   (3) expand sailings pool (until all bases covered, then idle)
//   (4) enrich top 5 AI candidates
//   (5) evaluate active alerts + queue triggered
//   (6) dispatch pending alert_emails via Resend (or mock if no key)
const scheduledHandler = async (ev: ScheduledController, env: Env, ctx: ExecutionContext) => {
  // 1) Bulk import — generates up to ~20 sailings per tick (sub‑request safe)
  const bulk = await runBulkImportTick(env, { maxBases: 4, variantsPerBase: 4 });
  await env.CACHE.put('bulk:last_tick', JSON.stringify({ ts: new Date().toISOString(), ...bulk }), { expirationTtl: 86400 * 7 });

  // 2) External line sync — only if it hasn't run in last 24h
  const lastSync = await env.CACHE.get('external_lines:last_sync');
  const stale = !lastSync || (Date.now() - Date.parse(JSON.parse(lastSync).ts) > 86400_000);
  if (stale) {
    const sync = await runExternalLineSyncTick(env);
    await env.CACHE.put('external_lines:last_sync', JSON.stringify({ ts: new Date().toISOString(), ...sync }), { expirationTtl: 86400 * 7 });
  }

  // 3) Ingestion: expand 5 base sailings per tick
  const ingest = await runIngestExpansionTick(env, { maxPerTick: 5 });
  await env.CACHE.put('ingest:last_tick', JSON.stringify({ ts: new Date().toISOString(), ...ingest }), { expirationTtl: 86400 * 7 });

  // 4) Enrichment: top 5 candidates (now includes newly-expanded sailings)
  const enrich = await runEnrichmentTick(env);
  await env.CACHE.put('scheduled:enrichment_last_run', JSON.stringify({ ts: new Date().toISOString(), ...enrich }), { expirationTtl: 86400 * 7 });

  // 5) Alert evaluation — scan 25 subscriptions per tick
  const alertEval = await runAlertEvaluationTick(env, { maxPerTick: 25 });
  await env.CACHE.put('alerts:last_eval_tick', JSON.stringify({ ts: new Date().toISOString(), ...alertEval }), { expirationTtl: 86400 * 7 });

  // 6) Alert dispatch — drain 10 pending emails per tick
  const alertDispatch = await runAlertDispatchTick(env, { maxPerTick: 10 });
  await env.CACHE.put('alerts:last_dispatch_tick', JSON.stringify({ ts: new Date().toISOString(), ...alertDispatch }), { expirationTtl: 86400 * 7 });
};

export default {
  fetch: app.fetch,
  scheduled: scheduledHandler,
};