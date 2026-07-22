import { test, expect } from '@playwright/test';

/**
 * Diagnostic: Find the exact breakpoint where layout breaks
 */

test.describe('PriceComparisonTable - Breakpoint Analysis', () => {
  test('find exact breakpoint where buttons overflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Test widths from 768 down to 600 in 20px increments
    const widths = [768, 748, 728, 708, 688, 668, 648, 628, 608];

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(200);

      // Check row layout class
      const tableContainer = page.locator('div.space-y-1').first();
      const firstRow = tableContainer.locator('> div').first();
      const rowClass = await firstRow.getAttribute('class');
      const usesGrid12 = rowClass?.includes('md:grid-cols-12');

      // Check button visibility and position
      const button = page.locator('button:has-text("Select")').first();
      const buttonVisible = await button.isVisible({ timeout: 1000 }).catch(() => false);
      
      let overflowInfo = null;
      if (buttonVisible && usesGrid12) {
        const buttonBox = await button.boundingBox();
        const rowBox = await firstRow.boundingBox();
        
        if (buttonBox && rowBox) {
          const buttonRight = buttonBox.x + buttonBox.width;
          const rowRight = rowBox.x + rowBox.width;
          overflowInfo = {
            buttonRight,
            rowRight,
            overflow: buttonRight - rowRight,
          };
        }
      }

      const status = !buttonVisible ? 'MOBILE (hidden)' : 
                     overflowInfo && overflowInfo.overflow > 0 ? '⚠️ OVERFLOW' : 
                     '✓ OK';
      
      console.log(`${width}px: ${status} | grid-cols-12: ${usesGrid12} | button visible: ${buttonVisible}${
        overflowInfo ? ` | overflow: ${overflowInfo.overflow.toFixed(1)}px` : ''
      }`);
    }

    // Now test the problematic range in more detail
    console.log('\n--- Detailed analysis around breakpoint ---');
    for (let width = 700; width <= 768; width += 10) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(100);

      const tableContainer = page.locator('div.space-y-1').first();
      const firstRow = tableContainer.locator('> div').first();
      const rowClass = await firstRow.getAttribute('class');
      
      // Get all children positions
      const children = firstRow.locator('> *');
      const childCount = await children.count();
      
      let maxRightEdge = 0;
      for (let i = 0; i < childCount; i++) {
        try {
          const box = await children.nth(i).boundingBox();
          if (box && box.x + box.width > maxRightEdge) {
            maxRightEdge = box.x + box.width;
          }
        } catch (e) {}
      }

      const rowBox = await firstRow.boundingBox();
      const overflow = maxRightEdge - (rowBox?.x + rowBox?.width || 0);
      
      if (overflow > 0) {
        console.log(`${width}px: ⚠️ OVERFLOW ${overflow.toFixed(1)}px | row width: ${rowBox?.width} | max content right: ${maxRightEdge}`);
      }
    }
  });

  test('capture problematic width screenshots', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Test the exact breakpoint area
    const testWidths = [768, 740, 720, 700, 680, 660];

    for (const width of testWidths) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(300);

      // Scroll to table
      await page.evaluate(() => {
        const el = document.querySelector('div.space-y-1');
        if (el) el.scrollIntoView();
      });
      await page.waitForTimeout(200);

      const tableContainer = page.locator('div.space-y-1').first();
      await tableContainer.screenshot({ 
        path: `test-results/table-overlap-diagnostic/breakpoint-${width}w.png` 
      });

      console.log(`Captured ${width}px`);
    }
  });
});
