import { test, expect } from '@playwright/test';

/**
 * Phase 6: Competitive Moat Verification — Playwright
 * 
 * Verifies that TripTide's unique features that competitors DON'T have
 * actually render for each sailing.
 */

test.describe('Competitive Moat — Unique Features That Competitors Lack', () => {

  test('Inventory Intelligence renders with cabin-specific content', async ({ page }) => {
    // Mock enhanced analytics API
    await page.route('**/api/enhanced/deal-analysis/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            dealScore: 78,
            pricingDeepDive: 'At $142/ppd, this Royal Caribbean sailing is 15% below the 6-month average for Icon of the Seas Caribbean routes.',
            priceTrend: 'rising',
            inventoryIntelligence: 'Balcony cabins on this sailing have sold 40% faster than the 90-day average for Icon of the Seas Caribbean routes. Inside cabins are still widely available at current pricing.',
            pricingStrategy: 'Royal Caribbean is using an aggressive load-building strategy on this sailing — 23% below their 6-month average for the same route. This is a promotional push, not a permanent price cut.',
            shipValueScore: 82,
            itineraryValue: 'Your $1,200 fare covers 4 ports at $300/port average. Cozumel charges $45/person for pier access — budget accordingly.',
            hiddenCosts: { mandatoryGratuities: 203, wifiCost: 84, resortFees: 25, realTotalCost: 1312 },
            insiderTips: ['This sailing departs during crew change week — expect some delays.', 'Request Deck 5 forward for quiet.'],
            verdict: 'Good deal — consider booking.',
            is_heuristic: false,
          },
        }),
      });
    });

    await page.goto('/sailing/1049');
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 15000 });

    // Verify inventory intelligence renders
    const inventoryEl = page.locator('[data-testid="inventory-intelligence"]');
    await expect(inventoryEl).toBeVisible();
    const inventoryText = await inventoryEl.textContent();
    expect(inventoryText).toMatch(/balcony|inside|sold|faster|available/i);
  });

  test('Pricing Strategy Decoder renders with cruise line-specific strategy', async ({ page }) => {
    await page.route('**/api/enhanced/deal-analysis/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            dealScore: 78,
            pricingDeepDive: 'Test analysis',
            priceTrend: 'rising',
            inventoryIntelligence: 'Test inventory',
            pricingStrategy: 'Royal Caribbean is using aggressive load-building — 23% below average.',
            shipValueScore: 82,
            itineraryValue: 'Test itinerary',
            hiddenCosts: { mandatoryGratuities: 203, wifiCost: 84, resortFees: 25, realTotalCost: 1312 },
            insiderTips: ['Test tip 1'],
            verdict: 'Good deal.',
            is_heuristic: false,
          },
        }),
      });
    });

    await page.goto('/sailing/1049');
    await page.waitForSelector('[data-testid="pricing-strategy-decoder"]', { timeout: 15000 });

    const strategyText = await page.locator('[data-testid="pricing-strategy-decoder"]').textContent();
    expect(strategyText).toMatch(/strategy|discount|aggressive|load-building/i);
    expect(strategyText).toMatch(/royal caribbean/i);
  });

  test('Ship Value Score renders as a visual score badge', async ({ page }) => {
    await page.route('**/api/enhanced/deal-analysis/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            dealScore: 78,
            pricingDeepDive: 'Test',
            priceTrend: 'rising',
            inventoryIntelligence: 'Test',
            pricingStrategy: 'Test',
            shipValueScore: 82,
            itineraryValue: 'Test',
            hiddenCosts: { mandatoryGratuities: 203, wifiCost: 84, resortFees: 25, realTotalCost: 1312 },
            insiderTips: ['Test'],
            verdict: 'Good deal.',
            is_heuristic: false,
          },
        }),
      });
    });

    await page.goto('/sailing/1049');
    await page.waitForSelector('[data-testid="ship-value-scoring"]', { timeout: 15000 });

    const scoreEl = page.locator('[data-testid="ship-value-scoring"]');
    const scoreText = await scoreEl.textContent();
    expect(scoreText).toMatch(/82/);
    expect(scoreText).toMatch(/value/i);
  });

  test('Itinerary Value Breakdown renders with cost-per-port analysis', async ({ page }) => {
    await page.route('**/api/enhanced/deal-analysis/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            dealScore: 78,
            pricingDeepDive: 'Test',
            priceTrend: 'rising',
            inventoryIntelligence: 'Test',
            pricingStrategy: 'Test',
            shipValueScore: 82,
            itineraryValue: 'Total fare $1,200 ÷ 4 ports = $300 per port. Cozumel charges $45/person for pier access.',
            hiddenCosts: { mandatoryGratuities: 203, wifiCost: 84, resortFees: 25, realTotalCost: 1312 },
            insiderTips: ['Test'],
            verdict: 'Good deal.',
            is_heuristic: false,
          },
        }),
      });
    });

    await page.goto('/sailing/1049');
    await page.waitForSelector('[data-testid="itinerary-value-breakdown"]', { timeout: 15000 });

    const itineraryText = await page.locator('[data-testid="itinerary-value-breakdown"]').textContent();
    expect(itineraryText).toMatch(/\$[0-9,]+\/port|per port|\$[0-9]+ per/i);
  });

  test('Hidden Cost Detector shows real total vs listed price', async ({ page }) => {
    await page.route('**/api/enhanced/deal-analysis/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            dealScore: 78,
            pricingDeepDive: 'Test',
            priceTrend: 'rising',
            inventoryIntelligence: 'Test',
            pricingStrategy: 'Test',
            shipValueScore: 82,
            itineraryValue: 'Test',
            hiddenCosts: { mandatoryGratuities: 203, wifiCost: 84, resortFees: 25, realTotalCost: 1312 },
            insiderTips: ['Test'],
            verdict: 'Good deal.',
            is_heuristic: false,
          },
        }),
      });
    });

    await page.goto('/sailing/1049');
    await page.waitForSelector('[data-testid="hidden-cost-detector"]', { timeout: 15000 });

    const hiddenCostText = await page.locator('[data-testid="hidden-cost-detector"]').textContent();
    expect(hiddenCostText).toMatch(/\$203|gratuit/i);
    expect(hiddenCostText).toMatch(/\$84|wi-fi/i);
    expect(hiddenCostText).toMatch(/\$1,312|real.*total/i);
  });

  test('Sailing-Specific Tips render (NOT generic advice)', async ({ page }) => {
    await page.route('**/api/enhanced/deal-analysis/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            dealScore: 78,
            pricingDeepDive: 'Test',
            priceTrend: 'rising',
            inventoryIntelligence: 'Test',
            pricingStrategy: 'Test',
            shipValueScore: 82,
            itineraryValue: 'Test',
            hiddenCosts: { mandatoryGratuities: 203, wifiCost: 84, resortFees: 25, realTotalCost: 1312 },
            insiderTips: [
              'This sailing departs during crew change week — expect some delays in cabin readiness.',
              'Request Deck 5 forward (away from the late-night arcade on Deck 14) for quiet.',
              'The ship installs a new ice skating rink on this rotation — check the Deck 14 schedule.',
            ],
            verdict: 'Good deal.',
            is_heuristic: false,
          },
        }),
      });
    });

    await page.goto('/sailing/1049');
    await page.waitForSelector('[data-testid="sailing-specific-tips"]', { timeout: 15000 });

    const tipsText = await page.locator('[data-testid="sailing-specific-tips"]').textContent();
    // Must contain sailing-specific details
    expect(tipsText).toMatch(/crew change|deck \d+|ice skating|this rotation|arcade/i);
    // Must NOT be only generic advice
    expect(tipsText).not.toMatch(/^(book early|clear your cookies|check multiple sites)$/i);
  });

  test('Price forecast per-cabin-type cards render with confidence intervals', async ({ page }) => {
    await page.route('**/api/enhanced/price-forecast/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            cabinForecasts: [
              { cabinType: 'Inside', currentPrice: 800, forecast7d: 820, forecast30d: 890, confidence: 0.72, trend: 'rising' },
              { cabinType: 'Oceanview', currentPrice: 950, forecast7d: 980, forecast30d: 1060, confidence: 0.68, trend: 'rising' },
              { cabinType: 'Balcony', currentPrice: 1100, forecast7d: 1150, forecast30d: 1280, confidence: 0.62, trend: 'rising' },
              { cabinType: 'Suite', currentPrice: 1800, forecast7d: 1860, forecast30d: 2040, confidence: 0.55, trend: 'rising' },
            ],
            optimalBookingWindow: '4-6 months before departure for this Royal Caribbean Caribbean sailing',
            competingSailings: [
              { sailingId: 2, cruiseLine: 'Carnival', shipName: 'Carnival Celebration', departureDate: '2026-03-20', balconyPrice: 1280 },
            ],
            alerts: [{ cabinType: 'Balcony', triggerPrice: 935, currentPrice: 1100, savings: 165 }],
            is_heuristic: false,
          },
        }),
      });
    });

    await page.goto('/sailing/1049');
    await page.waitForSelector('[data-testid="enhanced-price-forecast"]', { timeout: 15000 });

    // All 4 cabin types render
    await expect(page.locator('[data-testid="cabin-forecast-inside"]')).toBeVisible();
    await expect(page.locator('[data-testid="cabin-forecast-oceanview"]')).toBeVisible();
    await expect(page.locator('[data-testid="cabin-forecast-balcony"]')).toBeVisible();
    await expect(page.locator('[data-testid="cabin-forecast-suite"]')).toBeVisible();

    // Confidence intervals shown
    const balconyText = await page.locator('[data-testid="cabin-forecast-balcony"]').textContent();
    expect(balconyText).toMatch(/62%/);
  });

  test('Competing sailing comparisons render', async ({ page }) => {
    await page.route('**/api/enhanced/price-forecast/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            cabinForecasts: [
              { cabinType: 'Inside', currentPrice: 800, forecast7d: 820, forecast30d: 890, confidence: 0.72, trend: 'rising' },
              { cabinType: 'Balcony', currentPrice: 1100, forecast7d: 1150, forecast30d: 1280, confidence: 0.62, trend: 'rising' },
            ],
            competingSailings: [
              { sailingId: 2, cruiseLine: 'Carnival', shipName: 'Carnival Celebration', departureDate: '2026-03-20', balconyPrice: 1280 },
            ],
            is_heuristic: false,
          },
        }),
      });
    });

    await page.goto('/sailing/1049');
    await page.waitForSelector('[data-testid="competing-sailing-comparison"]', { timeout: 15000 });

    const compText = await page.locator('[data-testid="competing-sailing-comparison"]').textContent();
    expect(compText).toMatch(/carnival/i);
    expect(compText).toMatch(/celebration/i);
  });

  test('Optimal booking window is sailing-specific', async ({ page }) => {
    await page.route('**/api/enhanced/price-forecast/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            cabinForecasts: [{ cabinType: 'Inside', currentPrice: 800, forecast7d: 820, forecast30d: 890, confidence: 0.72, trend: 'rising' }],
            optimalBookingWindow: '4-6 months before departure for this Royal Caribbean Caribbean sailing',
            is_heuristic: false,
          },
        }),
      });
    });

    await page.goto('/sailing/1049');
    await page.waitForSelector('[data-testid="optimal-booking-window"]', { timeout: 15000 });

    const windowText = await page.locator('[data-testid="optimal-booking-window"]').textContent();
    expect(windowText).toMatch(/\d+-\d+ months/i);
  });

  test('Price trajectory chart renders with all cabin types', async ({ page }) => {
    await page.route('**/api/enhanced/price-forecast/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            cabinForecasts: [
              { cabinType: 'Inside', currentPrice: 800, forecast7d: 820, forecast30d: 890, confidence: 0.72, trend: 'rising' },
              { cabinType: 'Balcony', currentPrice: 1100, forecast7d: 1150, forecast30d: 1280, confidence: 0.62, trend: 'rising' },
            ],
            is_heuristic: false,
          },
        }),
      });
    });

    await page.goto('/sailing/1049');
    await page.waitForSelector('[data-testid="price-trajectory-chart"]', { timeout: 15000 });

    const svgChart = page.locator('[data-testid="price-trajectory-svg"]');
    await expect(svgChart).toBeVisible();
  });
});
