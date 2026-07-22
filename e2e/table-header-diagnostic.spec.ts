import { test, expect } from '@playwright/test';

/**
 * Diagnostic: Check table header layout at narrow widths
 */

test.describe('PriceComparisonTable - Header Layout', () => {
  test('check header column overlap at narrow widths', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // The header is hidden on mobile (hidden md:grid), so check at desktop widths
    const widths = [1024, 900, 850, 800, 768];

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(300);

      // Find the header row
      const header = page.locator('div[class*="grid-cols-12 gap-3 px-4 py-3 mb-1"]').first();
      const headerBox = await header.boundingBox();
      
      if (!headerBox) {
        console.log(`${width}px: Header not found (might be hidden)`);
        continue;
      }

      // Get all header columns
      const columns = header.locator('> div');
      const colCount = await columns.count();
      
      let maxRight = 0;
      let colInfo = [];
      
      for (let i = 0; i < colCount; i++) {
        const col = columns.nth(i);
        const box = await col.boundingBox();
        const text = await col.textContent();
        
        if (box && box.width > 0) {
          const right = box.x + box.width;
          maxRight = Math.max(maxRight, right);
          colInfo.push({
            index: i,
            text: text?.trim()?.substring(0, 20),
            x: box.x,
            w: box.width,
            right: right,
          });
        }
      }

      const overflow = maxRight - (headerBox.x + headerBox.width);
      
      console.log(`${width}px: headerW=${headerBox.width}, maxRight=${maxRight}, overflow=${overflow.toFixed(1)}px`);
      
      colInfo.forEach(c => {
        console.log(`  Col ${c.index}: "${c.text}" x=${c.x}, w=${c.w}, right=${c.right}`);
      });
    }

    // Check for text overlap in header columns
    const hasOverlap = await page.evaluate(() => {
      const headers = document.querySelectorAll('div[class*="grid-cols-12"] > div');
      let overlaps = [];
      
      headers.forEach((header, i) => {
        if (i < 5) { // Check first 5 headers
          const children = header.children;
          for (let j = 0; j < children.length - 1; j++) {
            const rect1 = children[j].getBoundingClientRect();
            const rect2 = children[j + 1].getBoundingClientRect();
            
            // Check if rectangles overlap
            if (rect1.right > rect2.left && rect1.left < rect2.right) {
              overlaps.push({
                headerIndex: i,
                child1: children[j].textContent?.substring(0, 20),
                child2: children[j + 1].textContent?.substring(0, 20),
              });
            }
          }
        }
      });
      
      return overlaps;
    });
    
    console.log(`\nText overlap detected: ${hasOverlap.length > 0}`);
    if (hasOverlap.length > 0) {
      hasOverlap.forEach(o => {
        console.log(`  Header ${o.headerIndex}: "${o.child1}" overlaps "${o.child2}"`);
      });
    }
  });

  test('check if header is responsive', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check header visibility at different widths
    const widths = [1024, 768, 767, 700, 640];

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(200);

      const header = page.locator('div[class*="grid-cols-12 gap-3 px-4 py-3 mb-1"]').first();
      const isVisible = await header.isVisible({ timeout: 1000 }).catch(() => false);
      
      console.log(`${width}px: header visible = ${isVisible}`);
    }
  });

  test('capture header screenshots at critical widths', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const widths = [1024, 900, 850, 800, 768];

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(300);

      // Scroll to table
      await page.evaluate(() => {
        const el = document.querySelector('div[class*="grid-cols-12"]');
        if (el) el.scrollIntoView();
      });
      await page.waitForTimeout(200);

      const header = page.locator('div[class*="grid-cols-12 gap-3 px-4 py-3 mb-1"]').first();
      if (await header.isVisible({ timeout: 1000 }).catch(() => false)) {
        await header.screenshot({ 
          path: `test-results/table-overlap-diagnostic/header-${width}w.png` 
        });
        console.log(`Captured header at ${width}px`);
      }
    }
  });
});
