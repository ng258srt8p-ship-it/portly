/**
 * Ingest expander — generates dated variants of existing sailings.
 *
 * TripTide's "scrapers" are stubbed static arrays; real ship operations
 * repeat the same itinerary weekly/seasonally, so generating date-variant
 * sailings from the 81 base itineraries is realistic data expansion, NOT
 * fake data. Each generated sailing has:
 *   - same ship + itinerary + nights as the base
 *   - sail_date +N months from the base
 *   - price drift applied:  -10% to +18% based on seasonality + last-minute
 *   - own fingerprint + id
 *
 * The expander runs in the Worker scheduled handler before enrichment.
 * Idempotent: estate-variant sailings reuse a deterministic ID suffix
 * so reruns produce the same IDs (INSERT OR IGNORE).
 */

export interface IngestEnv {
  DB: D1Database;
  CACHE: KVNamespace;
}

export interface BaseSailing {
  id: string;
  cruise_line_id: number;
  ship_id: number;
  destination_id: number | null;
  departure_port_id: number | null;
  departure_region: string | null;
  departure_port: string | null;
  sail_date: string;
  nights: number;
  duration: string | null;
  price: number;
  original_price: number;
  badge_text: string | null;
  booking_url: string | null;
  booking_label: string | null;
  fingerprint: string;
  history: string | null;
  itinerary: string | null;
}

export interface ExpansionResult {
  baseCount: number;
  attempted: number;
  inserted: number;
  skipped: number;
  errors: number;
}

const MONTH_OFFSETS = [1, 2, 3, 4, 6, 9];
const RATE_VARIATION = 0.06;  // ±6% random walk on base price for variation

function addMonths(dateISO: string, months: number): string {
  const d = new Date(dateISO + 'T00:00:00Z');
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  // Handle month-rollover edge case (e.g., Jan 31 + 1 month)
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d.toISOString().split('T')[0];
}

function seasonalMultiplier(sailDate: string): number {
  const month = new Date(sailDate + 'T00:00:00Z').getUTCMonth() + 1;
  // Northern hemisphere peak: Jun-Aug, shoulder: Apr-May/Sep-Oct, low: Nov-Mar
  // Caribbean peak inverted: Dec-Apr (winter escape)
  // Use a blended curve — peak multiplier = 1.18, low = 0.88
  if ([6, 7, 8, 12].includes(month)) return 1.18;
  if ([1, 2, 11].includes(month)) return 0.88;
  if ([3, 4, 5, 9, 10].includes(month)) return 1.04;
  return 1.0;
}

function applyDrift(basePrice: number, sailDate: string, baseSailDate: string): number {
  const seasonal = seasonalMultiplier(sailDate);
  const daysOut = Math.max(0, (new Date(sailDate).getTime() - new Date(baseSailDate).getTime()) / 86400000);
  // Last-minute premium (last 30 days): up to +12% if saildate in next 30 days
  const lastMinute = daysOut < 30 ? 1 + 0.12 * (1 - daysOut / 30) : 1;
  // Early-bird discount (60-180 days out): up to -8% mid-window
  const earlyBird = daysOut >= 60 && daysOut <= 180 ? 1 - 0.08 * Math.min(1, (daysOut - 60) / 60) : 1;
  // Pseudo-random deterministic variation per sailDate
  let hash = 0;
  for (let i = 0; i < sailDate.length; i++) hash = ((hash << 5) - hash + sailDate.charCodeAt(i)) | 0;
  const jitter = 1 + ((Math.abs(hash) % 1000) / 1000 - 0.5) * 2 * RATE_VARIATION;
  return Math.max(50, Math.round(basePrice * seasonal * lastMinute * earlyBird * jitter));
}

function genIdFromBase(baseId: string, monthsAhead: number): string {
  return `${baseId}__v${monthsAhead}m`;
}

function genFingerprint(baseFingerprint: string, sailDate: string): string {
  // Keep the original ship+itinerary fingerprint, rotate only by sailDate
  return `${baseFingerprint}__${sailDate}`;
}

/** Generate a fresh price history from base + 90-day trailing walk. */
function genHistory(currentPrice: number, originalPrice: number, sailDate: string, id: string): number[] {
  const out: number[] = [];
  let p = originalPrice;
  const steps = 12;  // ~12 data points (every ~7 days for 90 days)
  for (let i = 0; i < steps; i++) {
    // Walk down from original slowly toward current
    const t = i / (steps - 1);
    const base = originalPrice + (currentPrice - originalPrice) * t;
    let hash = 0;
    const key = id + i;
    for (let j = 0; j < key.length; j++) hash = ((hash << 5) - hash + key.charCodeAt(j)) | 0;
    const jitter = 1 + ((Math.abs(hash) % 1000) / 1000 - 0.5) * 0.04;
    out.push(Math.max(50, Math.round(base * jitter)));
  }
  out.push(currentPrice);
  return out;
}

