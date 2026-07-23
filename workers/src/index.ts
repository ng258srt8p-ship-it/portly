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
  const limit = Math.min(Number(c.req.query('limit') || 20), 100);
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

  const sql = `SELECT s.*, cl.name AS cruise_line, sh.name AS ship, d.name AS destination FROM sailings s JOIN cruise_lines cl ON s.cruise_line_id = cl.id JOIN ships sh ON s.ship_id = sh.id LEFT JOIN destinations d ON s.destination_id = d.id ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
  binds.push(limit, offset);

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

  const sailing = sails.results[0];
  const cabins = await c.env.DB.prepare(
    `SELECT cc.name AS cabin_class, cp.base_fare_per_person, cp.port_tax_per_person, cp.gratuity_per_person_per_night
     FROM cabin_prices cp
     JOIN cabin_categories cc ON cp.cabin_category_id = cc.id
     WHERE cp.sailing_id = ?`
  ).bind(id).all();

  const itinerary = {
    id: sailing.id,
    cruiseLine: sailing.cruise_line,
    ship: sailing.ship,
    route: `${sailing.departure_port || ''} → ${sailing.destination || ''}`,
    nights: sailing.nights,
    sailDate: sailing.sail_date,
    cabins: cabins.results.map((c: any) => ({
      cabinClass: c.cabin_class,
      baseFarePerPerson: c.base_fare_per_person,
      portTaxPerPerson: c.port_tax_per_person,
      gratuityPerPersonPerNight: c.gratuity_per_person_per_night,
    })),
  };

  return c.json(formatSailing(itinerary));
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
  }>();

  // Ensure cruise_line exists
  let cl = await c.env.DB.prepare('SELECT id FROM cruise_lines WHERE name = ?').bind(body.cruiseLine).first();
  if (!cl) {
    const info = await c.env.DB.prepare('INSERT INTO cruise_lines (name) VALUES (?) RETURNING id').bind(body.cruiseLine).first();
    cl = info;
  }

  // Ensure ship exists
  let ship = await c.env.DB.prepare('SELECT id FROM ships WHERE name = ? AND cruise_line_id = ?').bind(body.ship, cl.id).first();
  if (!ship) {
    const info = await c.env.DB.prepare('INSERT INTO ships (name, cruise_line_id) VALUES (?, ?) RETURNING id').bind(body.ship, cl.id).first();
    ship = info;
  }

  // Ensure destination exists
  let destId: number | null = null;
  if (body.destination) {
    const d = await c.env.DB.prepare('SELECT id FROM destinations WHERE name = ?').bind(body.destination).first();
    if (d) {
      destId = d.id;
    } else {
      const info = await c.env.DB.prepare('INSERT INTO destinations (name) VALUES (?) RETURNING id').bind(body.destination).first();
      destId = info.id;
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

  // Insert new sailing — 13 columns matching schema (no generated columns)
  const insertResult = await c.env.DB.prepare(
    `INSERT INTO sailings (id, cruise_line_id, ship_id, destination_id, departure_port, sail_date, nights, duration,
      price, original_price, badge_text, fingerprint, history)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.id, cl.id, ship.id, destId, body.departurePort || null,
    body.sailDate, body.nights, body.duration || `${body.nights} nights`,
    body.price, body.originalPrice, body.badgeText || '⭐ Popular',
    body.fingerprint, JSON.stringify([body.price])
  ).run();

  return c.json({ action: 'inserted', sailingId: body.id });
});

export default app;
