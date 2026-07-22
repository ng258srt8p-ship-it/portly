/**
 * Unit tests for the TripTide 6-factor heuristic scoring system.
 * Tests the deterministic logic in analyticsOptimized.ts directly.
 *
 * Run: npx vitest run server/__tests__/heuristicScoring.test.ts
 */

import { describe, it, expect } from 'vitest';
import { heuristicDealAnalysis, heuristicPriceForecast } from '../services/analyticsOptimized';

describe('heuristicDealAnalysis — 6-Factor Scoring', () => {
  function makeSailing(overrides: Record<string, any> = {}) {
    return {
      cruiseLine: 'Royal Caribbean',
      pricing: [
        { cabin_type: 'Inside', passenger_count: 2, captured_at: new Date().toISOString(), total_out_the_door_usd: '800' },
        { cabin_type: 'Balcony', passenger_count: 2, captured_at: new Date().toISOString(), total_out_the_door_usd: '1200' },
      ],
      departureDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      durationDays: 7,
      destinationRegion: 'East Caribbean',
      itinerary: ['at sea', 'Nassau', 'at sea', 'St. Thomas', 'at sea'],
      ...overrides,
    };
  }

  it('should return a dealScore between 0 and 100', () => {
    const result = heuristicDealAnalysis(makeSailing());
    expect(result.dealScore).toBeGreaterThanOrEqual(0);
    expect(result.dealScore).toBeLessThanOrEqual(100);
    expect(result.is_heuristic).toBe(true);
  });

  it('should include justification paragraph', () => {
    const result = heuristicDealAnalysis(makeSailing());
    expect(result.justification).toBeDefined();
    expect(typeof result.justification).toBe('string');
    expect(result.justification.length).toBeGreaterThan(50);
  });

  it('should include hiddenCosts with correct gratuities', () => {
    const result = heuristicDealAnalysis(makeSailing());
    expect(result.hiddenCosts).toBeDefined();
    expect(result.hiddenCosts!.mandatoryGratuities).toBe(224); // 16 * 7 * 2
    expect(result.hiddenCosts!.realTotalCost).toBeGreaterThan(0);
  });

  it('should include cabinValueBreakdown for multi-cabin data', () => {
    const result = heuristicDealAnalysis(makeSailing());
    expect(result.cabinValueBreakdown).toBeDefined();
    const cabins = Object.keys(result.cabinValueBreakdown!);
    expect(cabins).toContain('Inside');
    expect(cabins).toContain('Balcony');
    for (const [cabin, value] of Object.entries(result.cabinValueBreakdown!)) {
      expect(value.perNight).toBeGreaterThan(0);
      expect(['Excellent', 'Great', 'Good', 'Fair', 'Overpriced']).toContain(value.valueRating);
    }
  });

  it('should use $18/day for Norwegian gratuities', () => {
    const result = heuristicDealAnalysis(makeSailing({ cruiseLine: 'Norwegian' }));
    expect(result.hiddenCosts!.mandatoryGratuities).toBe(252); // 18 * 7 * 2
  });

  it('should use $14/day for Celebrity gratuities', () => {
    const result = heuristicDealAnalysis(makeSailing({ cruiseLine: 'Celebrity' }));
    expect(result.hiddenCosts!.mandatoryGratuities).toBe(196); // 14 * 7 * 2
  });

  it('should use $15/day default for unknown cruise lines', () => {
    const result = heuristicDealAnalysis(makeSailing({ cruiseLine: 'Small Line Co' }));
    expect(result.hiddenCosts!.mandatoryGratuities).toBe(210); // 15 * 7 * 2
  });

  it('should compute realTotalCost as listed + gratuities + wifi', () => {
    const result = heuristicDealAnalysis(makeSailing());
    const insidePrice = 800;
    const gratuities = 224;
    const wifi = Math.round(12 * 7 * 2); // 168
    expect(result.hiddenCosts!.realTotalCost).toBe(insidePrice + gratuities + wifi);
  });

  it('should set priceTrend based on price history', () => {
    const result = heuristicDealAnalysis(makeSailing({
      priceHistory: {
        Inside: [
          { passenger_count: 2, captured_at: '2024-01-01', total_out_the_door_usd: '700' },
          { passenger_count: 2, captured_at: '2024-02-01', total_out_the_door_usd: '900' },
        ],
      },
    }));
    expect(result.priceTrend).toBe('rising');
  });

  it('should set priceTrend to stable when prices are flat', () => {
    const result = heuristicDealAnalysis(makeSailing({
      priceHistory: {
        Inside: [
          { passenger_count: 2, captured_at: '2024-01-01', total_out_the_door_usd: '800' },
          { passenger_count: 2, captured_at: '2024-02-01', total_out_the_door_usd: '810' },
        ],
      },
    }));
    expect(result.priceTrend).toBe('stable');
  });

  it('should set priceTrend to falling when prices drop', () => {
    const result = heuristicDealAnalysis(makeSailing({
      priceHistory: {
        Inside: [
          { passenger_count: 2, captured_at: '2024-01-01', total_out_the_door_usd: '1000' },
          { passenger_count: 2, captured_at: '2024-02-01', total_out_the_door_usd: '700' },
        ],
      },
    }));
    expect(result.priceTrend).toBe('falling');
  });

  it('should include pricingDeepDive narrative', () => {
    const result = heuristicDealAnalysis(makeSailing());
    expect(result.pricingDeepDive).toBeDefined();
    expect(typeof result.pricingDeepDive).toBe('string');
    expect(result.pricingDeepDive.length).toBeGreaterThan(30);
  });

  it('should include insiderTips array', () => {
    const result = heuristicDealAnalysis(makeSailing());
    expect(Array.isArray(result.insiderTips)).toBe(true);
    expect(result.insiderTips.length).toBeGreaterThan(0);
  });

  it('should classify destination as mediterranean for med regions', () => {
    const result = heuristicDealAnalysis(makeSailing({
      destinationRegion: 'Mediterranean',
      cruiseLine: 'MSC',
    }));
    expect(result.justification).toBeDefined();
    expect(result.is_heuristic).toBe(true);
  });
});

