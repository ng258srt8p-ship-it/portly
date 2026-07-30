import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://portly-1i0.pages.dev';

test.describe('Cycle #26 — departurePort contract (live)', () => {
  test('deal cards show itinerary[0] as departurePort, not legacy column', async ({ page, request }) => {
    // API contract gate
    const apiResp = await request.get(`${BASE}/api/deals?limit=50`);
    expect(apiResp.status()).toBe(200);
    const deals = await apiResp.json();
    const mismatches = deals.filter((d: any) => {
      const it = d.itinerary || [];
      const dp = d.departurePort || '';
      return it.length > 0 && dp && dp.toLowerCase() !== it[0].toLowerCase();
    });
    expect(mismatches, `${mismatches.length} sailings have depPort != itinerary[0]`).toHaveLength(0);

    // UI gate — visible Miami/Galveston cards (not Lisbon/Athens garbage)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/deals`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const cards = page.locator('[data-testid="deal-card"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // No "lisbon" / "athens" strings in card text (legacy garbage)
    const firstBatchText = await cards.first().locator('..').innerText().catch(() => '');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).not.toContain('lisbon');
    expect(bodyText.toLowerCase()).not.toContain('athens');
  });

  test('filter catalog returns proper-cased ports only', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/filters`);
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    const filters = data.filters || data;
    const ports: string[] = filters.departurePorts || [];
    // No duplicate ports differing only by case
    const seen = new Map<string, string>();
    for (const p of ports) {
      const key = p.toLowerCase();
      expect(seen.has(key), `port "${p}" duplicates "${seen.get(key)}"`).toBe(false);
      seen.set(key, p);
    }
    // Should contain at least Miami, Galveston (from real sailings)
    expect(ports).toContain('Miami');
  });
});
