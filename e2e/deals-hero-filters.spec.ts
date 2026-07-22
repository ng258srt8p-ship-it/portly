import { test, expect } from '@playwright/test';

test.describe('Hero Quick-Filter Chips', () => {
  test.setTimeout(60000);

  /**
  /**
   * Helper: navigate to /deals and wait for deal cards to load.
   */
  async function loadDealsPage(page: any) {
    await page.goto('/deals', { waitUntil: 'commit', timeout: 30000 });
    // Wait for hero chips to render (don't depend on API)
    await page.waitForSelector('[data-testid="hero-chip-price-drop"]', { timeout: 10000 });
    // Wait for deal cards (may take time as API polls)
    await page.waitForSelector('[data-testid="deal-card"]', { timeout: 60000 });
  }

  // ─── Test 1: Price Drop chip toggles filter on ─────────────────────
  test('Price Drop chip — click toggles badgeType=drop and filters cards', async ({ page }) => {
    await loadDealsPage(page);

    const chip = page.locator('[data-testid="hero-chip-price-drop"]');

    // Chip should start in inactive state
    const initialClasses = await chip.evaluate((el: any) => el.className);
    expect(initialClasses).not.toContain('bg-indigo');

    // Click the chip
    await chip.click();

    // URL should contain badgeType=drop
    await page.waitForURL(/badgeType=drop/);

    // Chip should now be in active state (indigo background, white text)
    const activeClasses = await chip.evaluate((el: any) => el.className);
    expect(activeClasses).toContain('bg-indigo');
    expect(activeClasses).toContain('text-white');

    // All visible deal cards should have badgeType === 'drop'
    const cards = page.locator('[data-testid="deal-card"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    for (let i = 0; i < cardCount; i++) {
      const cardText = await cards.nth(i).textContent();
      // Badge text for drop contains "Drop" (e.g., "-72% Drop")
      expect(cardText).toContain('Drop');
    }
  });

  // ─── Test 2: Solo Friendly chip toggles filter on ──────────────────
  test('Solo Friendly chip — click toggles badgeType=solo and filters cards', async ({ page }) => {
    await loadDealsPage(page);

    const chip = page.locator('[data-testid="hero-chip-solo-friendly"]');
    await chip.click();

    // URL should contain badgeType=solo
    await page.waitForURL(/badgeType=solo/);

    // Chip should be active
    const activeClasses = await chip.evaluate((el: any) => el.className);
    expect(activeClasses).toContain('bg-indigo');

    // All visible deal cards should have 'Solo Friendly' badge text
    const cards = page.locator('[data-testid="deal-card"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    for (let i = 0; i < cardCount; i++) {
      const cardText = await cards.nth(i).textContent();
      expect(cardText).toContain('Solo Friendly');
    }
  });

  // ─── Test 3: Best Value chip toggles filter on ─────────────────────
  test('Best Value chip — click toggles badgeType=gold and filters cards', async ({ page }) => {
    await loadDealsPage(page);

    const chip = page.locator('[data-testid="hero-chip-best-value"]');
    await chip.click();

    // URL should contain badgeType=gold
    await page.waitForURL(/badgeType=gold/);

    // Chip should be active
    const activeClasses = await chip.evaluate((el: any) => el.className);
    expect(activeClasses).toContain('bg-indigo');

    // All visible deal cards should have 'Great Value' badge text
    const cards = page.locator('[data-testid="deal-card"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    for (let i = 0; i < cardCount; i++) {
      const cardText = await cards.nth(i).textContent();
      expect(cardText).toContain('Great Value');
    }
  });

  // ─── Test 4: Any Duration chip clears nights filter ────────────────
  test('Any Duration chip — clears minNights/maxNights from URL', async ({ page }) => {
    await loadDealsPage(page);

    // First, set a nights filter via the filter grid
    const nightsGroup = page.locator('[data-testid="filter-nights"]');
    await expect(nightsGroup).toBeVisible();

    // Click the "4–7" nights option
    const nightsBtn = nightsGroup.locator('button').nth(1); // 0-3 is index 0, 4-7 is index 1
    await nightsBtn.click();

    // URL should now contain minNights=4 and maxNights=7
    await page.waitForURL(/minNights=4/);
    const urlAfterNights = page.url();
    expect(urlAfterNights).toContain('minNights=4');
    expect(urlAfterNights).toContain('maxNights=7');

    // Now click the "Any Duration" hero chip
    const anyDurationChip = page.locator('[data-testid="hero-chip-any-duration"]');
    await anyDurationChip.click();

    // URL should no longer contain minNights or maxNights
    await page.waitForURL((url) => {
      const searchParams = new URLSearchParams(url.searchParams);
      return !searchParams.has('minNights') && !searchParams.has('maxNights');
    });

    const finalUrl = page.url();
    expect(finalUrl).not.toContain('minNights');
    expect(finalUrl).not.toContain('maxNights');

    // Chip should show active state (it indicates "any duration is now active")
    const chipClasses = await anyDurationChip.evaluate((el: any) => el.className);
    expect(chipClasses).toContain('bg-indigo');
  });

  // ─── Test 5: Re-clicking a chip toggles it off ─────────────────────
  test('Re-clicking Price Drop chip toggles filter off', async ({ page }) => {
    await loadDealsPage(page);

    const chip = page.locator('[data-testid="hero-chip-price-drop"]');

    // Click to turn on
    await chip.click();
    await page.waitForURL(/badgeType=drop/);

    let classes = await chip.evaluate((el: any) => el.className);
    expect(classes).toContain('bg-indigo');

    // Click again to turn off
    await chip.click();

    // URL should no longer contain badgeType=drop
    await page.waitForURL((url) => {
      const searchParams = new URLSearchParams(url.searchParams);
      return !searchParams.has('badgeType');
    });

    // Chip should be back to inactive state
    classes = await chip.evaluate((el: any) => el.className);
    expect(classes).not.toContain('bg-indigo');
  });

  // ─── Test 6: Filter grid → hero chip sync ─────────────────────────
  test('Filter grid badge type toggles hero chip active state', async ({ page }) => {
    await loadDealsPage(page);

    const priceDropChip = page.locator('[data-testid="hero-chip-price-drop"]');

    // Initially inactive
    let classes = await priceDropChip.evaluate((el: any) => el.className);
    expect(classes).not.toContain('bg-indigo');

    // Toggle via filter grid (Type section)
    const typeGroup = page.locator('[data-testid="filter-type"]');
    const dropPill = typeGroup.locator('button').filter({ hasText: /Drop/i }).first();
    await dropPill.click();

    // Hero chip should now be active
    await page.waitForTimeout(500); // Allow state sync
    classes = await priceDropChip.evaluate((el: any) => el.className);
    expect(classes).toContain('bg-indigo');

    // URL should contain badgeType=drop
    await page.waitForURL(/badgeType=drop/);

    // Toggle off via filter grid
    await dropPill.click();
    await page.waitForTimeout(500);

    // Hero chip should be inactive again
    classes = await priceDropChip.evaluate((el: any) => el.className);
    expect(classes).not.toContain('bg-indigo');
  });

  // ─── Test 7: Clear button resets hero chips and filter grid ────────
  test('Clear button resets hero chip active states and filter grid', async ({ page }) => {
    await loadDealsPage(page);

    const priceDropChip = page.locator('[data-testid="hero-chip-price-drop"]');
    const soloChip = page.locator('[data-testid="hero-chip-solo-friendly"]');

    // Activate two hero chips
    await priceDropChip.click();
    await page.waitForURL(/badgeType=drop/);
    await soloChip.click();
    // Wait for URL to contain both badge types
    await page.waitForURL(/badgeType=drop[^&]*solo|badgeType=solo[^&]*drop/);

    // Both should be active
    let priceDropClasses = await priceDropChip.evaluate((el: any) => el.className);
    let soloClasses = await soloChip.evaluate((el: any) => el.className);
    expect(priceDropClasses).toContain('bg-indigo');
    expect(soloClasses).toContain('bg-indigo');

    // Click Clear in the filter grid
    const clearBtn = page.locator('[data-testid="filter-clear"]');
    await clearBtn.click();

    // URL should have no filter params (or at least no badgeType)
    await page.waitForURL((url) => {
      const searchParams = new URLSearchParams(url.searchParams);
      return !searchParams.has('badgeType');
    });

    // Both hero chips should be back to inactive
    priceDropClasses = await priceDropChip.evaluate((el: any) => el.className);
    soloClasses = await soloChip.evaluate((el: any) => el.className);
    expect(priceDropClasses).not.toContain('bg-indigo');
    expect(soloClasses).not.toContain('bg-indigo');
  });
});
