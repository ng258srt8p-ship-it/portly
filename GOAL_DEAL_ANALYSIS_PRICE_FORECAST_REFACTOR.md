# Goal: Refactor Deal Analysis & Price Forecast — From Generic Scoring to Cruise Insider Intelligence

**Objective:** Transform every cruise's Deal Analysis and Price Forecast from a meaningless "score of 50" into rich, cruise-specific intelligence that reads like a seasoned booking agent sitting across the table — explaining *why* this sailing is a deal or a trap, *what* the hidden costs really are, and *when* the smart money books.

---

## The Problem (Current State)

Every cruise currently shows:
- **Deal Score: 50** — with zero justification, no criteria breakdown, no reasoning
- **Price Trend: "stable"** — stated as fact with no data backing it up
- **Pricing Deep Dive** — one line of heuristic text like `"Heuristic: PPD $150, trend stable"`
- **Insider Tips** — generic advice recycled across every cruise: *"Book 60-90 days out"*, *"Monitor price drops"*
- **Price Forecast** — single number predictions with no confidence intervals, no cabin-type differentiation

This is worse than competitors. Here's what they do right:

| Competitor | What They Show | Why It Works |
|---|---|---|
| **VacationsToGo** | Deal rating (0-100) with criteria: "Price vs. historical average", "Cabin value", "Itinerary quality" | Specificity builds trust |
| **Costals** | Price history chart + "We've tracked this price 12 times" | Data transparency |
| **CruiseCritic** | Ship-specific expert reviews + "Editor's Pick" badges | Authority and curation |
| **CruiseDirect** | Price drop alerts + "Last booked 3 days ago" urgency | Scarcity + actionability |
| **Cruise.com** | "Best time to book" by destination + seasonal pricing guides | Educational value |

**TripTide's moat should be:** Per-cruise AI intelligence that no scraper can replicate — ship-specific value scoring, hidden cost detection, itinerary cost-per-port breakdown, and sailing-specific booking windows.

---

## The Vision (Target State)

Every cruise sailing will display content that makes a visitor feel like they just got the inside track from someone who books 200+ cruises a year. Not marketing copy. Not generic advice. **Specific, data-justified intelligence.**

### Example: What a Good Deal Analysis Looks Like

> **Deal Score: 78/100 — Strong Buy**
>
> This Royal Caribbean *Icon of the Seas* 7-night Eastern Caribbean sailing from Miami is priced **12% below** its 90-day average for this exact ship and route. Royal Caribbean has been aggressively discounting Icon's inaugural-season sailings to build repeat bookings, and this pattern typically persists through Q2 2026.
>
> **The math:** At $1,489 out-the-door for a Balcony (2 guests), you're paying $213/night — compared to the Eastern Caribbean average of $240/night. But here's what most sites won't tell you: mandatory gratuities add $168 ($16/day × 7 nights), and the ship's premium Wi-Fi package runs $120 for the full voyage. Your real total: **$1,777**. Still a solid value, but factor that in.
>
> **Price trend: FALLING** (confidence: 72%). We've tracked 8 price snapshots over 23 days. The Balcony cabin dropped from $1,649 → $1,489 (−9.7%). Royal Caribbean's dynamic pricing engine tends to keep discounting this ship until at least May 2026 to fill remaining inventory. Historical pattern: prices bottom ~45 days before departure, then climb 15-20%.
>
> **Inventory signal:** Only 34 Balcony cabins remain (12% of total). When inventory drops below 15%, Royal Caribbean typically stops discounting. **Window is closing.**
>
> **Insider tip:** This ship has a "Wave" loyalty program that gives balcony guests free specialty dining on port days. Book early to secure a mid-ship Balcony (decks 8-9) — these go first and offer the best walk-out access to the main pool deck.

### Example: What a Good Price Forecast Looks Like

