/**
 * Filter rendering diagnostics — capture issues at various viewport widths
 */

import { test, expect } from '@playwright/test';

test.describe('Filter responsiveness', () => {
  const widths = [320, 480, 640, 768, 1024, 1280];

  for (const width of widths) {
    test(`filter layout at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/deals');
      await page.waitForSelector('[data-testid="deal-card"]', { timeout: 10000 });

      // Capture full page screenshot
      await page.screenshot({
        path: `test-results/filter-resize/${width}px-filter-layout.png`,
        fullPage: true,
      });

      // Check for overlapping elements
      const filters = page.locator('[data-testid="filter-bar"]');
      const filtersVisible = await filters.count() > 0;

      if (!filtersVisible) {
        console.log(`Width ${width} - Filter bar not visible (mobile?)`);
      } else {
        // Check for text overflow
        const filterTexts = filters.locator('span').allTextContents();
        const texts = await filterTexts;
        console.log(`Width ${width} - Filter texts: ${texts.join(', ')}`);
      }
    });
  }
});
