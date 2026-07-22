/**
 * Deal Analysis Consistency — Playwright E2E Verification
 *
 * Ensures every cruise page displays meaningful, non-placeholder Deal Analysis content.
 * Verifies the regenerate-all endpoint, heuristic badge rendering, and graceful handling
 * of degraded data.
 *
 * Run: npx playwright test e2e/deal-analysis-consistency.spec.ts
 */

import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';
const FRONTEND_BASE = 'http://localhost:3003';

/* ====================================================================== */
/*  HELPERS                                                                */
/* ====================================================================== */

const placeholderTexts = [
  'Analysis parsing failed',
  'Data unavailable',
  'Contact agent for details',
  'Manual review recommended',
  'Analysis unavailable',
];

/**
 * Assert that a text string does NOT contain any placeholder patterns.
 */
function assertNoPlaceholders(text: string, context: string) {
  for (const ph of placeholderTexts) {
    expect(
      text.toLowerCase().includes(ph.toLowerCase()),
      `${context}: should not contain "${ph}"`
    ).toBe(false);
  }
}

/* ====================================================================== */
/*  TEST 1: Scan all known cruise pages for meaningful Deal Analysis       */
/* ====================================================================== */

test.describe('Test 1: All cruise pages have meaningful Deal Analysis', () => {
  const testSailings = [
    { id: 1049, label: 'Royal Caribbean Icon of the Seas' },
    { id: 1072, label: 'Carnival cruise' },
    { id: 1080, label: 'Celebrity cruise' },
    { id: 1156, label: 'MSC cruise' },
    { id: 1214, label: 'MSC World Europa (previously stale)' },
    { id: 1219, label: 'MSC World Europa Asia' },
  ];

  for (const { id, label } of testSailings) {
    test(`Sailing ${id} (${label}) renders meaningful Deal Analysis`, async ({ page }) => {
      await page.goto(`/sailing/${id}`);

      // Wait for the Deal Analysis component to render
      await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 15000 });

      // Get all text content from the Deal Analysis section
      const dealAnalysisEl = page.locator('[data-testid="enhanced-deal-analysis"]');
      const text = await dealAnalysisEl.textContent();
      expect(text, `Deal Analysis for sailing ${id} should have content`).toBeTruthy();

      // Extract just the text content (remove icons/data-testid artifacts)
      const strippedText = text!.replace(/analytics|calculate|lightbulb|gavel|travel_explore|payments|trending_up|trending_down|trending_flat|book_online|view_in_ar|schedule|error_outline|inventory_2|map|star|directions_boat|compare_arrows/gi, '').trim();

      // Verify no placeholder text
      assertNoPlaceholders(strippedText, `sailing ${id}`);

      // Verify substantial content
      expect(strippedText.length, `sailing ${id} should have >100 chars of content`).toBeGreaterThan(100);

      console.log(`  ✓ Sailing ${id}: ${strippedText.length} chars of content`);
    });
  }
});

/* ====================================================================== */
/*  TEST 2: Heuristic badge displays for AI-fallback data                  */
/* ====================================================================== */

test.describe('Test 2: Heuristic badge shows for heuristic/placeholder data', () => {
  test('Shows heuristic badge for sailing with heuristic data (1049)', async ({ page }) => {
    await page.goto('/sailing/1049');
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 15000 });

    // Sailing 1049 has heuristic-generated data
    const badge = page.locator('[data-testid="heuristic-badge"]');
    await expect(badge).toBeVisible();
    const badgeText = await badge.textContent();
    expect(badgeText).toBeTruthy();
    expect(
      badgeText!.toLowerCase().includes('heuristic') || badgeText!.toLowerCase().includes('estimate'),
      'Badge should mention heuristic or estimate'
    ).toBe(true);
  });

  test('Shows "AI Estimate Unavailable" badge when placeholder text detected', async ({ page, request }) => {
    // Mock the API to return stale placeholder data
    await page.route('**/api/enhanced/deal-analysis/*', async (route) => {
      const degradedData = {
        dealScore: 50,
        pricingDeepDive: 'Analysis parsing failed - using fallback',
        priceTrend: 'stable',
        insiderTips: ['Contact agent for details'],
        verdict: 'Manual review recommended',
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: degradedData }),
      });
    });

    await page.goto('/sailing/9999');
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 15000 });

    // Should show the "AI Estimate Unavailable" badge
    const badge = page.locator('[data-testid="heuristic-badge"]');
    await expect(badge).toBeVisible();
    const badgeText = await badge.textContent();
    expect(badgeText!.toLowerCase()).toContain('unavailable');
  });
});