> **Current Assessment: Below Market**
>
> Your Balcony cabin at $1,489 is sitting **$180 below** the 30-day average for this exact sailing. Here's what each cabin type is likely to do:
>
> | Cabin | Now | 7-Day Forecast | 30-Day Forecast | Confidence |
> |---|---|---|---|---|
> | Inside | $849 | $849 (stable) | $920 (+8%) | 65% |
> | Oceanview | $1,149 | $1,149 (stable) | $1,240 (+8%) | 60% |
> | Balcony | $1,489 | $1,489 (stable) | $1,610 (+8%) | 72% |
> | Suite | $2,890 | $2,890 (stable) | $3,180 (+10%) | 55% |
>
> **Optimal booking window: Now — 45 days out.** After that, prices historically climb 8-12% as inventory tightens.
>
> **Competing sailings:** Norwegian *Norwegian Prima* departs the same week at $1,620 for a Balcony — TripTide is **$131 cheaper** on this Royal Caribbean sailing.
>
> **Alert:** If Balcony drops below $1,350, that's a flash sale threshold — book immediately.

---

## Refactoring Plan (6 Phases)

### Phase 1 — Kill the Score-of-50 Problem (Heuristic Overhaul)

**Goal:** Every cruise, even without AI, gets a meaningful, justified deal score.

- [ ] **Rewrite `heuristicDealAnalysis()`** in `server/services/analyticsOptimized.ts`
  - Score must be derived from multiple weighted factors (not just PPD)
  - Include per-cabin-type pricing context
  - Calculate real price-per-day with hidden costs factored in (gratuities, fees)
  - Compare against destination averages if available
  - Add a `justification` field that explains *why* the score is what it is
- [ ] **Rewrite `heuristicPriceForecast()`** in same file
  - Use actual price history volatility (not just days-until-departure heuristic)
  - Calculate confidence based on number of data points available
  - Generate cabin-specific forecasts even without AI
- [ ] **Add `is_heuristic: true` rendering** in frontend components
  - Visually distinguish AI-generated vs. heuristic content
  - Show "Powered by pricing data" badge instead of hiding the source

**Gates:**
- No cruise shows a bare "50" without explanation
- Heuristic output includes at least 3 data-derived justification sentences
- TypeScript compiles clean: `npx tsc --noEmit`

---

### Phase 2 — AI System Prompt Revolution (The Insider Voice)

**Goal:** Every AI-generated analysis reads like a cruise booking agent with 20 years of experience — specific, opinionated, data-backed.

- [ ] **Rewrite `ENHANCED_DEAL_SYSTEM_PROMPT`** in `server/services/enhancedAnalytics.ts`
  - Define the "TripTide Insider" persona explicitly: tone, expertise, what to reveal
  - Require per-cruise specificity — no recycled tips
  - Mandate data citations: "Based on X price snapshots over Y days..."
  - Require hidden cost disclosure (gratuities, Wi-Fi, specialty dining, excursions)
  - Require inventory analysis when data is available
- [ ] **Rewrite `ENHANCED_DEAL_USER_TEMPLATE`** in same file
  - Include ship-specific context (year built, size, amenities) when available
  - Include destination seasonality data (peak vs. value months)
  - Include cruise line pricing strategy context
  - Include actual price history (not just current price)
  - Include inventory data if available from B2B sources
- [ ] **Rewrite legacy system prompts** in `server/services/analytics.ts` and `analyticsOptimized.ts`
  - Apply same insider voice principles to old endpoints
  - Increase `max_tokens` from 1024→2048 to allow deeper analysis
  - Lower `temperature` to 0.1-0.2 for more consistent, factual output

**Gates:**
- AI output is at minimum 200 words of cruise-specific analysis (not generic)
- Every output includes at least one data citation (price point, trend %, inventory count)
- No two sailings produce identical analysis text (verified by string comparison)
- TypeScript compiles clean

---

### Phase 3 — Deep Pricing Analysis Engine

**Goal:** Go beyond "price per night" to show the real cost of the cruise and break down value by port.

- [ ] **Add cost-per-port breakdown** to the AI prompt
  - Calculate itinerary length and divide total cost by number of ports
  - Flag "at sea days" as lower-value days (no destination experience)
  - Compare cost-per-port against destination benchmarks
- [ ] **Build hidden cost calculator** (server-side, not just AI-generated)
  - Mandatory gratuities: $14-16/day × duration (varies by cruise line)
  - Wi-Fi packages: $9.99-14.99/day or bundled pricing
  - Specialty dining: $35-55/person per venue
  - Shore excursions: typical range by destination
  - Beverage packages: $59-89/day
  - Show "Real Total Cost" vs. "Listed Price" with breakdown
