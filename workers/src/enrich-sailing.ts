/**
 * Enrichment orchestrator — pulls a sailing, calls Workers AI,
 * validates, writes the columns back. Idempotent on retries.
 */
import { buildEnrichmentPrompt, isValidEnrichmentOutput, MODEL as DEFAULT_MODEL, parseJsonFence, type SailingContext } from './ai-prompts';

export interface EnrichmentEnv {
  AI: Ai;
  DB: D1Database;
  CACHE: KVNamespace;
}

export interface EnrichmentRow {
  id: string;                              // sailing slug
  ship_name: string;
  cruise_line_name: string;
  destination_name?: string;
  sail_date: string;
  nights: number;
  departure_port?: string;
  departure_region?: string;
  price: number;
  original_price: number;
  port_fees?: number;
  gratuities_per_night?: number;
  cabin_count?: number;
  history_len?: number;
  ai_generated_at?: string | null;
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

/** Build SailingContext from a joined DB row. */
function toContext(r: EnrichmentRow): SailingContext {
  const current = Number(r.price) || 0;
  const original = Number(r.original_price) || current;
  const drop = original > current ? Math.round(((original - current) / original) * 100) : 0;
  const perNight = r.nights > 0 ? Math.round(current / r.nights) : current;
  const portFees = Number(r.port_fees ?? 180);
  const gratNight = Number(r.gratuities_per_night ?? 18.5);
  const realTotal = current + portFees + gratNight * r.nights;

  return {
    shipLine: { ship: r.ship_name, line: r.cruise_line_name },
    route: {
      region: r.departure_region || 'Caribbean',
      departure_port: r.departure_port || 'Miami',
      ports_of_call: 3,
      destination: r.destination_name || 'Caribbean',
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
    cabinCount: r.cabin_count ?? 4,
    historyPoints: r.history_len ?? 0,
  };
}

/** Run enrichment on a sailing. Idempotent. */
export async function enrichSailing(env: EnrichmentEnv, sailingId: string, opts?: { model?: string; force?: boolean }): Promise<EnrichmentResult> {
  const row = (await env.DB.prepare(
    `SELECT s.id, s.sail_date, s.nights, s.price, s.original_price, s.departure_port, s.departure_region,
            s.history, cl.name AS cruise_line_name, sh.name AS ship_name,
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
  const ctx = toContext({ ...row, history_len: historyLen });

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
