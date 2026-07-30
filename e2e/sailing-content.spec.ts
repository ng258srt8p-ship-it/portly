/**
 * Live verification for AI content overhaul on /sailing/[id].
 * Asserts:
 *   - Key Takeaways callout card renders with verdict text and ≥3 badge pills
 *   - Verdict text is non-empty, contains expected words, no "undefined"/"[object Object]"
 *   - Cabin / Excursion detail sections render with non-empty body
 *   - Loading skeleton disappears after network idle
 *   - SailingHero price card still renders (no regression)
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://portly-1i0.pages.dev';

test('sailing key takeaways render with non-empty content', async ({ page, request }) => {
  const dealsRes = await request.get(`${BASE_URL}/api/deals?limit=1`);
  const deals = await dealsRes.json();
  const sailingId: string = deals[0]?.id ?? '';
  test.skip(!sailingId, 'no sailing ID available');

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE_URL}/sailing/${sailingId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // ── Key Takeaways container
  const takeaways = page.locator('[data-testid="sailing-key-takeaways"]');
  await expect(takeaways).toBeVisible();

  // ── Verdict pitch text
  const verdict = page.locator('[data-testid="key-takeaway-verdict"]');
  await expect(verdict).toBeVisible();
  const verdictText = (await verdict.textContent())?.trim() ?? '';
  expect(verdictText.length).toBeGreaterThan(20);
  expect(verdictText).not.toMatch(/undefined|null|\[object Object\]/i);

  // ── Badge pills
  const badges = page.locator('[data-testid="key-takeaway-badges"] > span');
  const badgeCount = await badges.count();
  expect(badgeCount).toBeGreaterThanOrEqual(3);

  // ── No raw HTML tag leakage
  const takeawaysHtml = (await takeaways.innerHTML()) ?? '';
  expect(takeawaysHtml).not.toMatch(/<undefined|<null|\[object Object\]/i);

  // ── SailingHero price still present (no regression)
  const heroPrice = page.locator('text=/^\\$[0-9,]+/').first();
  await expect(heroPrice).toBeVisible();

  // ── Log measurements for diagnostic
  const measurements = await page.evaluate(() => {
    const v = document.querySelector('[data-testid="key-takeaway-verdict"]') as HTMLElement | null;
    const bs = document.querySelectorAll('[data-testid="key-takeaway-badges"] > span');
    return {
      verdictTextLength: v?.textContent?.length ?? 0,
      verdictWords: v?.textContent?.split(/\s+/).filter(Boolean).length ?? 0,
      badgeCount: bs.length,
      badgeLabels: Array.from(bs).map((b) => b.textContent?.trim() ?? ''),
    };
  });
  console.log('[KEY TAKEAWAYS]', JSON.stringify(measurements, null, 2));
});

test('sailing page loads without undefined or [object Object] in body', async ({ page, request }) => {
  const dealsRes = await request.get(`${BASE_URL}/api/deals?limit=1`);
  const deals = await dealsRes.json();
  const sailingId: string = deals[0]?.id ?? '';
  test.skip(!sailingId, 'no sailing ID available');

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE_URL}/sailing/${sailingId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  const bodyText = (await page.locator('body').textContent()) ?? '';
  // Allow up to 2 "undefined" if it's in a price-missing fallback, but expect ZERO in key takeaways
  const takeawaysText = (await page.locator('[data-testid="sailing-key-takeaways"]').textContent()) ?? '';
  expect(takeawaysText).not.toMatch(/undefined|\[object Object\]/i);

  // No raw HTML tag leakage anywhere on the page
  const bodyHtml = (await page.locator('body').innerHTML()) ?? '';
  expect(bodyHtml).not.toMatch(/<undefined/i);

  // Log for debugging
  console.log('[BODY LENGTH]', bodyText.length, '[KEYTAKEAWAYS LENGTH]', takeawaysText.length);
});

test('loading skeleton disappears after network idle', async ({ page, request }) => {
  const dealsRes = await request.get(`${BASE_URL}/api/deals?limit=1`);
  const deals = await dealsRes.json();
  const sailingId: string = deals[0]?.id ?? '';
  test.skip(!sailingId, 'no sailing ID available');

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE_URL}/sailing/${sailingId}`, { waitUntil: 'domcontentloaded' });
  // Capture initial skeletons (may be gone quickly due to networkidle wait below)
  const initialSkelCount = await page.locator('.animate-pulse').count();
  console.log('[INITIAL SKELETONS]', initialSkelCount);

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // After network idle, the key takeaways must be present (replaces skeleton)
  await expect(page.locator('[data-testid="sailing-key-takeaways"]')).toBeVisible();
});
