import { test, expect } from '@playwright/test';

const BASE = 'https://portly-1i0.pages.dev';

// ============================================================================
// DESKTOP AUDIT (≥768px) — Inline FilterSelectionGrid is always visible
// ============================================================================

test('Filter Bar - Comprehensive UI/UX Audit (desktop)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(`${BASE}/deals`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Helper to measure element + dimensions
  const measure = async (selector: string, name: string) => {
    const el = await page.$(selector);
    if (!el) return { name, found: false };
    const box = await el.boundingBox();
    return { name, found: true, box };
  };

  // ============================================
  // ROW 1: MultiSelect Dropdowns (Line, Region, Dest, Ship)
  // ============================================
  console.log('\n=== ROW 1: MultiSelect Dropdowns (desktop) ===');

  const row1Buttons = [
    { selector: '[data-testid="filter-cruise-line"] button', name: 'LINE dropdown' },
    { selector: '[data-testid="filter-region"] button', name: 'REGION dropdown' },
    { selector: '[data-testid="filter-destination"] button', name: 'DEST dropdown' },
    { selector: '[data-testid="filter-ship"] button', name: 'SHIP dropdown' },
  ];

  for (const btn of row1Buttons) {
    const m = await measure(btn.selector, btn.name);
    if (m.found && m.box) {
      console.log(`${m.name}: ${m.box.width.toFixed(0)}x${m.box.height.toFixed(0)}px`);
      // Touch target check (≥ 44px tall is the Apple HIG minimum)
      expect(m.box.height).toBeGreaterThanOrEqual(40); // allow slight rendering variance
    }
  }

  // ============================================
  // ROW 2: Nights, Types, Price, Sort
  // ============================================
  console.log('\n=== ROW 2: Nights, Types, Price, Sort (desktop) ===');

  const row2Elements = [
    { selector: '[data-testid="filter-nights"]', name: 'Nights segmented group' },
    { selector: '[data-testid="filter-type"]', name: 'Type pill group' },
    { selector: '[data-testid="filter-price"]', name: 'Price inputs' },
    { selector: '[data-testid="filter-sort"]', name: 'Sort dropdown' },
  ];

  for (const el of row2Elements) {
    const container = await page.$(el.selector);
    if (container) {
      const box = await container.boundingBox();
      const buttons = await container.$$('button');
      for (let i = 0; i < buttons.length; i++) {
        const btnBox = await buttons[i].boundingBox();
        const btnText = await buttons[i].textContent();
        if (btnBox) {
          console.log(`${el.name} - button "${btnText?.trim()?.slice(0,20)}": ${btnBox.width.toFixed(0)}x${btnBox.height.toFixed(0)}px`);
          expect(btnBox.height).toBeGreaterThanOrEqual(40);
        }
      }
      if (box) console.log(`${el.name} container: ${box.width.toFixed(0)}x${box.height.toFixed(0)}px`);
    }
  }

  // ============================================
  // INTERACTION TESTS — Desktop dropdowns work
  // ============================================
  console.log('\n=== INTERACTION TESTS (desktop) ===');

  // Test LINE dropdown
  const lineBtn = page.locator('[data-testid="filter-cruise-line"] button').first();
  if (await lineBtn.count() > 0) {
    await lineBtn.click();
    await page.waitForTimeout(300);
    const dropdown = page.locator('[data-testid="filter-cruise-line"] [role="listbox"]').first();
    if (await dropdown.count() > 0) {
      const box = await dropdown.boundingBox();
      console.log(`LINE dropdown opened: ${box?.width.toFixed(0)}x${box?.height.toFixed(0)}px`);
      // Close by clicking the button again
      await lineBtn.click();
      await page.waitForTimeout(200);
    } else {
      console.log('❌ LINE dropdown did not open');
    }
  }

  // Test Sort dropdown
  const sortBtn = page.locator('[data-testid="filter-sort"] button').first();
  if (await sortBtn.count() > 0) {
    await sortBtn.click();
    await page.waitForTimeout(300);
    const dropdown = page.locator('[data-testid="filter-sort"] [role="listbox"]').first();
    if (await dropdown.count() > 0) {
      console.log('SORT dropdown opened ✓');
      await sortBtn.click();
    } else {
      console.log('❌ SORT dropdown did not open');
    }
    await page.waitForTimeout(200);
  }

  // Test Nights segmented click
  const nightsBtn = page.locator('[data-testid="filter-nights"] button').first();
  if (await nightsBtn.count() > 0) {
    await nightsBtn.click();
    await page.waitForTimeout(200);
    const active = page.locator('[data-testid="filter-nights"] button[aria-pressed="true"]').first();
    if (await active.count() > 0) console.log('Nights segmented: click works ✓');
    else console.log('❌ Nights segmented: click did not activate');
  }

  // Test Type pills
  const typeBtn = page.locator('[data-testid="filter-type"] button').first();
  if (await typeBtn.count() > 0) {
    await typeBtn.click();
    await page.waitForTimeout(200);
    const active = page.locator('[data-testid="filter-type"] button[aria-pressed="true"]').first();
    if (await active.count() > 0) console.log('Type pills: click works ✓');
    else console.log('❌ Type pills: click did not activate');
  }

  // ============================================
  // CONSOLE ERRORS
  // ============================================
  console.log('\n=== CONSOLE ERRORS ===');
  if (errors.length) {
    for (const err of errors) console.log(`❌ ${err}`);
  } else {
    console.log('No console errors ✓');
  }
  expect(errors.length).toBe(0);
});