- [ ] **Add cabin-type value comparison**
  - Calculate price premium for each upgrade (OV→Balcony, Balcony→Suite)
  - Flag when upgrades are "overpriced" vs. "good value" based on typical pricing
  - Show which cabin type offers best value for money
- [ ] **Integrate cruise line pricing strategy decoder**
  - Royal Caribbean: dynamic pricing, frequent sales, loyalty discounts
  - Carnival: "Funtastic Forward" pricing, last-minute deals
  - Norwegian: freestyle cruising premium, suite perks
  - Explain *why* this cruise line is pricing this way right now

**Gates:**
- Hidden cost breakdown renders for every sailing
- Cabin value comparison shows upgrade premiums
- Cost-per-port metric is calculated server-side (not just AI text)
- TypeScript compiles clean

---

### Phase 4 — Price Trend Justification & Forecasting

**Goal:** Every price trend claim comes with data justification and historical context.

- [ ] **Add price trend reasoning to AI output**
  - Explain *why* prices are rising/falling/stable based on:
    - Days until departure (historical patterns)
    - Inventory levels (if available)
    - Seasonality (peak vs. off-peak)
    - Recent price velocity (how fast prices are changing)
    - Cruise line pricing patterns for this ship/route
  - Require confidence score with explanation of what drives it
- [ ] **Build price trajectory visualization context**
  - Calculate price volatility (standard deviation of snapshots)
  - Identify price inflection points (when trend changed direction)
  - Compare current trajectory to historical patterns for same route/season
- [ ] **Add competing sailing intelligence**
  - Find same-route sailings on different ships/cruise lines
  - Calculate price delta and value delta
  - Explain why one might be better despite higher price (ship quality, itinerary, cabin size)
- [ ] **Build optimal booking window engine**
  - Calculate ideal booking window based on:
    - Destination type (Caribbean vs. Alaska vs. Mediterranean)
    - Seasonality
    - Ship popularity (high-demand ships = book earlier)
    - Current inventory levels
  - Show countdown: "X days remaining in optimal window"

**Gates:**
- Every price trend includes a "Why" explanation (minimum 2 sentences)
- Confidence scores are accompanied by reasoning
- Competing sailing comparisons render for every sailing with 2+ competitors
- TypeScript compiles clean

---

### Phase 5 — Frontend Integration & Experience Polish

**Goal:** The frontend delivers the insider experience with proper visual hierarchy and loading states.

- [ ] **Wire enhanced analytics endpoints** into `NimDealAnalysis.tsx` and `NimPriceForecast.tsx`
  - Use `/api/enhanced/deal-analysis/:id` and `/api/enhanced/price-forecast/:id` as primary sources
  - Fall back to legacy endpoints when enhanced data unavailable
  - Show loading skeletons that match final layout (no CLS)
- [ ] **Add visual elements for new data types**
  - Deal score gauge with criteria breakdown (expandable)
  - Hidden cost calculator with itemized list
  - Price trajectory chart (using existing `PriceTrajectoryChart.tsx`)
  - Cabin value comparison table
  - Competing sailing cards
  - Optimal booking window indicator with countdown
- [ ] **Add "Insider Voice" styling**
  - Use conversational typography (slightly larger body, comfortable line height)
  - Add subtle visual cues for "insider tips" (distinct background, icon)
  - Highlight key numbers in accent colors
  - Add "Did you know?" callouts for surprising data points
- [ ] **Add error states and empty states**
  - When AI is rate-limited: show heuristic data with "Data-driven estimate" badge
  - When no data available: show "We're gathering pricing intelligence for this sailing" with ETA
  - When API errors: friendly message, never raw errors

**Gates:**
- All components render without layout shift
- Enhanced data takes priority over legacy data
- Error states are user-friendly (no raw API errors visible)
- Mobile responsive at 375px viewport

---

### Phase 6 — Competitive Moat Verification & E2E Testing

**Goal:** Prove that TripTide's content is genuinely unique and superior to competitor offerings.

- [ ] **Write e2e tests that verify content uniqueness**
  - Test that no two sailings produce identical deal analysis text
  - Test that every sailing has cruise-specific data (ship name, route, pricing)
  - Test that heuristic fallbacks include justification (not just "score of 50")
