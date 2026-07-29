import { test, expect } from '@playwright/test';

test.describe('smoke test against live preview', () => {
  const BASE_URL = process.env.BASE_URL || 'https://portly-1i0.pages.dev/';

  test('homepage loads', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Portly/);
    await expect(page.locator('text=Cruise Deal Tracker')).toBeVisible();
  });

  test('deals page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/deals`);
    await expect(page.locator('text=Current Cruise Deals')).toBeVisible();
    const dealCards = page.locator('[data-testid="deal-card"]');
    await expect(dealCards).toHaveCountGreaterThan(0);
  });

  test('sailing detail page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/carnival_horizon_2026-03-08_miami_6__big_24__v4m`);
    await expect(page.getByRole('heading', { name: 'Carnival Horizon', exact: true })).toBeVisible();
    await expect(page.locator('#overview')).toBeVisible();
    await expect(page.locator('#price-history')).toBeVisible();
    await expect(page.locator('#deal-analysis')).toBeVisible();
    await expect(page.locator('#cabins')).toBeVisible();
    await expect(page.locator('#forecast')).toBeVisible();
    await expect(page.locator('#ship-info')).toBeVisible();
    // Verify no SailingSubNav
    const subnav = page.locator('[data-testid="sailing-subnav"]');
    await expect(subnav).toHaveCount(0);
  });

  test('history page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/history`);
    await expect(page.locator('text=Price History Trends')).toBeVisible();
  });

  test('solo page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/solo`);
    await expect(page.locator('text=Solo Traveler Deals')).toBeVisible();
  });

  test('about page renders without apostrophe errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/about`);
    await expect(page.locator('text=The moment your tracked sailing drops')).toBeVisible();
    await expect(page.locator('text=We dont take commissions')).toHaveCount(0); // Should not have raw apostrophe
    await expect(page.locator('text=We dont take commissions')).toHaveCount(0);
    // Should have HTML entities instead
    await expect(page.locator('text=We don&apos;t take commissions')).toBeVisible();
  });
});