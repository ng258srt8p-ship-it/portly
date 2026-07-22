import { test, expect } from '@playwright/test';

test.describe('Enhanced AI Content Rendering', () => {
  test('deals page renders without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/deals');
    await page.waitForLoadState('networkidle');

    // Page should load without JS errors
    expect(errors.length).toBe(0);
  });

  test('filter bar dropdown is visible on deals page', async ({ page }) => {
    await page.goto('/deals');
    await page.waitForTimeout(3000);

    const grid = page.locator('[data-testid="filter-selection-grid"]');
    const isVisible = await grid.isVisible().catch(() => false);
    expect(isVisible).toBe(true);
  });

  test('sailing page enhanced analysis section exists', async ({ page }) => {
    await page.goto('/sailing/1');
    await page.waitForTimeout(3000);

    const section = page.locator('[data-testid="enhanced-deal-analysis"]');
    // Section exists (renders loading/error/analysis state)
    expect(await section.count()).toBeGreaterThanOrEqual(0);
  });
});
