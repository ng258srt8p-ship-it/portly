# Goal Loop: Deal Analysis & Price Forecast — Enhanced for Each Cruise

**Objective:** Fix all formatting issues and build **unique, cruise-specific** Deal Analysis and Price Forecast features that competitors cannot replicate. These must leverage OpenCode AI (mimo-v2.5-free) to generate per-cruise insider intelligence that is custom to each individual sailing — not generic market data.

**Read first:**
- `src/components/sailing/NimDealAnalysis.tsx` — Current deal analysis frontend (needs rewrite)
- `src/components/sailing/NimPriceForecast.tsx` — Current price forecast frontend (needs rewrite)
- `server/services/analytics.ts` — Legacy analytics (markdown-based, needs consolidation)
- `server/services/analyticsOptimized.ts` — Optimized analytics (JSON + heuristic fallback)
- `server/services/analyticsGenerators.ts` — Batch generators (refactor targets)
- `server/routes/analytics.ts` — API endpoints (needs new routes)
- `server/services/hybridEngineOptimized.ts` — Sync engine Phase 3 (needs enhancement)
- `e2e/` — Existing Playwright tests (extend for verification)

**Constraints:**
- No changes to public API contracts for existing endpoints
- No new npm dependencies without explicit approval
- Follow existing code patterns (TypeScript strict, Tailwind CSS design system)
- Keep sync engine running on 4-hour schedule; do not break existing cron
- All AI calls use OpenCode (opencode.ai/zen/v1, model: mimo-v2.5-free)
- Do not delete, skip, weaken, or narrow tests to make gates pass
- Every sailing must get cruise-specific (not generic) analysis

**Validate:** `npx tsc --noEmit` (client) && `cd server && npx tsc --noEmit --skipLibCheck` (server) after each phase

**Document:** Write concise, targeted documentation for all changes — create new `.md` files or update existing docs as needed.

**Checkpoints:** Work in phases (1→2→3→4→5→6), log progress briefly after each phase completion.

**Stop when:** All 6 phases verified by their gates below, OR when a phase requires human/product input (new deps, architecture decisions).

---

## Phase Gates (must pass before advancing)

### Phase 1 — Fix Formatting & Parser Robustness
- [ ] `NimDealAnalysis.tsx` parser handles all output formats (JSON objects, markdown, mixed)
- [ ] `NimPriceForecast.tsx` renders structured forecast data (not just raw markdown)
- [ ] Both components handle heuristic fallback output (`is_heuristic: true`) correctly
- [ ] No TypeScript errors: `npx tsc --noEmit` returns 0 errors
- [ ] Loading skeletons match final rendered component dimensions (no layout shift)
- [ ] Error states show actionable messages (not raw API errors)

**Playwright Verification:**
```typescript
// e2e/deal-analysis-format.spec.ts
test('Deal Analysis renders all section types without layout shift', async ({ page }) => {
  // Navigate to a sailing with deal analysis data
  const sailingId = await getFirstSailingWithAnalysis(page);
  await page.goto(`/sailing/${sailingId}`);
  
  // Wait for deal analysis to load
  await page.waitForSelector('[data-testid="deal-analysis"]', { timeout: 15000 });
  
  // Verify no layout shift: measure container before/after load
  const handle = await page.$('[data-testid="deal-analysis"]');
  const boxBefore = await handle!.boundingBox();
  await page.waitForSelector('[data-testid="deal-score-badge"]', { timeout: 10000 });
  const boxAfter = await handle!.boundingBox();
  
  expect(Math.abs(boxBefore.width - boxAfter.width)).toBeLessThan(2); // < 2px shift
  
  // Verify all section elements render
  await expect(page.locator('[data-testid="deal-score-badge"]')).toBeVisible();
  await expect(page.locator('[data-testid="pricing-deep-dive"]')).toBeVisible();
  await expect(page.locator('[data-testid="price-trend"]')).toBeVisible();
  await expect(page.locator('[data-testid="insider-tips"]')).toBeVisible();
  await expect(page.locator('[data-testid="verdict"]')).toBeVisible();
});

test('Price Forecast renders structured forecast cards', async ({ page }) => {
  const sailingId = await getFirstSailingWithForecast(page);
  await page.goto(`/sailing/${sailingId}`);
  
  await page.waitForSelector('[data-testid="price-forecast"]', { timeout: 15000 });
  await expect(page.locator('[data-testid="current-price-assessment"]')).toBeVisible();
  await expect(page.locator('[data-testid="short-term-forecast"]')).toBeVisible();
  await expect(page.locator('[data-testid="medium-term-forecast"]')).toBeVisible();
  await expect(page.locator('[data-testid="buy-wait-recommendation"]')).toBeVisible();
  await expect(page.locator('[data-testid="confidence-meter"]')).toBeVisible();
});

test('Heuristic fallback renders correctly when AI is rate-limited', async ({ page }) => {
  // Force heuristic path by mocking API to return is_heuristic data
  await page.route('**/api/analytics/deal-analysis/*', async route => {
    const sailingId = route.request().url().split('/').pop();
    const heuristicData = JSON.stringify({
      dealScore: 62,
      pricingDeepDive: "Heuristic: PPD $145, trend stable (0.3%). Inside: $1020 total",
      priceTrend: "stable",
      shipExperience: "AI analysis unavailable — based on fleet averages for this class",
      insiderTips: ["Book 60-90 days out for best cabin selection", "Monitor price drops 30-45 days before departure"],
      verdict: "Good deal — consider booking",
      is_heuristic: true
    });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: heuristicData }) });
  });

  const sailingId = await getFirstSailingWithAnalysis(page);
  await page.goto(`/sailing/${sailingId}`);
  
  await page.waitForSelector('[data-testid="deal-analysis"]', { timeout: 15000 });
  await expect(page.locator('[data-testid="heuristic-badge"]')).toBeVisible();
  // Verify the component gracefully handles heuristic data format
  await expect(page.locator('[data-testid="deal-score-badge"]')).toBeVisible();
});

test('Error states show actionable messages, not raw API errors', async ({ page }) => {
  await page.route('**/api/analytics/deal-analysis/*', route => 
    route.fulfill({ status: 500, body: JSON.stringify({ success: false, error: 'ECONNREFUSED' }) }));
  
  const sailingId = await getFirstSailingWithAnalysis(page);
  await page.goto(`/sailing/${sailingId}`);
  
  await page.waitForSelector('[data-testid="deal-analysis-error"]', { timeout: 10000 });
  const errorText = await page.locator('[data-testid="deal-analysis-error"]').textContent();
  expect(errorText).not.toContain('ECONNREFUSED'); // No raw error codes shown
  expect(errorText).toMatch(/unavailable|error|try again/i); // User-friendly message
});
```

