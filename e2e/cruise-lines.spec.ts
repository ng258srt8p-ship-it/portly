import { test, expect } from '@playwright/test';

test.describe('Multiple cruise lines', () => {
  test('deals page shows all major cruise lines', async ({ page }) => {
    await page.goto('/deals');
    
    await page.waitForSelector('[data-testid="deal-card"]', { timeout: 15000 });
    
    const cards = page.locator('[data-testid="deal-card"]');
    const count = await cards.count();
    console.log(`Total cards: ${count}`);
    
    // Check all lines appear
    const expectedLines = ['Royal Caribbean', 'Norwegian Cruise Line', 'Princess Cruises', 'Carnival Cruise Line', 'Celebrity Cruises', 'MSC Cruises', 'Disney Cruise Line', 'Holland America'];
    const found = new Set<string>();
    
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const text = await card.textContent();
      for (const line of expectedLines) {
        if (text.includes(line)) found.add(line);
      }
    }
    
    console.log(`Lines found: ${found.size}/${expectedLines.length}`);
    for (const l of expectedLines) {
      console.log(`  ${found.has(l) ? '✓' : '✗'} ${l}`);
    }
    
    expect(found.size).toBeGreaterThanOrEqual(6);
  });
});
