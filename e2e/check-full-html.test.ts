import { test, expect } from '@playwright/test';

test('Check full HTML structure', async ({ page }) => {
  await page.goto('/deals');
  await page.waitForSelector('[data-testid="deal-card"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="filter-bar"]', { timeout: 5000 });
  
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(1000);
  
  // Get the filter bar HTML - full version
  const filterBar = await page.$('[data-testid="filter-bar"]');
  if (filterBar) {
    const html = await filterBar.innerHTML();
    console.log('=== FULL FILTER BAR HTML ===');
    console.log(html);
  }
  
  // Check for React errors in console
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  await page.waitForTimeout(1000);
  
  if (consoleErrors.length > 0) {
    console.log('\n=== CONSOLE ERRORS ===');
    consoleErrors.forEach(e => console.log(e));
  }
});
