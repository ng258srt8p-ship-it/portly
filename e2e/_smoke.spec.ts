import { test, expect } from '@playwright/test';

/**
 * Smoke tests against the live Cloudflare Pages deployment.
 *
 * These assertions match the actual deployed page content (not assumed text).
 * If page headings/marketing copy change intentionally, update these in lockstep.
 */
test.describe('smoke test against live preview', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Deployed title is "TripTide — Cruise Price Tracking & Insider Deal Intelligence — Cruise Price Tracking & Deal Insights"
    await expect(page).toHaveTitle(/TripTide/);
    // Homepage hero heading rendered in SearchHero (client-hydrated)
    await expect(
      page.getByRole('heading', { name: /Out-the-Door Cost/i })
    ).toBeVisible({ timeout: 15000 });
  });

  test('deals page loads', async ({ page }) => {
    // Wait for the deals API so client-fetched deal cards render
    const dealsResponse = page.waitForResponse(
      (resp) => resp.url().includes('/api/deals') && resp.status() === 200,
      { timeout: 20000 }
    );
    await page.goto('/deals', { waitUntil: 'domcontentloaded' });
    await dealsResponse;

    // ExploreDealsHero <h1>Find Your Perfect Voyage</h1> is in the static HTML
    await expect(
      page.locator('h1')
    ).toHaveText(/\s*Find\s+Your\s+Perfect\s+Voyage\s*/i, { timeout: 10000 });

    // Deal cards are client-rendered after the API response we awaited above
    const dealCards = page.locator('[data-testid="deal-card"]');
    await expect(dealCards.first()).toBeVisible({ timeout: 10000 });
    expect(await dealCards.count()).toBeGreaterThan(0);
  });

  test('sailing detail page loads', async ({ page }) => {
    await page.goto('/sailing/carnival_horizon_2026-03-08_miami_6__big_24__v4m', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: 'Carnival Horizon', exact: true })
    ).toBeVisible({ timeout: 15000 });
    // Section anchors (SailingSubNav preserved for deep links)
    for (const id of ['#overview', '#price-history', '#deal-analysis', '#cabins', '#forecast', '#ship-info']) {
      await expect(page.locator(id)).toBeAttached({ timeout: 5000 });
    }
    // Verify SailingSubNav is present
    const subnav = page.locator('[data-testid="sailing-subnav"]');
    await expect(subnav).toHaveCount(1);
  });

  test('history page loads', async ({ page }) => {
    await page.goto('/history', { waitUntil: 'domcontentloaded' });
    // Actual <h1> text is "Price History Maps" (NOT "Price History Trends")
    await expect(
      page.getByRole('heading', { name: 'Price History Maps' })
    ).toBeVisible({ timeout: 15000 });
  });

  test('solo page loads', async ({ page }) => {
    await page.goto('/solo', { waitUntil: 'domcontentloaded' });
    // Actual <h1> text is "Solo Hub" (NOT "Solo Traveler Deals")
    await expect(
      page.getByRole('heading', { name: 'Solo Hub' })
    ).toBeVisible({ timeout: 15000 });
  });

  test('about page renders without apostrophe errors', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText('The moment your tracked sailing drops')
    ).toBeVisible({ timeout: 15000 });
    // Rendered text should include the apostrophe (entity decoded by the browser).
    // "We don't take commissions" — the apostrophe entity (' / ') must render.
    const noCommissions = page.getByText(/We don't take commissions/);
    await expect(noCommissions).toBeVisible({ timeout: 10000 });
    // Make sure the raw unescaped text "We dont take commissions" (no apostrophe) is absent
    const rawUnescaped = page.locator('text=/We dont take commissions/');
    expect(await rawUnescaped.count()).toBe(0);
  });
});
