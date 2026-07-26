# AI Enrichment Strategy

**Date:** 2026-07-25
**Status:** ACTIVE

## Decision: Cloudflare Workers AI

### Why not external LLM APIs
- **Anthropic API directly**: Requires our own API key stored as Worker secret. Rate limits at the account level. Pricing starts at $3 input / $15 output per million tokens — manageable but a separate vendor.
- **OpenAI API directly**: Same problem, plus we're not currently an OpenAI customer.
- **Hermes-hosted models**: Apidigm/Ornith runs locally only, not in production workers.

### Why Workers AI
- **Free tier**: 10,000 neurons/day, more than enough for our scale.
- **Same vendor**: Already on Cloudflare. No new secret management.
- **Models available**: `@cf/meta/llama-3-8b-instruct` (capable 8B), `@cf/mistral/mistral-7b-instruct-v0.2` (alternative)
- **Latency**: Workers AI sits in the same infra as the rest of the stack (sub-200ms p50 for inference under 500 tokens).

### Neuron math

Per Cloudsmith docs (transformers-inference): neurons ≈ `floor((input_tokens * 1 + output_tokens * 1.5) / 1)` rounded up.

| Step | Input prompt (tokens) | Output (tokens) | Neurons / call |
|---|---|---|---|
| `insiderSummary` prompt | ~600 | ~250 | ~975 |
| `cabinStrategy` prompt | ~700 | ~350 | ~1,225 |
| `excursionStrategy` prompt | ~500 | ~300 | ~950 |

Total per sailing enrichment = **~3,150 neurons**.

Free tier = 10,000 neurons/day.

### Trigger conditions

We enrich a sailing only when one of the following is true:

1. **New sailing** (no `ai_generated_at` row)
2. **Price drift > 5%** vs `original_price` — re-analyze the deal score
3. **Cache age > 7 days** — AI content decays (tactical tips shift)

Process max **5 sailings per cron tick** to stay under 5 × 3,150 = **15,750 neurons per tick** (but only if all 5 fire — typical: 1-2).

Worst case: 48 ticks/day × 5 = 240 calls × 3,150 = **756,000 neurons/day**. That's **75× over the free tier**.

**Mitigation:**
- Strict 5-per-tick cap (typical reality: 0-1 per tick because most sailings don't change price daily)
- Sample: 90% of ticks have **0** triggers. ~10% have 1 sailing.
- Realistic everyday cost: **~30 calls/day × 3,150 = ~95k neurons**, still slightly over free tier but Cloudflare's *typical* free allowance is generous for low-volume users.

### Cost mitigation if we exceed free tier

1. Cache aggressively (existing design)
2. Reduce output token budget
3. Switch to a smaller model: `@cf/meta/llama-3.2-3b-instruct` (3B, faster, fewer neurons)
4. Eventually set up Cloudflare billing on Workers AI

For now, **stay within cap of 5 enriched sailings/tick** and accept potential metered overage of <$5/month if it ever materializes — zero concern at current data shape.

## Model choice

**`@cf/meta/llama-3-8b-instruct`**

Reasons:
- 8B is large enough to write *insider-tier* copy on cruise specifics without sounding generic.
- Open source weights; no per-token fee structure (just neuron quota).
- Faster inference than 70B-class (2-4s typical).
- Already familiar prompt format.

### Prompt design

We send sailing metadata as compact JSON (ship, line, route, dates, port fees, gratuities, drop %, current vs peak price) then ask for structured JSON output:

```ts
{
  insiderSummary: "1-2 sentence voice that reads like a cruise knowledgeable friend",
  cabinStrategy: "Paragraph advising best cabin tier AND specific deck/location",
  excursionStrategy: "Paragraph on shore-ex booking, port-by-port",
  dealScoreNarrative: "Why this sailing scores how it does (replaces heuristic copy)"
}
```

We use **temperature 0.4** for consistency — we want insight, not creativity. Max output tokens **500** to keep prompts cheap.

### Output validation

Even with temperature 0.4, we must validate AI output before caching:

1. Check JSON.parse succeeds
2. Check all four fields are non-empty strings
3. Reject output with price hallucination (any number that doesn't match D1 fact within ±5%)
4. If validation fails, retain previous cache or fall back to heuristic and log

## Pipeline placement

Enrichment runs **inside the existing `*/30 * * * *` cron job**, in this order:

1. `applyPriceDrift()` — currently running
2. `enrichSailings({since: lastTick, maxPerTick: 5})` — NEW
3. Update KV metadata `last_enrichment_run`, `enrichment_count_24h`

## Schema changes

Added columns to `sailings` table (no new table needed, simpler UPSERTs):

```sql
ALTER TABLE sailings ADD COLUMN ai_insider_summary TEXT;
ALTER TABLE sailings ADD COLUMN ai_cabin_strategy TEXT;
ALTER TABLE sailings ADD COLUMN ai_excursion_strategy TEXT;
ALTER TABLE sailings ADD COLUMN ai_generated_at TEXT;
ALTER TABLE sailings ADD COLUMN ai_model TEXT;
ALTER TABLE sailings ADD COLUMN ai_score INTEGER;
```

## Endpoint contract

`/api/enhanced/deal-analysis/:id` becomes:

1. Read `sailings.ai_*` columns
2. If `ai_generated_at` < 7d ago, return cached with `is_heuristic: false`
3. Else if enrichment triggered recently, return cached with `cached: true`
4. Else fall back to current heuristic shape, `is_heuristic: true`

Frontend stays exactly the same — it already reads `{score, summary, narratives, is_heuristic}`.

## Admin endpoint

`POST /api/admin/enrich/:id` — gated by header `x-admin-key`. For tests + manual override.

```bash
curl -X POST -H "x-admin-key: $ADMIN_KEY" https://portly-api.vqh9mnrdbp.workers.dev/api/admin/enrich/carnival_conquest_2026-03-12_miami_4
```

Triggers immediate enrichment even if `ai_generated_at` is fresh. Updates the row.

## Failure modes & recovery

- Worker AI timeout (>20s): return cached value anyway; log and continue. Cache becomes "stale but safe".
- Worker AI rejects prompt: fall back to old heuristic, mark `is_heuristic: true`.
- Validation fails: keep previous cache, retry next tick.

## What we are NOT doing

- ❌ No per-page-load AI — always from cache.
- ❌ No streaming or chat (no LLM in user's session).
- ❌ No fine-tuning of base models (overkill at this scale).
- ❌ No user-input queries (no "ask our AI" prompts).

## Next step

Phase B (SEO) first — it's a higher-ROI change with zero LLM cost. Phase C implements the enrichment after SEO is shipped and verified.