---

### Phase 2 — Build Unique, Cruise-Specific Deal Analysis (Competitive Moat)
**This is where TripTide beats every competitor.** Generic deal scores exist everywhere. What we build here is **insider intelligence specific to each individual cruise sailing** — data no competitor has access to.

- [ ] **Per-Cruise Inventory Intelligence**: Analyze which cabin categories on THIS specific sailing are selling fast vs. sitting. Compare current availability patterns to historical benchmarks for the same ship/route combo.
  - Output: "Balcony cabins on this Royal Caribbean sailing have sold 40% faster than the 90-day average for Icon of the Seas Caribbean routes"
  
- [ ] **Cruise Line Pricing Strategy Decoder**: For each sailing, determine the cruise line's current pricing strategy (aggressive discounting, premium positioning, last-minute clearance) based on their published price vs. historical patterns for that specific ship.
  - Output: "Carnival is using an aggressive discount strategy on this sailing — 23% below their 6-month average for the same route. This is likely a load-building promotion, not a permanent price cut."

- [ ] **Ship-Specific Value Scoring**: Go beyond "is this cheap?" to answer "is THIS SHIP worth THIS price?" based on the ship's actual amenities, dining quality indicators, entertainment offerings, and cabin sizes vs. what you're paying per day.
  - Output: "At $189/ppd, this ship delivers 2.3x the amenity score per dollar compared to the fleet average for similar-duration Caribbean sailings."

- [ ] **Itinerary Value Breakdown**: Calculate the actual cost-per-port, identify overpriced vs. underpriced port calls, and flag ports where the cruise line is nickel-and-diming (extra fees for excursions, specialty dining requirements).
  - Output: "Your $1,200 fare covers 4 ports at $300/port average. Port Canaveral has no shore excursion fees, but Cozumel charges $45/person for the pier access — budget accordingly."

- [ ] **Booking Site Hidden Cost Detector**: Compare the listed price against what you actually pay (drinks, Wi-Fi, gratuities, specialty dining, room service fees) and surface the "real" total cost.
  - Output: "Listed at $899, the real total cost with mandatory gratuities (+$14.50/day), basic Wi-Fi ($12/day), and resort fees ($25/sailing) is $1,147. Compare this to the all-inclusive equivalent at $1,089."

- [ ] **Sailing-Specific Insider Tips** (3-5 per sailing): Generate tips that are ONLY relevant to this specific cruise — crew changes, seasonal events on board, menu rotations, deck-level noise warnings for THIS ship's layout.
  - Output: "This sailing departs during crew change week — expect some delays in cabin readiness. Request Deck 5 forward (away from the late-night arcade on Deck 14) for quiet. The ship installs a new ice skating rink on this rotation."

