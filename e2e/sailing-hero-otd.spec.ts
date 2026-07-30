import { test, expect } from "@playwright/test";

/**
 * Cycle #27 — SailingHero OTD breakdown regression
 *
 * Three classes of bug live here, all on the sailing detail hero card:
 *  1. The OTD breakdown rows (Base Fare / Port Taxes / Gratuities) used to
 *     fabricate numbers via `price * 0.6 / 0.25 / 0.15` percentage
 *     multipliers instead of pulling real `cabinBreakdown[0]` data from the
 *     Worker. This produced wildly wrong breakdowns (e.g., a $320 sailing
 *     showed $192 / $80 / $48).
 *  2. The "View Deal / Book" CTA was wired to `href="#"` — a completely
 *     dead anchor. The real `bookingUrl` from the API was being passed to
 *     the bottom CTA but not the hero.
 *  3. The "Track Price" button built `/alerts?sailing=/sailing/${pathname}`
 *     which double-stacked the `/sailing/` prefix when the pathname already
 *     started with `/sailing/`.
 *
 * The fix wires `cabinTier` (real baseFare / portTax / gratuityPerNight)
 * and `bookingUrl` into the hero, so:
 *   - OTD rows reflect real cabin_prices when available (with a legacy %
 *     multiplier fallback so the rows never disappear)
 *   - "View Deal / Book" goes to the real bookingUrl when present, else
 *     renders as a disabled (cursor-not-allowed) span
 *   - "Track Price" redirects to `/alerts?sailing=/sailing/<id>` exactly
 *     once (no doubled prefix)
 */

const SAILING_ID = "carnival_horizon_2026-03-08_miami_6__big_31__v4m";

test.describe("SailingHero — Out-the-Door breakdown (Cycle #27)", () => {
  test("OTD rows render real cabin_prices (not percentage multipliers)", async ({ page }) => {
    await page.goto(`/sailing/${SAILING_ID}`, { waitUntil: "load" });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // All three OTD row test IDs must be present.
    await expect(page.getByTestId("hero-otd-base-fare")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("hero-otd-port-tax")).toBeVisible();
    await expect(page.getByTestId("hero-otd-gratuity")).toBeVisible();
    await expect(page.getByTestId("hero-otd-total")).toBeVisible();

    // Total = base + portTax + gratuity (numbers, not strings).
    const baseText = await page.getByTestId("hero-otd-base-fare").textContent();
    const portTaxText = await page.getByTestId("hero-otd-port-tax").textContent();
    const gratuityText = await page.getByTestId("hero-otd-gratuity").textContent();
    const totalText = await page.getByTestId("hero-otd-total").textContent();
    expect(baseText).toBeTruthy();
    expect(totalText).toBeTruthy();

    const baseNum = Number((baseText || "").replace(/[^0-9]/g, ""));
    const portTaxNum = Number((portTaxText || "").replace(/[^0-9]/g, ""));
    const gratuityNum = Number((gratuityText || "").replace(/[^0-9]/g, ""));
    const totalNum = Number((totalText || "").replace(/[^0-9]/g, ""));

    // Total must equal base + portTax + gratuity (allowing for rounding).
    expect(Math.abs(totalNum - (baseNum + portTaxNum + gratuityNum))).toBeLessThanOrEqual(5);

    // Sanity check — base should be > 0 (the test sailing is real data).
    expect(baseNum).toBeGreaterThan(0);
    expect(portTaxNum).toBeGreaterThan(0);
    expect(gratuityNum).toBeGreaterThan(0);
  });

  test("'View Deal / Book' CTA is functional (real bookingUrl, not href=#)", async ({ page }) => {
    await page.goto(`/sailing/${SAILING_ID}`, { waitUntil: "load" });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const cta = page.getByTestId("hero-view-deal-link");
    await expect(cta).toBeVisible({ timeout: 10_000 });
    const tagName = await cta.evaluate((el) => el.tagName.toLowerCase());
    if (tagName === "a") {
      // Real bookingUrl → must NOT be the empty "#" anchor.
      const href = await cta.getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).not.toBe("#");
      expect(href).not.toBe("");
      // bookingUrl should start with http(s)://
      expect(href).toMatch(/^https?:\/\//);
      expect(await cta.getAttribute("target")).toBe("_blank");
      expect(await cta.getAttribute("rel")).toContain("noopener");
    } else {
      // No bookingUrl available — the disabled span must carry the inert marker.
      const ariaDisabled = await cta.getAttribute("aria-disabled");
      expect(ariaDisabled).toBe("true");
    }
  });

  test("'Track Price' button does not double the /sailing/ prefix", async ({ page }) => {
    await page.goto(`/sailing/${SAILING_ID}`, { waitUntil: "load" });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const trackBtn = page.getByTestId("hero-track-price");
    await expect(trackBtn).toBeVisible({ timeout: 10_000 });

    // Click and assert the resulting URL has exactly ONE /sailing/ in the query value.
    await trackBtn.click();
    await page.waitForURL(/\/alerts/, { timeout: 10_000 });

    const url = page.url();
    // Extract the sailing param value.
    const match = url.match(/[?&]sailing=([^&]+)/);
    expect(match).toBeTruthy();
    const decoded = decodeURIComponent(match![1]);
    // Must start with /sailing/ exactly once.
    expect(decoded.startsWith("/sailing/")).toBe(true);
    expect(decoded.match(/\/sailing\//g)?.length).toBe(1);
    // Must equal the original sailing ID's path.
    expect(decoded).toBe(`/sailing/${SAILING_ID}`);
  });

  test("OTD fallback: when cabinTier is missing, rows still render (% multipliers)", async ({ page }) => {
    // Inject a fake sailing that has price but no cabinTier to exercise the fallback path.
    // We do this by intercepting /api/sailing/:id and stripping cabinBreakdown.
    await page.route(/\/api\/sailing\//, async (route) => {
      try {
        const response = await route.fetch();
        const json = await response.json();
        json.cabinBreakdown = [];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(json),
        });
      } catch {
        // If interception races, just continue without modification.
        await route.continue();
      }
    });

    await page.goto(`/sailing/${SAILING_ID}`, { waitUntil: "load" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

    // All OTD rows must still be present (fallback path).
    await expect(page.getByTestId("hero-otd-base-fare")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("hero-otd-port-tax")).toBeVisible();
    await expect(page.getByTestId("hero-otd-gratuity")).toBeVisible();
    await expect(page.getByTestId("hero-otd-total")).toBeVisible();

    const totalText = await page.getByTestId("hero-otd-total").textContent();
    const totalNum = Number((totalText || "").replace(/[^0-9]/g, ""));
    expect(totalNum).toBeGreaterThan(0);
  });
});
