import { test, expect } from "@playwright/test";

/**
 * Cycle #30 — Dashboard median-price + Caribbean-share label integrity
 *
 * Two silent data-integrity bugs in `workers/src/metrics-analytics.ts`:
 *
 *  1. `sailings.medianPrice` was actually `AVG(price)` aliased to the
 *     median field name. AVG($887.74) was being rendered under a "Price
 *     Range" label, with the actual min/max in a smaller line below —
 *     making the headline number neither median nor range. Fix: pull all
 *     non-null prices sorted, pick the middle element in app code
 *     (SQLite has no PERCENTILE_CONT). The dashboard card was relabeled
 *     from "Price Range" → "Typical Price" so the headline number is
 *     honestly labelled as the median.
 *
 *  2. `shipClasses.deck` was always "0% Caribbean" because the SQL
 *     scanned `departure_region` (which is a US-state field like
 *     "Florida"/"Texas") with `LIKE '%Carib%'`. Caribbean destinations
 *     live in the `destinations` table (e.g. "Eastern Caribbean"). Fix:
 *     JOIN destinations on destination_id and count rows whose name
 *     contains "Carib". Live: ~59.5% of sailings (1060 / 1781).
 *
 * These tests assert:
 *  - /api/metrics.sailings.medianPrice is a true median (within ±5% of
 *    the manually-computed D1 median of $670), NOT close to AVG ($887.74)
 *  - /api/metrics.shipClasses.deck contains a non-zero Caribbean %
 *  - The dashboard card is labeled "Typical Price" (not "Price Range")
 *    and shows the new median value matching the API
 */

const WORKER_BASE = "https://portly-api.vqh9mnrdbp.workers.dev";
const PAGES_BASE = "https://portly-1i0.pages.dev";

test.describe("Dashboard metrics label integrity (Cycle #30)", () => {
  test("GET /api/metrics.sailings.medianPrice is the true median, not AVG", async ({ request }) => {
    const res = await request.get(`${WORKER_BASE}/api/metrics`);
    expect(res.status()).toBe(200);
    const body = await res.json();

    const medianPrice = body.sailings?.medianPrice;
    expect(typeof medianPrice).toBe("number");
    expect(medianPrice).toBeGreaterThan(0);

    // Live median (manually computed from D1): $670 (1781 rows, sorted).
    // Allow ±5% slack for any future data drift.
    const EXPECTED_MEDIAN = 670;
    const MEDIAN_TOLERANCE = 0.05;
    const lower = EXPECTED_MEDIAN * (1 - MEDIAN_TOLERANCE);
    const upper = EXPECTED_MEDIAN * (1 + MEDIAN_TOLERANCE);

    expect(medianPrice).toBeGreaterThanOrEqual(lower);
    expect(medianPrice).toBeLessThanOrEqual(upper);

    // Crucially: the median must be visibly different from AVG ($887.74).
    // If they collapse together, the SQL bug has regressed.
    expect(Math.abs(medianPrice - EXPECTED_MEDIAN)).toBeLessThan(
      Math.abs(medianPrice - 887.74),
      "medianPrice should be closer to true median ($670) than to old AVG ($887.74)",
    );
  });

  test("GET /api/metrics.shipClasses.deck reports real Caribbean share", async ({ request }) => {
    const res = await request.get(`${WORKER_BASE}/api/metrics`);
    expect(res.status()).toBe(200);
    const body = await res.json();

    const deck = body.shipClasses?.deck;
    expect(typeof deck).toBe("string");

    // The previous SQL silently returned "0% Caribbean" forever — if the
    // string still starts with "0", the bug has regressed.
    expect(deck).not.toMatch(/^0(\.0)?% Caribbean/);

    // Live count: 1060 / 1781 ≈ 59.5%. Allow 30%-90% for data drift.
    const m = deck.match(/^([\d.]+)% Caribbean/);
    expect(m).not.toBeNull();
    const pct = parseFloat(m![1]);
    expect(pct).toBeGreaterThan(30);
    expect(pct).toBeLessThan(90);
  });

  test("/dashboard shows 'Typical Price' card with median value matching API", async ({ page }) => {
    // Fetch API in parallel so we can compare the displayed value
    const apiRes = await page.request.get(`${WORKER_BASE}/api/metrics`);
    expect(apiRes.status()).toBe(200);
    const apiBody = await apiRes.json();
    const apiMedian = apiBody.sailings?.medianPrice;
    expect(typeof apiMedian).toBe("number");

    await page.goto(`${PAGES_BASE}/dashboard`, { waitUntil: "networkidle" });

    // The card must exist with the new label
    const card = page.getByTestId("dashboard-stat-card-price-range");
    await expect(card).toBeVisible({ timeout: 15000 });

    // Card label is now "Typical Price" (was "Price Range" pre-Cycle #30)
    await expect(card.getByText("Typical Price", { exact: false })).toBeVisible();

    // The card's headline number must match the API median (formatted with $)
    const headline = page.getByTestId("dashboard-stat-median-price");
    await expect(headline).toBeVisible({ timeout: 5000 });
    const text = (await headline.textContent())?.trim() ?? "";
    // Format: "$670" or "$670.00" — strip "$" and commas, parse to number
    const numeric = parseFloat(text.replace(/[$,]/g, ""));
    expect(numeric).toBe(apiMedian);

    // The min-max line below must still show both bounds
    const minMaxText = await card.textContent();
    expect(minMaxText).toMatch(/\$\d/); // at least one $ value
    expect(minMaxText).toMatch(/–/);   // en-dash separator
  });

  test("/dashboard no longer renders the misleading 'Price Range' headline label", async ({ page }) => {
    // Pure negative assertion: the old label string must be absent from the
    // Typical Price card. (Other cards may use words like "range" but none
    // should claim a single median value IS the range.)
    await page.goto(`${PAGES_BASE}/dashboard`, { waitUntil: "networkidle" });
    const card = page.getByTestId("dashboard-stat-card-price-range");
    await expect(card).toBeVisible({ timeout: 15000 });

    const cardText = (await card.textContent()) ?? "";
    // The big-number label slot (uppercase tracking-wide) is what changed.
    expect(cardText).not.toMatch(/Price Range/);
  });
});