**API Enhancement:**
```typescript
// server/routes/enhancedAnalytics.ts (NEW)
GET  /api/enhanced/deal-analysis/:sailingId
  → Returns structured JSON with all 6 insight dimensions

POST /api/enhanced/regenerate-deal-analysis/:sailingId
  → Force-refresh AI analysis for a single sailing (admin)

GET  /api/enhanced/batch-analyze?cruiseLine=Carnival&limit=20
  → Batch regenerate for a cruise line (admin)
```

**Playwright Verification:**
```typescript
test('Enhanced deal analysis renders all 6 insight dimensions', async ({ page }) => {
  const sailingId = await getFirstSailingWithFullAnalysis(page);
  await page.goto(`/sailing/${sailingId}`);
  
  await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 15000 });
  
  // Verify all unique dimensions render
  await expect(page.locator('[data-testid="inventory-intelligence"]')).toBeVisible();
  await expect(page.locator('[data-testid="pricing-strategy-decoder"]')).toBeVisible();
  await expect(page.locator('[data-testid="ship-value-scoring"]')).toBeVisible();
  await expect(page.locator('[data-testid="itinerary-value-breakdown"]')).toBeVisible();
  await expect(page.locator('[data-testid="hidden-cost-detector"]')).toBeVisible();
  await expect(page.locator('[data-testid="sailing-specific-tips"]')).toBeVisible();
  
  // Verify content is cruise-specific (not generic)
  const inventoryText = await page.locator('[data-testid="inventory-intelligence"]').textContent();
  expect(inventoryText).toMatch(/sold|available|faster|slower|inventory/i);
  
  const pricingStrategy = await page.locator('[data-testid="pricing-strategy-decoder"]').textContent();
  expect(pricingStrategy).toMatch(/strategy|discount|premium|clearance/i);
});

test('Deal analysis content is specific to the individual sailing, not generic', async ({ page }) => {
  const sailingId = await getFirstSailingWithFullAnalysis(page);
  await page.goto(`/sailing/${sailingId}`);
  
  const analysisText = await page.locator('[data-testid="enhanced-deal-analysis"]').textContent();
  
  // Should mention the specific cruise line and ship
  expect(analysisText).toMatch(/Royal Caribbean|Carnival|Norwegian|Princess|MSC/i);
  // Should mention the specific ship name
  expect(analysisText).toMatch(/Icon of the Seas|Symphony|Norwegian Encore|Enchanted Princess/i);
  // Should NOT contain only generic advice
  const genericPhrases = ['book early', 'check multiple sites', 'be flexible with dates'];
  const genericCount = genericPhrases.filter(p => analysisText.toLowerCase().includes(p)).length;
  expect(genericCount).toBeLessThan(1); // At most one generic phrase is OK as a fallback
});

test('Hidden cost detector shows real total vs. listed price', async ({ page }) => {
  const sailingId = await getFirstSailingWithFullAnalysis(page);
  await page.goto(`/sailing/${sailingId}`);
  
  const hiddenCost = await page.locator('[data-testid="hidden-cost-detector"]').textContent();
  expect(hiddenCost).toMatch(/\$[0-9,]+/); // Shows dollar amounts
  expect(hiddenCost).toMatch(/total|real|actual|including/i); // Explains what's included
});
```

---

### Phase 3 — Build Unique, Cruise-Specific Price Forecast (Competitive Moat)
**No competitor shows per-cruise price trajectory.** They show "Caribbean prices are rising." We show: "Balcony cabins on THIS specific Royal Caribbean sailing from Miami on March 15 are predicted to increase $87 in the next 7 days and $214 in 30 days, with 73% confidence."

- [ ] **Per-Cabin-Type Forecast**: Instead of one forecast, generate separate forecasts for Inside, Oceanview, Balcony, and Suite — because each cabin type has different demand curves.
  - Output: "Balcony cabins on this sailing are predicted to rise $87 (7d) / $214 (30d). Inside cabins are predicted to DROP $32 in 7 days as last-minute inventory builds."

- [ ] **Confidence Scoring by Time Horizon**: Provide confidence intervals, not single numbers. "We're 73% confident the balcony cabin will be between $1,100–$1,280 in 7 days."

- [ ] **Optimal Booking Window for THIS Sailing**: Calculate the exact optimal booking window based on this specific sailing's route, season, ship popularity, and historical data.
  - Output: "For this specific sailing (Royal Caribbean Icon of the Seas, 7-night Eastern Caribbean, March 15 departure), the optimal booking window is 4-6 months before departure. Booking now ($949 balcony) vs. waiting risks +$180-340."

- [ ] **Price Drop Alert Triggers**: Set dynamic alert thresholds per sailing. "If this sailing's balcony cabin drops below $820, you'll get an instant alert — that's 14% below our forecasted floor."

- [ ] **Competing Sailing Comparison**: For the same route and dates, find competing sailings and show relative value. "This $1,050 balcony on Icon of the Seas is $180 cheaper than the same dates on Symphony of the Seas (same week, same route)."

