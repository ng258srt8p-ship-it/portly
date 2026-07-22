import { test, expect } from '@playwright/test';

/**
 * Diagnostic: Test mobile expandable behavior
 */

test.describe('PriceComparisonTable - Mobile Expand', () => {
  test('check mobile expanded row at 375px', async ({ page }) => {
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

    // Find a data row (not header)
    const tableContainer = page.locator('div.space-y-1').first();
    const rows = tableContainer.locator('> div');
    
    // Click first row to expand
    await rows.first().click();
    await page.waitForTimeout(500);

    // Check if expanded content is visible
    const expandedSection = page.locator('div[class*="mt-3 pt-3 border-t"]').first();
    const isVisible = await expandedSection.isVisible({ timeout: 2000 }).catch(() => false);
    
    console.log(`Expanded section visible: ${isVisible}`);

    if (isVisible) {
      // Take screenshot of expanded row
      await expandedSection.screenshot({ path: 'test-results/table-overlap-diagnostic/375w-expanded.png' });

      // Check button position in expanded section
      const button = expandedSection.locator('button').first();
      const buttonBox = await button.boundingBox();
      const sectionBox = await expandedSection.boundingBox();
      
      if (buttonBox && sectionBox) {
        console.log(`\nExpanded section: w=${sectionBox.width}`);
        console.log(`Button: x=${buttonBox.x}, w=${buttonBox.width}, right=${buttonBox.x + buttonBox.width}`);
        console.log(`Button overflow: ${(buttonBox.x + buttonBox.width) - sectionBox.width}px`);
      }

      // Check for overflow in expanded section
      const overflow = await page.evaluate(() => {
        const sections = document.querySelectorAll('div[class*="mt-3 pt-3 border-t"]');
        let info = [];
        sections.forEach((section, i) => {
          if (i < 2) {
            info.push({
              index: i,
              scrollWidth: section.scrollWidth,
              clientWidth: section.clientWidth,
              hasOverflow: section.scrollWidth > section.clientWidth,
            });
          }
        });
        return info;
      });
      
      console.log('\nExpanded section overflow:');
      overflow.forEach(o => {
        console.log(`  Section ${o.index}: scrollWidth=${o.scrollWidth}, clientWidth=${o.clientWidth}, overflow=${o.hasOverflow}`);
      });
    } else {
      console.log('Expanded section not found or not visible');
      
      // Check if any expandable content exists
      const allButtons = await page.locator('button').all();
      console.log(`Total buttons on page: ${allButtons.length}`);
      
      // Check the row structure
      const firstRow = rows.first();
      const rowClass = await firstRow.getAttribute('class');
      console.log(`\nFirst row classes: ${rowClass}`);
    }

    // Also check the unexpanded row structure
    const firstRowBox = await rows.first().boundingBox();
    console.log(`\nFirst row box: x=${firstRowBox?.x}, y=${firstRowBox?.y}, w=${firstRowBox?.width}, h=${firstRowBox?.height}`);
    
    await rows.first().screenshot({ path: 'test-results/table-overlap-diagnostic/375w-unexpanded.png' });
  });

  test('check mobile layout at various widths', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const widths = [768, 640, 540, 420, 375];

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(300);

      // Scroll to table
      await page.evaluate(() => {
        const el = document.querySelector('div.space-y-1');
        if (el) el.scrollIntoView();
      });
      await page.waitForTimeout(200);

      // Check what's visible in the row
      const tableContainer = page.locator('div.space-y-1').first();
      const firstRow = tableContainer.locator('> div').first();
      
      // Get all visible text content
      const text = await firstRow.textContent();
      
      // Check for specific elements
      const hasBaseFare = await page.locator('text=/Base Fare|\\$\\d+/').first().isVisible({ timeout: 1000 }).catch(() => false);
      const hasSelectButton = await page.locator('button:has-text("Select")').first().isVisible({ timeout: 1000 }).catch(() => false);
      
      console.log(`${width}px: hasPrices=${hasBaseFare}, hasButton=${hasSelectButton}, text="${text?.substring(0, 60)}"`);
    }
  });
});
