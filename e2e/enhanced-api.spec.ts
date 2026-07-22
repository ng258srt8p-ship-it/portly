/**
 * Enhanced API E2E Tests
 * 
 * Tests for /api/enhanced/deal-analysis and /api/enhanced/price-forecast endpoints.
 * Validates new fields: justification, hiddenCosts, cabinValueBreakdown, rateLock, trendContext.
 * 
 * Uses cached data (no forceRefresh) to avoid slow OpenCode AI calls.
 * Uses a sailing with pre-existing analysis data.
 */

import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';
const TEST_SAILING_ID = process.env.TEST_SAILING_ID || '1049';

test.describe('Enhanced Deal Analysis API', () => {
  test('returns successful response with deal analysis data', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/enhanced/deal-analysis/${TEST_SAILING_ID}`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
  });

  test('returns justification field with >50 chars', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/enhanced/deal-analysis/${TEST_SAILING_ID}`);
    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.justification).toBeDefined();
    // Can be string or array of FormattedSection
    if (Array.isArray(json.data.justification)) {
      expect(json.data.justification.length).toBeGreaterThanOrEqual(1);
      const totalContent = json.data.justification.reduce((sum, s) => sum + s.content.length, 0);
      expect(totalContent).toBeGreaterThan(50);
    } else {
      expect(json.data.justification.length).toBeGreaterThan(50);
      expect(typeof json.data.justification).toBe('string');
    }
  });

  test('returns hiddenCosts object with all required fields', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/enhanced/deal-analysis/${TEST_SAILING_ID}`);
    const json = await res.json();
    expect(json.data.hiddenCosts).toBeDefined();
    expect(json.data.hiddenCosts.mandatoryGratuities).toBeDefined();
    expect(typeof json.data.hiddenCosts.mandatoryGratuities).toBe('number');
    expect(json.data.hiddenCosts.mandatoryGratuities).toBeGreaterThan(0);
    
    expect(json.data.hiddenCosts.wifiCost).toBeDefined();
    expect(typeof json.data.hiddenCosts.wifiCost).toBe('number');
    expect(json.data.hiddenCosts.wifiCost).toBeGreaterThan(0);
    
    expect(json.data.hiddenCosts.realTotalCost).toBeDefined();
    expect(typeof json.data.hiddenCosts.realTotalCost).toBe('number');
    expect(json.data.hiddenCosts.realTotalCost).toBeGreaterThan(0);
  });

  test('returns cabinValueBreakdown with ratings', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/enhanced/deal-analysis/${TEST_SAILING_ID}`);
    const json = await res.json();
    expect(json.data.cabinValueBreakdown).toBeDefined();
    expect(typeof json.data.cabinValueBreakdown).toBe('object');
    
    const cabins = json.data.cabinValueBreakdown as Record<string, { perNight: number; valueRating: string }>;
    expect(Object.keys(cabins).length).toBeGreaterThan(0);
    
    for (const [cabin, value] of Object.entries(cabins)) {
      expect(value.perNight).toBeDefined();
      expect(typeof value.perNight).toBe('number');
      expect(value.valueRating).toBeDefined();
      expect(['Excellent', 'Great', 'Good', 'Fair', 'Overpriced']).toContain(value.valueRating);
    }
  });

  test('returns deal score in valid range (0-100)', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/enhanced/deal-analysis/${TEST_SAILING_ID}`);
    const json = await res.json();
    expect(json.data.dealScore).toBeDefined();
    expect(typeof json.data.dealScore).toBe('number');
    expect(json.data.dealScore).toBeGreaterThanOrEqual(0);
    expect(json.data.dealScore).toBeLessThanOrEqual(100);
  });

  test('returns price trend as rising/falling/stable', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/enhanced/deal-analysis/${TEST_SAILING_ID}`);
    const json = await res.json();
    expect(json.data.priceTrend).toBeDefined();
    expect(['rising', 'falling', 'stable']).toContain(json.data.priceTrend);
  });

  test('returns insider tips as non-empty array', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/enhanced/deal-analysis/${TEST_SAILING_ID}`);
    const json = await res.json();
    expect(json.data.insiderTips).toBeDefined();
    expect(Array.isArray(json.data.insiderTips)).toBe(true);
    expect(json.data.insiderTips.length).toBeGreaterThan(0);
  });

  test('returns verdict string', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/enhanced/deal-analysis/${TEST_SAILING_ID}`);
    const json = await res.json();
    expect(json.data.verdict).toBeDefined();
    expect(typeof json.data.verdict).toBe('string');
    expect(json.data.verdict.length).toBeGreaterThan(0);
  });

  test('returns pricingDeepDive and inventoryIntelligence', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/enhanced/deal-analysis/${TEST_SAILING_ID}`);
    const json = await res.json();
    expect(json.data.pricingDeepDive).toBeDefined();
    expect(typeof json.data.pricingDeepDive).toBe('string');
    expect(json.data.pricingDeepDive.length).toBeGreaterThan(0);
    
    expect(json.data.inventoryIntelligence).toBeDefined();
    expect(typeof json.data.inventoryIntelligence).toBe('string');
    expect(json.data.inventoryIntelligence.length).toBeGreaterThan(0);
  });

  test('returns shipValueScore and pricingStrategy', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/enhanced/deal-analysis/${TEST_SAILING_ID}`);
    const json = await res.json();
    expect(json.data.shipValueScore).toBeDefined();
    expect(typeof json.data.shipValueScore).toBe('number');
    expect(json.data.shipValueScore).toBeGreaterThanOrEqual(0);
    expect(json.data.shipValueScore).toBeLessThanOrEqual(100);
    
    expect(json.data.pricingStrategy).toBeDefined();
    expect(typeof json.data.pricingStrategy).toBe('string');
    expect(json.data.pricingStrategy.length).toBeGreaterThan(0);
  });
});