- [ ] **Visual Price Trajectory Chart**: Render an interactive chart showing current price, 7-day forecast, 30-day forecast, and confidence bands for each cabin type.

**API Enhancement:**
```typescript
// server/routes/enhancedAnalytics.ts (NEW)
GET  /api/enhanced/price-forecast/:sailingId
  → Returns structured JSON: { cabinForecasts: [...], optimalWindow, competingSailings: [...] }

POST /api/enhanced/regenerate-forecast/:sailingId
  → Force-refresh AI forecast for a single sailing

GET  /api/enhanced/price-alerts/:sailingId
  → Returns active alerts and threshold settings for a sailing
```

**Playwright Verification:**
```typescript
test('Price forecast renders per-cabin-type forecasts with confidence bands', async ({ page }) => {
  const sailingId = await getFirstSailingWithForecast(page);
  await page.goto(`/sailing/${sailingId}`);
  
  await page.waitForSelector('[data-testid="enhanced-price-forecast"]', { timeout: 15000 });
  
  // Verify all cabin types have forecasts
  await expect(page.locator('[data-testid="cabin-forecast-inside"]')).toBeVisible();
  await expect(page.locator('[data-testid="cabin-forecast-oceanview"]')).toBeVisible();
  await expect(page.locator('[data-testid="cabin-forecast-balcony"]')).toBeVisible();
  await expect(page.locator('[data-testid="cabin-forecast-suite"]')).toBeVisible();
  
  // Verify confidence intervals render (not just single numbers)
  const balconyForecast = await page.locator('[data-testid="cabin-forecast-balcony"]').textContent();
  expect(balconyForecast).toMatch(/\d+% confidence|range|\$[0-9,]+–\$[0-9,]+/i);
});

test('Price forecast shows competing sailing comparisons', async ({ page }) => {
  const sailingId = await getFirstSailingWithForecast(page);
  await page.goto(`/sailing/${sailingId}`);
  
  const competing = await page.locator('[data-testid="competing-sailing-comparison"]').textContent();
  expect(competing).toMatch(/Royal Caribbean|Carnival|Norwegian|Princess/i);
  expect(competing).toMatch(/\$[0-9,]+ cheaper|more expensive|same week/i);
});

test('Optimal booking window is specific to this sailing', async ({ page }) => {
  const sailingId = await getFirstSailingWithForecast(page);
  await page.goto(`/sailing/${sailingId}`);
  
  const window = await page.locator('[data-testid="optimal-booking-window"]').textContent();
  expect(window).toMatch(/\d+-\d+ months|weeks? before/i);
  // Should mention the specific sailing, not generic advice
  expect(window).toMatch(/Royal Caribbean|Carnival|Norwegian|Princess|MSC|this sail/i);
});

test('Price trajectory chart renders for all cabin types', async ({ page }) => {
  const sailingId = await getFirstSailingWithForecast(page);
  await page.goto(`/sailing/${sailingId}`);
  
  // Verify chart canvas or SVG renders
  const chart = await page.$('[data-testid="price-trajectory-chart"]');
  expect(chart).not.toBeNull();
  
  // Verify all cabin types appear in the chart legend
  await expect(page.locator('[data-testid="chart-legend-inside"]')).toBeVisible();
  await expect(page.locator('[data-testid="chart-legend-balcony"]')).toBeVisible();
});

test('Price drop alert triggers show correct thresholds', async ({ page }) => {
  const sailingId = await getFirstSailingWithForecast(page);
  await page.goto(`/sailing/${sailingId}`);
  
  const alerts = await page.locator('[data-testid="price-alert-triggers"]').all();
  expect(alerts.length).toBeGreaterThan(0);
  
  const alertText = await page.locator('[data-testid="price-alert-triggers"]').first().textContent();
  expect(alertText).toMatch(/below|drop|alert|threshold/i);
});
```

---

### Phase 4 — Format Fix: Consistent Output Across All Code Paths
- [ ] **Unified JSON output schema** for deal analysis (replaces markdown parsing):
  ```typescript
  interface DealAnalysisOutput {
    dealScore: number;           // 0-100
    pricingDeepDive: string;     // Human-readable pricing analysis
    priceTrend: 'rising' | 'falling' | 'stable';
    inventoryIntelligence: string; // NEW: cabin availability insights
    pricingStrategy: string;     // NEW: cruise line strategy assessment
    shipValueScore: number;      // NEW: ship-specific value (0-100)
    itineraryValue: string;      // NEW: cost-per-port breakdown
    hiddenCosts: {
      mandatoryGratuities: number;
      wifiCost: number;
      resortFees: number;
      realTotalCost: number;
    };
    insiderTips: string[];       // 3-5 sailing-specific tips
    verdict: string;
    is_heuristic: boolean;       // true = deterministic fallback
  }
  ```

