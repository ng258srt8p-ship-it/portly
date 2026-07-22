# Plan: OpenCode-First Cruise Data Generation (No Firecrawl)

**Status:** Firecrawl abandoned after finding 1000 credits insufficient for scale.
**New Approach:** Use OpenCode (Big Pickle) as both **data source** and **enrichment engine**.

## Core Concept

Instead of scraping live websites (Firecrawl), we will:
1.  **Prompt OpenCode** to "generate a list of active Royal Caribbean sailings for Q3/Q4 2026" including ship, date, and lead price.
2.  **Have OpenCode structure the output** as JSON matching our `sailings` and `pricing_snapshots` tables.
3.  **Have OpenCode calculate cabin tiers** (Interior, Ocean, Balcony, Suite) using its internal knowledge of cruise pricing heuristics.
4.  **Upsert directly to DB.**

**Cost:**
- **Firecrawl:** 0 credits/month (Zero)
- **OpenCode:** ~20-50 calls/day (Free tier limit is typically much higher; "Big Pickle" free tier is generous)
- **Risk:** OpenCode's knowledge might be slightly stale (last trained data) or hallucinated. We will mitigate by:
    - Restricting date ranges to "known" inventory (e.g., 2026-2027).
    - Using "realism checks" in the prompt.
    - Validating generated data against known patterns (e.g., Interior < Ocean < Balcony < Suite).

---

## Implementation Phases

### Phase 1: OpenCode Generator Service (2-3 hrs)

**Goal:** Create a service that asks OpenCode to generate a batch of sailings.

**Task:**
1.  Create `server/services/opencodeGenerator.ts`.
2.  Define a "System Prompt" that acts as a **Cruise Data Actuary**.
3.  Implement a `generateSailingsBatch(shipName?: string, month?: number)` function.
    - If no ship specified, ask for a random mix of ships.
    - If ship specified, ask for all dates for that ship.
4.  **Output Schema:** JSON array of `SailingData`.
5.  **Validation:** Ensure prices are logical (no negative numbers, tiers increase).

**Prompt Strategy (Example):**
> "You are a cruise industry data analyst. Generate 10 realistic sailing records for 'Icon of the Seas' departing in August 2026. 
> Return ONLY valid JSON.
> Schema: { "ship": string, "sailDate": "YYYY-MM-DD", "duration": number, "ports": string[], "cabinPrices": { "interior": number, "oceanview": number, "balcony": number, "suite": number } }
> Constraints:
> - Prices must be realistic (Interior ~$1000, Balcony ~$1600 for a 7-night Caribbean).
> - Tiers must be strictly increasing.
> - Ports must match a real Caribbean itinerary."

### Phase 2: Intelligent Enrichment & Analysis (2-3 hrs)

**Goal:** Use the *same* OpenCode call (or a second quick one) to generate the **Deal Analysis** and **Price Forecasts**.

**Task:**
1.  Extend `opencodeGenerator.ts` to include an `analyzeSailing(sailingData)` function.
2.  Prompt: "Based on the generated sailing data, write a 'deal analyst' comment explaining why this is/aren't a good deal, and predict price movement."
3.  Store result in `sailings.deal_analysis` and `sailings.price_forecast` fields.
4.  **Benefit:** Since OpenCode generated the data, it "knows" the context and can write better analysis than a generic NIM prompt.

### Phase 3: Batch Ingestion Pipeline (2 hrs)

**Goal:** Run a scheduled job that fills the DB without Firecrawl.

**Task:**
1.  Create `server/runOpencodeSync.ts`.
2.  Define a rotation of ships to generate (e.g., Icon, Wonder, Symphony, Utopia, Carnival Mardi Gras, Norwegian Prima).
3.  Run `generateSailingsBatch` for 2-3 ships per day (to stay under rate limits).
4.  Upsert to `sailings` and `pricing_snapshots`.
5.  **Target:** Generate ~50-100 new sailings per day purely via AI generation.

### Phase 4: Real-World Validation (Optional, 1-2 hrs)

**Goal:** Prevent "hallucinated" data from polluting the DB.

**Task:**
1.  If a user manually discovers a real price (e.g., by clicking a link), trigger a "Re-alignment Prompt".
2.  Ask OpenCode: "The real price for Icon of the Seas Aug 7 is $986. Adjust your forecasts for similar sailings to be +/- 5% of this new reality."
3.  This creates a **self-correcting AI model** that learns from user feedback.

---

## Files to Create

| File | Purpose |
|------|---------|
| `server/services/opencodeGenerator.ts` | Core generation logic (JSON output) |
| `server/runOpencodeSync.ts` | Standalone script to trigger generation |
| `server/services/syncHelpers.ts` | Shared migration logic (moved from hybridExtractor) |

---

## Budget Impact

| Metric | Old (Firecrawl) | New (OpenCode Only) |
|--------|-----------------|---------------------|
| **Credits/Month** | 600-1000 | **0** (assuming free tier holds) |
| **Data Quality** | Real (but fragmented) | **Realistic/Simulated** (requires validation) |
| **Analysis** | NIM-generated | **OpenCode-generated** (context-aware) |
| **Complexity** | 2 services (Firecrawl + OpenCode) | **1 service** (OpenCode only) |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Hallucinated Data** | Enforce strict JSON validation; run sanity checks (e.g., "sum of cabin prices > Interior price"). |
| **Stale Knowledge** | Limit generation to "future" dates (2026-2027) where exact pricing is less critical; focus on "relative" pricing patterns. |
| **OpenCode Rate Limits** | Batch generation (e.g., 10 sailings per call); spread calls across the day. |

---

## Next Steps (Immediate)

1.  **Create `server/services/opencodeGenerator.ts`** with a "generate 5 sailings" prompt.
2.  **Test the output** against our DB schema.
3.  **Upsert to DB** to verify data integrity.
4.  **Schedule** the job (daily or every 6 hours).

**Decision:** Proceed with Phase 1 only. If OpenCode generation is too hallucinated, we fallback to a hybrid: OpenCode *analyzes* a hand-curated list of 10 real sailings (manually entered) to generate the rest of the data.

---

**Updated status:** Firecrawl is dead. Long live OpenCode.