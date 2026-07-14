/**
 * TRIPTIDE — Pricing Math Engine
 *
 * Mathematical translation layer that processes out-the-door costs,
 * solo-supplement margins, and deal ratings.
 *
 * All outputs are formatted for direct consumption by the frontend's
 * Geist Mono / JetBrains Mono tabular-nums display system.
 *
 * @module formulas
 */

// ============================================================================
// TYPES
// ============================================================================

export interface RawPricing {
  base_fare_usd: number;
  port_fees_usd: number;
  gratuities_usd: number;
  is_solo_supplement_waived: boolean;
}

export interface PassengerConfig {
  adults: number;
  children?: number;
  infants?: number;
}

export interface CostBreakdown {
  /** Per-person published base fare (before occupancy multipliers) */
  perPersonBase: number;
  /** Total base fare after occupancy/solo logic applied */
  totalBase: number;
  /** Port taxes × total passengers */
  totalFees: number;
  /** Mandatory gratuities × total passengers */
  totalGratuities: number;
  /** Total out-the-door: base + fees + gratuities */
  totalOutTheDoor: number;
  /** Per-person per-day all-in rate (standardized comparison metric) */
  perPersonPerDay: number;
  /** Solo supplement percentage (0 if waived or multi-passenger) */
  soloSupplementPercent: number;
  /** Whether a solo supplement was applied to this calculation */
  soloSupplementApplied: boolean;
  /** Total passenger count used in calculation */
  totalPassengers: number;
}

export interface DealRating {
  rating: 'hot' | 'great' | 'good' | 'average' | 'poor';
  label: string;
  percentBelowAvg: number;
}

export interface PriceDropAnalysis {
  currentPrice: number;
  previousPrice: number;
  absoluteDrop: number;
  percentDrop: number;
  isSignificant: boolean;
}

// ============================================================================
// CORE FORMULAS
// ============================================================================

/**
 * Calculate total out-the-door pricing replicating CruisePlum's engine.
 *
 * KEY RULE — Solo Occupancy Penalty:
 *   Industry standard: solo traveler pays 200% of base fare (double occupancy)
 *   UNLESS is_solo_supplement_waived = true (cruise line is offering solo-friendly pricing)
 *
 * @param pricing    Raw pricing from database or checkout scrape
 * @param passengers Number of passengers (1 = solo, 2-4 = standard)
 * @returns CostBreakdown with all derived metrics
 */
export function calculateTotals(
  pricing: RawPricing,
  passengers: number
): CostBreakdown {
  // Validate inputs
  const pax = Math.max(1, Math.min(4, Math.round(passengers)));
  const base = Number(pricing.base_fare_usd) || 0;
  const fees = Number(pricing.port_fees_usd) || 0;
  const tips = Number(pricing.gratuities_usd) || 0;
  const waived = Boolean(pricing.is_solo_supplement_waived);

  // --- Base fare with solo occupancy logic ---

  // Industry standard: solo traveler pays 200% of base fare
  // (double-occupancy penalty) unless explicitly waived
  let totalBase: number;
  let soloSupplementApplied = false;
  let soloSupplementPercent = 0;

  if (pax === 1 && !waived) {
    // Standard solo penalty: charge double base fare
    totalBase = base * 2;
    soloSupplementApplied = true;
    // Solo supplement = (2x - 1x) / 1x = 100% surcharge
    soloSupplementPercent = 100;
  } else if (pax === 1 && waived) {
    // Solo-friendly: charge single base fare only
    totalBase = base;
    soloSupplementApplied = false;
    soloSupplementPercent = 0;
  } else {
    // Standard multi-passenger: base × passenger count
    totalBase = base * pax;
    soloSupplementApplied = false;
    soloSupplementPercent = 0;
  }

  // Fees and gratuities scale linearly with passenger count
  const totalFees = Number((fees * pax).toFixed(2));
  const totalGratuities = Number((tips * pax).toFixed(2));

  // Out-the-door total
  const totalOutTheDoor = Number(
    (totalBase + totalFees + totalGratuities).toFixed(2)
  );

  // Per-person per-day: all-in cost divided by pax and by voyage duration
  // NOTE: duration_days is NOT available in RawPricing — callers must pass it
  // This variant computes perPersonPerDay without duration (set to 0)
  // Use the overloaded function below for duration-aware computation

  return {
    perPersonBase: base,
    totalBase: Number(totalBase.toFixed(2)),
    totalFees,
    totalGratuities,
    totalOutTheDoor,
    perPersonPerDay: 0, // Requires duration; use calculateTotalsWithDuration()
    soloSupplementPercent,
    soloSupplementApplied,
    totalPassengers: pax,
  };
}