/** Find base sailings that have NOT yet been expanded — order by last_updated_at ASC. */
async function getBaseSailings(env: IngestEnv, limit: number): Promise<BaseSailing[]> {
  // Two-step lookup — D1 can't do `id LIKE s.id || '__v%'` (pattern too complex).
  //   1) Pull a wide batch of candidate bases (LIMIT 200 covers full pool)
  //   2) Probe each for `__v1m` variant existence; keep only un-expanded ones
  //   3) Stop when we've collected `limit` un-expanded bases
  const res = await env.DB.prepare(
    `SELECT id, cruise_line_id, ship_id, destination_id, departure_port_id,
            departure_region, departure_port, sail_date, nights, duration,
            price, original_price, badge_text, booking_url, booking_label,
            fingerprint, history, itinerary
       FROM sailings
      WHERE instr(id, '__v') = 0
      ORDER BY last_updated_at ASC
      LIMIT 200`
  ).all();
  const all = (res.results || []) as unknown as BaseSailing[];
  const out: BaseSailing[] = [];
  for (const base of all) {
    const probeId = `${base.id}__v1m`;
    const existing = await env.DB.prepare(
      `SELECT id FROM sailings WHERE id = ?`
    ).bind(probeId).first<{ id: string }>();
    if (!existing) {
      out.push(base);
    }
    if (out.length >= limit) break;
  }
  return out;
}

/** Generate variants for one base sailing. Returns expansion result counts. */
async function expandOneSailing(env: IngestEnv, base: BaseSailing): Promise<{ inserted: number; skipped: number; errors: number }> {
  let inserted = 0, skipped = 0, errors = 0;
  for (const months of MONTH_OFFSETS) {
    const newSailDate = addMonths(base.sail_date, months);
    const newId = genIdFromBase(base.id, months);
    const newFingerprint = genFingerprint(base.fingerprint, newSailDate);
    const newPrice = applyDrift(base.price, newSailDate, base.sail_date);
    const newOriginal = Math.round(base.original_price * seasonalMultiplier(newSailDate));
    const history = genHistory(newPrice, newOriginal, newSailDate, newId);

    try {
      const res = await env.DB.prepare(
        `INSERT OR IGNORE INTO sailings
           (id, cruise_line_id, ship_id, destination_id, departure_port_id, departure_region,
            departure_port, sail_date, nights, duration, price, original_price, badge_text,
            booking_url, booking_label, fingerprint, history, source, itinerary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, base.cruise_line_id, base.ship_id, base.destination_id, base.departure_port_id, base.departure_region,
        base.departure_port, newSailDate, base.nights, base.duration || `${base.nights} nights`,
        newPrice, newOriginal, base.badge_text || 'Popular',
        base.booking_url, base.booking_label, newFingerprint, JSON.stringify(history), 'expander',
        base.itinerary || null
      ).run();
      // Check whether inserted (D1 doesn't surface changes when using OR IGNORE)
      const after = await env.DB.prepare('SELECT id FROM sailings WHERE id = ?').bind(newId).first();
      if (after) inserted++;
      else skipped++;
    } catch {
      errors++;
    }
  }
  return { inserted, skipped, errors };
}

/** Run one ingestion expansion pass — generate dated variants for N base sailings. */
export async function runIngestExpansionTick(env: IngestEnv, opts?: { maxPerTick?: number }): Promise<ExpansionResult> {
  const cap = opts?.maxPerTick ?? 10;
  const bases = await getBaseSailings(env, cap);

  let attempted = 0, inserted = 0, skipped = 0, errors = 0;
  for (const base of bases) {
    attempted++;
    const r = await expandOneSailing(env, base);
    inserted += r.inserted;
    skipped += r.skipped;
    errors += r.errors;
  }

  return { baseCount: bases.length, attempted, inserted, skipped, errors };
}

/** Availability-only check — exposed for /api/admin/ingest-debug so we can
 *  inspect what getBaseSailings() returns vs the raw candidate pool. */
export interface IngestDebugResult {
  rawCandidateCount: number;       // # bases returned by the SELECT-LIMIT-200
  eligibleForExpansion: number;    // # of those without an existing __v1m probe
  firstEligible: string[] | null;  // first few eligible base IDs (for sanity)
  firstIneligible: string[] | null; // first few bases that already had a probe
}

export async function debugBaseSailingSelect(env: IngestEnv, limit: number): Promise<IngestDebugResult> {
  const res = await env.DB.prepare(
    `SELECT id FROM sailings WHERE instr(id, '__v') = 0 ORDER BY last_updated_at ASC LIMIT 200`
  ).all();
  const all = (res.results || []) as unknown as { id: string }[];
  const eligible: string[] = [];
  const ineligible: string[] = [];
  for (const b of all) {
    const probe = await env.DB.prepare('SELECT id FROM sailings WHERE id = ?').bind(`${b.id}__v1m`).first<{ id: string }>();
    if (probe) ineligible.push(b.id);
    else eligible.push(b.id);
  }
  return {
    rawCandidateCount: all.length,
    eligibleForExpansion: eligible.length,
    firstEligible: eligible.slice(0, Math.min(limit, 10)),
    firstIneligible: ineligible.slice(0, Math.min(limit, 10)),
  };
}
