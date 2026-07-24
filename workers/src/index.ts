import { Hono } from 'hono';
import { cors } from 'hono/cors';

export type Env = {
  DB: D1Database;
  CACHE: KVNamespace;
  SCRAPER_SECRET: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors());

// ── Helpers ──────────────────────────────────────────────

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
  // limit=0 means "All" — omit LIMIT clause entirely
  const limitParam = Number(c.req.query('limit') || 20);
  const limit = limitParam > 0 ? Math.min(limitParam, 500) : 0;
  const offset = Number(c.req.query('offset') || 0);
  const sort = c.req.query('sort') || 'drop-desc';

  const orderMap: Record<string, string> = {
    'price-asc': 's.price ASC',
    'price-desc': 's.price DESC',
    'nights-asc': 's.nights ASC',
    'nights-desc': 's.nights DESC',
    'date-asc': 's.sail_date ASC',
    'date-desc': 's.sail_date DESC',
    'drop-desc': 's.drop_percent DESC',
  };
  const orderBy = orderMap[sort] || 's.drop_percent DESC';

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
  if (badgeType) { where += ' AND s.badge_type IN (' + badgeType.split(',').map(() => '?').join(',') + ')'; binds.push(...badgeType.split(',')); }

  const limitClause = limit > 0 ? ' LIMIT ? OFFSET ?' : '';
  const sql = `SELECT s.*, cl.name AS cruise_line, sh.name AS ship, d.name AS destination FROM sailings s JOIN cruise_lines cl ON s.cruise_line_id = cl.id JOIN ships sh ON s.ship_id = sh.id LEFT JOIN destinations d ON s.destination_id = d.id ${where} ORDER BY ${orderBy}${limitClause}`;
  if (limit > 0) binds.push(limit, offset);

  const { results } = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json(results.map(formatSailing));
});

// GET /api/sailing/:id
app.get('/api/sailing/:id', async (c) => {
  const id = c.req.param('id');
  const sails = await c.env.DB.prepare(
    `SELECT s.*, cl.name AS cruise_line, sh.name AS ship, d.name AS destination
     FROM sailings s
     JOIN cruise_lines cl ON s.cruise_line_id = cl.id
     JOIN ships sh ON s.ship_id = sh.id
     LEFT JOIN destinations d ON s.destination_id = d.id
     WHERE s.id = ?`
  ).bind(id).all();

  if (!sails.results.length) return c.json({ error: 'Not found' }, 404);

  const s = sails.results[0] as any;

  // Fetch cabin prices
  const cabins = await c.env.DB.prepare(
    `SELECT cc.name AS cabin_class, cp.base_fare_per_person, cp.port_tax_per_person, cp.gratuity_per_person_per_night
     FROM cabin_prices cp
     JOIN cabin_categories cc ON cp.cabin_category_id = cc.id
     WHERE cp.sailing_id = ?`
  ).bind(id).all();

  // Fetch price history
  const history = await c.env.DB.prepare(
    `SELECT price, recorded_at FROM price_history WHERE sailing_id = ? ORDER BY recorded_at ASC`
  ).bind(id).all();

  // Build route array: [departurePort, ...ports if known, destination]
  const routeParts: string[] = [];
  if (s.departure_port) routeParts.push(s.departure_port);
  routeParts.push(s.destination || '');

  // Response shape matches frontend SailingData interface
  const response = {
    sailing: {
      id: s.id,
      line: s.cruise_line,
      ship: s.ship,
      days: s.nights,
      port: s.departure_port || '',
      route: routeParts,
      region: s.departure_region || s.destination || '',
      departureDate: s.sail_date,
      bookingUrl: s.booking_url || undefined,
    },
    cabinBreakdown: cabins.results.map((c: any) => ({
      cabinType: c.cabin_class,
      cabinClass: c.cabin_class,
      baseFarePerPerson: c.base_fare_per_person,
      portTaxPerPerson: c.port_tax_per_person,
      gratuityPerPersonPerNight: c.gratuity_per_person_per_night,
      nights: s.nights,
      raw: {
        totalOutTheDoor: (c.base_fare_per_person || 0) + (c.port_tax_per_person || 0) + ((c.gratuity_per_person_per_night || 0) * (s.nights || 0)),
      },
    })),
    priceHistory: history.results.map((h: any) => ({
      price: h.price,
      date: h.recorded_at,
    })),
  };

  return c.json(response);
});

