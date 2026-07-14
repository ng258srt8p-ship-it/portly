/**
 * Unit tests for the TripTide pricing math engine.
 * Tests cover all formula functions in server/utils/formulas.ts.
 *
 * Run: npx vitest run server/__tests__/formulas.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  calculateTotals,
  calculateTotalsWithDuration,
  getDealRating,
  analyzePriceDrop,
  calculateSoloSupplement,
  formatTabularPrice,
  formatCompactPrice,
} from '../utils/formulas';

describe('calculateTotals', () => {
  it('calculates standard double occupancy correctly', () => {
    const result = calculateTotals(
      { base_fare_usd: 1250, port_fees_usd: 184.50, gratuities_usd: 126, is_solo_supplement_waived: false },
      2
    );
    expect(result.perPersonBase).toBe(1250);
    expect(result.totalBase).toBe(2500); // 1250 * 2
    expect(result.totalFees).toBe(369); // 184.50 * 2
    expect(result.totalGratuities).toBe(252); // 126 * 2
    expect(result.totalOutTheDoor).toBe(3121); // 2500 + 369 + 252
    expect(result.soloSupplementApplied).toBe(false);
    expect(result.soloSupplementPercent).toBe(0);
    expect(result.totalPassengers).toBe(2);
  });

  it('applies solo supplement (200% base fare) for solo traveler', () => {
    const result = calculateTotals(
      { base_fare_usd: 1250, port_fees_usd: 184.50, gratuities_usd: 126, is_solo_supplement_waived: false },
      1
    );
    expect(result.perPersonBase).toBe(1250);
    expect(result.totalBase).toBe(2500); // 1250 * 2 (solo penalty)
    expect(result.totalFees).toBe(184.50); // 184.50 * 1
    expect(result.totalGratuities).toBe(126); // 126 * 1
    expect(result.soloSupplementApplied).toBe(true);
    expect(result.soloSupplementPercent).toBe(100);
    expect(result.totalPassengers).toBe(1);
  });

  it('waives solo supplement for solo-friendly cruises', () => {
    const result = calculateTotals(
      { base_fare_usd: 1649, port_fees_usd: 215, gratuities_usd: 160, is_solo_supplement_waived: true },
      1
    );
    expect(result.totalBase).toBe(1649); // No penalty
    expect(result.soloSupplementApplied).toBe(false);
    expect(result.soloSupplementPercent).toBe(0);
    expect(result.totalOutTheDoor).toBe(2024); // 1649 + 215 + 160
  });

  it('handles 3-4 passengers without solo supplement', () => {
    const result = calculateTotals(
      { base_fare_usd: 449, port_fees_usd: 98, gratuities_usd: 64, is_solo_supplement_waived: false },
      3
    );
    expect(result.totalBase).toBe(1347); // 449 * 3
    expect(result.totalFees).toBe(294); // 98 * 3
    expect(result.totalGratuities).toBe(192); // 64 * 3
    expect(result.soloSupplementApplied).toBe(false);
  });

  it('clamps passenger count between 1 and 4', () => {
    const result0 = calculateTotals(
      { base_fare_usd: 100, port_fees_usd: 10, gratuities_usd: 5, is_solo_supplement_waived: false },
      0
    );
    expect(result0.totalPassengers).toBe(1);

    const result5 = calculateTotals(
      { base_fare_usd: 100, port_fees_usd: 10, gratuities_usd: 5, is_solo_supplement_waived: false },
      5
    );
    expect(result5.totalPassengers).toBe(4);
  });

  it('handles zero/negative pricing gracefully', () => {
    const result = calculateTotals(
      { base_fare_usd: 0, port_fees_usd: 0, gratuities_usd: 0, is_solo_supplement_waived: false },
      2
    );
    expect(result.totalOutTheDoor).toBe(0);
    expect(result.totalBase).toBe(0);
  });
});

describe('calculateTotalsWithDuration', () => {
  it('computes perPersonPerDay correctly', () => {
    const result = calculateTotalsWithDuration(
      { base_fare_usd: 1250, port_fees_usd: 184.50, gratuities_usd: 126, is_solo_supplement_waived: false },
      2,
      7
    );
    // totalOutTheDoor = 3121, / 2 passengers / 7 days = 222.93
    expect(result.perPersonPerDay).toBeCloseTo(222.93, 1);
    expect(result.totalOutTheDoor).toBe(3121);
  });

  it('handles 1-day duration', () => {
    const result = calculateTotalsWithDuration(
      { base_fare_usd: 100, port_fees_usd: 20, gratuities_usd: 10, is_solo_supplement_waived: false },
      1,
      1
    );
    // Solo supplement applies: base * 2 = 200, + fees 20 + tips 10 = 230
    // Per person per day: 230 / 1 / 1 = 230
    expect(result.perPersonPerDay).toBe(230);
  });
});

describe('getDealRating', () => {
  it('rates "hot" for price <= 70% of market average', () => {
    const rating = getDealRating(140, 200);
    expect(rating.rating).toBe('hot');
    expect(rating.percentBelowAvg).toBeCloseTo(30, 0);
  });

  it('rates "great" for price between 70-85% of average', () => {
    const rating = getDealRating(160, 200);
    expect(rating.rating).toBe('great');
  });

  it('rates "good" for price between 85-100% of average', () => {
    const rating = getDealRating(190, 200);
    expect(rating.rating).toBe('good');
  });

  it('rates "average" for price between 100-115% of average', () => {
    const rating = getDealRating(210, 200);
    expect(rating.rating).toBe('average');
  });

  it('rates "poor" for price > 115% of average', () => {
    const rating = getDealRating(250, 200);
    expect(rating.rating).toBe('poor');
  });

  it('returns average when avgPricePerDay is 0 or negative', () => {
    expect(getDealRating(100, 0).rating).toBe('average');
    expect(getDealRating(100, -1).rating).toBe('average');
  });
});

describe('analyzePriceDrop', () => {
  it('detects a significant price drop', () => {
    const result = analyzePriceDrop(800, 1000);
    expect(result.absoluteDrop).toBe(200);
    expect(result.percentDrop).toBe(20);
    expect(result.isSignificant).toBe(true);
  });

  it('does not flag small drops as significant', () => {
    const result = analyzePriceDrop(950, 1000, 10);
    expect(result.percentDrop).toBe(5);
    expect(result.isSignificant).toBe(false);
  });

  it('handles price increase (negative drop)', () => {
    const result = analyzePriceDrop(1100, 1000);
    expect(result.absoluteDrop).toBe(-100);
    expect(result.percentDrop).toBe(-10);
    expect(result.isSignificant).toBe(false);
  });

  it('handles zero previous price', () => {
    const result = analyzePriceDrop(100, 0);
    expect(result.percentDrop).toBe(0);
    expect(result.isSignificant).toBe(false);
  });
});

describe('calculateSoloSupplement', () => {
  it('calculates standard 100% supplement', () => {
    // Solo pays $2500 for a $1250 base = 100% supplement
    expect(calculateSoloSupplement(2500, 1250)).toBe(100);
  });

  it('returns 0 when supplement is waived (same price)', () => {
    expect(calculateSoloSupplement(1649, 1649)).toBe(0);
  });

  it('returns 0 for zero base fare', () => {
    expect(calculateSoloSupplement(100, 0)).toBe(0);
  });
});

describe('formatTabularPrice', () => {
  it('formats price with 2 decimal places', () => {
    expect(formatTabularPrice(1250)).toBe('$1,250.00');
    expect(formatTabularPrice(184.50)).toBe('$184.50');
  });

  it('handles negative amounts', () => {
    const result = formatTabularPrice(-50);
    expect(result).toBe('-$50.00');
  });

  it('handles zero', () => {
    expect(formatTabularPrice(0)).toBe('$0.00');
  });
});

describe('formatCompactPrice', () => {
  it('formats price without decimals', () => {
    expect(formatCompactPrice(1250)).toBe('$1,250');
    expect(formatCompactPrice(3121)).toBe('$3,121');
  });

  it('rounds fractional amounts', () => {
    expect(formatCompactPrice(1250.75)).toBe('$1,251');
  });

  it('handles zero', () => {
    expect(formatCompactPrice(0)).toBe('$0');
  });
});
