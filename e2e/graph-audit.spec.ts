/**
 * Audit the price history graph on /sailing/[id]:
 *  - Click each cabin button, measure if chart updates (svg path data changes)
 *  - Capture screenshot to inspect visual styling
 */
import { test } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://3946fca7.portly-1i0.pages.dev';

test('audit price history graph per cabin + capture screenshots', async ({ page, request }) => {
  const dealsRes = await request.get(`${BASE_URL}/api/deals?limit=1`);
  const deals = await dealsRes.json();
  const sailingId: string = deals[0]?.id ?? '';
  test.skip(!sailingId, 'no sailing ID');

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE_URL}/sailing/${sailingId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Scroll to price history section
  await page.locator('#price-history').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Capture initial screenshot (Inside selected by default)
  await page.screenshot({ path: 'test-results/graph-inside.png', fullPage: false });

  // Get initial svg data
  const initialSvg = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="price-history-chart"]') as SVGSVGElement | null;
    if (!svg) return null;
    return {
      viewBox: svg.getAttribute('viewBox'),
      width: svg.getBoundingClientRect().width,
      height: svg.getBoundingClientRect().height,
      paths: Array.from(svg.querySelectorAll('path')).map((p) => p.getAttribute('d')?.slice(0, 80)),
      textLabels: Array.from(svg.querySelectorAll('text')).map((t) => t.textContent),
    };
  });
  console.log('\n[INSIDE — initial]');
  console.log('  viewBox:', initialSvg?.viewBox);
  console.log('  rendered size:', initialSvg?.width, 'x', initialSvg?.height);
  console.log('  paths:', initialSvg?.paths?.length);
  console.log('  text labels:', initialSvg?.textLabels?.slice(0, 10));

  // Click Oceanview button
  const oceanviewBtn = page.locator('button:has-text("Oceanview")').first();
  await oceanviewBtn.click();
  await page.waitForTimeout(800);

  const oceanviewSvg = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="price-history-chart"]') as SVGSVGElement | null;
    if (!svg) return null;
    return {
      paths: Array.from(svg.querySelectorAll('path')).map((p) => p.getAttribute('d')?.slice(0, 80)),
      textLabels: Array.from(svg.querySelectorAll('text')).map((t) => t.textContent),
    };
  });
  console.log('\n[OCEANVIEW — after click]');
  console.log('  paths:', oceanviewSvg?.paths?.length);
  console.log('  text labels:', oceanviewSvg?.textLabels?.slice(0, 10));
  console.log('  Same as Inside?', JSON.stringify(initialSvg?.paths) === JSON.stringify(oceanviewSvg?.paths));

  await page.screenshot({ path: 'test-results/graph-oceanview.png', fullPage: false });

  // Click Balcony
  const balconyBtn = page.locator('button:has-text("Balcony")').first();
  await balconyBtn.click();
  await page.waitForTimeout(800);
  const balconySvg = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="price-history-chart"]') as SVGSVGElement | null;
    return svg ? Array.from(svg.querySelectorAll('text')).map((t) => t.textContent) : null;
  });
  console.log('\n[BALCONY — after click]');
  console.log('  text labels:', balconySvg?.slice(0, 10));
  console.log('  Has data?', balconySvg && balconySvg.some((l) => l?.includes('$') && /\d/.test(l)));
  await page.screenshot({ path: 'test-results/graph-balcony.png', fullPage: false });

  // Click Suite
  const suiteBtn = page.locator('button:has-text("Suite")').first();
  await suiteBtn.click();
  await page.waitForTimeout(800);
  const suiteSvg = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="price-history-chart"]') as SVGSVGElement | null;
    return svg ? Array.from(svg.querySelectorAll('text')).map((t) => t.textContent) : null;
  });
  console.log('\n[SUITE — after click]');
  console.log('  text labels:', suiteSvg?.slice(0, 10));
  await page.screenshot({ path: 'test-results/graph-suite.png', fullPage: false });

  // Back to Inside
  const insideBtn = page.locator('button:has-text("Inside")').first();
  await insideBtn.click();
  await page.waitForTimeout(800);
});
