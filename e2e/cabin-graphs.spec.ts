import { test, expect } from '@playwright/test';

const SAILING_PAGE = '/sailing/carnival_horizon_2026-03-08_miami_6__big_31__v4m';

test.describe('Cabin Price History Graphs — Synthesis & Visual Differentiation', () => {

  test('Inside cabin chart shows real data (not synthesized)', async ({ page }) => {
    await page.goto(SAILING_PAGE);
    await page.waitForSelector('[data-testid="price-history-chart"]', { timeout: 15000 });

    // Default selected cabin is Inside, which has real data
    const svg = page.locator('[data-testid="price-history-chart"]');
    await expect(svg).toBeVisible();

    // Synthetic cabins show aria-label with "(estimated from Inside cabin history)"
    const ariaLabel = await svg.getAttribute('aria-label');
    console.log(`  Inside aria-label: ${ariaLabel}`);
    expect(ariaLabel).toContain('Inside');

    // Inside should NOT have the synthesis indicator
    const isSynthesized = await svg.getAttribute('data-synthesized');
    expect(isSynthesized).toBe('false');
  });

  test('Oceanview cabin chart shows synthesized data with indicator', async ({ page }) => {
    await page.goto(SAILING_PAGE);
    await page.waitForSelector('[data-testid="price-history-chart"]', { timeout: 15000 });

    // Click Oceanview button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cabinBtn = btns.find(b => /^Oceanview\$/.test(b.textContent?.trim() || ''));
      cabinBtn?.click();
    });
    await page.waitForTimeout(2000);

    // Wait for chart to update
    const svg = page.locator('[data-testid="price-history-chart"]');
    await expect(svg).toBeVisible();

    const ariaLabel = await svg.getAttribute('aria-label');
    console.log(`  Oceanview aria-label: ${ariaLabel}`);

    // Should show estimated indicator
    expect(ariaLabel).toContain('estimated from Inside cabin history');

    // data-synthesized should be true
    const isSynthesized = await svg.getAttribute('data-synthesized');
    expect(isSynthesized).toBe('true');

    // "Based on Inside cabin history" badge should be visible
    await expect(page.locator('text=Based on Inside cabin history')).toBeVisible();
    console.log('  ✓ Synthesis badge visible');
  });

  test('each cabin type shows distinct curve shape', async ({ page }) => {
    await page.goto(SAILING_PAGE);
    await page.waitForSelector('[data-testid="price-history-chart"]', { timeout: 15000 });

    // Collect the SVG path data for each cabin type
    const cabinTypes = ['Inside', 'Oceanview', 'Balcony', 'Suite'];
    const pathData: string[] = [];

    for (const cabinType of cabinTypes) {
      await page.evaluate((ct) => {
        const btns = Array.from(document.querySelectorAll('button'));
        const cabinBtn = btns.find(b => new RegExp(`^${ct}\\$`).test(b.textContent?.trim() || ''));
        cabinBtn?.click();
      }, cabinType);
      await page.waitForTimeout(2000);

      const paths = await page.evaluate(() => {
        const svg = document.querySelector('[data-testid="price-history-chart"]');
        if (!svg) return [];
        return Array.from(svg.querySelectorAll('path')).map(p => p.getAttribute('d'));
      });

      // Take the line path (second path) for comparison
      const linePath = paths[1] || paths[0] || '';
      pathData.push(linePath);
      console.log(`  ${cabinType} path length: ${linePath.length} chars`);
    }

    // All paths should be different (jitter ensures each cabin has unique curve)
    const uniquePaths = new Set(pathData);
    expect(uniquePaths.size, `Expected ${cabinTypes.length} distinct curves but got ${uniquePaths.size}`).toBe(cabinTypes.length);
    console.log('  ✓ All cabin types have distinct curve paths');
  });

  test('synthesized chart still shows data range aria-label', async ({ page }) => {
    await page.goto(SAILING_PAGE);
    await page.waitForSelector('[data-testid="price-history-chart"]', { timeout: 15000 });

    // Click Oceanview
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cabinBtn = btns.find(b => /^Oceanview\$/.test(b.textContent?.trim() || ''));
      cabinBtn?.click();
    });
    await page.waitForTimeout(2000);

    const svg = page.locator('[data-testid="price-history-chart"]');
    const ariaLabel = await svg.getAttribute('aria-label');

    // Should still show numeric range
    expect(ariaLabel).toMatch(/Oceanview: \d+ to \d+/);
    console.log(`  ✓ Aria-label: ${ariaLabel}`);
  });

  test('cabin rows display current price from cabinBreakdown', async ({ page }) => {
    await page.goto(SAILING_PAGE);
    await page.waitForSelector('[data-testid="price-history-chart"]', { timeout: 15000 });

    // Check that cabin buttons show prices
    const cabinButtons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns
        .filter(b => /^(Inside|Oceanview|Balcony|Suite)\$\d+/.test(b.textContent?.trim() || ''))
        .map(b => ({
          text: b.textContent?.trim(),
          price: b.textContent?.match(/\$\d+/)?.[0],
        }));
    });

    expect(cabinButtons.length).toBeGreaterThanOrEqual(3);
    cabinButtons.forEach(cb => {
      expect(cb.price).toBeTruthy();
      console.log(`  ${cb.text?.split('$')[0]}: ${cb.price}`);
    });
  });
});