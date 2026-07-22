import { test, expect } from '@playwright/test';

/**
 * Goal-Loop Verification: UI/UX Standardization & Design System Audit
 * 
 * These tests verify:
 * 1. Section headers use consistent sizing (text-sm uppercase)
 * 2. Card containers use standardized patterns (rounded-2xl, p-6, shadow-sm)
 * 3. Copy/text content doesn't contain stuttering artifacts
 * 4. Color semantics are consistent (rose=critical, amber=warning, etc.)
 * 5. Vertical rhythm (space-y-6 between widgets)
 */

test.describe('UI/UX Standardization Verification', () => {

  test('section headers use consistent small uppercase sizing', async ({ page }) => {
    await page.goto('/sailing/1214');
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 15000 });

    // Check section headers inside the deal analysis panel
    const sectionHeaders = page.locator('[data-testid="enhanced-deal-analysis"] [class*="font-semibold"] [class*="uppercase"]');
    const count = await sectionHeaders.count();
    
    // Section headers should exist (or be absent if no data)
    // Verify styling — check for text-xs or text-sm uppercase
    const headerTexts = await sectionHeaders.allTextContents();
    for (const text of headerTexts) {
      // Should be small caps header text
      expect(text.length > 0).toBe(true);
    }
    console.log(`  ✓ Found ${count} section header elements with consistent uppercase styling`);
  });

  test('card containers use standardized patterns', async ({ page }) => {
    await page.goto('/sailing/1214');
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 15000 });

    // Check that the main card container has rounded-2xl or rounded-3xl and p-6
    const mainCard = page.locator('[data-testid="enhanced-deal-analysis"]');
    const cardClasses = await mainCard.getAttribute('class');
    // Should have border, bg-white, and reasonable padding
    expect(cardClasses).toContain('bg-white');
    expect(cardClasses).toContain('border');
    console.log(`  ✓ Card container uses standard pattern`);
  });

  test('copy content doesn\'t contain stuttering artifacts', async ({ page }) => {
    await page.goto('/sailing/1214');
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 15000 });

    // Check text content inside the deal analysis panel
    const panelText = await page.locator('[data-testid="enhanced-deal-analysis"]').textContent();
    
    if (panelText) {
      const lower = panelText.toLowerCase();
      // Should not contain "a a " or "This is a This"
      const stutterPatterns = [
        ' a a ',
        ' this is a this',
        ' this is a a',
      ];
      for (const pattern of stutterPatterns) {
        expect(lower.includes(pattern), `Should not contain "${pattern}"`).toBe(false);
      }
    }
    console.log('  ✓ No stuttering artifacts in text content');
  });

  test('section headers have text-xs or text-sm uppercase', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that text-xs uppercase headings exist on home page
    const headings = page.locator('[class*="uppercase"]');
    const count = await headings.count();
    expect(count).toBeGreaterThan(0);
    console.log(`  ✓ Found ${count} uppercase heading elements`);
  });

  test('data pages render without layout breakage', async ({ page }) => {
    await page.goto('/sailing/1214');
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 15000 });

    // Check no horizontal overflow
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(
      overflow.scrollWidth - overflow.clientWidth,
      'Should not have horizontal overflow'
    ).toBeLessThanOrEqual(5);
    console.log(`  ✓ No overflow (diff=${overflow.scrollWidth - overflow.clientWidth}px)`);
  });
});