/**
 * Extended calculation with voyage duration for per-person-per-day metric.
 * This is the primary function used by the API endpoints.
 *
 * @param pricing    Raw pricing payload
 * @param passengers Number of passengers
 * @param durationDays Length of voyage in nights
 * @returns CostBreakdown with perPersonPerDay populated
 */
export function calculateTotalsWithDuration(
  pricing: RawPricing,
  passengers: number,
  durationDays: number
): CostBreakdown {
  const result = calculateTotals(pricing, passengers);
  const days = Math.max(1, Math.round(durationDays));

  // Per-person per-day: total out-the-door ÷ passengers ÷ duration
  const perDay = Number(
    (result.totalOutTheDoor / result.totalPassengers / days).toFixed(2)
  );

  return {
    ...result,
    perPersonPerDay: perDay,
  };
}

/**
 * Determine deal rating based on price comparison against market average.
 *
 * Uses the same ratio thresholds as CruisePlum's internal rating algorithm.
 *
 * @param pricePerDay       Current listing's per-person-per-day price
 * @param avgPricePerDay    Market average per-person-per-day for comparable cruises
 * @returns DealRating with label and css class name
 */
export function getDealRating(
  pricePerDay: number,
  avgPricePerDay: number
): DealRating {
  if (avgPricePerDay <= 0) {
    return { rating: 'average', label: 'Average', percentBelowAvg: 0 };
  }

  const ratio = pricePerDay / avgPricePerDay;
  const percentBelowAvg = Number(
    ((1 - ratio) * 100).toFixed(1)
  );

  if (ratio <= 0.7) {
    return { rating: 'hot', label: '🔥 Hot Deal', percentBelowAvg };
  }
  if (ratio <= 0.85) {
    return { rating: 'great', label: '💰 Great Value', percentBelowAvg };
  }
  if (ratio <= 1.0) {
    return { rating: 'good', label: '👍 Good Deal', percentBelowAvg };
  }
  if (ratio <= 1.15) {
    return { rating: 'average', label: 'Average', percentBelowAvg };
  }
  return { rating: 'poor', label: 'Below Avg', percentBelowAvg };
}

/**
 * Analyze price drop between current and previous snapshot.
 *
 * Used by the price alert engine to determine if a notification
 * should be triggered.
 *
 * @param currentPrice  Most recent price snapshot
 * @param previousPrice Previous price snapshot (e.g., 24h ago)
 * @param thresholdPercent Minimum percent drop to be considered significant (default: 10%)
 * @returns PriceDropAnalysis
 */
export function analyzePriceDrop(
  currentPrice: number,
  previousPrice: number,
  thresholdPercent = 10
): PriceDropAnalysis {
  const absDrop = Number((previousPrice - currentPrice).toFixed(2));
  const pctDrop =
    previousPrice > 0
      ? Number(((absDrop / previousPrice) * 100).toFixed(1))
      : 0;

  return {
    currentPrice,
    previousPrice,
    absoluteDrop: absDrop,
    percentDrop: pctDrop,
    isSignificant: pctDrop >= thresholdPercent && absDrop > 0,
  };
}

/**
 * Calculate solo supplement percentage.
 *
 * Standard formula: (solo_fare - single_base) / single_base * 100
 *
 * @param soloFare     Total fare charged to solo traveler
 * @param singleBase   Published per-person base fare
 * @returns Solo supplement as percentage (0 = waived, 100 = standard double)
 */
export function calculateSoloSupplement(
  soloFare: number,
  singleBase: number
): number {
  if (singleBase <= 0) return 0;
  return Number((((soloFare - singleBase) / singleBase) * 100).toFixed(2));
}

/**
 * Format a number for tabular display.
 * Returns a string with exactly 2 decimal places, right-aligned
 * for monospace font rendering.
 *
 * @param amount  Numeric value to format
 * @param currencySymbol Currency symbol (default: '$')
 * @returns Formatted string: "$1,356.00"
 */
export function formatTabularPrice(
  amount: number,
  currencySymbol = '$'
): string {
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? '-' : '';
  return `${sign}${currencySymbol}${formatted}`;
}

/**
 * Format a price for compact display (no decimals) — used in card components.
 *
 * @param amount Numeric value
 * @returns Formatted string: "$1,356"
 */
export function formatCompactPrice(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}
