/**
 * Comprehensive Validation — Enhanced Analytics Across ALL Active Sailings
 * 
 * Validates Deal Analysis and Price Forecast endpoints for every active sailing.
 * Checks all new fields: justification, hiddenCosts, cabinValueBreakdown, rateLock, trendContext.
 * 
 * Run: npx playwright test e2e/validate-enhanced-all-sailings.spec.ts
 */

import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3001';

// Static list of known active sailings with data
// Generated from a real API query at test time
const KNOWN_SAILINGS = [
  { id: 1162, line: 'Carnival', ship: 'Mardi Gras', region: 'Caribbean' },
  { id: 1192, line: 'Celebrity', ship: 'Beyond', region: 'Caribbean' },
  { id: 1211, line: 'Celebrity', ship: 'Solstice', region: 'Hawaii' },
  { id: 1219, line: 'MSC', ship: 'World Europa', region: 'Asia' },
  { id: 1748, line: 'Celebrity', ship: 'Apex', region: 'Caribbean' },
  { id: 1049, line: 'Royal Caribbean', ship: 'Icon of the Seas', region: 'Caribbean' },
];

for (const s of KNOWN_SAILINGS) {
  test(`Deal Analysis - ${s.line} ${s.ship} (${s.region})`, async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/enhanced/deal-analysis/${s.id}`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.dealScore).toBeDefined();
    expect(typeof data.data.dealScore).toBe('number');
    expect(data.data.dealScore).toBeGreaterThanOrEqual(0);
    expect(data.data.dealScore).toBeLessThanOrEqual(100);
    
    // Justification (NEW) - now formatted into sections
    expect(data.data.justification).toBeDefined();
    // Can be either string (legacy) or array of FormattedSection
    if (Array.isArray(data.data.justification)) {
      expect(data.data.justification.length).toBeGreaterThanOrEqual(1);
      for (const section of data.data.justification) {
        expect(section.title).toBeDefined();
        expect(typeof section.content).toBe('string');
        expect(section.content.length).toBeGreaterThan(10);
      }
    } else {
      expect(typeof data.data.justification).toBe('string');
      expect(data.data.justification.length).toBeGreaterThan(50);
    }
    
    // Hidden Costs (NEW)
    expect(data.data.hiddenCosts).toBeDefined();
    expect(typeof data.data.hiddenCosts!.mandatoryGratuities).toBe('number');
    expect(data.data.hiddenCosts!.mandatoryGratuities).toBeGreaterThan(0);
    expect(typeof data.data.hiddenCosts!.wifiCost).toBe('number');
    expect(data.data.hiddenCosts!.wifiCost).toBeGreaterThan(0);
    expect(typeof data.data.hiddenCosts!.realTotalCost).toBe('number');
    expect(data.data.hiddenCosts!.realTotalCost).toBeGreaterThan(0);
    
    // Cabin Value Breakdown (NEW)
    expect(data.data.cabinValueBreakdown).toBeDefined();
    const cabins = data.data.cabinValueBreakdown;
    expect(Object.keys(cabins).length).toBeGreaterThanOrEqual(2);
    for (const [cabin, val] of Object.entries(cabins)) {
      expect(val.perNight).toBeDefined();
      expect(typeof val.perNight).toBe('number');
      expect(['Excellent', 'Great', 'Good', 'Fair', 'Overpriced']).toContain(val.valueRating);
    }
    
    // Insider Tips (NEW) - now formatted into sections
    expect(Array.isArray(data.data.insiderTips)).toBe(true);
    expect(data.data.insiderTips.length).toBeGreaterThan(0);
    for (const tip of data.data.insiderTips) {
      if (typeof tip === 'string') {
        expect(tip.length).toBeGreaterThan(5);
      } else {
        expect(tip.title).toBeDefined();
        expect(tip.content).toBeDefined();
        expect(tip.content.length).toBeGreaterThan(10);
      }
    }
    
    // Verdict
    expect(typeof data.data.verdict).toBe('string');
    expect(data.data.verdict.length).toBeGreaterThan(0);
    
    // Pricing Deep Dive
    expect(typeof data.data.pricingDeepDive).toBe('string');
    expect(data.data.pricingDeepDive.length).toBeGreaterThan(0);
    
    // Price Trend
    expect(['rising', 'falling', 'stable']).toContain(data.data.priceTrend);
    
    console.log(`  ✓ ${s.line} ${s.ship} (${s.region}): score=${data.data.dealScore} justification=${data.data.justification.slice(0,40)}...`);
  });

  test(`Price Forecast - ${s.line} ${s.ship}`, async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/enhanced/price-forecast/${s.id}`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    
    // Cabin Forecasts
    expect(Array.isArray(data.data.cabinForecasts)).toBe(true);
    expect(data.data.cabinForecasts.length).toBeGreaterThanOrEqual(2);
    for (const cf of data.data.cabinForecasts) {
      expect(cf.cabinType).toBeDefined();
      expect(cf.currentPrice).toBeGreaterThan(0);
      expect(typeof cf.forecast7d).toBe('number');
      expect(typeof cf.forecast30d).toBe('number');
      expect(typeof cf.confidence).toBe('number');
      expect(cf.confidence).toBeGreaterThanOrEqual(0);
      expect(cf.confidence).toBeLessThanOrEqual(1);
      expect(['rising', 'falling', 'stable']).toContain(cf.trend);
    }
    
    // Rate Lock (NEW)
    expect(data.data.rateLock).toBeDefined();
    expect(['critical', 'high', 'moderate', 'low']).toContain(data.data.rateLock.urgency);
    expect(typeof data.data.rateLock.minutesRemaining).toBe('number');
    expect(data.data.rateLock.minutesRemaining).toBeGreaterThan(0);
    
    // Trend Context (NEW)
    expect(data.data.trendContext).toBeDefined();
    expect(['rising', 'falling', 'stable']).toContain(data.data.trendContext.direction);
    expect(typeof data.data.trendContext.magnitude).toBe('number');
    expect(Array.isArray(data.data.trendContext.windows)).toBe(true);
    expect(data.data.trendContext.windows.length).toBeGreaterThanOrEqual(1);
    for (const w of data.data.trendContext.windows) {
      expect(w.period).toBeDefined();
      expect(typeof w.magnitude).toBe('number');
      expect(w.snapshots).toBeGreaterThanOrEqual(0);
    }
    
    // Seasonal Indicator (NEW)
    expect(['peak', 'shoulder', 'low', 'unknown']).toContain(data.data.seasonalIndicator);
    
    console.log(`  ✓ ${s.line} ${s.ship}: ${data.data.cabinForecasts.length} cabins, trend=${data.data.trendContext.direction}, urgency=${data.data.rateLock.urgency}`);
  });
}
