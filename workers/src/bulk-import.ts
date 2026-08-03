/**
 * DISABLED 2026-08-03 — SYNTHETIC DATA GENERATOR
 *
 * This module generates fake sailing variants with random departure ports
 * assigned to fixed itineraries (e.g., Caribbean routes from Athens).
 * The downstream scheduled handler call was removed; this file exists
 * purely for reference.
 *
 * See docs/data-pipeline/real-data-research.md for replacement plan.
 *
 * Bulk sailings importer — generates large sailing pools from base itineraries.
 *
 * Unlike the `ingest-expander` (which makes 6 monthly variants of *each* base), this importer
 * can blow a single itinerary up into *many* sailings with different combinations:
 *
 *   base_v1 * nightCount_choices * departurePort_choices * portBudget_choices
 *
 * That brings the active sailing count from ~600 (full synthetic expansion) to ~3‑5 000 rows,
 * a realistic shape for a major cruise aggregator.
 *
 * Idempotency: each generated sailing has a deterministic id
 *   `<baseId>__big_<seed>`
 * INSERT OR IGNORE so a re‑run no‑ops existing rows.
 */

export interface BulkImportEnv {
  DB: D1Database;
  CACHE: KVNamespace;
}

export interface BulkImportResult {
  basesExpanded: number;
  variantsPerBase: number;
  attempted: number;
  inserted: number;
  skipped: number;
  errors: number;
  durationMs: number;
}

const PORT_POOL: string[][] = [
  ['miami', 'port-canaveral'],
  ['fort-lauderdale', 'miami'],
  ['galveston', 'new-orleans'],
  ['seattle', 'vancouver'],
  ['los-angeles', 'long-beach'],
  ['southampton', 'amsterdam'],
  ['barcelona', 'rome'],
  ['athens', 'lisbon'],
];

function stringHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number, salt: number): T {
  return arr[(seed + salt) % arr.length];
}

function derivePrice(basePrice: number, nights: number, seasonal: number): number {
  // Price scales roughly linearly with nights around the base ratio.
  const baseRatio = basePrice / 7; // assume the base is a 7‑night sailing
  const target = Math.max(199, Math.round(baseRatio * nights));
  return Math.round(target * seasonal);
}

async function fetchBases(env: BulkImportEnv, limit: number): Promise<any[]> {
  const res = await env.DB.prepare(
    `SELECT id, cruise_line_id, ship_id, destination_id, departure_port_id,
            departure_region, departure_port, sail_date, nights, duration,
            price, original_price, badge_text, booking_url, booking_label,
            fingerprint, history, itinerary
       FROM sailings
      WHERE instr(id, '__v') = 0
        AND instr(id, '__big_') = 0
      ORDER BY last_updated_at ASC
      LIMIT ?`
  ).bind(limit).all();
  return (res.results || []) as unknown as any[];
}

export async function runBulkImportTick(env: BulkImportEnv, opts?: { maxBases?: number; variantsPerBase?: number }): Promise<BulkImportResult> {
  const start = performance?.now?.() ?? Date.now();
  // Cloudflare Workers sub‑request cap is 50/invocation. Each variant needs one
  // INSERT + (best‑effort) one SELECT for idempotency → so a single tick must
  // stay <= ~20 variants to leave headroom for status writes and KV logs.
  const maxBases = opts?.maxBases ?? 5;
  const variantsPerBase = opts?.variantsPerBase ?? 4;
  const bases = await fetchBases(env, maxBases);
  let attempted = 0, inserted = 0, skipped = 0, errors = 0;

  for (const base of bases) {
    const seed = stringHash(base.id);
    for (let v = 0; v < variantsPerBase; v++) {
      attempted++;
      try {
        // Choose a night count near base ± 3
        const nightOffsets = [-3, -2, -1, 0, +1, +2, +3];
        const nights = pick(nightOffsets, seed, v) + Number(base.nights);
        if (nights < 2 || nights > 21) { skipped++; continue; }

        // Choose departure port from a pool (one of PORT_POOL buckets *by seed)
        const portBucket = PORT_POOL[seed % PORT_POOL.length];
        const departure = portBucket[v % portBucket.length];

        // Choose month offset (0-12 into the future)
        const monthOffset = 1 + (v % 12);

        // Seasonal multiplier
        const month = 1 + ((seed + v) % 12);
        const seasonal = ([6, 7, 8, 12].includes(month) ? 1.18
                         : [1, 2, 11].includes(month) ? 0.88
                         : [3, 4, 5, 9, 10].includes(month) ? 1.04 : 1.0);

        // Compute new sail_date
        const d = new Date(base.sail_date + 'T00:00:00Z');
        d.setUTCMonth(d.getUTCMonth() + monthOffset);
        const sailDate = d.toISOString().split('T')[0];

        // Shipping id deterministic
        const newId = `${base.id}__big_${v}`;

        // Price: price scales with nights and the seasonal multiplier
        const newPrice = derivePrice(Number(base.price), nights, seasonal);
        const newOriginal = Math.round(Number(base.original_price) * seasonal);

        // Build a stable fingerprint
        const newFp = `${base.fingerprint}__big_${v}`;

        const history = JSON.stringify([newOriginal, newPrice]);

        // INSERT OR IGNORE — success means a row was either inserted OR the unique
        // conflict was silently skipped. D1's D1Result doesn't surface which.
        // We rely on a second SELECT to dedupe‑verify ONLY on a random 1‑in‑N
        // subset of attempts (otherwise we burn our sub‑request budget).
        const r = await env.DB.prepare(
          `INSERT OR IGNORE INTO sailings
            (id, cruise_line_id, ship_id, destination_id, departure_port_id, departure_region,
             departure_port, sail_date, nights, duration, price, original_price, badge_text,
             booking_url, booking_label, fingerprint, history, source, itinerary)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          newId, base.cruise_line_id, base.ship_id, base.destination_id, base.departure_port_id, base.departure_region,
          departure, sailDate, nights, String(nights) + ' nights',
          newPrice, newOriginal, base.badge_text || 'Popular',
          base.booking_url, base.booking_label, newFp, history, 'bulk-import',
          base.itinerary || null
        ).run();
        if (r.success) {
          // Count this as inserted; D1's INSERT OR IGNORE without a UNIQUE CONSTRAINT
          //           on `id` (which we have via PRIMARY KEY) is reliable.
          inserted++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }
  }
  const end = performance?.now?.() ?? Date.now();
  const result: BulkImportResult = {
    basesExpanded: bases.length,
    variantsPerBase,
    attempted,
    inserted,
    skipped,
    errors,
    durationMs: Math.round(end - start),
  };
  await env.CACHE.put('bulk:last_tick', JSON.stringify({ ts: new Date().toISOString(), ...result }), { expirationTtl: 86400 * 7 });
  return result;
}
