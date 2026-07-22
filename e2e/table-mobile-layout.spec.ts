import { test, expect } from '@playwright/test';

/**
 * Focused diagnostic: Mobile layout issues in PriceComparisonTable
 */

test.describe('PriceComparisonTable - Mobile Layout', () => {
  test('check mobile row structure at 375px', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.setViewportSize({ width: 375, height: 900 });
    await page.waitForTimeout(500);

    // Scroll to the table section
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.scrollIntoView();
    });
    await page.waitForTimeout(300);

    // Find actual data rows (not header) - they contain "Inside", "Oceanview", etc.
    const dataRows = page.locator('div:has-text("Inside"), div:has-text("Oceanview"), div:has-text("Balcony")').first().locator('..').locator('..');
    
    // Get the parent container of all rows
    const tableContainer = page.locator('div.space-y-1').first();
    const containerBox = await tableContainer.boundingBox();
    console.log(`Table container: x=${containerBox?.x}, y=${containerBox?.y}, w=${containerBox?.width}, h=${containerBox?.height}`);

    // Get all row items
    const rows = tableContainer.locator('> div');
    const rowCount = await rows.count();
    console.log(`Found ${rowCount} data rows`);

    // Check first data row (Interior)
    const firstDataRow = rows.first();
    const firstRowBox = await firstDataRow.boundingBox();
    console.log(`\nFirst data row box: x=${firstRowBox?.x}, y=${firstRowBox?.y}, w=${firstRowBox?.width}, h=${firstRowBox?.height}`);

    // Get all child elements of the row
    const children = firstDataRow.locator('> *');
    const childCount = await children.count();
    console.log(`First row has ${childCount} direct children`);

    for (let i = 0; i < childCount; i++) {
      const child = children.nth(i);
      try {
        const box = await child.boundingBox();
        const text = await child.textContent();
        if (box) {
          console.log(`  Child ${i}: x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height}, text="${text?.substring(0, 50)}"`);
        }
      } catch (e) {
        // Some children might not be visible
      }
    }

    // Check for overflow in the row
    const overflowInfo = await page.evaluate(() => {
      const tableContainer = document.querySelector('div.space-y-1');
      if (!tableContainer) return null;
      
      const rows = tableContainer.querySelectorAll(':scope > div');
      let info = [];
      rows.forEach((row, i) => {
        if (i < 2) {
          info.push({
            index: i,
            scrollWidth: row.scrollWidth,
            clientWidth: row.clientWidth,
            hasOverflow: row.scrollWidth > row.clientWidth,
            overflowX: row.scrollWidth - row.clientWidth,
          });
        }
      });
      return info;
    });
    console.log('\nRow overflow info:');
    if (overflowInfo) {
      overflowInfo.forEach(info => {
        console.log(`  Row ${info.index}: scrollWidth=${info.scrollWidth}, clientWidth=${info.clientWidth}, overflow=${info.hasOverflow} (${info.overflowX}px)`);
      });
    }

    // Take screenshot of the table area
    await tableContainer.screenshot({ path: 'test-results/table-overlap-diagnostic/375w-table-container.png' });
  });

  test('check if mobile rows show prices inline or in expandable section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.setViewportSize({ width: 375, height: 900 });
    await page.waitForTimeout(500);

    // At mobile widths, prices should be hidden and only visible when expanded
    // Check if price text is visible in the row
    const hasBaseFare = await page.locator('text=$809').isVisible({ timeout: 2000 }).catch(() => false);
    const hasTotal = await page.locator('text=$2,136.98').isVisible({ timeout: 2000 }).catch(() => false);
    const hasSelectButton = await page.locator('button:has-text("Select")').first().isVisible({ timeout: 2000 }).catch(() => false);
    
    console.log(`\nAt 375px:`);
    console.log(`  Base Fare visible: ${hasBaseFare}`);
    console.log(`  Total visible: ${hasTotal}`);
    console.log(`  Select button visible: ${hasSelectButton}`);

    // If prices are visible at mobile width, that's the issue
    if (hasBaseFare || hasSelectButton) {
      console.log('\n⚠️  ISSUE: Mobile prices/buttons should be hidden but are visible!');
    }
  });

  test('compare desktop vs mobile layout at 1024px', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.waitForTimeout(500);

    // At 1024px (md breakpoint), rows should use grid-cols-12
    const tableContainer = page.locator('div.space-y-1').first();
    const rows = tableContainer.locator('> div');
    
    // Check if the row has grid-cols-12 class
    const firstRowClass = await rows.first().getAttribute('class');
    console.log(`\nFirst row classes at 1024px: ${firstRowClass}`);
    console.log(`Uses grid-cols-12: ${firstRowClass?.includes('md:grid-cols-12')}`);

    // Check button position relative to row
    const button = page.locator('button:has-text("Select")').first();
    const buttonBox = await button.boundingBox();
    const rowBox = await rows.first().boundingBox();
    
    if (buttonBox && rowBox) {
      console.log(`\nButton: x=${buttonBox.x}, y=${buttonBox.y}, w=${buttonBox.width}, h=${buttonBox.height}`);
      console.log(`Row: x=${rowBox.x}, y=${rowBox.y}, w=${rowBox.width}, h=${rowBox.height}`);
      console.log(`Button right edge: ${buttonBox.x + buttonBox.width}`);
      console.log(`Row right edge: ${rowBox.x + rowBox.width}`);
      console.log(`Button overflow from row: ${(buttonBox.x + buttonBox.width) - (rowBox.x + rowBox.width)}px`);
    }

    await rows.first().screenshot({ path: 'test-results/table-overlap-diagnostic/1024w-first-row.png' });
  });
});
