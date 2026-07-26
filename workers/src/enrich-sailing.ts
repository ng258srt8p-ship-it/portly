/**
 * Enrichment orchestrator — pulls a sailing, calls Workers AI,
 * validates, writes the columns back. Idempotent on retries.
 */
import { buildEnrichmentPrompt, isValidEnrichmentOutput, MODEL as DEFAULT_MODEL, parseJsonFence, type CabinTier, type SailingContext } from './ai-prompts';

export interface EnrichmentEnv {
  AI: Ai;
  DB: D1Database;
  CACHE: KVNamespace;
}

export interface EnrichmentRow {
  id: string;                              // sailing slug
  ship_name: string;
  cruise_line_name: string;
  cruise_line_id: number;
  ship_class?: string;
  ship_launched_year?: number;
  destination_name?: string;
  sail_date: string;
  nights: number;
  departure_port?: string;
  departure_region?: string;
  itinerary?: string | null;             // JSON array of port names
  price: number;
  original_price: number;
  port_fees?: number;
  gratuities_per_night?: number;
  cabin_count?: number;
  history_len?: number;
  ai_generated_at?: string | null;
}

export interface CabinPriceRow {
  name: string;
  base_fare_per_person: number;
  port_tax_per_person: number;
  gratuity_per_person_per_night: number;
}

export interface LineGuideRow {
  cruise_line_name: string;
  personality: string;
  fleet_position: string;
  cabin_strategy: string;
  excursion_strategy: string;
  what_avoid: string;
  best_for: string;
  onboard_concessions: string;
  fleet_avg_age_years?: number;
}

export interface EnrichmentResult {
  id: string;
  ok: boolean;
  reason?: string;
  cached?: boolean;
  generatedAt?: string;
}

interface AiRunResponse<T = unknown> {
  response: T;
}

/** Build SailingContext from a joined DB row + optional cabin/guide rows. */
function toContext(
  r: EnrichmentRow,
  opts: { cabins?: CabinPriceRow[]; lineGuide?: LineGuideRow | null } = {}
): SailingContext {
  const current = Number(r.price) || 0;
  const original = Number(r.original_price) || current;
  const drop = original > current ? Math.round(((original - current) / original) * 100) : 0;
  const perNight = r.nights > 0 ? Math.round(current / r.nights) : current;
  const portFees = Number(r.port_fees ?? 180);
  const gratNight = Number(r.gratuities_per_night ?? 18.5);
  const realTotal = current + portFees + gratNight * r.nights;

  // Parse itinerary JSON → ports list
  let ports: string[] = [];
  try {
    const parsed = JSON.parse(r.itinerary || '[]');
    if (Array.isArray(parsed)) ports = parsed.filter((p: unknown) => typeof p === 'string');
  } catch { /* fall through */ }

  // Build cabin tiers from pricing rows
  const cabins: CabinTier[] = (opts.cabins || []).map((c) => {
    const bf = Number(c.base_fare_per_person) || 0;
    const pt = Number(c.port_tax_per_person) || 180;
    const gpr = Number(c.gratuity_per_person_per_night) || 18.5;
    const total = bf + pt + gpr * r.nights;
    const pn = r.nights > 0 ? Math.round(total / r.nights) : total;
    return { name: c.name, baseFare: bf, portTax: pt, gratuityPerNight: gpr, totalPerPerson: total, perNight: pn };
  });

  return {
    shipLine: { ship: r.ship_name, line: r.cruise_line_name },
    route: {
      region: r.departure_region || 'Caribbean',
      departure_port: r.departure_port || 'Miami',
      ports_of_call: ports.length || 3,
      destination: r.destination_name || 'Caribbean',
      ports,
    },
    dates: { sail_date: r.sail_date, nights: r.nights },
    pricing: {
      current,
      original,
      drop_pct: drop,
      per_night: perNight,
      port_fees: portFees,
      gratuities_per_night: gratNight,
      real_total: realTotal,
    },
    cabinCount: r.cabin_count ?? cabins.length ?? 4,
    cabins,
    historyPoints: r.history_len ?? 0,
    shipClass: r.ship_class,
    shipLaunchedYear: r.ship_launched_year,
    lineGuide: opts.lineGuide
      ? {
          name: opts.lineGuide.cruise_line_name,
          personality: opts.lineGuide.personality,
          fleetPosition: opts.lineGuide.fleet_position,
          cabinStrategy: opts.lineGuide.cabin_strategy,
          excursionStrategy: opts.lineGuide.excursion_strategy,
          whatAvoid: opts.lineGuide.what_avoid,
          bestFor: opts.lineGuide.best_for,
          onboardConcessions: opts.lineGuide.onboard_concessions,
          fleetAvgAgeYears: opts.lineGuide.fleet_avg_age_years ?? undefined,
        }
      : undefined,
  };
}