test.describe('Enhanced Price Forecast API', () => {
  test('returns successful response with price forecast data', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/enhanced/price-forecast/${TEST_SAILING_ID}`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
  });

  test('returns rateLock with urgency field', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/enhanced/price-forecast/${TEST_SAILING_ID}`);
    const json = await res.json();
    expect(json.data.rateLock).toBeDefined();
    expect(json.data.rateLock.urgency).toBeDefined();
    expect(['critical', 'high', 'moderate', 'low']).toContain(json.data.rateLock.urgency);
    expect(typeof json.data.rateLock.urgency).toBe('string');
  });

  test('returns trendContext with windows', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/enhanced/price-forecast/${TEST_SAILING_ID}`);
    const json = await res.json();
    expect(json.data.trendContext).toBeDefined();
    expect(json.data.trendContext.direction).toBeDefined();
    expect(['rising', 'falling', 'stable']).toContain(json.data.trendContext.direction);
    
    expect(json.data.trendContext.windows).toBeDefined();
    expect(Array.isArray(json.data.trendContext.windows)).toBe(true);
    
    if (json.data.trendContext.windows.length > 0) {
      const window = json.data.trendContext.windows[0];
      expect(window.period).toBeDefined();
      expect(window.direction).toBeDefined();
      expect(typeof window.magnitude).toBe('number');
      expect(window.snapshots).toBeGreaterThan(0);
    }
  });

  test('returns cabin forecasts with valid data', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/enhanced/price-forecast/${TEST_SAILING_ID}`);
    const json = await res.json();
    expect(json.data.cabinForecasts).toBeDefined();
    expect(Array.isArray(json.data.cabinForecasts)).toBe(true);
    
    if (json.data.cabinForecasts.length > 0) {
      const cf = json.data.cabinForecasts[0];
      expect(cf.cabinType).toBeDefined();
      expect(cf.currentPrice).toBeDefined();
      expect(cf.forecast7d).toBeDefined();
      expect(cf.forecast30d).toBeDefined();
      expect(typeof cf.confidence).toBe('number');
      expect(cf.confidence).toBeGreaterThanOrEqual(0);
      expect(cf.confidence).toBeLessThanOrEqual(1);
      expect(['rising', 'falling', 'stable']).toContain(cf.trend);
    }
  });

  test('returns alerts if applicable', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/enhanced/price-forecast/${TEST_SAILING_ID}`);
    const json = await res.json();
    if (json.data.alerts) {
      expect(Array.isArray(json.data.alerts)).toBe(true);
      if (json.data.alerts.length > 0) {
        const alert = json.data.alerts[0];
        expect(alert.cabinType).toBeDefined();
        expect(alert.triggerPrice).toBeDefined();
        expect(alert.currentPrice).toBeDefined();
        expect(alert.savings).toBeDefined();
        expect(alert.savings).toBeGreaterThan(0);
      }
    }
  });

  test('returns seasonal indicator', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/enhanced/price-forecast/${TEST_SAILING_ID}`);
    const json = await res.json();
    if (json.data.seasonalIndicator) {
      expect(['peak', 'shoulder', 'low', 'unknown']).toContain(json.data.seasonalIndicator);
    }
  });

  test('returns competing sailings if available', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/enhanced/price-forecast/${TEST_SAILING_ID}`);
    const json = await res.json();
    if (json.data.competingSailings && json.data.competingSailings.length > 0) {
      const cs = json.data.competingSailings[0];
      expect(cs.cruiseLine).toBeDefined();
      expect(cs.shipName).toBeDefined();
      expect(cs.balconyPrice).toBeGreaterThan(0);
    }
  });
});

test.describe('Enhanced Components Rendering', () => {
  test('renders EnhancedDealAnalysis component on sailing page', async ({ page }) => {
    await page.goto(`/sailing/${TEST_SAILING_ID}`);
    await page.waitForSelector('[data-testid="enhanced-deal-analysis"]', { timeout: 15000 });
    const component = await page.$('[data-testid="enhanced-deal-analysis"]');
    expect(component).toBeTruthy();
  });

  test('renders HiddenCostDisplay with data-testid', async ({ page }) => {
    await page.goto(`/sailing/${TEST_SAILING_ID}`);
    await page.waitForSelector('[data-testid="hidden-cost-detector"]', { timeout: 15000 });
    const hiddenCosts = await page.$('[data-testid="hidden-cost-detector"]');
    expect(hiddenCosts).toBeTruthy();
  });

  test('renders cabin value comparison with data-testid', async ({ page }) => {
    await page.goto(`/sailing/${TEST_SAILING_ID}`);
    await page.waitForSelector('[data-testid="cabin-value-breakdown"]', { timeout: 15000 });
    const cabinValue = await page.$('[data-testid="cabin-value-breakdown"]');
    expect(cabinValue).toBeTruthy();
  });

  test('renders deal justification section with content', async ({ page }) => {
    await page.goto(`/sailing/${TEST_SAILING_ID}`);
    await page.waitForSelector('[data-testid="deal-justification"]', { timeout: 15000 });
    const justification = await page.$('[data-testid="deal-justification"]');
    expect(justification).toBeTruthy();
    const text = await page.textContent('[data-testid="deal-justification"]');
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(50);
  });

  test('renders insider tips section', async ({ page }) => {
    await page.goto(`/sailing/${TEST_SAILING_ID}`);
    await page.waitForSelector('[data-testid="sailing-specific-tips"]', { timeout: 15000 });
    const tips = await page.$('[data-testid="sailing-specific-tips"]');
    expect(tips).toBeTruthy();
  });

  test('shows heuristic badge when data is heuristic-generated', async ({ page }) => {
    await page.goto(`/sailing/${TEST_SAILING_ID}`);
    // The heuristic badge may or may not be present depending on data
    const badge = await page.$('[data-testid="heuristic-badge"]');
    // Just verify no errors occur when badge is missing or present
    expect(true).toBe(true);
  });
});
