import { test, expect } from '@playwright/test';

test.describe('Price Graph Data Consistency', () => {
  test.setTimeout(60000);

  /**
   * Helper: navigate to /deals and wait for deal cards to load.
   */
  async function loadDealsPage(page: any) {
    await page.goto('/deals', { waitUntil: 'commit', timeout: 30000 });
    // Wait for hero chips to render (don't depend on API)
    await page.waitForSelector('[data-testid="hero-chip-price-drop"]', { timeout: 10000 });
    // Wait for deal cards (may take time as API polls)
    await page.waitForSelector('[data-testid="deal-card"]', { timeout: 60000 });
  }

  /**
   * Test 1: Same data, same sailing — Verify Deal.history contains only pax=2 data
   * For sailing 1156, Deal.history should be [721.9, 788.9, 742.9] (Interior pax=2)
   * NOT interleaved with Interior pax=1 values like [362.72, 721.9, 375.72, 788.9, 392.72, 742.9]
   */
  test('Deal.history contains only pax=2 data (no interleaving)', async ({ page }) => {
    // Fetch deals from API
    const dealsResponse = await page.goto('http://localhost:3001/api/deals?limit=20');
    const deals = await dealsResponse.json();

    // Find sailing 1156
    const sailing1156 = deals.find((d: any) => d.id === 1156);
    expect(sailing1156).toBeDefined();

    // Deal.history should be [721.9, 788.9, 742.9] (Interior pax=2)
    // NOT [362.72, 721.9, 375.72, 788.9, 392.72, 742.9] (interleaved pax=1 and pax=2)
    const expectedHistory = [721.9, 788.9, 742.9];
    expect(sailing1156.history).toEqual(expectedHistory);

    // Verify no fake data fallback
    expect(sailing1156.history.length).toBeGreaterThan(0);
    expect(sailing1156.history).not.toContain(801 * 0.85); // Not fake data
  });

  /**
   * Test 2: Match data between components — For a specific sailing, verify both
   * Sparkline (deal card) and PriceHistoryPanel (detail page) show identical price values.
   */
  test('Sparkline and PriceHistoryPanel show same data for same sailing', async ({ page }) => {
    // Fetch deals from API
    const dealsResponse = await page.goto('http://localhost:3001/api/deals?limit=20');
    const deals = await dealsResponse.json();

    // Find sailing 1156
    const sailing1156 = deals.find((d: any) => d.id === 1156);
    expect(sailing1156).toBeDefined();

    // Fetch sailing detail from API
    const sailingDetailResponse = await page.goto('http://localhost:3001/api/sailing/1156');
    const sailingDetail = await sailingDetailResponse.json();

    // Extract Interior(pax=2) data from PriceHistoryPanel
    const ph = sailingDetail.priceHistory;
    const insidePax2 = ph
      .filter((s: any) => s.cabin_type === 'Inside' && s.passenger_count === 2)
      .sort((a: any, b: any) => new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime())
      .map((s: any) => parseFloat(s.total_usd));

    // Both should match
    expect(sailing1156.history).toEqual(insidePax2);
  });

  /**
   * Test 3: No fake multipliers — When fetching deals, Deal.history should contain
   * real values from DB, not synthetic multipliers like `price * 0.85`.
   */
  test('Deal.history contains real DB values, not fake multipliers', async ({ page }) => {
    // Fetch deals from API
    const dealsResponse = await page.goto('http://localhost:3001/api/deals?limit=20');
    const deals = await dealsResponse.json();

    // Find sailing 1156
    const sailing1156 = deals.find((d: any) => d.id === 1156);
    expect(sailing1156).toBeDefined();

    // Fetch sailing detail from API
    const sailingDetailResponse = await page.goto('http://localhost:3001/api/sailing/1156');
    const sailingDetail = await sailingDetailResponse.json();

    // Extract Interior(pax=2) data from PriceHistoryPanel (real DB values)
    const ph = sailingDetail.priceHistory;
    const insidePax2 = ph
      .filter((s: any) => s.cabin_type === 'Inside' && s.passenger_count === 2)
      .sort((a: any, b: any) => new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime())
      .map((s: any) => parseFloat(s.total_usd));

    // Deal.history should match real DB values, not fake multipliers
    // Fake multipliers would be: 801 * 0.85, 801 * 0.9, etc.
    const fakeValues = [801 * 0.85, 801 * 0.9, 801 * 0.95, 801 * 0.97, 801 * 0.99, 801];
    for (const fake of fakeValues) {
      expect(sailing1156.history).not.toContain(fake);
    }

    // Deal.history should equal real DB values
    expect(sailing1156.history).toEqual(insidePax2);
  });

  /**
   * Test 4: Cheapest cabin type — Both components should use the cheapest cabin
   * (e.g., Inside), not Suite or other types.
   */
  test('Both components use cheapest cabin (Inside), not Suite', async ({ page }) => {
    // Fetch deals from API
    const dealsResponse = await page.goto('http://localhost:3001/api/deals?limit=20');
    const deals = await dealsResponse.json();

    // Find sailing 1156
    const sailing1156 = deals.find((d: any) => d.id === 1156);
    expect(sailing1156).toBeDefined();

    // Deal.history for sailing 1156 should be Interior(pax=2) values: [721.9, 788.9, 742.9]
    // NOT Suite values like [2426.8, 2876.8, 2663.8]
    expect(sailing1156.history).toEqual([721.9, 788.9, 742.9]);

    // Verify Suite values are NOT in the history
    const suiteValues = [2426.8, 2876.8, 2663.8];
    for (const suiteVal of suiteValues) {
      expect(sailing1156.history).not.toContain(suiteVal);
    }
  });

  /**
   * Test 5: No interleaving — History array should not alternate between
   * different price ranges from different passenger counts.
   */
  test('History array does not interleave pax=1 and pax=2 values', async ({ page }) => {
    // Fetch deals from API
    const dealsResponse = await page.goto('http://localhost:3001/api/deals?limit=20');
    const deals = await dealsResponse.json();

    // Find sailing 1156
    const sailing1156 = deals.find((d: any) => d.id === 1156);
    expect(sailing1156).toBeDefined();

    // Deal.history should be [721.9, 788.9, 742.9] (3 values, all pax=2)
    // NOT [362.72, 721.9, 375.72, 788.9, 392.72, 742.9] (6 values, interleaved pax=1 and pax=2)
    expect(sailing1156.history).toEqual([721.9, 788.9, 742.9]);

    // Verify no interleaving
    expect(sailing1156.history.length).toBe(3); // Only 3 values (one per data point)

    // Verify no pax=1 values (which would be ~362, ~375, ~392)
    const pax1Values = [362.72, 375.72, 392.72];
    for (const pax1Val of pax1Values) {
      expect(sailing1156.history).not.toContain(pax1Val);
    }
  });
});
