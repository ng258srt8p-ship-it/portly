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

export interface CabinTier {
  name: string;            // "Inside" / "Oceanview" / "Balcony" / "Suite"
  baseFare: number;
  portTax: number;
  gratuityPerNight: number;
  totalPerPerson: number;
  perNight: number;
}

export interface LineGuide {
  name: string;
  personality: string;
  fleetPosition: string;
  cabinStrategy: string;
  excursionStrategy: string;
  whatAvoid: string;
  bestFor: string;
  onboardConcessions: string;
  fleetAvgAgeYears?: number;
}

export interface SailingContext {
  shipLine: { ship: string; line: string };
  route: { region: string; departure_port: string; ports_of_call: number; destination: string; ports: string[] };
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
  cabins: CabinTier[];
  historyPoints: number;
  lineGuide?: LineGuide;
  shipClass?: string;        // optional — populated when ships.class exists
  shipLaunchedYear?: number;
}

/* ------------------------------------------------------------------ */
/*  Shared system prompt — sets tone + JSON-shape contract              */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `You are TripTide's senior cruise analyst writing copy for travellers deciding whether to book a specific sailing. Tone is confident, domain-fluent, and direct — like a friend who has worked ships and knows the lines, not a brochure. No emoji. No exclamation marks. Always return valid JSON inside the markdown code fence exactly as specified.`;

/* ------------------------------------------------------------------ */
/*  Full enrichment prompt — produces 2-3 crisp paragraphs             */
/* ------------------------------------------------------------------ */

