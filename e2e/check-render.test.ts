import { test, expect } from '@playwright/test';

test('Check actual rendering', async ({ page }) => {
  await page.goto('/deals');
  await page.waitForSelector('[data-testid="deal-card"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="filter-bar"]', { timeout: 5000 });
  
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(1000);
  
  // Get the filter bar HTML structure
  const filterBar = await page.$('[data-testid="filter-bar"]');
  if (filterBar) {
    const html = await filterBar.innerHTML();
    console.log('Filter bar HTML (first 2000 chars):');
    console.log(html.slice(0, 2000));
  } else {
    console.log('Filter bar not found!');
  }
  
  // Check specific elements
  const tests = [
    'filter-bar',
    'filter-cruise-line',
    'filter-region', 
    'filter-destination',
    'filter-port',
    'filter-nights',
    'filter-type',
    'filter-price',
    'filter-price-min',
    'filter-price-max',
    'filter-sort',
    'filter-clear',
    'filter-page-size',
  ];
  
  console.log('\nElement presence:');
  for (const testId of tests) {
    const el = await page.$(`[data-testid="${testId}"]`);
    console.log(`  ${testId}: ${el ? '✓ present' : '✗ missing'}`);
  }
});
