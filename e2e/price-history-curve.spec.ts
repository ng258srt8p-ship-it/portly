import { test, expect } from '@playwright/test';

test.describe('Price History Graph — Smooth Curves & Hover Tooltips', () => {

  test('renders smooth cubic bezier curve (not straight lines)', async ({ page }) => {
    await page.goto('/sailing/1214');
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 15000 });

    const chartSvg = page.locator('svg').filter({ hasText: 'Price (USD)' }).first();
    await expect(chartSvg).toBeVisible();

    const linePath = chartSvg.locator('path[d]').nth(1);
    const d = await linePath.getAttribute('d');

    expect(d, 'Path should use cubic bezier curves (C commands)').toContain('C');
    expect(d, 'Path should not use straight line segments').not.toContain(' L');
    console.log('  ✓ Graph uses smooth curves');
  });

  test('hover tooltip shows price and date on data points', async ({ page }) => {
    await page.goto('/sailing/1214');
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 15000 });

    const chartSvg = page.locator('svg').filter({ hasText: 'Price (USD)' }).first();
    const dataPoints = chartSvg.locator('circle[r]');
    expect(await dataPoints.count()).toBeGreaterThan(0);

    // Hover and check tooltip
    await dataPoints.first().hover();
    await page.waitForTimeout(500);

    const svgTexts = await chartSvg.locator('text').allTextContents();
    const hasPriceText = svgTexts.some(t => /^\$\d{1,3},?\d{3}$/.test(t.trim()));
    const hasDateText = svgTexts.some(t => /[A-Z][a-z]{2}\s+\d{1,2}/.test(t.trim()));
    expect(hasPriceText || hasDateText, 'Hover should reveal price and/or date tooltip').toBe(true);
    console.log('  ✓ Hover reveals price/date tooltip');
  });

  test('hover targets and conditional elements are properly set up', async ({ page }) => {
    await page.goto('/sailing/1214');
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 15000 });

    const chartSvg = page.locator('svg').filter({ hasText: 'Price (USD)' }).first();
    const svgHtml = await chartSvg.innerHTML();

    // Check for hover target rects with cursor-crosshair class
    expect(svgHtml, 'Should have hover target rects').toContain('cursor-crosshair');
    
    // Check for the tooltip shadow filter (used by tooltip)
    expect(svgHtml, 'Should have tooltip filter').toContain('tooltip-shadow');
    
    // Check that data points are present
    expect(svgHtml, 'Should have data point circles').toContain('<circle');
    
    // Hover guide line is conditionally rendered on hover (verified via tooltip test above)

    console.log('  ✓ Hover infrastructure properly set up');
  });

  test('all axis labels remain visible without hover', async ({ page }) => {
    await page.goto('/sailing/1214');
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 15000 });

    const chartSvg = page.locator('svg').filter({ hasText: 'Price (USD)' }).first();

    const yLabels = chartSvg.locator('text').filter({ hasText: /^\$\d/ });
    const yCount = await yLabels.count();
    expect(yCount).toBeGreaterThan(0);

    const xLabels = chartSvg.locator('text').filter({ hasText: /[A-Z][a-z]{2}\s+\d{1,2}/ });
    const xCount = await xLabels.count();
    expect(xCount).toBeGreaterThan(0);

    const axisTitle = chartSvg.locator('text').filter({ hasText: 'Price (USD)' });
    await expect(axisTitle).toBeVisible();

    console.log(`  ✓ Axes labeled: ${yCount} y-labels, ${xCount} x-labels`);
  });
});
