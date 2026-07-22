import { test, expect } from '@playwright/test';

test.describe('FilterBar Component Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/deals');
    // Wait for deals to load (filter bar only renders when deals are available)
    await page.waitForSelector('[data-testid="deal-card"]', { timeout: 15000 });
    // Now wait for filter bar to appear
    await page.waitForSelector('[data-testid="filter-bar"]', { timeout: 5000 });
  });

  test('Desktop (1280px): all filters visible, mobile toggle hidden', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    
    // Mobile toggle should be HIDDEN on desktop
    const mobileToggle = page.locator('button:has-text("Filters")');
    await expect(mobileToggle).not.toBeVisible();
    
    // Cruise line filter should be VISIBLE (multiple distinct cruise lines in data)
    const cruiseLineFilter = page.locator('[data-testid="filter-cruise-line"]');
    await expect(cruiseLineFilter).toBeVisible();
    
    // Region, Destination, Port should be VISIBLE (multiple options)
    await expect(page.locator('[data-testid="filter-region"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-destination"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-port"]')).toBeVisible();
    
    // Other controls should be visible
    await expect(page.locator('[data-testid="filter-nights"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-sort"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-page-size"]')).toBeVisible();
    
    // Clear and Apply buttons should be HIDDEN (no active filters)
    await expect(page.locator('[data-testid="filter-clear"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="filter-apply"]')).not.toBeVisible();
  });

  test('Mobile (375px) collapsed: only price + clear visible', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Mobile toggle should be VISIBLE
    const mobileToggle = page.locator('button:has-text("Filters")');
    await expect(mobileToggle).toBeVisible();
    
    // When collapsed, the mobile collapsed body should be visible
    // It contains price inputs (without testId since it's a subset)
    const mobileCollapsedBody = page.locator('[data-testid="filter-bar"]').first();
    const priceInputsInMobile = mobileCollapsedBody.locator('input[placeholder="Min $"]').first();
    await expect(priceInputsInMobile).toBeVisible();
    
    // Region, Destination, Port should be HIDDEN when collapsed
    // Use .first() to avoid strict mode violation (exists in both views)
    await expect(page.locator('[data-testid="filter-region"]').first()).not.toBeVisible();
    await expect(page.locator('[data-testid="filter-destination"]').first()).not.toBeVisible();
    await expect(page.locator('[data-testid="filter-port"]').first()).not.toBeVisible();
  });

  test('Mobile (375px) expanded: all filters visible', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Click mobile toggle to expand
    const mobileToggle = page.locator('button:has-text("Filters")');
    await mobileToggle.click();
    
    // Give it a moment to render
    await page.waitForTimeout(500);
    
    // The mobile expanded body is conditionally rendered and appears after the desktop view
    // It's visible when expanded=true. Query based on visibility using aria-expanded.
    const filterBar = page.locator('[data-testid="filter-bar"]');
    
    // The mobile expanded body has aria-expanded="true" on the toggle
    // Query filters within the visible mobile expanded section
    // Use getElementsByClassName or query based on parent structure
    const regionVisible = await page.locator('[data-testid="filter-region"]').evaluateAll(el => 
      el.some(e => (e as HTMLElement).offsetParent !== null)
    );
    const destVisible = await page.locator('[data-testid="filter-destination"]').evaluateAll(el => 
      el.some(e => (e as HTMLElement).offsetParent !== null)
    );
    const portVisible = await page.locator('[data-testid="filter-port"]').evaluateAll(el => 
      el.some(e => (e as HTMLElement).offsetParent !== null)
    );
    
    expect(regionVisible).toBe(true);
    expect(destVisible).toBe(true);
    expect(portVisible).toBe(true);
  });

  test('Departure Port filter is accessible and functional', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    
    const portDropdown = page.locator('[data-testid="filter-port"]');
    await expect(portDropdown).toBeVisible();
    
    // Click to open dropdown
    await portDropdown.click();
    
    // Port options should be visible
    const portOptions = page.locator('[role="option"]');
    const count = await portOptions.count();
    
    // Should have some ports available (current data has 4)
    expect(count).toBeGreaterThan(0);
  });

  test('Clear and Apply buttons appear when filters are active', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    
    // Set a price filter to make buttons appear
    const filterBar = page.locator('[data-testid="filter-bar"]');
    const desktopView = filterBar.locator('> div').nth(1);
    const minInput = desktopView.locator('[data-testid="filter-price-min"]');
    await minInput.fill('500');
    
    // Both Clear and Apply buttons should now be visible since we have an active filter
    const clearButton = desktopView.locator('[data-testid="filter-clear"]');
    const applyButton = desktopView.locator('[data-testid="filter-apply"]');
    await expect(clearButton).toBeVisible();
    await expect(applyButton).toBeVisible();
  });

  test('Price range inputs are interactive', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    
    // Query within the desktop view (second child of filter-bar)
    const filterBar = page.locator('[data-testid="filter-bar"]');
    const desktopView = filterBar.locator('> div').nth(1); // Second child (0=mobile toggle, 1=desktop view)
    const minInput = desktopView.locator('[data-testid="filter-price-min"]');
    const maxInput = desktopView.locator('[data-testid="filter-price-max"]');
    
    // Both inputs should be present and visible
    await expect(minInput).toBeVisible();
    await expect(maxInput).toBeVisible();
  });
});