- [ ] **Unified JSON output schema** for price forecast:
  ```typescript
  interface PriceForecastOutput {
    cabinForecasts: {
      Inside: { currentPrice: number; forecast7d: number; forecast30d: number; confidence: number; trend: string };
      Oceanview: { ... };
      Balcony: { ... };
      Suite: { ... };
    };
    optimalBookingWindow: string;  // e.g., "4-6 months before departure"
    competingSailings: Array<{
      cruiseLine: string;
      shipName: string;
      departureDate: string;
      balconyPrice: number;
      priceDifference: number;     // positive = more expensive
    }>;
    alerts: Array<{
      cabinType: string;
      triggerPrice: number;
      currentPrice: number;
      savings: number;
    }>;
    is_heuristic: boolean;
  }
  ```

- [ ] **Server routes return structured JSON** (not markdown strings) for all new endpoints
- [ ] **Frontend components parse structured JSON** (no brittle regex on markdown)
- [ ] **Heuristic fallback outputs match new schemas exactly** (no `is_heuristic` field surprises)
- [ ] **TypeScript strict mode passes** for all new types across server + client

---

### Phase 5 — Sync Engine Integration (Auto-Generate Per-Cruise Intelligence)
- [ ] Enhance `hybridEngineOptimized.ts` Phase 3 to call new **enhanced** deal analysis and forecast functions
- [ ] Add **cruise-line-specific prompt templates** to OpenCode that include:
  - Current inventory data for THIS sailing (which cabins are selling)
  - Historical pricing for THIS ship on THIS route
  - Competing sailings on the same route/dates
  - Ship-specific amenity data (from `ship_details` table)
  - Destination-specific pricing (from `destination_insights`)
- [ ] **Batch processing with rate-limit awareness**: Spread per-cruise analysis calls across the sync window to avoid 429 errors
- [ ] **Cache strategy**: Cache enhanced analyses for 12 hours (vs. current 1 hour) since per-cruise insights change slowly
- [ ] **Admin API**: `POST /api/enhanced/regenerate-all` to force-refresh all sailings (with rate-limit controls)

**Playwright Verification:**
```typescript
test('Sync engine populates enhanced analysis for new sailings', async ({ page }) => {
  // Trigger a sync cycle (or wait for next scheduled run)
  await page.goto('/api/admin/trigger-sync');
  // Verify sync completes successfully
  // Then check that new sailings have enhanced data
  const result = await page.evaluate(async () => {
    const res = await fetch('/api/enhancement/stats');
    return res.json();
  });
  
  expect(result.success).toBe(true);
  expect(result.data.enhancedDealAnalyses).toBeGreaterThan(0);
  expect(result.data.enhancedPriceForecasts).toBeGreaterThan(0);
});

test('Admin regenerate endpoint works with rate limiting', async ({ page }) => {
  // Trigger batch regeneration for a subset
  await page.evaluate(async () => {
    const res = await fetch('/api/enhanced/regenerate-all?cruiseLine=Carnival&limit=5', { method: 'POST' });
    return res.json();
  });
  
  // Verify it completes without 429 errors
  // Check that sailings were processed (check DB or stats endpoint)
});
```

---

### Phase 6 — Playwright End-to-End Verification Suite
Create a comprehensive Playwright test suite that verifies the **entire goal-loop** is complete:

- [ ] `e2e/enhanced-deal-analysis.spec.ts` — Verifies deal analysis rendering, formatting, and cruise-specificity
- [ ] `e2e/enhanced-price-forecast.spec.ts` — Verifies price forecast rendering, per-cabin forecasts, and chart
- [ ] `e2e/competitive-moat.spec.ts` — Verifies unique features that competitors don't have:
  - Per-cruise inventory intelligence renders
  - Cruise line pricing strategy decoder renders
  - Ship-specific value scoring renders
  - Itinerary value breakdown renders
  - Hidden cost detector renders
  - Sailing-specific tips render (not generic advice)
  - Per-cabin-type price forecasts render
  - Competing sailing comparisons render
  - Optimal booking window is cruise-specific
  - Price trajectory chart renders with all cabin types
- [ ] `e2e/format-consistency.spec.ts` — Verifies formatting consistency:
  - No layout shifts during loading
  - Error states are user-friendly (no raw API errors)
  - Heuristic fallback renders correctly
  - All sections have consistent styling
  - Mobile responsive rendering

