import { test, expect } from '@playwright/test';

test.describe('Sailing Detail Page Refactor', () => {
  test.use({
    baseURL: 'https://152e86f2.portly-1i0.pages.dev',
  });

  test('sailing page loads, subnav visible, mobile booking bar works', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/sailing/carnival_horizon_2026-03-08_miami_6__big_24__v4m');

    // H1 ship name visible
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

    // Subnav present with 7 tabs
    const subnav = page.locator('[data-testid="sailing-subnav"]');
    await expect(subnav).toBeVisible({ timeout: 10000 });
    // Desktop only (test runs on desktop viewport)
    const tabs = subnav.locator('nav[aria-label="Sections"] button');
    await expect(tabs).toHaveCount(7);

    // Verify tab labels in order
    await expect(tabs.nth(0)).toContainText('Overview');
    await expect(tabs.nth(1)).toContainText('Itinerary');
    await expect(tabs.nth(2)).toContainText('Price History');
    await expect(tabs.nth(3)).toContainText('Deal Analysis');
    await expect(tabs.nth(4)).toContainText('Cabins');
    await expect(tabs.nth(5)).toContainText('Forecast');
    await expect(tabs.nth(6)).toContainText('Ship Info');

    // Click Price History tab — it should scroll to the section
    await tabs.nth(2).click();
    await page.waitForTimeout(1500); // wait for smooth scroll + IntersectionObserver
    await expect(page.locator('#price-history')).toBeInViewport();

    // Mobile viewport: no mobile booking bar (removed per user request - hero has CTA buttons)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    const mobileBar = page.locator('.fixed.bottom-0');
    await expect(mobileBar).not.toBeVisible();

    // No console errors
    expect(errors).toEqual([]);
  });
});
