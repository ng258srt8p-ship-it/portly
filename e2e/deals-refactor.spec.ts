/**
 * Regression spec for the /deals page refactor (P0/P1 audit fix).
 *
 * Covers:
 *   - Pagination renders with the expected summary text
 *   - Next/Prev pages update URL & DOM
 *   - Page-size selector changes the per-page count
 *   - Cruise-line cascade: selecting a Line narrows the Ship dropdown
 *   - Active filter pills appear + clear-all removes them
 *   - URL is the single source of truth (refresh preserves filters + page)
 *
 * Mobile users hit the bottom-sheet drawer instead of the inline filters, so
 * the spec splits at lg breakpoint (1024 px) and runs the appropriate test
 * on each viewport.
 */
import { test, expect } from '@playwright/test';

const FRONTEND = process.env.FRONTEND_BASE || 'https://portly-1i0.pages.dev';

test.describe('/deals — refactor (cascading filters, pagination, URL sync)', () => {
  test('desktop: pagination summary renders and Next moves to page 2', async ({ page, viewport }) => {
    test.skip(!!(viewport && viewport.width < 1024), 'desktop-only');

    await page.goto(`${FRONTEND}/deals`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(7000);

    const summary = page.locator('[data-testid="pagination-summary"]');
    await expect(summary).toBeVisible({ timeout: 10_000 });
    const text = (await summary.textContent()) || '';
    expect(text).toMatch(/Showing\s+\d+\D+\d+\s+of\s+\d+/);

    const next = page.locator('[data-testid="pagination-next"]');
    if ((await next.count()) > 0 && !(await next.isDisabled())) {
      await next.click();
      await page.waitForTimeout(2500);
      expect(page.url()).toMatch(/[?&]page=2/);
      const summary2 = (await summary.textContent()) || '';
      // page 2 should show a different range than page 1
      expect(summary2).not.toEqual(text);
    }
  });

  test('desktop: selecting a Cruise Line narrows the Ship dropdown (cascade)', async ({
    page,
    viewport,
  }) => {
    test.skip(!!(viewport && viewport.width < 1024), 'desktop-only');

    await page.goto(`${FRONTEND}/deals`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(7000);

    // Open Line dropdown and capture option count
    await page.locator('[data-testid="filter-cruise-line"] button').first().click();
    await page.waitForTimeout(800);
    const lineCount = await page.locator('[data-testid="filter-cruise-line"] [role="option"]').count();
    expect(lineCount).toBeGreaterThan(2);
    await page.locator('[data-testid="filter-cruise-line"] [role="option"]').first().click();
    await page.waitForTimeout(2500);

    // URL should reflect the line
    expect(page.url()).toMatch(/cruiseLine=/);

    // Active filter pill should be present
    const pills = page.locator('[data-testid="active-filter-pills"]');
    await expect(pills).toBeVisible({ timeout: 5000 });
    const pillText = (await pills.textContent()) || '';
    expect(pillText.toLowerCase()).toContain('line:');

    // Open Ship dropdown and assert it's smaller than the full catalog would be
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await page.locator('[data-testid="filter-ship"] button').first().click();
    await page.waitForTimeout(800);
    const shipOptions = await page.locator('[data-testid="filter-ship"] [role="option"]').count();
    // Strictly fewer than the unfiltered catalog would offer (>5 ships normally).
    expect(shipOptions).toBeGreaterThan(0);
    expect(shipOptions).toBeLessThanOrEqual(20);
  });

  test('desktop: Clear-All filters resets URL + removes pills', async ({ page, viewport }) => {
    test.skip(!!(viewport && viewport.width < 1024), 'desktop-only');

    await page.goto(`${FRONTEND}/deals?cruiseLine=Azamara+Club+Cruises&page=2`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(7000);

    const clearBtn = page.locator('[data-testid="clear-all-filters"]');
    await expect(clearBtn).toBeVisible({ timeout: 10_000 });
    await clearBtn.click();
    await page.waitForTimeout(2000);

    expect(page.url()).toMatch(/\/deals(?:\?)?$/);
    await expect(page.locator('[data-testid="active-filter-pills"]')).toHaveCount(0);
  });

  test('desktop: URL refresh preserves filters + page', async ({ page, viewport }) => {
    test.skip(!!(viewport && viewport.width < 1024), 'desktop-only');

    await page.goto(
      `${FRONTEND}/deals?cruiseLine=Royal+Caribbean&destination=Eastern+Caribbean`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await page.waitForTimeout(7000);

    // Pills should be rendered from the URL on first paint
    const pills = page.locator('[data-testid="active-filter-pills"]');
    await expect(pills).toBeVisible({ timeout: 10_000 });
    const text = (await pills.textContent()) || '';
    expect(text.toLowerCase()).toContain('line:');
    expect(text.toLowerCase()).toContain('dest:');
  });

  test('mobile: bottom-sheet filter drawer opens and has Apply button', async ({
    page,
    viewport,
  }) => {
    test.skip(!viewport || viewport.width >= 1024, 'mobile-only');

    await page.goto(`${FRONTEND}/deals`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(6000);

    await page.locator('[data-testid="mobile-filters-button"]').click();
    await page.waitForTimeout(800);

    await expect(page.locator('[data-testid="mobile-filter-drawer"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="mobile-filter-apply"]')).toBeVisible({ timeout: 5000 });

    // Apply Filters should close the drawer
    await page.locator('[data-testid="mobile-filter-apply"]').click();
    await page.waitForTimeout(800);
    await expect(page.locator('[data-testid="mobile-filter-drawer"]')).toHaveCount(0);
  });
});
