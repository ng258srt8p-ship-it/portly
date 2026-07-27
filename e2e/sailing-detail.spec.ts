/**
 * Sailing detail page regression.
 *
 * Catches two bugs we've seen in production:
 *   1) Static export missing sailing IDs (404 on direct URL)
 *   2) Worker returning synthetic "straight line" histories
 *
 * Runs against the live Cloudflare deploy by default — set FRONTEND_BASE to
 * override for local development.
 */
import { test, expect } from '@playwright/test';

const FRONTEND = process.env.FRONTEND_BASE || 'https://portly-1i0.pages.dev';
const SAILING_ID = 'carnival_horizon_2026-03-08_miami_6__big_24__v4m';

test.describe('/sailing/[id] — regression (404 fix + graph quality)', () => {
  test('previously-404 sailing ID returns 200 and renders content', async ({ page }) => {
    const response = await page.goto(`${FRONTEND}/sailing/${SAILING_ID}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    expect(response?.status()).toBe(200);

    // Page should have a hero title (not the Next.js 404 page)
    await expect(page.locator('text=404')).toHaveCount(0);
    const main = page.locator('#main-content');
    await expect(main).toBeVisible({ timeout: 10_000 });

    // Wait for client-side fetch to populate the page
    await page.waitForTimeout(3000);

    // The hero should show a ship name (Carnival Horizon) for this sailing
    const heroText = (await page.locator('h1').first().textContent()) || '';
    expect(heroText.toLowerCase()).toContain('horizon');
  });

  test('a second sailing ID also returns 200 (covers full static export)', async ({ page }) => {
    const r = await page.goto(`${FRONTEND}/sailing/carnival_horizon_2026-03-08_miami_6__big_31__v4m`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    expect(r?.status()).toBe(200);
    await expect(page.locator('text=404')).toHaveCount(0);
  });

  test('deal card sparklines have realistic (non-monotonic) histories', async ({ page }) => {
    await page.goto(`${FRONTEND}/deals`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('[data-testid="deal-card"]', { timeout: 30_000 });
    await page.waitForTimeout(4000);

    const stats = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('[data-testid="deal-card"]')];
      return cards.slice(0, 8).map((c) => {
        const path = c.querySelector('svg path[stroke]');
        const d = path?.getAttribute('d') || '';
        const ys = [...d.matchAll(/[\d.]+,([\d.]+)/g)].map(m => parseFloat(m[1]));
        let monotonic = true;
        for (let j = 1; j < ys.length; j++) if (ys[j] > ys[j - 1]) { monotonic = false; break; }
        return { points: ys.length, monotonic };
      });
    });

    // Sparklines should have enough points to draw a real curve
    expect(stats.length).toBeGreaterThan(0);
    for (const s of stats) {
      expect(s.points).toBeGreaterThanOrEqual(5);
      // At least one card in the sample should NOT be strictly monotonic —
      // a "straight diagonal" generator fails this check.
    }
    const nonMonotonic = stats.filter((s) => !s.monotonic).length;
    expect(nonMonotonic).toBeGreaterThan(0);
  });
});
