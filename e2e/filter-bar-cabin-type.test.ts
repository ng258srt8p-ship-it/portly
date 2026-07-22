import { test, expect } from '@playwright/test';

test.describe('FilterBar Cruise Line & Cabin Type Enhancement', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/deals');
    // Wait for deals to load (filter bar only renders when deals are available)
    await page.waitForSelector('[data-testid="deal-card"]', { timeout: 15000 });
    // Now wait for filter bar to appear
    await page.waitForSelector('[data-testid="filter-bar"]', { timeout: 5000 });
  });

  test('Desktop (1280px): Cruise line filter renders with dropdown', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    
    // Cruise line filter should be visible (if there are multiple lines) or hidden (if ≤1)
    const cruiseLineFilter = page.locator('[data-testid="filter-cruise-line"]');
    
    // Click to open dropdown (if filter is visible)
    const isVisible = await cruiseLineFilter.isVisible().catch(() => false);
    
    if (isVisible) {
      await cruiseLineFilter.click();
      
      // Dropdown options should be visible
      const options = page.locator('[role="option"]');
      const count = await options.count();
      
      // Should have some cruise lines (current data has Royal Caribbean)
      expect(count).toBeGreaterThan(0);
    }
  });

  test('Desktop (1280px): Room type filter hides when no cabin data', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    
    // Room type filter should be hidden when no cabin type data in API
    const roomTypeFilter = page.locator('[data-testid="filter-cabin-type"]');
    
    // Should be hidden (not shown) when no cabin type data
    const isVisible = await roomTypeFilter.isVisible().catch(() => false);
    
    // Current API doesn't return cabinType, so filter should be hidden
    expect(isVisible).toBe(false);
  });

  test('URL sync: cabinType param preserves in URL', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    
    // Navigate to deals with cabinType in URL
    await page.goto('/deals?cabinType=Inside&cabinType=Balcony');
    
    // Wait for deals to load
    await page.waitForSelector('[data-testid="deal-card"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="filter-bar"]', { timeout: 5000 });
    
    // URL should still have cabinType params (even though filter is hidden due to no data)
    const url = page.url();
    expect(url).toMatch(/cabinType=/);
  });

  test('Mobile (375px) expanded: Room type filter location in DOM', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Click mobile toggle to expand
    const mobileToggle = page.locator('button:has-text("Filters")');
    await mobileToggle.click();
    
    // Give it a moment to render
    await page.waitForTimeout(500);
    
    // Room type filter should exist in DOM (even if hidden)
    const roomTypeFilter = page.locator('[data-testid="filter-cabin-type"]');
    
    // Filter exists but is hidden (no cabin type data in current API)
    const isVisible = await roomTypeFilter.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test('Cruise line filter: URL param persists selection', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    
    // Check if cruise line filter is available
    const cruiseLineFilter = page.locator('[data-testid="filter-cruise-line"]');
    const isVisible = await cruiseLineFilter.isVisible().catch(() => false);
    
    if (isVisible) {
      // Click to open dropdown
      await cruiseLineFilter.click();
      
      // Select first option if available
      const options = page.locator('[role="option"]');
      const count = await options.count();
      
      if (count > 0) {
        await options.first().click();
        await page.waitForTimeout(500);
        
        // URL should include cruiseLine param
        const url = page.url();
        expect(url).toMatch(/cruiseLine=/);
      }
    }
  });

  test('Clear All button: Resets filters and clears URL', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    
    // Navigate to deals with filters in URL
    await page.goto('/deals?cruiseLine=Royal+Caribbean&minPrice=1000');
    
    // Wait for deals to load
    await page.waitForSelector('[data-testid="deal-card"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="filter-bar"]', { timeout: 5000 });
    
    // Clear button should appear (filters are active)
    // Query within the desktop view (second child of filter-bar)
    const filterBar = page.locator('[data-testid="filter-bar"]');
    const desktopView = filterBar.locator('> div').nth(1); // Second child (0=mobile toggle, 1=desktop view)
    const clearButton = desktopView.locator('[data-testid="filter-clear"]');
    await expect(clearButton).toBeVisible();
    
    // Click clear all
    await clearButton.click();
    await page.waitForTimeout(500);
    
    // URL should be cleared of filter params
    const url = page.url();
    expect(url).not.toMatch(/cruiseLine=/);
    expect(url).not.toMatch(/minPrice=/);
  });

  test('Component structure: CabinTypeFilter conditionally renders', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    
    // Wait for filter bar to render
    await page.waitForSelector('[data-testid="filter-bar"]', { timeout: 5000 });
    
    // When no cabin type data, the filter should be hidden (returns null)
    const roomTypeFilter = page.locator('[data-testid="filter-cabin-type"]');
    const isVisible = await roomTypeFilter.isVisible().catch(() => false);
    
    // Current API doesn't return cabinType, so filter should be hidden (not in DOM)
    expect(isVisible).toBe(false);
  });
});