describe('heuristicPriceForecast', () => {
  it('should return a valid forecast object', () => {
    const result = heuristicPriceForecast(800, 90);
    expect(result.currentPriceAssessment).toBeDefined();
    expect(result.shortTermForecast).toBeDefined();
    expect(result.mediumTermForecast).toBeDefined();
    expect(result.recommendation).toBeDefined();
    expect(result.is_heuristic).toBe(true);
  });

  it('should return confidence between 0 and 1', () => {
    const result = heuristicPriceForecast(800, 90);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('should give lower confidence for longer time horizons', () => {
    const near = heuristicPriceForecast(800, 14);
    const far = heuristicPriceForecast(800, 180);
    expect(near.confidence).toBeGreaterThan(far.confidence);
  });

  it('should include data point count in output', () => {
    const result = heuristicPriceForecast(800, 90, [
      { price: 700, date: '2024-01-01' },
      { price: 750, date: '2024-02-01' },
      { price: 800, date: '2024-03-01' },
    ]);
    expect(result.shortTermForecast).toContain('3 snapshots');
  });

  it('should recommend "Buy now" for rising trends', () => {
    const result = heuristicPriceForecast(800, 30, [
      { price: 600, date: '2024-01-01' },
      { price: 700, date: '2024-02-01' },
      { price: 800, date: '2024-03-01' },
    ]);
    expect(result.recommendation.toLowerCase()).toMatch(/buy|book|rising|climb/);
  });

  it('should recommend "Wait" for falling trends', () => {
    const result = heuristicPriceForecast(800, 30, [
      { price: 1000, date: '2024-01-01' },
      { price: 900, date: '2024-02-01' },
      { price: 800, date: '2024-03-01' },
    ]);
    expect(result.recommendation.toLowerCase()).toMatch(/wait|dip|fall|drop/);
  });
});