// GET /api/history
app.get('/api/history', async (c) => {
  const lines = await c.env.DB.prepare(
    `SELECT cl.name AS line, COUNT(DISTINCT s.id) AS total_sailings, SUM(CASE WHEN ph.id IS NOT NULL THEN 1 ELSE 0 END) AS total_prices_tracked
     FROM cruise_lines cl
     LEFT JOIN sailings s ON s.cruise_line_id = cl.id
     LEFT JOIN price_history ph ON ph.sailing_id = s.id
     GROUP BY cl.name
     ORDER BY total_sailings DESC`
  ).all();

  return c.json({ lines: lines.results, totalPricesTracked: 0, totalSailings: 0 });
});

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
    cl = await c.env.DB.prepare('SELECT last_insert_rowid() as id').first<{ id: number }>();
  }

  // Ensure ship exists
  let ship = await c.env.DB.prepare('SELECT id FROM ships WHERE name = ? AND cruise_line_id = ?').bind(body.ship, cl!.id).first<{ id: number }>();
  if (!ship) {
    await c.env.DB.prepare('INSERT INTO ships (name, cruise_line_id) VALUES (?, ?)').bind(body.ship, cl!.id).run();
    ship = await c.env.DB.prepare('SELECT last_insert_rowid() as id').first<{ id: number }>();
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
      destId = destRow!.id;
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
    await c.env.DB.prepare(
      'INSERT INTO price_history (sailing_id, cabin_category_id, price) VALUES (?, 1, ?)'
    ).bind(existing.id, body.price).run();
    return c.json({ action: 'updated', sailingId: existing.id });
  }

  // Insert new sailing — aligned with live DB schema (departure_port text column + booking fields)
  const insertResult = await c.env.DB.prepare(
    `INSERT INTO sailings (id, cruise_line_id, ship_id, destination_id, departure_port_id, departure_region,
      departure_port, sail_date, nights, duration, price, original_price, badge_text, booking_url, booking_label,
      fingerprint, history, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.id, cl!.id, ship!.id, destId, null, departRegion,
    departPort,
    body.sailDate, body.nights, body.duration || `${body.nights} nights`,
    body.price, body.originalPrice, body.badgeText || '⭐ Popular',
    bookingUrl, bookingLabel,
    body.fingerprint, JSON.stringify([body.price]), 'scraper'
  ).run();

  return c.json({ action: 'inserted', sailingId: body.id });
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
    priceHistory?: Array<{ price: number; date?: string }>;
  }>();

  // Ensure cabin categories exist + insert cabin prices
  for (const cab of body.cabins) {
    let cat = await c.env.DB.prepare('SELECT id FROM cabin_categories WHERE name = ?').bind(cab.cabinClass).first<{ id: number }>();
    if (!cat) {
      await c.env.DB.prepare('INSERT INTO cabin_categories (name) VALUES (?)').bind(cab.cabinClass).run();
      cat = await c.env.DB.prepare('SELECT last_insert_rowid() as id').first<{ id: number }>();
    }
    await c.env.DB.prepare(
      `INSERT INTO cabin_prices (sailing_id, cabin_category_id, base_fare_per_person, port_tax_per_person, gratuity_per_person_per_night)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(id, cat!.id, cab.baseFare, cab.portTax, cab.gratuityPerNight).run();
  }

  // Insert price history if provided
  if (body.priceHistory) {
    for (const ph of body.priceHistory) {
      await c.env.DB.prepare(
        `INSERT INTO price_history (sailing_id, cabin_category_id, price, recorded_at) VALUES (?, 1, ?, ?)`
      ).bind(id, ph.price, ph.date || new Date().toISOString()).run();
    }
  }

  return c.json({ action: 'details_seeded', sailingId: id, cabins: body.cabins.length, history: body.priceHistory?.length || 0 });
});

export default app;
