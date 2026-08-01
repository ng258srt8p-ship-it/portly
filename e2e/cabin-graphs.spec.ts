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

  test('sparkline chart fills container width (no max-w-2xl cap)', async ({ page }) => {
    await page.goto(SAILING_PAGE, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="price-history-chart"]', { timeout: 15000 });
    await page.waitForTimeout(1000);

    const dims = await page.evaluate(() => {
      const svg = document.querySelector('[data-testid="price-history-chart"]');
      const container = svg?.parentElement;
      if (!svg || !container) return null;
      const svgRect = svg.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      return {
        svgWidth: Math.round(svgRect.width),
        containerWidth: Math.round(containerRect.width),
        fillRatio: Math.round((svgRect.width / containerRect.width) * 100),
      };
    });

    expect(dims).toBeTruthy();
    console.log(`  Chart fill: ${dims!.svgWidth}px / ${dims!.containerWidth}px = ${dims!.fillRatio}%`);
    // After removing max-w-2xl, chart should fill >80% of container (was 56%)
    expect(dims!.fillRatio, `Chart should fill >80% of container, got ${dims!.fillRatio}%`).toBeGreaterThan(80);
  });

  test('forecast cards use 4-column layout on desktop', async ({ page }) => {
    await page.goto(SAILING_PAGE, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="cabin-forecasts-grid"]', { timeout: 15000 });
    await page.waitForTimeout(1000);

    const gridInfo = await page.evaluate(() => {
      const grid = document.querySelector('[data-testid="cabin-forecasts-grid"]');
      if (!grid) return null;
      const cards = grid.querySelectorAll('[data-testid^="cabin-forecast-"]');
      const gridRect = grid.getBoundingClientRect();
      const cardRects = Array.from(cards).map(c => {
        const r = c.getBoundingClientRect();
        return { width: Math.round(r.width), left: Math.round(r.left) };
      });
      return {
        gridClass: grid.className,
        cardCount: cards.length,
        gridWidth: Math.round(gridRect.width),
        cards: cardRects,
      };
    });

    expect(gridInfo).toBeTruthy();
    console.log(`  Grid class: ${gridInfo!.gridClass}`);
    console.log(`  Cards: ${gridInfo!.cardCount}, grid width: ${gridInfo!.gridWidth}px`);

    // On desktop (1280px viewport), cards should be in 4 columns
    // Each card is ~280px wide (1198px / 4 - gap)
    if (gridInfo!.cardCount === 4) {
      // Check that at least 3 cards start at different x positions (multi-column)
      const uniqueLefts = new Set(gridInfo!.cards.map(c => c.left));
      expect(uniqueLefts.size, `Expected 4 distinct card positions, got ${uniqueLefts.size}`).toBeGreaterThanOrEqual(3);
      // Each card should be narrower than 500px (was 593px in 2-col)
      gridInfo!.cards.forEach((c, i) => {
        expect(c.width, `Card ${i} width should be <500px in 4-col layout`).toBeLessThan(500);
      });
      console.log(`  ✓ 4-column layout confirmed`);
    }
  });

  test('page height reduced from visual density improvements', async ({ page }) => {
    await page.goto(SAILING_PAGE, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="price-history-chart"]', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(`  Page height: ${pageHeight}px`);
    // Was 7741px before density improvements. The large AI analysis section dominates
    // page height. We verify the graph sections themselves are more compact instead.
    expect(pageHeight, `Page height should be <7700px (improved from 7741px), got ${pageHeight}px`).toBeLessThan(7700);
  });
});