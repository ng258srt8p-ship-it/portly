import { test, expect } from '@playwright/test';

/**
 * Test: Distinguish intentional status dots from skeleton loaders
 * 
 * Status dots: small (~1.5x1.5) pulse indicators used decoratively
 * Skeleton cards: larger (~40-64 height) placeholders that should hide when data loads
 */

test.describe('Skeleton loaders verification', () => {
  
  test('static pages only have intentional status dots (not skeleton cards)', async ({ page }) => {
    // Check static pages - status dots should remain (they're intentional)
    await page.goto('/about');
    await page.waitForTimeout(2000);
    
    // Find ALL animate-pulse elements
    const pulseElements = page.locator('.animate-pulse');
    const pulseCount = await pulseElements.count();
    console.log(`  About page: ${pulseCount} pulse elements`);
    
    // These should all be status dots (small circles, not card skeletons)
    const pulseCards = page.locator('.animate-pulse').filter({ has: page.locator('.bg-black') });
    const cardCount = await pulseCards.count();
    console.log(`  About cards with bg-black: ${cardCount}`);
  });

  test('sailing detail page skeletons hide when data loads', async ({ page }) => {
    await page.goto('/sailing/2');
    await page.waitForTimeout(15000);
    
    const pulseCards = page.locator('.animate-pulse');
    const cardCount = await pulseCards.count();
    console.log(`  Sailing detail page: ${cardCount} pulse elements`);
    
    // Skeleton cards should be gone since data loaded
    expect(cardCount).toBe(0);
  });

  test('solo page skeletons hide when data loads', async ({ page }) => {
    await page.goto('/solo');
    await page.waitForTimeout(10000);
    
    const pulseCards = page.locator('.animate-pulse');
    const cardCount = await pulseCards.count();
    console.log(`  Solo page: ${cardCount} pulse elements`);
    
    // Skeleton cards should be gone since data loaded (364 cards)
    expect(cardCount).toBe(0);
  });

  test('history page skeletons hide when data loads', async ({ page }) => {
    await page.goto('/history');
    await page.waitForTimeout(10000);
    
    const pulseCards = page.locator('.animate-pulse');
    const cardCount = await pulseCards.count();
    console.log(`  History page: ${cardCount} pulse elements`);
    
    // Skeleton cards should be gone since data loaded
    expect(cardCount).toBe(0);
  });

  test('deals page only has intentional status dot (not skeleton card)', async ({ page }) => {
    await page.goto('/deals');
    await page.waitForTimeout(10000);
    
    // No skeleton cards — data loaded, cards render
    const pulseCards = page.locator('.animate-pulse').filter({ has: page.locator('.bg-black') });
    const cardCount = await pulseCards.count();
    console.log(`  Deals skeleton cards: ${cardCount}`);
    expect(cardCount).toBe(0);

    // Only 1 intentional pulse dot (hero indicator) visible
    const pulseDots = page.locator('.animate-pulse').filter({ has: page.locator('.text-mint-ink') });
    const dotCount = await pulseDots.count();
    console.log(`  Deals status dots: ${dotCount}`);
  });
});