- [ ] **Write e2e tests that verify content depth**
  - Test that deal analysis is minimum 150 words
  - Test that price forecast includes per-cabin-type data
  - Test that hidden costs are displayed when pricing data is available
- [ ] **Write e2e tests that verify competitive differentiation**
  - Test that competing sailing comparisons render
  - Test that optimal booking window renders with destination-specific timing
  - Test that price trend includes justification text
- [ ] **Manual content audit**
  - Visit 5 random sailings and verify content reads like insider intelligence
  - Compare against competitor sites for feature parity or superiority
  - Verify no generic advice survives (e.g., "book early" without context)

**Gates:**
- All e2e tests pass
- Manual audit confirms "insider voice" quality
- No generic content in any rendered output

---

## Key Files Affected

| File | Change | Priority |
|---|---|---|
| `server/services/analyticsOptimized.ts` | Rewrite heuristic functions with justified scoring | P0 |
| `server/services/enhancedAnalytics.ts` | Rewrite system prompts for insider voice | P0 |
| `server/services/analytics.ts` | Update legacy system prompts | P1 |
| `server/routes/enhanced.ts` | Ensure endpoints serve enhanced data | P1 |
| `src/components/sailing/NimDealAnalysis.tsx` | Wire enhanced endpoints, add new visual elements | P1 |
| `src/components/sailing/NimPriceForecast.tsx` | Wire enhanced endpoints, add cabin comparison table | P1 |
| `src/components/sailing/PriceTrajectoryChart.tsx` | Enhance with volatility and trend context | P2 |
| `src/types/enhancedAnalytics.ts` | Add new types for hidden costs, competing sailings | P1 |

---

## Definition of Done

The goal is **COMPLETE** when ALL of the following are true:

### Content Quality
- [ ] No cruise shows a bare score without multi-factor justification
- [ ] Every deal analysis is minimum 200 words of cruise-specific intelligence
- [ ] Every price trend claim includes a "Why" explanation with data citations
- [ ] Hidden costs are calculated and displayed for every sailing with pricing data
- [ ] No two sailings produce identical analysis text (content is unique per cruise)

### Data Depth
- [ ] Per-cabin-type pricing and forecasts render for every sailing
- [ ] Competing sailing comparisons render when competitors exist
- [ ] Optimal booking window is destination-specific and data-driven
- [ ] Price trajectory includes volatility metrics and trend reasoning

### Technical
- [ ] `npx tsc --noEmit` = 0 errors (client)
- [ ] `cd server && npx tsc --noEmit --skipLibCheck` = 0 errors (server)
- [ ] All e2e tests pass
- [ ] No layout shift during component loading

### Competitive Moat
- [ ] Content reads like a knowledgeable booking agent, not a marketing bot
- [ ] Feature set exceeds: VacationsToGo (deal ratings), Costals (price tracking), CruiseDirect (alerts)
- [ ] Unique features no competitor has: hidden cost calculator, cabin value comparison, itinerary cost-per-port, inventory signals

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| OpenCode API rate limits (429s) | Enhanced analysis fails, falls back to heuristic | Heuristic overhaul ensures even fallback is high-quality |
| AI generates generic content despite prompts | Content quality doesn't improve | Add e2e tests that verify uniqueness; tighten prompts with examples |
| Heuristic scoring still feels arbitrary | Users don't trust the scores | Include explicit formula explanation in UI ("Score based on: price vs. history, inventory, seasonality") |
| Longer AI generation times | Sync cycle slows down | Batch with staggered delays; cache aggressively (12h TTL); incremental only new/changed |
| Frontend components break with new data shapes | Runtime errors | TypeScript strict mode catches mismatches; e2e tests catch runtime issues |

---

## Success Metrics

| Metric | Current | Target |
|---|---|---|
| Average deal analysis word count | ~50 (heuristic) | 200+ (AI) / 100+ (heuristic) |
| Sailings with score-of-50 | 100% | 0% |
| Sailings with price trend justification | 0% | 100% |
| Sailings with hidden cost breakdown | 0% | 100% (when pricing data exists) |
| Unique content per sailing | N/A (generic) | 100% unique |
| Time to generate enhanced analysis per sailing | N/A | < 8 seconds (with caching) |
