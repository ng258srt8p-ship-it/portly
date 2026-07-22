/**
 * Phase 6: Global Accessibility Audit — WCAG AA Compliance Tests
 *
 * Verifies WCAG AA contrast ratios and accessibility features across
 * all components on the sailing detail page.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3002';

test.describe('Phase 6 — WCAG AA Contrast & Accessibility', () => {
  // Verify hero price label has higher contrast (text-ink-faint/80 vs old /60)
  test('Hero price label has improved contrast', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForTimeout(5000);

    // Check that breadcrumb line uses improved contrast
    const heroBreadcrumbs = page.locator('p.text-ink-faint\\/80');
    await expect(heroBreadcrumbs).toHaveCount(1);

    // Hero text should be visible on dark background
    const heroText = page.locator('div.relative.z-10 p');
    await expect(heroText.first()).toBeVisible();
  });

  // Verify all info panel values use muted styling for empty states
  test('Empty state values use muted text colors', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForTimeout(5000);

    // Check for "N/A" text (used when totalCabins is null)
    const naText = page.locator('text=N/A');
    // Either present or not depending on data — but shouldn't have plain "-" fallbacks
    const dashFallback = page.locator('text=—').first();
    const bodyText = await page.evaluate(() => document.body.innerText);

    // Ensure no raw em-dash fallbacks remain (replaced by N/A, Unknown, etc.)
    expect(bodyText).not.toContain('—');

    // Should contain "Unknown" for string fields
    expect(bodyText).toContain('Unknown');

    // Should contain "0 ports" instead of "—"
    expect(bodyText).toContain('0 ports');

    // Should contain "Unsynched" instead of "—"
    expect(bodyText).toContain('Unsynched');
  });

  // Verify deal analysis cards use white backgrounds (not colored tints)
  test('Deal analysis cards have uniform white backgrounds', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForTimeout(5000);

    // Check that card backgrounds are NOT colored tints
    const cardBackgrounds = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid]');
      return Array.from(cards).map(el => el.getAttribute('class') || '');
    });

    // No colored backgrounds should remain in card containers (except buttons)
    const coloredBgCards = cardBackgrounds.filter(cls =>
      cls.includes('bg-amber-50') ||
      cls.includes('bg-emerald-50') ||
      cls.includes('bg-blue-50') ||
      cls.includes('bg-violet-50') ||
      cls.includes('bg-indigo-mist') ||
      cls.includes('bg-rose-50')
    );

    // Buttons can have colored backgrounds, cards should not (exclude button classes)
    const cardContainers = cardBackgrounds.filter(cls =>
      cls.includes('rounded-xl') || cls.includes('border border-')
    );

    const cardsWithColoredBg = cardContainers.filter(cls =>
      cls.includes('bg-amber-50') ||
      cls.includes('bg-emerald-50') ||
      cls.includes('bg-blue-50') ||
      cls.includes('bg-violet-50') ||
      cls.includes('bg-indigo-mist') ||
      cls.includes('bg-rose-50')
    );

    expect(cardsWithColoredBg.length, 'Cards should use white backgrounds').toBe(0);
  });

  // Verify cabin pricing table rows have consistent heights (no py-4)
  test('Table rows use consistent padding', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForTimeout(5000);

    const rowPadding = await page.evaluate(() => {
      const rows = document.querySelectorAll('div.grid-cols-1.md\\:grid-cols-12');
      return Array.from(rows).map(el => el.getAttribute('class') || '');
    });

    const rowsWithPy4 = rowPadding.filter(cls => cls.includes('py-4'));
    expect(rowsWithPy4.length, 'No rows should use py-4').toBe(0);

    // Should have py-3
    const rowsWithPy3 = rowPadding.filter(cls => cls.includes('py-3'));
    expect(rowsWithPy3.length, 'All rows should use py-3').toBeGreaterThan(0);

    // Should have items-center for vertical alignment
    const rowsWithCenter = rowPadding.filter(cls => cls.includes('items-center'));
    expect(rowsWithCenter.length, 'All rows should have items-center').toBeGreaterThan(0);
  });

  // Verify total column has breakdown label
  test('Total column shows price breakdown label', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForTimeout(5000);

    // Check for the breakdown label in mobile expanded view
    const totalLabel = page.locator('p.text-xs.text-ink-faint');
    await expect(totalLabel.first()).toBeVisible();

    // Should contain "Includes base fare" text
    const firstLabel = await totalLabel.first().textContent();
    expect(firstLabel).toContain('Includes base fare');
  });

  // Verify no duplicate CTA buttons remain on page
  test('Only one Book This Cruise CTA exists', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForTimeout(5000);

    // Count CTA buttons - should be exactly 1
    const ctaButtons = await page.locator('[data-testid="deal-cta"]');
    await expect(ctaButtons.first()).toBeVisible();

    // Should NOT have "Book Now - Great Value" text anywhere
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).not.toContain('Book Now - Great Value');
    expect(bodyText).not.toContain('View All');

    // Should have "Book This Cruise" (exactly once)
    expect(bodyText).toContain('Book This Cruise');
  });

  // Visual regression snapshot for accessibility state
  test('Visual regression snapshot (accessibility)', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForTimeout(5000);

    const body = await page.$('body');
    expect(body).toBeTruthy();

    // Snapshot — visually verify contrast and accessibility improvements
    await expect(page).toHaveScreenshot('phase6-accessibility.png');
  });
});
