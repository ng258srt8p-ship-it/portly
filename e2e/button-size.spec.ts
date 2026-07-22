import { test, expect } from '@playwright/test';

test.describe('Deal card button sizing', () => {
  test('all View Deal buttons have identical dimensions', async ({ page }) => {
    await page.goto('/deals');
    await page.waitForSelector('[data-testid="deal-card"]', { timeout: 15000 });

    const cards = page.locator('[data-testid="deal-card"]');
    const count = await cards.count();

    const dimensions: { width: number; height: number }[] = [];

    // Sample first 6 cards only (enough to verify consistency)
    const sample = Math.min(count, 6);
    for (let i = 0; i < sample; i++) {
      const card = cards.nth(i);
      const vdBtn = card.locator('button').filter({ hasText: 'View Deal' }).first();
      const box = await vdBtn.boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        dimensions.push({ width: box.width, height: box.height });
      }
    }

    expect(dimensions.length).toBeGreaterThanOrEqual(5);

    // All must match (tolerance for rendering rounding)
    const ref = dimensions[0];
    const tol = 5; // 5px tolerance
    for (const d of dimensions) {
      expect(d.width, `width ${d.width} should match ref ${ref.width}`).toBeGreaterThanOrEqual(ref.width - tol);
      expect(d.width, `width ${d.width} should match ref ${ref.width}`).toBeLessThanOrEqual(ref.width + tol);
      expect(d.height, `height ${d.height} should match ref ${ref.height}`).toBeGreaterThanOrEqual(ref.height - tol);
      expect(d.height, `height ${d.height} should match ref ${ref.height}`).toBeLessThanOrEqual(ref.height + tol);
    }
  });
});