/** Run enrichment on a sailing. Idempotent. */
export async function enrichSailing(env: EnrichmentEnv, sailingId: string, opts?: { model?: string; force?: boolean }): Promise<EnrichmentResult> {
  const row = (await env.DB.prepare(
    `SELECT s.id, s.sail_date, s.nights, s.price, s.original_price, s.departure_port, s.departure_region,
            s.itinerary, s.cruise_line_id, s.history,
            cl.name AS cruise_line_name, sh.name AS ship_name,
            sh.year_built AS ship_launched_year,
            d.name AS destination_name, s.ai_generated_at
       FROM sailings s
       JOIN cruise_lines cl ON s.cruise_line_id = cl.id
       JOIN ships sh ON s.ship_id = sh.id
       LEFT JOIN destinations d ON s.destination_id = d.id
       WHERE s.id = ?`
  ).bind(sailingId).first()) as (EnrichmentRow & { history: string | null }) | null;

  if (!row) return { id: sailingId, ok: false, reason: 'sailing-not-found' };

  const model = opts?.model ?? DEFAULT_MODEL;

  // Skip cache if forced OR cache > 7d OR never cached
  if (!opts?.force && row.ai_generated_at) {
    const generatedAt = Date.parse(row.ai_generated_at);
    if (!Number.isNaN(generatedAt) && Date.now() - generatedAt < 7 * 24 * 3600_000) {
      return { id: sailingId, ok: true, cached: true, generatedAt: row.ai_generated_at };
    }
  }

  // Compute context then call AI
  let historyLen = 0;
  try { historyLen = JSON.parse(row.history || '[]').length; } catch { /* */ }

  // Fetch cabin tiers + line guide in parallel
  const [cabinRes, guideRow] = await Promise.all([
    env.DB.prepare(
      `SELECT cc.name, cp.base_fare_per_person, cp.port_tax_per_person, cp.gratuity_per_person_per_night
         FROM cabin_prices cp
         JOIN cabin_categories cc ON cp.cabin_category_id = cc.id
        WHERE cp.sailing_id = ?`
    ).bind(sailingId).all(),
    env.DB.prepare(
      `SELECT cruise_line_name, personality, fleet_position, cabin_strategy, excursion_strategy,
              what_avoid, best_for, onboard_concessions, fleet_avg_age_years
         FROM line_guides
        WHERE cruise_line_id = ?`
    ).bind(row.cruise_line_id).first<LineGuideRow>(),
  ]);

  const cabins = (cabinRes.results || []) as unknown as CabinPriceRow[];
  const ctx = toContext({ ...row, history_len: historyLen }, { cabins, lineGuide: guideRow });

  let parsed: Record<string, string> | null = null;
  try {
    const aiResponse = (await env.AI.run(model as any, {
      messages: [
        { role: 'system', content: 'You are TripTide\'s senior cruise analyst. Return only JSON inside a markdown fence.' },
        { role: 'user', content: buildEnrichmentPrompt(ctx) },
      ],
      max_tokens: 600,
      temperature: 0.4,
    })) as unknown as { response?: string };
    parsed = parseJsonFence(aiResponse.response || '');
  } catch (e: any) {
    return { id: sailingId, ok: false, reason: `ai-call-failed: ${e?.message || 'unknown'}` };
  }

  if (!parsed || !isValidEnrichmentOutput(parsed, ctx)) {
    return { id: sailingId, ok: false, reason: 'invalid-llm-output' };
  }

  const now = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE sailings
       SET ai_insider_summary = ?, ai_cabin_strategy = ?, ai_excursion_strategy = ?, ai_deal_score_narrative = ?,
           ai_generated_at = ?, ai_model = ?, ai_score = ?
       WHERE id = ?`
  ).bind(
    parsed.insiderSummary,
    parsed.cabinStrategy,
    parsed.excursionStrategy,
    parsed.dealScoreNarrative,
    now,
    model,
    Math.min(100, Math.max(0, 60 + (100 - ctx.pricing.drop_pct) / 4)),
    sailingId
  ).run();

  return { id: sailingId, ok: true, generatedAt: now };
}

/** Find candidates needing enrichment: new + price-drifted + stale. */
export async function findCandidatesForEnrichment(env: EnrichmentEnv, max: number = 10): Promise<string[]> {
  const out = await env.DB.prepare(
    `SELECT s.id FROM sailings s
     WHERE s.price IS NOT NULL
       AND (
         s.ai_generated_at IS NULL
         OR datetime(s.ai_generated_at) < datetime('now', '-7 days')
         OR (
           s.original_price IS NOT NULL
           AND s.price < s.original_price * 0.95
           AND (s.ai_generated_at IS NULL OR datetime(s.ai_generated_at) < datetime('now', '-12 hours'))
         )
       )
     ORDER BY s.last_updated_at DESC
     LIMIT ?`
  ).bind(max).all();
  return (out.results || []).map((r: any) => r.id);
}

/** Run a batch enrichment pass with a hard cap. */
export async function runEnrichmentTick(env: EnrichmentEnv, opts?: { maxPerTick?: number }): Promise<{ enriched: number; skipped: number; failed: number }> {
  const cap = opts?.maxPerTick ?? 5;
  const candidates = await findCandidatesForEnrichment(env, cap);

  let enriched = 0, skipped = 0, failed = 0;
  for (const id of candidates) {
    const res = await enrichSailing(env, id);
    if (res.ok && !res.cached) enriched++;
    else if (res.ok && res.cached) skipped++;
    else failed++;
  }

  // Record telemetry
  await env.CACHE.put('enrichment:last_tick', JSON.stringify({
    ts: new Date().toISOString(),
    candidates: candidates.length,
    enriched,
    skipped,
    failed,
  }), { expirationTtl: 86400 });
  await env.CACHE.put('enrichment:tick_count', String(Number((await env.CACHE.get('enrichment:tick_count')) || '0') + 1), { expirationTtl: 86400 * 7 });

  return { enriched, skipped, failed };
}
