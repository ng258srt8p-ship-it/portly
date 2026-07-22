import { test, expect } from '@playwright/test';

test('Debug filter visibility', async ({ page }) => {
  await page.goto('/deals');
  await page.waitForSelector('[data-testid="filter-bar"]', { timeout: 10000 });
  
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(1000);
  
  // Get all visible filter elements
  const visibleFilters = await page.evaluate(() => {
    const filters = document.querySelectorAll('[data-testid]');
    return Array.from(filters)
      .map(el => {
        const rect = el.getBoundingClientRect();
        return {
          testId: el.getAttribute('data-testid'),
          visible: rect.width > 0 && rect.height > 0,
          text: el.textContent?.slice(0, 50),
        };
      })
      .filter(f => f.testId)
      .sort((a, b) => (a.testId || '').localeCompare(b.testId || ''));
  });
  
  console.log('Visible filters:');
  visibleFilters.forEach(f => {
    console.log(`  ${f.testId}: ${f.visible ? '✓' : '✗'} - ${f.text?.slice(0, 40)}`);
  });
  
  // Check specific elements
  const priceMin = page.locator('[data-testid="filter-price-min"]');
  const priceMax = page.locator('[data-testid="filter-price-max"]');
  
  const minRect = await priceMin.boundingBox();
  const maxRect = await priceMax.boundingBox();
  
  console.log(`\nPrice min box: ${JSON.stringify(minRect)}`);
  console.log(`Price max box: ${JSON.stringify(maxRect)}`);
});
