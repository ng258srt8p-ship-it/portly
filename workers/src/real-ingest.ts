/**
 * Real-sailing admin ingest endpoint.
 *
 * POST /api/admin/ingest-real
 * Auth: Bearer <SCRAPER_SECRET>
 *
 * Accepts a verified real sailing payload and upserts it into D1.
 * Validates port/itinerary consistency and basic field constraints.
 * Returns { ok: true, id, duplicated } where duplicated=true if row already existed.
 */

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  AI: Ai;
  SCRAPER_SECRET: string;
}

export interface RealSailingPayload {
  id: string;
  cruiseLine: string;
  ship: string;
  shipCode?: string;
  destination: string;
  departurePort: string;
  departureRegion?: string;
  nights: number;
  sailDate: string; // ISO-8601 YYYY-MM-DD
  price: number;
  originalPrice: number;
  itinerary: string[]; // [departure, ...ports, return]
  bookingUrl?: string;
  bookingLabel?: string;
  source?: string;
}

export interface IngestResult {
  ok: boolean;
  id: string;
  duplicated: boolean;
  error?: string;
}

function validatePayload(body: any): RealSailingPayload | { error: string } {
  // Required string fields
  const requiredStrings = ['id', 'cruiseLine', 'ship', 'destination', 'departurePort'];
  for (const field of requiredStrings) {
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      return { error: `Missing or empty required field: ${field}` };
    }
  }

  // sailDate: ISO-8601 YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.sailDate)) {
    return { error: 'sailDate must be ISO-8601 (YYYY-MM-DD)' };
  }

  // nights: 2-21
  const nights = Number(body.nights);
  if (!Number.isInteger(nights) || nights < 2 || nights > 21) {
    return { error: 'nights must be an integer between 2 and 21' };
  }

  // prices
  const price = Number(body.price);
  const originalPrice = Number(body.originalPrice);
  if (!Number.isFinite(price) || price <= 0) {
    return { error: 'price must be a positive number' };
  }
  if (!Number.isFinite(originalPrice) || originalPrice < price) {
    return { error: 'originalPrice must be >= price' };
  }

  // itinerary: array with at least 2 entries
  if (!Array.isArray(body.itinerary) || body.itinerary.length < 2) {
    return { error: 'itinerary must be an array with at least 2 entries' };
  }

  // departurePort should match itinerary[0] (warn but accept if mismatch)
  if (body.departurePort !== body.itinerary[0]) {
    console.warn(
      `Port mismatch: departurePort=${body.departurePort} but itinerary[0]=${body.itinerary[0]}`
    );
  }

  return {
    id: body.id.trim(),
    cruiseLine: body.cruiseLine.trim(),
    ship: body.ship.trim(),
    shipCode: body.shipCode?.trim(),
    destination: body.destination.trim(),
    departurePort: body.departurePort.trim(),
    departureRegion: body.departureRegion?.trim(),
    nights,
    sailDate: body.sailDate,
    price,
    originalPrice,
    itinerary: body.itinerary,
    bookingUrl: body.bookingUrl?.trim(),
    bookingLabel: body.bookingLabel?.trim(),
    source: body.source?.trim() || 'real-scraper',
  };
}

/** Look up cruise_line_id by name, creating if missing. Returns the ID. */
async function lookupOrCreateLine(env: Env, name: string): Promise<number> {
  const existing = await env.DB.prepare('SELECT id FROM cruise_lines WHERE name = ?').bind(name).first<{ id: number }>();
  if (existing) return existing.id;
  const r = await env.DB.prepare('INSERT INTO cruise_lines (name) VALUES (?)').bind(name).run();
  return Number(r.meta?.last_row_id) || 1;
}

/** Look up ship_id by name, creating if missing. Returns the ID. */
async function lookupOrCreateShip(env: Env, name: string, lineId: number): Promise<number> {
  const existing = await env.DB.prepare('SELECT id FROM ships WHERE name = ?').bind(name).first<{ id: number }>();
  if (existing) return existing.id;
  const r = await env.DB.prepare('INSERT INTO ships (name, cruise_line_id) VALUES (?, ?)').bind(name, lineId).run();
  return Number(r.meta?.last_row_id) || 1;
}

/** Upsert a verified real sailing into D1. */
export async function ingestRealSailing(env: Env, payload: RealSailingPayload): Promise<IngestResult> {
  const validated = validatePayload(payload);
  if ('error' in validated) {
    return { ok: false, id: payload.id || '', duplicated: false, error: validated.error };
  }

  const v = validated;
  const itineraryJson = JSON.stringify(v.itinerary);
  const fingerprint = `${v.cruiseLine.toLowerCase().replace(/\s+/g, '-')}|${v.sailDate}|${v.ship.toLowerCase().replace(/\s+/g, '-')}|${v.departurePort.toLowerCase().replace(/\s+/g, '-')}|${v.nights}`;

  // Check if row already exists
  const existing = await env.DB.prepare('SELECT id FROM sailings WHERE id = ?').bind(v.id).first();
  const duplicated = !!existing;

  // Look up FK IDs (create if missing)
  const lineId = await lookupOrCreateLine(env, v.cruiseLine);
  const shipId = await lookupOrCreateShip(env, v.ship, lineId);

  // INSERT OR REPLACE
  const result = await env.DB.prepare(
    `INSERT OR REPLACE INTO sailings
     (id, cruise_line_id, ship_id, destination_id, departure_port_id,
      departure_region, sail_date, nights, duration, price, original_price,
      badge_text, booking_url, booking_label, fingerprint, history, source, itinerary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    v.id,
    lineId,
    shipId,
    null, // destination_id — nullable
    null, // departure_port_id — nullable
    v.departureRegion || null,
    v.sailDate,
    v.nights,
    `${v.nights} nights`,
    v.price,
    v.originalPrice,
    'Verified Real Data',
    v.bookingUrl || null,
    v.bookingLabel || null,
    fingerprint,
    JSON.stringify([]), // empty history — real scrapers will fill this
    v.source,
    itineraryJson
  ).run();

  if (!result.success) {
    return { ok: false, id: v.id, duplicated, error: 'D1 insert failed' };
  }

  return { ok: true, id: v.id, duplicated };
}
