/**
 * Cycle #29 — dashboard alert tick contract.
 *
 * Catches the exact class of bug fixed in Cycle #29:
 *   - /api/admin/alert-eval-tick and /api/admin/alert-dispatch-tick returned 404
 *     (Worker functions runAlertEvaluationTick / runAlertDispatchTick were
 *     imported but never routed). The dashboard's "Run Alert Tick" button hit 404.
 *   - The dashboard dumped the raw 401 JSON into a <pre> block instead of
 *     showing a clear "auth required" status with the curl recipe to run it.
 *
 * Run against live Cloudflare deployment by default.
 */
import { test, expect } from '@playwright/test';

const WORKER = process.env.WORKER_BASE || 'https://portly-api.vqh9mnrdbp.workers.dev';
const PAGES = process.env.BASE_URL || 'https://portly-1i0.pages.dev';

test.describe('Cycle #29 — alert tick endpoints (live)', () => {
  test('POST /api/admin/alert-eval-tick exists (no longer 404)', async ({ request }) => {
    // Send NO auth header — must be 401 (not 404). If 404, the endpoint still isn't routed.
    const resp = await request.post(`${WORKER}/api/admin/alert-eval-tick`, {
      headers: { 'Content-Type': 'application/json' },
      data: { max: 5 },
    });
    expect(resp.status(), 'endpoint must exist (401 = auth gate, 404 = still missing)').not.toBe(404);
    expect(resp.status()).toBe(401);
  });

  test('POST /api/admin/alert-dispatch-tick exists (no longer 404)', async ({ request }) => {
    const resp = await request.post(`${WORKER}/api/admin/alert-dispatch-tick`, {
      headers: { 'Content-Type': 'application/json' },
      data: { max: 5 },
    });
    expect(resp.status(), 'endpoint must exist (401 = auth gate, 404 = still missing)').not.toBe(404);
    expect(resp.status()).toBe(401);
  });

  test('Run Alert Tick button shows auth-required status (not raw error)', async ({ page }) => {
    await page.goto(`${PAGES}/dashboard`, { waitUntil: 'networkidle' });
    // Wait for metrics grid to confirm page hydrated
    await expect(page.getByRole('heading', { name: 'Analytics Dashboard' })).toBeVisible({ timeout: 10_000 });

    // Click the button. Two fetches in series — wait for both to finish (the
    // 401 from the eval endpoint short-circuits before the dispatch fetch).
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/admin/alert-eval-tick') && r.request().method() === 'POST',
        { timeout: 10_000 }
      ),
      page.locator('[data-testid="dashboard-run-tick"]').click(),
    ]);

    // The <pre> block should now contain "Authentication required" — NOT the raw 401 JSON
    const pre = page.locator('pre');
    await expect(pre).toBeVisible({ timeout: 5_000 });
    // Wait until the "Running…" placeholder is replaced by the real response text
    await expect(pre).not.toContainText(/^Running…$/, { timeout: 5_000 });
    const text = await pre.innerText();
    expect(text).toContain('Authentication required');
    expect(text).toContain('SCRAPER_SECRET');
    expect(text).toContain('curl -X POST');
    // Must NOT show the raw `{"error":"Unauthorized"}` body the old code dumped
    expect(text).not.toMatch(/^\s*\{"error":"Unauthorized"\}/);
  });
});
