/**
 * TripTide — Cruise Industry Constants
 * 
 * Shared constants for cruise line calculations, pricing thresholds,
 * and industry benchmarks. Centralized to avoid duplication across services.
 */

/* ====================================================================== */
/*  CRUISE LINE GRATUITY RATES (per person, per day)                       */
/* ====================================================================== */

export const GRATUITY_RATES: Record<string, number> = {
  royal: 16,
  carnival: 16,
  norwegian: 18,
  celebrity: 14,
  default: 15,
};

/**
 * Get the daily gratuity rate for a cruise line.
 * @param cruiseLine Cruise line name (case-insensitive)
 * @returns Daily gratuity rate in USD per person
 */
export function getGratuityRate(cruiseLine: string): number {
  const line = cruiseLine.toLowerCase();
  if (line.includes('royal')) return GRATUITY_RATES.royal;
  if (line.includes('carnival')) return GRATUITY_RATES.carnival;
  if (line.includes('norwegian')) return GRATUITY_RATES.norwegian;
  if (line.includes('celebrity')) return GRATUITY_RATES.celebrity;
  return GRATUITY_RATES.default;
}

/* ====================================================================== */
/*  WIRELESS INTERNET PRICING                                              */
/* ====================================================================== */

export const WIFI_COST_PER_DAY = 12; // USD per person per day

/* ====================================================================== */
/*  PRICE-PER-DAY VALUE THRESHOLDS                                         */
/* ====================================================================== */

export const PPD_THRESHOLDS = {
  caribbean: { excellent: 100, good: 150, average: 200, expensive: 200 },
  alaska: { excellent: 180, good: 250, average: 300, expensive: 300 },
  mediterranean: { excellent: 150, good: 200, average: 250, expensive: 250 },
  premium: { excellent: 120, good: 180, average: 250, expensive: 250 },
} as const;

/* ====================================================================== */
/*  CABIN VALUE RATINGS                                                    */
/* ====================================================================== */

export const CABIN_VALUE_RATINGS = {
  excellent: 100, // Under $100/night per person
  great: 150,     // Under $150/night per person
  good: 200,      // Under $200/night per person
  fair: 250,      // Under $250/night per person
  overpriced: Infinity,
} as const;
