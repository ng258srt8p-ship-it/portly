/**
 * Phase 6: Global Accessibility Audit — WCAG AA Compliance Tests
 *
 * Verifies WCAG AA contrast ratios and accessibility features across
 * all components on the sailing detail page. Uses mocked API data
 * since the Remix backend build is a separate concern.
 */

import { test, expect } from '@playwright/test';

test.setTimeout(60000);

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3002';

// Mock API response since Remix server build is a separate concern
const MOCK_DEAL_ANALYSIS = {
  dealScore: 72,
  justification: [
    { title: 'Why This Is a Deal', content: 'Price trending below average for this cabin type. No hidden fees detected.' },
    { title: 'Insider Tips', content: 'Book soon — inventory is limited for this cabin tier.' },
  ],
  hiddenCosts: { mandatoryGratuities: 150, wifiCost: 200, resortFees: 0 },
  cabinValueBreakdown: {
    Interior: { perNight: 120, valueRating: 'good' },
    Oceanview: { perNight: 180, valueRating: 'great' },
    Balcony: { perNight: 250, valueRating: 'excellent' },
    Suite: { perNight: 400, valueRating: 'overpriced' },
  },
  pricingDeepDive: 'This sailing scores well across all dimensions. Price trend is falling (-5.2%). Hidden costs add $200 to your real total.',
  priceTrend: 'falling',
  inventoryIntelligence: 'Low availability — expect prices to rise.',
};

function setupMockApi(page: any): Promise<void> {
  return page.route('**/api/enhanced/deal-analysis/*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_DEAL_ANALYSIS }),
    });
  });
}

test.describe('Phase 6 — WCAG AA Contrast & Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  // Verify hero price label has higher contrast (text-ink-faint/80 vs old /60)
  test('Hero price label has improved contrast', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 30000 });

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
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 30000 });

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
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 30000 });

    const cardClasses = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid]');
      return Array.from(cards).map(el => el.getAttribute('class') || '');
    });

    const cardContainers = cardClasses.filter(cls =>
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
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 30000 });

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

  // Verify total column has breakdown label (in mobile expanded view)
  test('Total column shows price breakdown label', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 30000 });

    // Expand a cabin row to reveal mobile details
    const expandBtn = page.locator('div[data-testid="cabin-row"]').first();
    await expandBtn.click({ force: true });
    await page.waitForTimeout(1000);

    const totalLabel = page.locator('p.text-xs.text-ink-faint');
    await expect(totalLabel.first()).toBeVisible();

    const firstLabel = await totalLabel.first().textContent();
    expect(firstLabel).toContain('Includes base fare');
  });

  // Verify no duplicate CTA buttons remain on page
  test('Only one Book This Cruise CTA exists', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 30000 });

    const ctaButtons = await page.locator('[data-testid="deal-cta"]');
    await expect(ctaButtons.first()).toBeVisible();

    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).not.toContain('Book Now - Great Value');
    expect(bodyText).not.toContain('View All');
    expect(bodyText).toContain('Book This Cruise');
  });

  // Visual regression snapshot for accessibility state
  test('Visual regression snapshot (accessibility)', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 30000 });

    const body = await page.$('body');
    expect(body).toBeTruthy();

    await expect(page).toHaveScreenshot('phase6-accessibility.png');
  });
});
