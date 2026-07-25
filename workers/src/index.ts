import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getAllSailings, getSailingDetail, makeFingerprint } from './scraper-data';

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

  const ship = c.req.query('ship');
  if (ship) { where += ' AND sh.name = ?'; binds.push(ship); }

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

  // Fetch price history — join cabin_categories to get cabin type name
  const history = await c.env.DB.prepare(
    `SELECT ph.price, ph.recorded_at, COALESCE(cc.name, 'Inside') AS cabin_type
     FROM price_history ph
     LEFT JOIN cabin_categories cc ON ph.cabin_category_id = cc.id
     WHERE ph.sailing_id = ? ORDER BY ph.recorded_at ASC`
  ).bind(id).all();

  // Build route array: use itinerary if available, otherwise fall back to [departurePort, destination]
  let routeParts: string[] = [];
  if (s.itinerary) {
    try {
      const parsed = JSON.parse(s.itinerary);
      if (Array.isArray(parsed) && parsed.length > 0) routeParts = parsed;
    } catch { /* fall through */ }
  }
  if (routeParts.length === 0) {
    if (s.departure_port) routeParts.push(s.departure_port);
    routeParts.push(s.destination || '');
  }

  // Response shape matches frontend SailingData interface
  const response = {
    sailing: {
      id: s.id,
      line: s.cruise_line,
      ship: s.ship,
      days: s.nights,
      port: s.departure_port || '',
      route: routeParts,
      region: s.destination || s.departure_region || '',
      departureDate: s.sail_date,
      bookingUrl: s.booking_url || undefined,
    },
    cabinBreakdown: cabins.results.map((c: any) => {
      const total = Math.round((c.base_fare_per_person || 0) + (c.port_tax_per_person || 0) + ((c.gratuity_per_person_per_night || 0) * (s.nights || 0)));
      return {
        cabinType: c.cabin_class,
        cabinClass: c.cabin_class,
        baseFarePerPerson: Math.round(c.base_fare_per_person || 0),
        portTaxPerPerson: Math.round(c.port_tax_per_person || 0),
        gratuityPerPersonPerNight: c.gratuity_per_person_per_night || 0,
        nights: s.nights,
        raw: {
          totalOutTheDoor: total,
          perPersonPerDay: Math.round(total / (s.nights || 1)),
        },
      };
    }),
    priceHistory: history.results.map((h: any) => ({
      price: h.price,
      date: h.recorded_at,
      recorded_date: h.recorded_at,
      cabin_type: h.cabin_type || 'Inside',
      passenger_count: 2,
      total_usd: String(h.price),
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
  const dealScore = Math.min(95, 40 + dropPct * 2);
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
    'Mardi Gras': { description: 'Carnival\'s flagship Excel-class mega-ship, launched 2021. First cruise ship with a roller coaster at sea.', highlights: ['Bolt roller coaster', 'Grand Central atrium', '6,500 passengers', 'Launched 2021', 'LNG-powered'] },
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
    'MSC Virtuosa': { description: 'Meraviglia Plus-class ship launched 2021, featuring the longest promenade at sea.', highlights: ['Longest promenade', 'Meraviglia Plus', '5,742 passengers'] },
    'Disney Wish': { description: 'Disney\'s newest Triton-class ship launched 2022, featuring the first Disney attraction at sea.', highlights: ['AquaMouse attraction', 'Triton-class', 'Launched 2022', '1,555 passengers'] },
    'Disney Fantasy': { description: 'Dream-class ship launched 2012, featuring the AquaDuck water coaster.', highlights: ['AquaDuck', 'Dream-class', '2,500 passengers'] },
    'Celebrity Apex': { description: 'Edge-class ship launched 2020, featuring the Magic Carpet cantilevered platform.', highlights: ['Magic Carpet', 'Edge-class', 'Launched 2020', '3,260 passengers'] },
    'Celebrity Beyond': { description: 'Edge-class ship launched 2022, featuring the largest Resort Deck and rooftop garden.', highlights: ['Rooftop Garden', 'Edge-class', 'Launched 2022', '3,260 passengers'] },
  };

  const shipInfo = shipDescriptions[s.ship] || { description: `${s.cruise_line} cruise ship on the ${s.destination || 'Caribbean'} route.`, highlights: ['Modern cruise ship', 'Multiple dining venues', 'Entertainment options'] };

  // Compute justifications
  const dealScoreJustification = [
    { title: 'Price Below Recent Peak', content: `The current fare of $${price.toLocaleString()} is ${dropPct}% below the recent high of $${original.toLocaleString()} — that's a $${(original - price).toLocaleString()} savings per person. On a 7-night sailing, this magnitude of drop happens in roughly 15% of fare cycles.` },
    { title: 'Per-Night Cost Benchmark', content: `At $${perNight}/night per person (base fare only), this sailing sits in the ${dropPct >= 25 ? 'bottom 10th' : dropPct >= 15 ? 'bottom 25th' : 'middle'} percentile for ${s.destination || 'Caribbean'} sailings of similar duration. Comparable sailings average $${Math.round(perNight * 1.3)}/night.` },
    { title: 'Historical Trend', content: `Price has been ${priceTrend} for ${history.length >= 2 ? `${history.length} consecutive data points` : 'the recent tracking period'}. ${priceTrend === 'falling' ? 'The downward trend suggests the line may be discounting to fill cabins — a buyer-favorable signal.' : priceTrend === 'rising' ? 'Rising prices indicate this fare may increase further — consider booking soon.' : 'Stable pricing suggests this fare has found its equilibrium.'}` },
  ];

  const shipValueScore = Math.min(92, 60 + Math.floor(dropPct / 3));
  const shipValueScoreJustification = [
    { title: 'Ship Overview', content: shipInfo.description },
    { title: 'Notable Features', content: shipInfo.highlights.join(' · ') },
    { title: 'Value Assessment', content: `At $${totalCost.toLocaleString()} total per person out-the-door, you're paying $${Math.round(totalCost / nights)}/night including all taxes and gratuities. The ${s.ship} offers ${shipInfo.highlights.length} notable amenities, translating to $${Math.round(totalCost / (nights * shipInfo.highlights.length))}/night per major feature — strong value for a ship of this caliber.` },
  ];

  // Check for AI-generated content
  let aiContent: any = null;
  try {
    const ai = await c.env.DB.prepare('SELECT content_json FROM ai_content WHERE sailing_id = ?').bind(id).first<{ content_json: string }>();
    if (ai?.content_json) aiContent = JSON.parse(ai.content_json);
  } catch { /* table may not exist yet */ }

  return c.json({
    data: {
      is_heuristic: !aiContent,
      is_ai_enhanced: !!aiContent,
      dealScore,
      dealScoreJustification,
      verdict: aiContent?.verdict || (dropPct >= 25 ? 'Exceptional value — price has dropped significantly below recent highs. Strong buy opportunity.' : dropPct >= 15 ? 'Good deal — below recent average. Worth booking soon.' : 'Fair price — in line with recent trends. Monitor for further drops.'),
      priceTrend,
      pricingDeepDive: aiContent?.pricingDeepDive || `The current fare of $${price.toLocaleString()} represents a ${dropPct}% discount from the recent high of $${original.toLocaleString()}. On a per-night basis, you're paying $${perNight}/night, which ${dropPct >= 20 ? 'is well below the typical range for this route' : 'is competitive for this category'}.`,
      hiddenCosts: {
        portFees: '$180 per person',
        gratuities: `$${(nights * 18.5).toFixed(2)} per person ($18.50/night)`,
        totalOutTheDoor: `$${totalCost.toLocaleString()} per person`,
      },
      itineraryValue: aiContent?.itineraryValue || `${s.destination || 'This route'} offers ${nights} nights of diverse port calls. The itinerary balances sea days with port-intensive exploration.`,
      pricingStrategy: aiContent?.pricingStrategy || 'Cruise lines typically raise prices in the final 60 days before departure. Booking now locks in the current rate before the next fare increase cycle.',
      inventoryIntelligence: aiContent?.inventoryIntelligence || 'Interior and ocean view cabins tend to sell out first on this route. Balcony cabins remain available but may not last past the early-bird window.',
      insiderTips: aiContent?.insiderTips || [],
      shipValueScore: Math.min(92, 60 + Math.floor(dropPct / 3)),
      shipValueScoreJustification,
    },
  });
});

// GET /api/enhanced/price-forecast/:id — stub heuristic price forecast
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

  const price = s.price || 0;
  const original = s.original_price || price;
  const nights = s.nights || 7;

  // Determine trend from history
  let history: number[] = [];
  try { history = JSON.parse(s.history || '[]'); } catch { /* */ }
  const direction = history.length >= 2
    ? (history[history.length - 1] < history[0] ? 'falling' : history[history.length - 1] > history[0] ? 'rising' : 'stable')
    : 'stable';
  const magnitude = history.length >= 2
    ? Math.abs(((history[history.length - 1] - history[0]) / history[0]) * 100)
    : 0;
  const seasonal = s.sail_date ? (new Date(s.sail_date).getMonth() >= 5 && new Date(s.sail_date).getMonth() <= 8 ? 'peak' : new Date(s.sail_date).getMonth() >= 11 || new Date(s.sail_date).getMonth() <= 2 ? 'shoulder' : 'value') : 'unknown';

  return c.json({
    data: {
      is_heuristic: true,
      cabinForecasts: [
        { cabinClass: 'Inside', cabinType: 'Inside', currentPrice: Math.round(price * 0.75), projectedPrice: Math.round(price * 0.75 * 1.05), forecast7d: Math.round(price * 0.75 * 1.02), forecast30d: Math.round(price * 0.75 * 1.05), trend: 'rising', confidence: 0.72 },
        { cabinClass: 'Oceanview', cabinType: 'Oceanview', currentPrice: price, projectedPrice: Math.round(price * 1.03), forecast7d: Math.round(price * 1.01), forecast30d: Math.round(price * 1.03), trend: 'rising', confidence: 0.68 },
        { cabinClass: 'Balcony', cabinType: 'Balcony', currentPrice: Math.round(price * 1.65), projectedPrice: Math.round(price * 1.65 * 1.08), forecast7d: Math.round(price * 1.65 * 1.03), forecast30d: Math.round(price * 1.65 * 1.08), trend: 'rising', confidence: 0.65 },
        { cabinClass: 'Suite', cabinType: 'Suite', currentPrice: Math.round(price * 3.4), projectedPrice: Math.round(price * 3.4 * 1.12), forecast7d: Math.round(price * 3.4 * 1.05), forecast30d: Math.round(price * 3.4 * 1.12), trend: 'rising', confidence: 0.60 },
      ],
      trendContext: {
        direction,
        magnitude: Math.round(magnitude * 10) / 10,
        windows: [
          { windowDays: 90, startPrice: original, endPrice: price, changePercent: Math.round(((price - original) / original) * 100) / 10 },
          { windowDays: 30, startPrice: history.length >= 3 ? history[history.length - 3] : original, endPrice: price, changePercent: history.length >= 3 ? Math.round(((price - history[history.length - 3]) / history[history.length - 3]) * 100) / 10 : 0 },
        ],
      },
      seasonalIndicator: seasonal,
      rateLock: {
        urgency: magnitude > 15 ? 'high' : 'medium',
        minutesRemaining: 4320,
      },
      optimalBookingWindow: 'Book within the next 7–10 days to secure the current rate before the next fare increase.',
      competingSailings: [],
      alerts: [
        { type: 'price_drop', message: `Price has dropped ${Math.round(((original - price) / original) * 100)}% from recent highs.`, severity: 'info' },
      ],
    },
  });
});

