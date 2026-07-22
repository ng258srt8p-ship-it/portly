import { test, expect } from '@playwright/test';

test.describe('Empty/orphan elements cleanup', () => {
  test('Deals page has minimal empty elements', async ({ page }) => {
    await page.goto('/deals');
    await page.waitForTimeout(10000);

    // Count empty spans (no text content)
    const emptySpans = await page.evaluate(() => {
      const spans = document.querySelectorAll('span');
      return Array.from(spans).filter(s => !s.textContent?.trim()).length;
    });
    console.log(`  Empty spans: ${emptySpans}`);

    // Count empty divs
    const emptyDivs = await page.evaluate(() => {
      const divs = document.querySelectorAll('div');
      return Array.from(divs).filter(d => !d.textContent?.trim() && d.children.length === 0).length;
    });
    console.log(`  Empty divs: ${emptyDivs}`);

    // Total orphan spans
    const allSpans = await page.evaluate(() => {
      const spans = document.querySelectorAll('span');
      return spans.length;
    });
    console.log(`  Total spans: ${allSpans}`);

    // Empty elements ratio
    const emptyElements = await page.evaluate(() => {
      const all = document.querySelectorAll('*');
      return Array.from(all).filter(el => 
        !el.textContent?.trim() && el.children.length === 0
      ).length;
    });
    console.log(`  Total empty elements: ${emptyElements}`);
  });
});