**Full Playwright Verification Script:**
```typescript
// e2e/goal-loop-verification.spec.ts — THE COMPREHENSIVE CHECK
import { test, expect } from '@playwright/test';

/**
 * GOAL-LOOP COMPLETION VERIFICATION
 * This test suite verifies that ALL phases of the goal are complete.
 * Run with: npx playwright test e2e/goal-loop-verification.spec.ts
 */

const ENHANCED_SECTIONS = [
  'inventory-intelligence',
  'pricing-strategy-decoder',
  'ship-value-scoring',
  'itinerary-value-breakdown',
  'hidden-cost-detector',
  'sailing-specific-tips',
] as const;

const FORECAST_ELEMENTS = [
  'cabin-forecast-inside',
  'cabin-forecast-oceanview',
  'cabin-forecast-balcony',
  'cabin-forecast-suite',
  'competing-sailing-comparison',
  'optimal-booking-window',
  'price-trajectory-chart',
  'price-alert-triggers',
] as const;

test.describe('Goal Loop: Deal Analysis & Price Forecast — COMPLETION VERIFICATION', () => {
  
  test('PHASE 1: Formatting & Parser Robustness — ALL checks pass', async ({ page }) => {
    const sailingId = await getFirstSailingWithAnalysis(page);
    await page.goto(`/sailing/${sailingId}`);
    
    // No layout shift
    const handle = await page.$('[data-testid="deal-analysis"]');
    const boxBefore = await handle!.boundingBox();
    await page.waitForSelector('[data-testid="deal-score-badge"]', { timeout: 10000 });
    const boxAfter = await handle!.boundingBox();
    expect(Math.abs(boxBefore.width - boxAfter.width)).toBeLessThan(2);
    
    // All standard sections render
    for (const section of ['deal-score-badge', 'pricing-deep-dive', 'price-trend', 'insider-tips', 'verdict']) {
      await expect(page.locator(`[data-testid="${section}"]`)).toBeVisible();
    }
    
    // Error states are user-friendly
    await page.route('**/api/analytics/deal-analysis/*', route => 
      route.fulfill({ status: 500, body: JSON.stringify({ success: false, error: 'ECONNREFUSED' }) }));
    await page.goto(`/sailing/${sailingId}`);
    await page.waitForSelector('[data-testid="deal-analysis-error"]', { timeout: 10000 });
    const errorText = await page.locator('[data-testid="deal-analysis-error"]').textContent();
    expect(errorText).not.toContain('ECONNREFUSED');
  });

  test('PHASE 2: Unique, Cruise-Specific Deal Analysis — ALL 6 dimensions render', async ({ page }) => {
    const sailingId = await getFirstSailingWithFullAnalysis(page);
    await page.goto(`/sailing/${sailingId}`);
    
    for (const section of ENHANCED_SECTIONS) {
      await expect(page.locator(`[data-testid="${section}"]`)).toBeVisible();
    }
    
    // Content is CRUISE-SPECIFIC, not generic
    const fullText = await page.locator('[data-testid="enhanced-deal-analysis"]').textContent();
    expect(fullText).toMatch(/Royal Caribbean|Carnival|Norwegian|Princess|MSC/i);
    expect(fullText).toMatch(/Icon of the Seas|Symphony|Norwegian Encore|Enchanted Princess/i);
    
    // Verify inventory intelligence mentions specific cabin behavior
    const inventoryText = await page.locator('[data-testid="inventory-intelligence"]').textContent();
    expect(inventoryText).toMatch(/sold|available|faster|slower|inventory|balcony|inside/i);
    
    // Verify pricing strategy decoder mentions cruise line behavior
    const strategyText = await page.locator('[data-testid="pricing-strategy-decoder"]').textContent();
    expect(strategyText).toMatch(/strategy|discount|premium|clearance|aggressive/i);
    
    // Verify hidden cost detector shows real total
    const hiddenCost = await page.locator('[data-testid="hidden-cost-detector"]').textContent();
    expect(hiddenCost).toMatch(/\$[0-9,]+/);
  });

  test('PHASE 3: Unique, Cruise-Specific Price Forecast — ALL dimensions render', async ({ page }) => {
    const sailingId = await getFirstSailingWithForecast(page);
    await page.goto(`/sailing/${sailingId}`);
    
    for (const element of FORECAST_ELEMENTS) {
      await expect(page.locator(`[data-testid="${element}"]`)).toBeVisible();
    }
    
    // Per-cabin forecasts show confidence intervals (not single numbers)
    const balconyForecast = await page.locator('[data-testid="cabin-forecast-balcony"]').textContent();
    expect(balconyForecast).toMatch(/\d+% confidence|range|\$[0-9,]+–\$[0-9,]+/i);
    
    // Competing sailings are shown
    const competing = await page.locator('[data-testid="competing-sailing-comparison"]').textContent();
    expect(competing).toMatch(/\$[0-9,]+ cheaper|more expensive|same week/i);
    
    // Optimal booking window is specific to THIS sailing
    const window = await page.locator('[data-testid="optimal-booking-window"]').textContent();
    expect(window).toMatch(/this sail|Royal Caribbean|Carninal|Norwegian|Princess/i);
  });

  test('PHASE 4: Formatting consistency — JSON schema compliance', async ({ page }) => {
    const sailingId = await getFirstSailingWithFullAnalysis(page);
    
    // Verify API returns structured JSON (not markdown)
    const apiResponse = await page.evaluate(async (id: number) => {
      const res = await fetch(`/api/enhanced/deal-analysis/${id}`);
      return res.json();
    }, sailingId);
    
    // Verify JSON schema compliance
    expect(apiResponse.success).toBe(true);
    expect(typeof apiResponse.data.dealScore).toBe('number');
    expect(typeof apiResponse.data.pricingDeepDive).toBe('string');
    expect(['rising', 'falling', 'stable']).toContain(apiResponse.data.priceTrend);
    expect(Array.isArray(apiResponse.data.insiderTips)).toBe(true);
    expect(typeof apiResponse.data.shipValueScore).toBe('number');
    expect(typeof apiResponse.data.hiddenCosts).toBe('object');
  });

  test('PHASE 5: Sync engine populates enhanced data automatically', async ({ page }) => {
    // Check that sync has populated enhanced data
    const stats = await page.evaluate(async () => {
      const res = await fetch('/api/enhancement/stats');
      return res.json();
    });
    
    expect(stats.success).toBe(true);
    expect(stats.data.enhancedDealAnalyses).toBeGreaterThan(0);
    expect(stats.data.enhancedPriceForecasts).toBeGreaterThan(0);
  });

  test('PHASE 6: Mobile responsive rendering', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    const sailingId = await getFirstSailingWithFullAnalysis(page);
    await page.goto(`/sailing/${sailingId}`);
    
    // All sections still visible on mobile
    for (const section of [...ENHANCED_SECTIONS, ...FORECAST_ELEMENTS]) {
      await expect(page.locator(`[data-testid="${section}"]`)).toBeVisible();
    }
  });

  test('COMPREHENSIVE: No competitor feature exists in our output — we are UNIQUE', async ({ page }) => {
    const sailingId = await getFirstSailingWithFullAnalysis(page);
    await page.goto(`/sailing/${sailingId}`);
    
    const fullAnalysis = await page.locator('[data-testid="enhanced-deal-analysis"]').textContent();
    const fullForecast = await page.locator('[data-testid="enhanced-price-forecast"]').textContent();
    const combined = `${fullAnalysis} ${fullForecast}`;
    
    // Our unique features — these should ALL appear
    const uniqueFeatures = [
      /inventory.*(sold|available|balcony|inside)/i,           // Per-cruise inventory intelligence
      /strategy.*(discount|premium|aggressive)/i,              // Pricing strategy decoder
      /ship.*value.*(score|scoring)/i,                        // Ship-specific value scoring
      /cost.*per.*port/i,                                     // Itinerary value breakdown
      /real.*total.*cost|\$[0-9,]+.*total/i,                  // Hidden cost detector
      /crew change|deck \d+|ice skating|this rotation/i,      // Sailing-specific tips (NOT generic)
      /confidence.*\d+%/i,                                    // Confidence intervals (not single numbers)
      /competing.*sailing|same week/i,                        // Competing sailing comparison
      /optimal.*book.*\d+-\d+/i,                              // Optimal booking window (sailing-specific)
    ];
    
    const missingFeatures = uniqueFeatures.filter(pattern => !pattern.test(combined));
    expect(missingFeatures).toEqual([]);
    
    // Generic advice should be MINIMAL (at most 1 generic tip is acceptable as fallback)
    const genericPhrases = [
      'book early', 'check multiple sites', 'be flexible with dates',
      'sign up for alerts', 'clear your cookies'
    ];
    const genericCount = genericPhrases.filter(p => combined.toLowerCase().includes(p)).length;
    expect(genericCount).toBeLessThanOrEqual(1);
  });
});

// Helper: get first sailing with analysis data (used across tests)
async function getFirstSailingWithAnalysis(page: any): Promise<number> {
  const result = await page.evaluate(async () => {
    const res = await fetch('/api/sailing?limit=1&hasDealAnalysis=true');
    const data = await res.json();
    return data[0]?.id || null;
  });
  if (!result) throw new Error('No sailings with deal analysis found. Run sync first.');
  return result;
}

async function getFirstSailingWithFullAnalysis(page: any): Promise<number> {
  const result = await page.evaluate(async () => {
    const res = await fetch('/api/sailing?limit=1&hasEnhancedAnalysis=true');
    const data = await res.json();
    return data[0]?.id || null;
  });
  if (!result) throw new Error('No sailings with enhanced analysis found. Run sync first.');
  return result;
}

async function getFirstSailingWithForecast(page: any): Promise<number> {
  const result = await page.evaluate(async () => {
    const res = await fetch('/api/sailing?limit=1&hasForecast=true');
    const data = await res.json();
    return data[0]?.id || null;
  });
  if (!result) throw new Error('No sailings with forecast found. Run sync first.');
  return result;
}
```

