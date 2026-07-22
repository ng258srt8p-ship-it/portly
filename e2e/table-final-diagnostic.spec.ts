import { test, expect } from '@playwright/test';

/**
 * Final diagnostic: Identify the exact overlap issue
 */

test.describe('PriceComparisonTable - Final Diagnostic', () => {
  test('check for overlap at critical widths', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // The user mentioned button overlap. Let's check widths where both desktop and mobile elements might coexist
    const testWidths = [768, 700, 640, 580, 520, 460, 400];

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
      const firstRow = tableContainer.locator('> div').first();
      
      // Get all direct children and their positions
      const children = firstRow.locator(':scope > *');
      const childCount = await children.count();
      
      let maxRight = 0;
      let childInfo = [];
      
      for (let i = 0; i < childCount; i++) {
        try {
          const child = children.nth(i);
          const box = await child.boundingBox();
          const cls = await child.getAttribute('class');
          
          if (box && box.width > 0 && box.height > 0) {
            const right = box.x + box.width;
            maxRight = Math.max(maxRight, right);
            childInfo.push({
              index: i,
              x: box.x,
              w: box.width,
              right: right,
              class: cls?.substring(0, 80),
            });
          }
        } catch (e) {}
      }

      const rowBox = await firstRow.boundingBox();
      const overflow = maxRight - (rowBox?.x + rowBox?.width || 0);
      
      console.log(`${width}px: rowW=${rowBox?.width}, maxRight=${maxRight}, overflow=${overflow.toFixed(1)}px`);
      
      if (overflow > 0 || childInfo.length > 0) {
        childInfo.forEach(c => {
          console.log(`  Child ${c.index}: x=${c.x}, w=${c.w}, right=${c.right}, class="${c.class}"`);
        });
      }
    }

    // Check for horizontal scroll (sign of overflow)
    const hasHorizontalScroll = await page.evaluate(() => 
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    console.log(`\nHorizontal scroll present: ${hasHorizontalScroll}`);
  });

  test('check expanded mobile rows for overflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.setViewportSize({ width: 375, height: 900 });
    await page.waitForTimeout(500);

    // Scroll to table
    await page.evaluate(() => {
      const el = document.querySelector('div.space-y-1');
      if (el) el.scrollIntoView();
    });
    await page.waitForTimeout(300);

    const tableContainer = page.locator('div.space-y-1').first();
    const rows = tableContainer.locator('> div');
    
    // Click first row to expand
    await rows.first().click();
    await page.waitForTimeout(500);

    // Now check the expanded content
    const expandedDiv = page.locator('div[class*="mt-3 pt-3 border-t"]').first();
    const isVisible = await expandedDiv.isVisible({ timeout: 2000 }).catch(() => false);
    
    console.log(`Expanded section visible: ${isVisible}`);

    if (isVisible) {
      // Check all children in expanded section
      const children = expandedDiv.locator(':scope > *');
      const childCount = await children.count();
      
      let maxRight = 0;
      for (let i = 0; i < childCount; i++) {
        try {
          const child = children.nth(i);
          const box = await child.boundingBox();
          if (box && box.width > 0) {
            maxRight = Math.max(maxRight, box.x + box.width);
          }
        } catch (e) {}
      }

      const sectionBox = await expandedDiv.boundingBox();
      const overflow = maxRight - (sectionBox?.x + sectionBox?.width || 0);
      
      console.log(`Expanded section: w=${sectionBox?.width}, maxRight=${maxRight}, overflow=${overflow.toFixed(1)}px`);

      // Check the button specifically
      const button = expandedDiv.locator('button').first();
      const buttonBox = await button.boundingBox();
      console.log(`Button: x=${buttonBox?.x}, w=${buttonBox?.width}, right=${buttonBox?.x + buttonBox?.width}`);
    }

    // Take screenshot
    await rows.first().screenshot({ path: 'test-results/table-overlap-diagnostic/final-375w-expanded.png' });
  });

  test('check if rows are expanded by default', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.setViewportSize({ width: 375, height: 900 });
    await page.waitForTimeout(500);

    // Check if any expanded sections exist without clicking
    const expandedSections = await page.locator('div[class*="mt-3 pt-3 border-t"]').all();
    console.log(`Expanded sections without clicking: ${expandedSections.length}`);

    // Check the state of expandedTier in the component
    const state = await page.evaluate(() => {
      // Try to find React component state
      const rows = document.querySelectorAll('div[class*="grid grid-cols-1"]');
      let info = [];
      rows.forEach((row, i) => {
        if (i < 3) {
          // Check if any child has the expanded section styles
          const hasExpanded = row.querySelector('div[class*="mt-3 pt-3 border-t"]') !== null;
          info.push({ index: i, hasExpanded });
        }
      });
      return info;
    });
    
    console.log('Row expansion state:');
    state.forEach(s => console.log(`  Row ${s.index}: expanded=${s.hasExpanded}`));
  });
});
