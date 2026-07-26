/**
 * AI enrichment prompts for cruise sailings.
 *
 * Each builder returns a single multi-prompt structure suitable for
 * Cloudflare Workers AI's `c.env.AI.run(model, { messages: [...] })`
 *
 * Style guide: read like a cruise insider. Specifics > generalities.
 * No emojis. ~150-250 tokens per call.
 */

export const MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8';

export interface SailingContext {
  shipLine: { ship: string; line: string };
  route: { region: string; departure_port: string; ports_of_call: number; destination: string };
  dates: { sail_date: string; nights: number };
  pricing: {
    current: number;
    original: number;
    drop_pct: number;
    per_night: number;
    port_fees: number;
    gratuities_per_night: number;
    real_total: number;
  };
  cabinCount: number;
  historyPoints: number;
}

/* ------------------------------------------------------------------ */
/*  Shared system prompt — sets tone + JSON-shape contract              */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `You are TripTide's senior cruise analyst writing copy for travellers deciding whether to book a specific sailing. Tone is confident, domain-fluent, and direct — like a friend who has worked ships and knows the lines, not a brochure. No emoji. No exclamation marks. Always return valid JSON inside the markdown code fence exactly as specified.`;

/* ------------------------------------------------------------------ */
/*  Full enrichment prompt — produces 2-3 crisp paragraphs             */
/* ------------------------------------------------------------------ */

export function buildEnrichmentPrompt(ctx: SailingContext): string {
  return `Sailing context (current data from TripTide):

${JSON.stringify(ctx, null, 2)}

Return a JSON object inside a \`\`\`json fence with these keys:

1. "insiderSummary": ONE sentence, ≤35 words, the kind of recommendation a cruise-tracker pal gives you at a bar. Reference the ship, line, or route specifically — no generic phrases like "great option".
2. "cabinStrategy": 75-120 words. Name a specific cabin Tier (Inside/Oceanview/Balcony/Suite) and a specific deck or location if relevant. Skip generic advice.
3. "excursionStrategy": 75-120 words. Shore-ex booking strategy — direct-book savings, when ship tours are still the better call, and port-specific considerations for ${ctx.route.region}.
4. "dealScoreNarrative": 2-3 sentences. Why this sailing is or isn't a buy now, anchored to the ${ctx.pricing.drop_pct}% drop from peak. No fluff.

Hard constraints:
- Every numeric claim must match the input. Do NOT invent prices or percentages.
- If a section doesn't apply to this sailing, return empty string "" — no placeholder.
- Output ONLY the JSON fence. No prose before or after.`;
}

/** Parse JSON-LL output (look for ```json fenced block first). */
export function parseJsonFence(text: string): Record<string, string> | null {
  // Look for ```json ... ```
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) {
    try { return JSON.parse(fence[1]); } catch { /* fall through */ }
  }
  // Bare JSON
  if (text.trim().startsWith('{')) {
    try { return JSON.parse(text); } catch { /* fall through */ }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Validation — keep bad hallucinations out of cache                  */
/* ------------------------------------------------------------------ */

export function isValidEnrichmentOutput(
  parsed: unknown,
  ctx: SailingContext
): parsed is Record<string, string> {
  if (!parsed || typeof parsed !== 'object') return false;
  const p = parsed as Record<string, unknown>;
  const required = ['insiderSummary', 'cabinStrategy', 'excursionStrategy', 'dealScoreNarrative'];
  for (const key of required) {
    if (typeof p[key] !== 'string') return false;
    if ((p[key] as string).length === 0) continue; // empty allowed
    if ((p[key] as string).length > 1000) return false; // way over target
  }
  // Guard against price hallucinations: any \$N,NNN token must align
  const allText = required.map(k => p[k] as string).join(' ');
  const mentionedPrices = Array.from(allText.matchAll(/\$[\d,]+/g)).map((m) => Number(m[0].replace(/[\$,]/g, '')));
  const allowedPrices = new Set([ctx.pricing.current, ctx.pricing.original, ctx.pricing.real_total, ctx.pricing.per_night, ctx.pricing.port_fees, ctx.pricing.gratuities_per_night]);
  for (const p of mentionedPrices) {
    if (allowedPrices.has(p)) continue;
    const within = [...allowedPrices].some((a) => Math.abs(a - p) <= Math.max(2, a * 0.05));
    if (!within) return false; // hallucinated price
  }
  return true;
}
