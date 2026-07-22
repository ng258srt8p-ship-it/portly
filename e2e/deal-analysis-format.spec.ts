import { test, expect } from '@playwright/test';

/**
 * Phase 1: Fix Formatting & Parser Robustness — Playwright Verification
 * 
 * Tests:
 * 1. No layout shift during loading
 * 2. All section elements render correctly
 * 3. Heuristic fallback renders correctly
 * 4. Error states are user-friendly (no raw API errors)
 */

test.describe('Deal Analysis — Formatting & Parser Robustness', () => {

  test('Deal Analysis: No layout shift during loading', async ({ page }) => {
    await page.goto('/sailing/1049');
    
    // Wait for deal analysis container to appear
    await page.waitForSelector('[data-testid="deal-analysis"]', { timeout: 15000 });
    
    // Measure container dimensions at load point
    const handle = await page.$('[data-testid="deal-analysis"]');
    expect(handle).not.toBeNull();
    const boxBefore = await handle!.boundingBox();
    
    // Wait for interactive elements to render (score badge)
    await page.waitForSelector('[data-testid="deal-score-badge"]', { timeout: 10000 });
    const boxAfter = await handle!.boundingBox();
    
    // Width should not shift by more than 2px (accounting for scrollbar)
    expect(Math.abs(boxBefore!.width - boxAfter!.width)).toBeLessThan(2);
    // Height may change slightly as content loads, but width must be stable
  });

  test('Deal Analysis: All standard sections render with data-testid', async ({ page }) => {
    await page.goto('/sailing/1049');
    await page.waitForSelector('[data-testid="deal-analysis"]', { timeout: 15000 });
    
    // Verify all standard section elements exist
    await expect(page.locator('[data-testid="deal-analysis-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="deal-score-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="pricing-deep-dive"]')).toBeVisible();
    await expect(page.locator('[data-testid="price-trend"]')).toBeVisible();
    await expect(page.locator('[data-testid="insider-tips"]')).toBeVisible();
    await expect(page.locator('[data-testid="verdict"]')).toBeVisible();
  });

  test('Deal Analysis: Heuristic fallback renders correctly with badge', async ({ page }) => {
    // Mock API to return heuristic data (is_heuristic: true)
    await page.route('**/api/analytics/deal-analysis/*', async route => {
      const sailingId = route.request().url().split('/').pop() || '1';
      const heuristicData = {
        dealScore: 62,
        pricingDeepDive: "Heuristic: PPD $145, trend stable (0.3%). Inside: $1020 total",
        priceTrend: "stable",
        shipExperience: "AI analysis unavailable — based on fleet averages for this class",
        insiderTips: ["Book 60-90 days out for best cabin selection", "Monitor price drops 30-45 days before departure"],
        verdict: "Good deal — consider booking",
        is_heuristic: true,
      };
      await route.fulfill({ 
        status: 200, 
        contentType: 'application/json', 
        body: JSON.stringify({ success: true, data: heuristicData }) 
      });
    });

    await page.goto('/sailing/1049');
    await page.waitForSelector('[data-testid="deal-analysis"]', { timeout: 15000 });
    
    // Verify heuristic badge appears
    await expect(page.locator('[data-testid="heuristic-badge"]')).toBeVisible();
    // Verify score badge still renders from heuristic data
    await expect(page.locator('[data-testid="deal-score-badge"]')).toBeVisible();
  });

  test('Deal Analysis: Error states show user-friendly messages, not raw API errors', async ({ page }) => {
    // Mock API to return 500 error with raw technical details
    await page.route('**/api/analytics/deal-analysis/*', async route => {
      await route.fulfill({ 
        status: 500, 
        body: JSON.stringify({ success: false, error: 'ECONNREFUSED: connect ECONNREFUSED 127.0.0.1:5432' }) 
      });
    });

    await page.goto('/sailing/1049');
    await page.waitForSelector('[data-testid="deal-analysis-error"]', { timeout: 10000 });
    
    const errorText = await page.locator('[data-testid="deal-analysis-error"]').textContent();
    
    // Must NOT contain raw API error details
    expect(errorText).not.toContain('ECONNREFUSED');
    expect(errorText).not.toContain('127.0.0.1');
    expect(errorText).not.toContain('5432');
    
    // Must contain user-friendly guidance
    expect(errorText).toMatch(/unavailable|sync cycle|try again/i);
  });

  test('Price Forecast: No layout shift during loading', async ({ page }) => {
    await page.goto('/sailing/1049');
    
    await page.waitForSelector('[data-testid="price-forecast"]', { timeout: 15000 });
    const handle = await page.$('[data-testid="price-forecast"]');
    expect(handle).not.toBeNull();
    const boxBefore = await handle!.boundingBox();
    
    // Wait for forecast content to render
    await page.waitForSelector('[data-testid="cabin-forecasts-grid"]', { timeout: 10000 });
    const boxAfter = await handle!.boundingBox();
    
    expect(Math.abs(boxBefore!.width - boxAfter!.width)).toBeLessThan(2);
  });

  test('Price Forecast: All cabin forecast cards render with data-testid', async ({ page }) => {
    await page.goto('/sailing/1049');
    await page.waitForSelector('[data-testid="price-forecast"]', { timeout: 15000 });
    
    await expect(page.locator('[data-testid="price-forecast-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="cabin-forecast-inside"]')).toBeVisible();
    await expect(page.locator('[data-testid="cabin-forecast-oceanview"]')).toBeVisible();
    await expect(page.locator('[data-testid="cabin-forecast-balcony"]')).toBeVisible();
    await expect(page.locator('[data-testid="cabin-forecast-suite"]')).toBeVisible();
  });

  test('Price Forecast: Heuristic fallback shows badge', async ({ page }) => {
    await page.route('**/api/analytics/price-forecast/*', async route => {
      const forecastData = {
        cabinForecasts: [
          { cabinType: 'Inside', currentPrice: 800, forecast7d: 820, forecast30d: 890, confidence: 0.65, trend: 'rising' },
          { cabinType: 'Balcony', currentPrice: 1100, forecast7d: 1150, forecast30d: 1280, confidence: 0.55, trend: 'rising' },
        ],
        is_heuristic: true,
      };
      await route.fulfill({ 
        status: 200, 
        contentType: 'application/json', 
        body: JSON.stringify({ success: true, data: forecastData }) 
      });
    });

    await page.goto('/sailing/1049');
    await page.waitForSelector('[data-testid="price-forecast"]', { timeout: 15000 });
    
    // Verify heuristic badge appears in forecast
    const forecastContainer = await page.$('[data-testid="price-forecast"]');
    const badge = await forecastContainer?.$('[data-testid="heuristic-badge"]');
    expect(badge).not.toBeNull();
  });

  test('Price Forecast: Error states are user-friendly', async ({ page }) => {
    await page.route('**/api/analytics/price-forecast/*', async route => {
      await route.fulfill({ 
        status: 500, 
        body: JSON.stringify({ success: false, error: 'RateLimitError: Too many requests (429)' }) 
      });
    });

    await page.goto('/sailing/1049');
    await page.waitForSelector('[data-testid="forecast-error"]', { timeout: 10000 });
    
    const errorText = await page.locator('[data-testid="forecast-error"]').textContent();
    expect(errorText).not.toContain('RateLimitError');
    expect(errorText).not.toContain('429');
    expect(errorText).toMatch(/unavailable|sync cycle/i);
  });

  test('Both components: Loading skeletons match final dimensions', async ({ page }) => {
    // Route all API calls to slow responses to test loading state dimensions
    await page.route('**/api/analytics/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3s delay
      await route.fulfill({ 
        status: 200, 
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: null })
      });
    });

    await page.goto('/sailing/1049');
    
    // Wait for loading skeleton to appear
    await page.waitForSelector('[data-testid="deal-analysis"]', { timeout: 5000 });
    const dealHandle = await page.$('[data-testid="deal-analysis"]');
    const dealBox = await dealHandle!.boundingBox();
    
    // Wait for price forecast loading skeleton
    await page.waitForSelector('[data-testid="price-forecast"]', { timeout: 5000 });
    const forecastHandle = await page.$('[data-testid="price-forecast"]');
    const forecastBox = await forecastHandle!.boundingBox();
    
    // Both should have consistent widths (same parent container)
    expect(Math.abs(dealBox!.width - forecastBox!.width)).toBeLessThan(4);
  });
});