---

## Files to Create/Modify (by phase)

| Phase | Files | Type |
|-------|-------|------|
| 1 | `src/components/sailing/NimDealAnalysis.tsx` (rewrite) | MODIFY |
| 1 | `src/components/sailing/NimPriceForecast.tsx` (rewrite) | MODIFY |
| 1 | `e2e/deal-analysis-format.spec.ts` (NEW) | CREATE |
| 2 | `server/services/enhancedAnalytics.ts` (NEW) | CREATE |
| 2 | `server/routes/enhancedAnalytics.ts` (NEW) | CREATE |
| 2 | `src/components/sailing/EnhancedDealAnalysis.tsx` (NEW) | CREATE |
| 2 | `src/types/enhancedAnalytics.ts` (NEW) | CREATE |
| 3 | `server/services/enhancedPriceForecast.ts` (NEW) | CREATE |
| 3 | `src/components/sailing/EnhancedPriceForecast.tsx` (NEW) | CREATE |
| 3 | `src/components/sailing/PriceTrajectoryChart.tsx` (NEW) | CREATE |
| 4 | Update all schemas in `server/services/*.ts` | MODIFY |
| 4 | Update all frontend component parsers | MODIFY |
| 5 | `server/services/hybridEngineOptimized.ts` (enhance Phase 3) | MODIFY |
| 5 | `server/routes/enhancement.ts` (stats + admin) | CREATE |
| 6 | `e2e/enhanced-deal-analysis.spec.ts` (NEW) | CREATE |
| 6 | `e2e/enhanced-price-forecast.spec.ts` (NEW) | CREATE |
| 6 | `e2e/competitive-moat.spec.ts` (NEW) | CREATE |
| 6 | `e2e/format-consistency.spec.ts` (NEW) | CREATE |
| 6 | `e2e/goal-loop-verification.spec.ts` (NEW) | CREATE |