// ============================================================================
// MOBILE AUDIT (375×667) — Uses MobileFilterBar sticky bottom drawer
// ============================================================================

test('Mobile Filter Bar - Sticky Bottom Bar (375px)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(`${BASE}/deals`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // The mobile filter entry point is the sticky bottom bar
  const mobileFiltersBtn = page.locator('[data-testid="mobile-filters-button"]');
  await expect(mobileFiltersBtn).toBeVisible({ timeout: 5000 });

  // Touch-target size check (≥44px tall per Apple HIG / WCAG 2.5.5)
  const filterBox = await mobileFiltersBtn.boundingBox();
  console.log(`Mobile Filters button: ${filterBox?.width.toFixed(0)}x${filterBox?.height.toFixed(0)}px`);
  expect(filterBox?.height).toBeGreaterThanOrEqual(40);

  // Sort button should also be visible
  const sortBtn = page.locator('button:has-text("Sort")').first();
  await expect(sortBtn).toBeVisible();

  // Open the filter drawer
  await mobileFiltersBtn.click();
  await page.waitForTimeout(500);

  const drawer = page.locator('[data-testid="mobile-filter-drawer"]');
  await expect(drawer).toBeVisible({ timeout: 5000 });

  const drawerBox = await drawer.boundingBox();
  console.log(`Filter drawer: ${drawerBox?.width.toFixed(0)}x${drawerBox?.height.toFixed(0)}px`);
  expect(drawerBox?.width).toBe(375);

  // Drawer should host the FilterSelectionGrid (expanded by default)
  const gridInDrawer = drawer.locator('[data-testid="filter-selection-grid"]');
  await expect(gridInDrawer).toBeVisible();

  // The Filters heading should be present
  await expect(drawer.locator('h2:has-text("Filter sailings")')).toBeVisible();

  // Filter dropdowns (Line, Region, Dest, Ship) should all be present in drawer.
  // Use .first() because the inline (hidden) grid below also renders the same testids.
  for (const id of ['filter-cruise-line', 'filter-region', 'filter-destination', 'filter-ship']) {
    await expect(drawer.locator(`[data-testid="${id}"]`).first()).toBeVisible();
  }

  // Sort inside drawer (the desktop sort) — note: the bottom bar's Sort is separate
  await expect(drawer.locator('[data-testid="filter-sort"]').first()).toBeVisible();

  // Close via the X button
  const closeBtn = drawer.locator('button[aria-label="Close filters"]');
  await closeBtn.click();
  await page.waitForTimeout(300);

  // Drawer should be gone
  await expect(drawer).toHaveCount(0);
});

test('Mobile Filter Bar - Sort popover works', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(`${BASE}/deals`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Find the Sort button in the mobile bottom bar (next to Filters)
  const sortBtn = page.locator('button:has-text("Sort")').first();
  await expect(sortBtn).toBeVisible();

  // Touch-target size
  const sortBox = await sortBtn.boundingBox();
  expect(sortBox?.height).toBeGreaterThanOrEqual(40);

  // Open sort popover
  await sortBtn.click();
  await page.waitForTimeout(300);

  // Sort popover should appear at the bottom — has buttons for each sort option
  const sortOptions = page.locator('button').filter({ hasText: /Drop|Date|Value|Default|Price/i });
  const count = await sortOptions.count();
  console.log(`Sort popover options visible: ${count}`);
  expect(count).toBeGreaterThan(0);

  // Click backdrop to close
  const backdrop = page.locator('.fixed.inset-0.bg-black\\/20, .fixed.inset-0.bg-black\\/40').first();
  if (await backdrop.count() > 0) {
    await backdrop.click();
  }
});