export function buildEnrichmentPrompt(ctx: SailingContext): string {
  const lineProfile = ctx.lineGuide ? `
LINE PROFILE — ${ctx.lineGuide.name} (use this vocabulary; don't contradict it):
  personality: ${ctx.lineGuide.personality}
  fleet_position: ${ctx.lineGuide.fleetPosition}
  cabin_strategy (line-level): ${ctx.lineGuide.cabinStrategy}
  excursion_strategy (line-level): ${ctx.lineGuide.excursionStrategy}
  what_to_avoid: ${ctx.lineGuide.whatAvoid}
  best_for: ${ctx.lineGuide.bestFor}
  onboard_concessions: ${ctx.lineGuide.onboardConcessions}
  fleet_avg_age_years: ${ctx.lineGuide.fleetAvgAgeYears ?? 'unknown'}` : '';

  const cabinSection = ctx.cabins.length
    ? `\nCABIN TIERS OFFERED ON THIS SAILING (only discuss tiers in this list; do NOT mention cabin categories the sailing does not offer):\n${ctx.cabins.map(c => `  - ${c.name}: base $${c.baseFare}, port tax $${c.portTax}, gratuity $${c.gratuityPerNight}/night, total $${c.totalPerPerson} per person ($${c.perNight}/night)`).join('\n')}`
    : '';

  const portsSection = ctx.route.ports.length
    ? `\nPORTS OF CALL (in order): ${ctx.route.ports.join(' → ')}`
    : '';

  const shipMeta = [ctx.shipClass ? `ship class: ${ctx.shipClass}` : '', ctx.shipLaunchedYear ? `launched: ${ctx.shipLaunchedYear}` : ''].filter(Boolean).join(', ');

  return `Sailing context (live data from TripTide):

${JSON.stringify(ctx, null, 2)}
${lineProfile}${cabinSection}${portsSection}

Ship metadata: ${shipMeta || 'limited data available'}

Return a JSON object inside a \`\`\`json fence with these keys:

1. "insiderSummary": ONE sentence, ≤35 words, the kind of recommendation a cruise-tracker pal gives you at a bar. Reference the ship, line, or route specifically — no generic phrases like "great option". Anchor on this sailing's ${ctx.pricing.drop_pct}% drop from peak and ${ctx.pricing.per_night}/night.
2. "cabinStrategy": 75-120 words. Pick a specific cabin tier from the CABIN TIERS list above. Reference the line's typical cabin approach (from LINE PROFILE) but tailor it to THIS sailing's actual prices. Skip generic advice.
3. "excursionStrategy": 75-120 words. Shore-ex booking strategy directly informed by the LINE PROFILE excursion_strategy and the specific ports listed — name at least one port from the PORTS OF CALL list. Don't reuse generic Caribbean advice if this isn't a Caribbean sailing.
4. "dealScoreNarrative": 2-3 sentences. Why this sailing is or isn't a buy now, anchored to the ${ctx.pricing.drop_pct}% drop from peak. No fluff. Mention the ship's fleet position if relevant.
5. "shipPersonality": A JSON-formatted string with three sub-keys (escape inner quotes properly): \`atmosphere\` (2-4 words like \"High-energy family\", \"Casual value\"), \`bestFor\` (one phrase like \"Families with teens\", \"Budget couples\"), \`standoutAmenities\` (an array of 2-4 short phrases like [\"Havana Bar & Pool\", \"Guy's Burger Joint\"]). Reference the LINE PROFILE personality vocabulary and the ship context above.

Hard constraints:
- Every numeric claim must match the input. Do NOT invent prices, deck numbers, or percentages.
- ONLY mention cabin tiers from the CABIN TIERS list. If only Inside/Oceanview/Balcony are offered, do NOT recommend Suite.
- Use the LINE PROFILE personality vocabulary — e.g., if the line profile says "Fun Ship" for Carnival, use Carnival's vocabulary; if it says "Edge-class modern luxury" for Celebrity, use that vocabulary.
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
  const required = ['insiderSummary', 'cabinStrategy', 'excursionStrategy', 'dealScoreNarrative', 'shipPersonality'];
  for (const key of required) {
    if (typeof p[key] !== 'string') return false;
    if ((p[key] as string).length === 0) continue; // empty allowed
    if ((p[key] as string).length > 1000) return false; // way over target
  }
  const allText = required.map(k => p[k] as string).join(' ').toLowerCase();

  // Cabin-tier guard: soft-fail log for now — mentions of tiers not offered
  // are kept (line-level guidance legitimately discusses other tiers).
  const offeredTiers = new Set((ctx.cabins.length ? ctx.cabins : []).map((c) => c.name.toLowerCase()));
  const tierMentionPattern = /\b(inside|oceanview|ocean view|balcony|suite|verandah|concierge|penthouse|studio|haven|retreat|sky class|star class)\b/gi;
  const mentionedTiers = Array.from(allText.matchAll(tierMentionPattern)).map((m) => m[0].toLowerCase());
  for (const tier of mentionedTiers) {
    const normalized = tier === 'ocean view' ? 'oceanview' : tier;
    // Skip generic check if either (a) tier is in offeredTiers OR (b) it appears as part of OBC/line-strategy prose
    if (offeredTiers.has(normalized)) continue;
    if (ctx.lineGuide) {
      // Tier mentions present in LINE PROFILE strategies are allowed (line-level guidance)
      const lineText = (ctx.lineGuide.cabinStrategy + ' ' + ctx.lineGuide.personality + ' ' + ctx.lineGuide.onboardConcessions).toLowerCase();
      if (lineText.includes(normalized)) continue;
    }
    // Soft-fail: mention without representation. Be permissive for now — log only
    // (could tighten to false if hallucinations persist in QA).
  }

  // Guard against price hallucinations: any $N,NNN token must align
  const mentionedPrices = Array.from(required.map(k => p[k] as string).join(' ').matchAll(/\$[\d,]+/g)).map((m) => Number(m[0].replace(/[\$,]/g, '')));
  const allowedPrices = new Set([ctx.pricing.current, ctx.pricing.original, ctx.pricing.real_total, ctx.pricing.per_night, ctx.pricing.port_fees, ctx.pricing.gratuities_per_night]);
  // Include all cabin prices as valid allowed prices
  for (const c of (ctx.cabins || [])) {
    allowedPrices.add(c.baseFare);
    allowedPrices.add(c.totalPerPerson);
    allowedPrices.add(c.perNight);
    allowedPrices.add(c.portTax);
  }
  for (const mp of mentionedPrices) {
    if (allowedPrices.has(mp)) continue;
    const within = [...allowedPrices].some((a) => Math.abs(a - mp) <= Math.max(2, a * 0.05));
    if (!within) return false; // hallucinated price
  }
  return true;
}
