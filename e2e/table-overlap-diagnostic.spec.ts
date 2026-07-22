import { test, expect } from '@playwright/test';

/**
 * Diagnostic test: Capture the PriceComparisonTable at various viewport widths
 * to document overlapping elements (especially action buttons).
 */

test.describe('Table Overlap Diagnostic', () => {
  test('capture screenshots at progressive widths', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const widths = [1920, 1440, 1024, 768, 640, 540, 420, 375];

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      // Small wait for layout to settle
      await page.waitForTimeout(300);

      // Scroll to the table area (below the fold)
      await page.evaluate(() => {
        const el = document.querySelector('[class*="grid-cols-12"]');
        if (el) el.scrollIntoView({ behavior: 'instant' });
      });
      await page.waitForTimeout(200);

      // Take full-page screenshot
      await page.screenshot({
        path: `test-results/table-overlap-diagnostic/${width}w.png`,
        fullPage: false,
      });

      // Also capture just the table region if we can find it
      const tableRegion = page.locator('[class*="grid-cols-12"]').first();
      if (await tableRegion.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tableRegion.screenshot({
          path: `test-results/table-overlap-diagnostic/${width}w-table.png`,
        });
      }

      console.log(`Captured screenshot at ${width}px width`);
    }

    // Focus specifically on the button area at narrow widths
    await page.setViewportSize({ width: 420, height: 900 });
    await page.waitForTimeout(300);

    // Get button bounding boxes to detect overlap
    const buttons = await page.locator('button:has-text("Select")').all();
    if (buttons.length > 0) {
      const boxes = await Promise.all(buttons.map(b => b.boundingBox()));
      console.log('\nButton bounding boxes at 420px:');
      boxes.forEach((box, i) => {
        console.log(`  Button ${i}: x=${box?.x}, y=${box?.y}, w=${box?.width}, h=${box?.height}`);
      });

      // Check for overlaps between adjacent buttons
      for (let i = 0; i < boxes.length - 1; i++) {
        if (boxes[i] && boxes[i + 1]) {
          const overlap = boxes[i].x + boxes[i].width > boxes[i + 1].x;
          if (overlap) {
            console.log(`  ⚠️  OVERLAP detected between button ${i} and ${i + 1}`);
          }
        }
      }
    }

    // Check for text/content overflow in table rows
    const rows = await page.locator('[class*="grid grid-cols-1"]').all();
    console.log(`\nFound ${rows.length} table rows`);

    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const text = await rows[i].textContent();
      console.log(`Row ${i}: "${text?.substring(0, 100)}..."`);
    }

    // Check for horizontal scroll (sign of overflow)
    const hasHorizontalScroll = await page.evaluate(() => 
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    console.log(`\nHorizontal scroll present: ${hasHorizontalScroll}`);

    // Final screenshot at mobile width
    await page.setViewportSize({ width: 375, height: 900 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: 'test-results/table-overlap-diagnostic/375w-final.png',
      fullPage: true,
    });

    console.log('\nDiagnostic complete. Screenshots saved to test-results/table-overlap-diagnostic/');
  });

  test('check button visibility at narrow widths', async ({ page }) => {
    const narrowWidths = [768, 640, 540, 420, 375];

    for (const width of narrowWidths) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(300);

      // At mobile widths, the desktop buttons should be hidden (md:hidden)
      // and only the mobile expandable section should show buttons
      const desktopButtons = page.locator('button:has-text("Select")').first();
      const isVisible = await desktopButtons.isVisible({ timeout: 1000 }).catch(() => false);
      
      console.log(`At ${width}px: desktop Select button visible = ${isVisible}`);
    }
  });
});