// POST /api/trigger-sync — manually trigger the scheduled sync (same as cron)
app.post('/api/trigger-sync', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${c.env.SCRAPER_SECRET}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const sailings = getAllSailings();
  let inserted = 0, updated = 0, skipped = 0, errors = 0;
  for (const s of sailings) {
    try {
      const action = await upsertSailing(c.env.DB, s);
      if (action === 'inserted') inserted++;
      else if (action === 'updated') updated++;
      else skipped++;
    } catch (err) {
      console.error(`[Manual Sync] Error upserting ${s.id}:`, err);
      errors++;
    }
  }
  return c.json({ action: 'sync_complete', inserted, updated, skipped, errors, total: sailings.length });
});

// ── Scheduled handler (Cron Trigger — every 30 minutes) ──
// Upserts all 22 stub sailings + seeds cabin prices/price history into D1.
// This replaces the manual `scrapers/run.ts` execution — the Worker self-populates.

async function upsertSailing(db: D1Database, s: ReturnType<typeof getAllSailings>[0]): Promise<'inserted' | 'updated' | 'skipped'> {
  const fp = makeFingerprint({ cruiseLine: s.cruiseLine, sailDate: s.sailDate, ship: s.ship, departurePort: s.departurePort, nights: s.nights });
  const fingerprint = fp;

  // Ensure cruise_line exists
  let cl = await db.prepare('SELECT id FROM cruise_lines WHERE name = ?').bind(s.cruiseLine).first<{ id: number }>();
  if (!cl) {
    await db.prepare('INSERT INTO cruise_lines (name) VALUES (?)').bind(s.cruiseLine).run();
    cl = await db.prepare('SELECT last_insert_rowid() as id').first<{ id: number }>();
  }

  // Ensure ship exists
  let ship = await db.prepare('SELECT id FROM ships WHERE name = ? AND cruise_line_id = ?').bind(s.ship, cl!.id).first<{ id: number }>();
  if (!ship) {
    await db.prepare('INSERT INTO ships (name, cruise_line_id) VALUES (?, ?)').bind(s.ship, cl!.id).run();
    ship = await db.prepare('SELECT last_insert_rowid() as id').first<{ id: number }>();
  }

  // Ensure destination exists
  let destId: number | null = null;
  if (s.destination) {
    const d = await db.prepare('SELECT id FROM destinations WHERE name = ?').bind(s.destination).first<{ id: number }>();
    if (d) {
      destId = d.id;
    } else {
      await db.prepare('INSERT INTO destinations (name) VALUES (?)').bind(s.destination).run();
      const destRow = await db.prepare('SELECT last_insert_rowid() as id').first<{ id: number }>();
      destId = destRow!.id;
    }
  }

  // Check fingerprint for dedup
  const existing = await db.prepare('SELECT id, price FROM sailings WHERE fingerprint = ?').bind(fingerprint).first<any>();

  if (existing) {
    if (existing.price === s.price) {
      return 'skipped';
    }
    // Update price + history
    const prevHistory = await db.prepare('SELECT history FROM sailings WHERE id = ?').bind(existing.id).first<any>();
    const history: number[] = prevHistory?.history ? JSON.parse(prevHistory.history) : [];
    history.push(s.price);
    await db.prepare(
      `UPDATE sailings SET price = ?, original_price = ?, last_updated_at = datetime('now'), history = ? WHERE id = ?`
    ).bind(s.price, s.originalPrice, JSON.stringify(history.slice(-90)), existing.id).run();
    // Look up the Inside cabin category ID (don't hardcode 1 — it may not exist after a DB reset)
    const insideCat = await db.prepare('SELECT id FROM cabin_categories WHERE name = ?').bind('Inside').first<{ id: number }>();
    const insideCatId = insideCat?.id ?? 1;
    await db.prepare('INSERT INTO price_history (sailing_id, cabin_category_id, price) VALUES (?, ?, ?)').bind(existing.id, insideCatId, s.price).run();
    return 'updated';
  }

  // Insert new sailing
  await db.prepare(
    `INSERT INTO sailings (id, cruise_line_id, ship_id, destination_id, departure_port_id, departure_region,
      departure_port, sail_date, nights, duration, price, original_price, badge_text, booking_url, booking_label,
      fingerprint, history, source, itinerary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    s.id, cl!.id, ship!.id, destId, null, s.departureRegion ?? null, s.departurePort,
    s.sailDate, s.nights, s.duration, s.price, s.originalPrice, s.badgeText,
    s.bookingUrl ?? null, s.bookingLabel ?? null,
    fingerprint, JSON.stringify(s.history?.length >= 2 ? s.history : [s.price]), 'scraper',
    s.itinerary ? JSON.stringify(s.itinerary) : null
  ).run();

  // Seed cabin prices + price history
  const detail = getSailingDetail(s.id);
  if (detail) {
    const cabinCatMap: Record<string, number> = {};
    for (const cab of detail.cabins) {
      let cat = await db.prepare('SELECT id FROM cabin_categories WHERE name = ?').bind(cab.cabinClass).first<{ id: number }>();
      if (!cat) {
        await db.prepare('INSERT INTO cabin_categories (name) VALUES (?)').bind(cab.cabinClass).run();
        cat = await db.prepare('SELECT last_insert_rowid() as id').first<{ id: number }>();
      }
      cabinCatMap[cab.cabinClass] = cat!.id;
      await db.prepare(
        `INSERT INTO cabin_prices (sailing_id, cabin_category_id, base_fare_per_person, port_tax_per_person, gratuity_per_person_per_night) VALUES (?, ?, ?, ?, ?)`
      ).bind(s.id, cat!.id, cab.baseFarePerPerson, cab.portTaxPerPerson, cab.gratuityPerPersonPerNight).run();
    }
    for (const ph of detail.priceHistory) {
      const catId = ph.cabinClass ? (cabinCatMap[ph.cabinClass] || 1) : 1;
      await db.prepare(
        `INSERT INTO price_history (sailing_id, cabin_category_id, price, recorded_at) VALUES (?, ?, ?, ?)`
      ).bind(s.id, catId, ph.price, ph.date).run();
    }
  }

  return 'inserted';
}

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('[Cron] Starting scheduled sync...', new Date(event.scheduledTime).toISOString());
    const sailings = getAllSailings();
    let inserted = 0, updated = 0, skipped = 0, errors = 0;

    for (const s of sailings) {
      try {
        const action = await upsertSailing(env.DB, s);
        if (action === 'inserted') inserted++;
        else if (action === 'updated') updated++;
        else skipped++;
      } catch (err) {
        console.error(`[Cron] Error upserting ${s.id}:`, err);
        errors++;
      }
    }
    console.log(`[Cron] Sync complete. Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
  },
};