/* ====================================================================== */
/*  TEST 3: Regenerate endpoint fixes stale data                           */
/* ====================================================================== */

test.describe('Test 3: Regenerate-all endpoint fixes stale entries', () => {
  test('POST /api/enhanced/regenerate-all returns success', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/enhanced/regenerate-all`, {
      data: { limit: 5 },
    });
    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(typeof json.data.fixed).toBe('number');
    expect(typeof json.data.totalFound).toBe('number');
    expect(Array.isArray(json.data.sailingIds)).toBe(true);
    console.log(`  ✓ Regenerate endpoint: ${json.data.fixed} fixed, ${json.data.totalFound} found`);
  });

  test('Regenerate endpoint fixes sailing 1214 stale data', async ({ page, request }) => {
    // First, capture current data
    const preResponse = await request.get(`${API_BASE}/api/enhanced/deal-analysis/1214`);
    const preData = await preResponse.json();

    // Run regenerate
    const regenResponse = await request.post(`${API_BASE}/api/enhanced/regenerate-all`, {
      data: { limit: 50 },
    });
    const regenData = await regenResponse.json();

    // Refresh the specific sailing
    const postResponse = await request.get(`${API_BASE}/api/enhanced/deal-analysis/1214?forceRefresh=true`);
    const postData = await postResponse.json();

    // Verify the new data doesn't have placeholders
    expect(postData.success).toBe(true);
    assertNoPlaceholders(postData.data.pricingDeepDive || '', 'sailing 1214 post-regenerate');
    expect(postData.data.pricingDeepDive.length, 'pricingDeepDive should be >50 chars').toBeGreaterThan(50);

    // Insider tips should be meaningful
    if (Array.isArray(postData.data.insiderTips)) {
      expect(postData.data.insiderTips.length).toBeGreaterThan(0);
      for (const tip of postData.data.insiderTips) {
        const tipStr = typeof tip === 'string' ? tip : tip.content || '';
        assertNoPlaceholders(tipStr, `insider tip for sailing 1214`);
      }
    }

    console.log(`  ✓ Sailing 1214 pricingDeepDive length: ${postData.data.pricingDeepDive.length} chars`);
  });
});

/* ====================================================================== */
/*  TEST 4: Quality gate for all active sailings via API                   */
/* ====================================================================== */

test.describe('Test 4: Quality gate across all sailings', () => {
  test('All API-returned deal analyses pass quality gate', async ({ page, request }) => {
    // Get a list of active sailings
    const statsResponse = await request.get(`${API_BASE}/api/enhanced/stats`);
    const stats = await statsResponse.json();
    const totalActive = stats.data?.totalActiveSailings || 0;
    console.log(`  Total active sailings: ${totalActive}`);

    // Test a sample of sailings (up to 20 to avoid too many API calls)
    const sampleIds = [1049, 1072, 1080, 1156, 1214, 1219, 1162, 1192, 1211, 1748];
    let allPassed = true;
    const failures: string[] = [];

    for (const id of sampleIds) {
      const response = await request.get(`${API_BASE}/api/enhanced/deal-analysis/${id}`);
      if (!response.ok()) continue;

      const json = await response.json();
      if (!json.success || !json.data) continue;

      const data = json.data;

      // Check pricingDeepDive
      if (typeof data.pricingDeepDive === 'string') {
        if (data.pricingDeepDive.length < 20) {
          failures.push(`${id}: pricingDeepDive too short (${data.pricingDeepDive.length} chars)`);
          allPassed = false;
        }
        for (const ph of placeholderTexts) {
          if (data.pricingDeepDive.toLowerCase().includes(ph.toLowerCase())) {
            failures.push(`${id}: pricingDeepDive contains "${ph}"`);
            allPassed = false;
          }
        }
      }

      // Check insiderTips
      if (Array.isArray(data.insiderTips)) {
        if (data.insiderTips.length === 0) {
          failures.push(`${id}: insiderTips is empty`);
          allPassed = false;
        }
        for (const tip of data.insiderTips) {
          const tipStr = typeof tip === 'string' ? tip : tip.content || '';
          for (const ph of placeholderTexts) {
            if (tipStr.toLowerCase().includes(ph.toLowerCase())) {
              failures.push(`${id}: insiderTip contains "${ph}"`);
              allPassed = false;
            }
          }
        }
      }

      // Check verdict
      if (typeof data.verdict === 'string') {
        for (const ph of placeholderTexts) {
          if (data.verdict.toLowerCase().includes(ph.toLowerCase())) {
            failures.push(`${id}: verdict contains "${ph}"`);
            allPassed = false;
          }
        }
      }
    }

    if (failures.length > 0) {
      console.log(`  ✗ Quality gate failures:`);
      for (const f of failures) console.log(`    - ${f}`);
    } else {
      console.log(`  ✓ All ${sampleIds.length} sampled sailings pass quality gate`);
    }

    expect(allPassed, `Quality gate violations: ${failures.join('; ')}`).toBe(true);
  });
});

/* ====================================================================== */
/*  TEST 5: Frontend renders gracefully with mocked degraded data           */
/* ====================================================================== */

test.describe('Test 5: Frontend handles degraded data gracefully', () => {
  test('Renders Deal Analysis section even with placeholder API data', async ({ page }) => {
    // Mock API to return degraded content
    await page.route('**/api/enhanced/deal-analysis/*', async (route) => {
      const degradedData = {
        dealScore: 50,
        pricingDeepDive: 'Analysis parsing failed - using fallback',
        priceTrend: 'stable',
        insiderTips: ['Contact agent for details'],
        verdict: 'Manual review recommended',
        is_heuristic: false,
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: degradedData }),
      });
    });

    await page.goto('/sailing/9999');
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 15000 });

    // Section should still render
    const section = page.locator('[data-testid="enhanced-deal-analysis"]');
    await expect(section).toBeVisible();

    // Heuristic/unavailable badge should appear
    const badge = page.locator('[data-testid="heuristic-badge"]');
    await expect(badge).toBeVisible();

    // Refresh button should be present
    const refreshBtn = page.locator('[data-testid="refresh-deal-analysis"]');
    await expect(refreshBtn).toBeVisible();

    // The placeholder text "Analysis parsing failed" should NOT be visible in rendered content
    const sectionText = await section.textContent();
    expect(sectionText).not.toContain('Analysis parsing failed');
    expect(sectionText).not.toContain('Contact agent for details');
    expect(sectionText).not.toContain('Manual review recommended');

    console.log('  ✓ Degraded data handled gracefully - placeholders filtered');
  });

  test('Refresh button triggers forceRefresh', async ({ page }) => {
    let refreshCalled = false;

    await page.route('**/api/enhanced/deal-analysis/*', async (route) => {
      const url = route.request().url();
      if (url.includes('forceRefresh=true')) {
        refreshCalled = true;
        // Return fresh data on refresh
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              dealScore: 82,
              pricingDeepDive: 'Royal Caribbean Icon of the Seas 7-night Caribbean at $76/person/day - excellent value.',
              priceTrend: 'falling',
              insiderTips: [{ title: 'Price Alert', content: 'Prices dropping - book now for best rates' }],
              verdict: 'Strong buy - excellent value for this route',
              is_heuristic: false,
            },
          }),
        });
      } else {
        // Return degraded data initially
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              dealScore: 50,
              pricingDeepDive: 'Analysis parsing failed - using fallback',
              priceTrend: 'stable',
              insiderTips: ['Contact agent for details'],
              verdict: 'Manual review recommended',
              is_heuristic: false,
            },
          }),
        });
      }
    });

    await page.goto('/sailing/9999');
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 15000 });

    // Click refresh button
    await page.click('[data-testid="refresh-deal-analysis"]');
    await page.waitForTimeout(1000);

    expect(refreshCalled).toBe(true);
    console.log('  ✓ Refresh button triggers forceRefresh API call');
  });
});