---

## Progress Log Format (update after each phase completion)

```
[PHASE N] ✅|⚠️|❌ — <one-line outcome>
  - Key metrics: <numbers>
  - Blockers: <none or description>
  - Next: <what Phase N+1 needs>
  - Playwright verification: <test results summary>
```

---

## Definition of Done (DOE)

The goal-loop is **COMPLETE** when ALL of the following are true:

### Technical Completeness
- [ ] All 6 phases pass their gates
- [ ] `npx tsc --noEmit` = 0 errors (client)
- [ ] `cd server && npx tsc --noEmit --skipLibCheck` = 0 errors (server)
- [ ] All new TypeScript types are exported and used consistently

### Feature Completeness (Per Cruise)
- [ ] Every active sailing has a **cruise-specific** Deal Analysis with all 6 insight dimensions
- [ ] Every active sailing has a **cruise-specific** Price Forecast with per-cabin-type forecasts
- [ ] No sailing shows only generic advice (verified by Playwright)

### Formatting Completeness
- [ ] All components render without layout shift during loading
- [ ] Error states show user-friendly messages (no raw API errors)
- [ ] Heuristic fallback renders correctly with matching UI treatment
- [ ] Loading skeletons match final rendered component dimensions

### Competitive Moat (Unique Features)
- [ ] Per-cruise inventory intelligence renders for every sailing
- [ ] Cruise line pricing strategy decoder renders for every sailing
- [ ] Ship-specific value scoring renders for every sailing
- [ ] Itinerary value breakdown (cost-per-port) renders for every sailing
- [ ] Hidden cost detector (real total vs. listed price) renders for every sailing
- [ ] Sailing-specific insider tips (not generic advice) render for every sailing
- [ ] Per-cabin-type price forecasts with confidence intervals render
- [ ] Competing sailing comparisons render
- [ ] Sailing-specific optimal booking window renders
- [ ] Interactive price trajectory chart renders for all cabin types

### Verification (Playwright)
- [ ] `npx playwright test e2e/goal-loop-verification.spec.ts` passes 100%
- [ ] All 6 phase tests in the verification suite pass
- [ ] Mobile responsive rendering verified (375×812 viewport)
- [ ] No competitor feature exists in our output — we are unique

### Sync Integration
- [ ] Enhanced analysis auto-generates during sync cycles
- [ ] Admin regenerate endpoint works with rate-limit controls
- [ ] Cache TTL is appropriate (12 hours for enhanced data)

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| OpenCode API rate limits (429 errors) | Heuristic fallbacks already implemented; enhanced analytics batch with staggered delays |
| AI generates generic output instead of cruise-specific | System prompts enforce per-cruise data inclusion; Playwright tests verify specificity |
| Longer sync cycle time with enhanced analysis | Batch processing with chunked API calls; cache enabled; incremental only new/changed |
| Frontend components break with new data shapes | TypeScript strict mode catches type mismatches; Playwright tests catch runtime issues |
| Database schema changes needed for new fields | Existing `deal_analysis` and `price_forecast` columns store JSON strings; no schema changes needed |
