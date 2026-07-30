import { test, expect } from "@playwright/test";

/**
 * Cycle #28 — Dashboard /api/metrics wiring regression
 *
 * Two classes of bug live here, both on the /dashboard admin route:
 *
 *  1. The Worker had no `/api/metrics` endpoint at all. The dashboard page
 *     called `fetch('/api/metrics')` and the Worker returned 404, so the
 *     page was permanently stuck on the "Could not load metrics" error
 *     state. The aggregator `getMetricsSnapshot()` was already implemented
 *     in workers/src/metrics-analytics.ts and the import was already in
 *     index.ts — the endpoint just needed to be wired.
 *
 *  2. The dashboard's `API_BASE` defaulted to `''` (empty string). On the
 *     static export production build, the browser resolves `''` against the
 *     current origin, which has no API proxy. In dev mode the Next.js
 *     rewrite handles `/api/*`, but in production there's no proxy — so
 *     `${API_BASE}/api/metrics` resolved to `https://<pages>/api/metrics`
 *     and 404'd even after the Worker endpoint shipped. Fixed by defaulting
 *     `API_BASE` to the Worker URL, matching the pattern used by
 *     sailing/[id]/page.tsx.
 *
 * The fix wires `app.get('/api/metrics', getMetricsSnapshot(c.env))` into
 * the Worker and updates the dashboard's API_BASE default, so:
 *   - /dashboard renders the metrics grid (not "Could not load metrics")
 *   - The /api/metrics endpoint returns 200 with the contract shape the
 *     dashboard's `MetricsSnapshot` interface expects
 *   - The 8 StatCards in the dashboard show real numbers (not NaN / "-")
 */

const WORKER_BASE = "https://portly-api.vqh9mnrdbp.workers.dev";

test.describe("Dashboard /api/metrics (Cycle #28)", () => {
  test("GET /api/metrics returns 200 with expected shape", async ({ request }) => {
    const res = await request.get(`${WORKER_BASE}/api/metrics`);
    expect(res.status()).toBe(200);

    const body = await res.json();

    // Top-level fields required by dashboard's MetricsSnapshot interface
    expect(body).toHaveProperty("generatedAt");
    expect(typeof body.generatedAt).toBe("string");

    expect(body).toHaveProperty("alerts");
    expect(body.alerts).toMatchObject({
      activeSubscriptions: expect.any(Number),
      pendingAlerts: expect.any(Number),
      sentAlerts: expect.any(Number),
      failedAlerts: expect.any(Number),
      uniqueRecipients: expect.any(Number),
      recentAttempts: expect.any(Number),
    });

    expect(body).toHaveProperty("enrichment");
    expect(body.enrichment).toMatchObject({
      totalSailings: expect.any(Number),
      enrichedSailings: expect.any(Number),
      enrichmentCoveragePct: expect.any(Number),
    });

    expect(body).toHaveProperty("sailings");
    expect(body.sailings).toMatchObject({
      totalSailings: expect.any(Number),
      linesTracked: expect.any(Number),
    });

    expect(body).toHaveProperty("ingest");
    expect(body.ingest).toMatchObject({
      baseSailings: expect.any(Number),
      syntheticSailings: expect.any(Number),
      expansionRatio: expect.any(Number),
    });

    expect(body).toHaveProperty("recent");
    expect(body.recent).toMatchObject({
      lastIngestTick: expect.anything(),
      lastAlertEvalTick: expect.anything(),
      lastAlertDispatchTick: expect.anything(),
    });
  });

  test("GET /api/metrics numeric fields are > 0 (D1 has real data)", async ({ request }) => {
    const res = await request.get(`${WORKER_BASE}/api/metrics`);
    const body = await res.json();

    // The D1 DB has 1781+ sailings and 213 active alert subscriptions
    // as of Cycle #28 — the aggregator must surface those, not zeros.
    expect(body.alerts.activeSubscriptions).toBeGreaterThan(0);
    expect(body.sailings.totalSailings).toBeGreaterThan(0);
    expect(body.sailings.linesTracked).toBeGreaterThan(0);
    expect(body.ingest.baseSailings).toBeGreaterThan(0);

    // min/max prices should be populated (at least one sailing with a price)
    expect(body.sailings.minPrice).not.toBeNull();
    expect(body.sailings.maxPrice).not.toBeNull();
  });

  test("/dashboard renders metrics grid (not 'Could not load metrics')", async ({ page }) => {
    // Hit the dashboard route, wait for the client component to fetch and
    // render. Default API_BASE now points to the Worker, so the fetch will
    // succeed in production static export.
    await page.goto("/dashboard", { waitUntil: "load" });

    // The error state shows "Could not load metrics." — verify it is NOT shown.
    // Scoped to main to avoid false positives from footer text.
    const main = page.getByRole("main");
    await expect(main.getByText("Could not load metrics.")).toHaveCount(0, { timeout: 15_000 });

    // The H1 must render so we know the page mounted.
    await expect(
      page.getByRole("heading", { name: "Analytics Dashboard" })
    ).toBeVisible({ timeout: 10_000 });

    // All 4 StatCard labels must render. (Cycle #30 relabeled the headline
    // value card from "Price Range" → "Typical Price" so the median number
    // is honestly labelled; the min/max is still in the small text below.)
    const expectedLabels = [
      "Total Sailings",
      "Active Alert Subscribers",
      "AI Coverage",
      "Typical Price",
    ];
    for (const label of expectedLabels) {
      await expect(
        page.getByText(label, { exact: true }).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("/dashboard StatCards show real numbers (not 'NaN' or empty)", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "load" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 });

    // Wait for the metrics grid to render (one StatCard shows Total Sailings)
    await expect(
      page.getByText("Total Sailings", { exact: false }).first()
    ).toBeVisible({ timeout: 15_000 });

    // Pull the body text and assert it contains numeric digits and no NaN.
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toContain("NaN");
    expect(/\d/.test(bodyText)).toBe(true);

    // The "Total Sailings" card should render the actual count from the API
    // (1,781 as of this commit). The .font-display text block immediately
    // follows the uppercase label.
    const totalCard = page
      .locator("div", { has: page.getByText("Total Sailings", { exact: false }) })
      .first();
    const cardText = await totalCard.innerText();
    expect(cardText).toMatch(/\d+/);
  });

  test("/dashboard fetches from Worker URL (not relative path)", async ({ page }) => {
    // Listen for the /api/metrics network request and assert its URL.
    const metricsPromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/metrics"),
      { timeout: 15_000 }
    );

    await page.goto("/dashboard", { waitUntil: "load" });

    const resp = await metricsPromise;
    expect(resp.status()).toBe(200);

    // The fetch must go to the Worker host, not the Pages host (the static
    // export has no /api/* proxy).
    const url = new URL(resp.url());
    expect(url.host).toContain("portly-api");
    expect(url.pathname).toBe("/api/metrics");
  });
});
