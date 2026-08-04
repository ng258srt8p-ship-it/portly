/**
 * TripTide — Enhanced Analytics Types
 * 
 * TypeScript interfaces for the enhanced (Phase 2+) deal analysis and price forecast.
 * These define the unified JSON output schemas used across server + client.
 */

/* ====================================================================== */
/*  FORMATTED SECTIONS                                                      */
/* ====================================================================== */

export interface FormattedSection {
  title: string;
  content: string;
}

/* ====================================================================== */
/*  DEAL ANALYSIS TYPES                                                    */
/* ====================================================================== */

export interface HiddenCosts {
  /** Annual mandatory gratuity total for the sailing (2 passengers) */
  mandatoryGratuities?: number;
  /** Total Wi-Fi cost for the sailing duration */
  wifiCost?: number;
  /** Total resort/destination fees */
  resortFees?: number;
  /** Computed real total cost including all hidden fees */
  realTotalCost?: number;
  /** Canonical listed price (OTD total) from cabin breakdown */
  totalOutTheDoor?: number;
}

export interface DealAnalysisOutput {
  /** Deal score 0-100 (higher = better value) */
  dealScore: number;
  /** Human-readable pricing analysis paragraph */
  pricingDeepDive: string;
  /** Price trend direction */
  priceTrend: 'rising' | 'falling' | 'stable';
  /** Per-cruise inventory intelligence (cabin availability vs benchmarks) */
  inventoryIntelligence?: string;
  /** Cruise line pricing strategy assessment */
  pricingStrategy?: string;
  /** Ship-specific value score 0-100 (amenities vs price) */
  shipValueScore?: number;
  /** Itinerary cost-per-port breakdown */
  itineraryValue?: string;
  /** Computed hidden costs (gratuities, Wi-Fi, resort fees, real total) */
  hiddenCosts?: HiddenCosts;
  /** 3-5 sailing-specific insider tips (NOT generic advice) */
  insiderTips: string[] | FormattedSection[];
  /** Bottom-line booking recommendation */
  verdict: string;
  /** Comprehensive justification - either raw string or formatted sections */
  justification: string | FormattedSection[];

  /** Formatted sections for the justification (Populated by formatter utility) */
  /** @deprecated Use justification directly */
  /** Per-cabin value breakdown with ratings */
  cabinValueBreakdown?: Record<string, { perNight: number; valueRating: string }>;
  /** Whether this is a deterministic heuristic result (AI rate-limited) */
  is_heuristic: boolean;
}

/* ====================================================================== */
/*  PRICE FORECAST TYPES                                                   */
/* ====================================================================== */

export interface CabinForecast {
  /** Cabin category name */
  cabinType: 'Inside' | 'Oceanview' | 'Balcony' | 'Suite' | string;
  /** Current out-the-door price (2 passengers) */
  currentPrice: number;
  /** Predicted price in 7 days */
  forecast7d: number;
  /** Predicted price in 30 days */
  forecast30d: number;
  /** Confidence score 0-1 (higher = more reliable) */
  confidence: number;
  /** Price direction */
  trend: 'rising' | 'falling' | 'stable';
}

export interface CompetingSailing {
  /** Database ID of the competing sailing */
  sailingId?: number;
  /** Competing cruise line name */
  cruiseLine: string;
  /** Competing ship name */
  shipName: string;
  /** Departure date string */
  departureDate: string;
  /** Balcony cabin price on competing sailing */
  balconyPrice: number;
  /** Price difference vs current sailing (positive = more expensive) */
  priceDifference: number;
}

export interface PriceAlert {
  /** Cabin category this alert applies to */
  cabinType: string;
  /** Price threshold that triggers the alert */
  triggerPrice: number;
  /** Current price for comparison */
  currentPrice: number;
  /** Potential savings if alert triggers */
  savings: number;
}

export interface PriceForecastOutput {
  /** Per-cabin-type forecasts (Inside, Oceanview, Balcony, Suite) */
  cabinForecasts: CabinForecast[];
  /** Optimal booking window for THIS specific sailing */
  optimalBookingWindow?: string;
  /** Competing sailings on same route/dates */
  competingSailings?: CompetingSailing[];
  /** Dynamic price-drop alert thresholds */
  alerts?: PriceAlert[];
  /** Multi-window trend context with direction and magnitude */
  trendContext?: {
    direction: 'rising' | 'falling' | 'stable';
    magnitude: number;
    windows: Array<{ period: string; direction: string; magnitude: number; snapshots: number }>;
  };
  /** Seasonal indicator for the departure month */
  seasonalIndicator?: 'peak' | 'shoulder' | 'low' | 'unknown';
  /** Rate lock expiry and urgency signal */
  rateLock?: {
    expiresAt?: string;
    minutesRemaining?: number;
    urgency: 'critical' | 'high' | 'moderate' | 'low';
  };
  /** Whether this is a deterministic heuristic result */
  is_heuristic: boolean;
}

/* ====================================================================== */
/*  API RESPONSE TYPES                                                     */
/* ====================================================================== */

export interface EnhancedDealAnalysisResponse {
  success: boolean;
  data: DealAnalysisOutput | null;
  generatedAt?: string;
  cached?: boolean;
  note?: string;
}

export interface EnhancedPriceForecastResponse {
  success: boolean;
  data: PriceForecastOutput | null;
  generatedAt?: string;
  cached?: boolean;
  note?: string;
}

export interface EnhancementStats {
  success: boolean;
  data: {
    /** Number of sailings with enhanced deal analysis */
    enhancedDealAnalyses: number;
    /** Number of sailings with enhanced price forecasts */
    enhancedPriceForecasts: number;
    /** Total active sailings */
    totalActiveSailings: number;
    /** Last sync timestamp */
    lastSyncAt?: string;
  };
}

/* ====================================================================== */
/*  SERVER-SIDE GENERATOR INPUT TYPES                                      */
/* ====================================================================== */

export interface SailingContext {
  sailingId: number;
  cruiseLine: string;
  shipName: string;
  durationDays: number;
  departurePort: string;
  destinationRegion?: string;
  departureDate: string;
  itinerary: string[];
  cabinCategories?: string[];
  bookingUrl?: string;
  /** Current pricing by cabin type (2 passengers) */
  currentPricing: Record<string, number>;
  /** Historical pricing snapshots */
  priceHistory: Array<{ cabinType: string; price: number; date: string }>;
  /** Ship details (amenities, rating, etc.) */
  shipDetails?: {
    yearBuilt?: number;
    passengerCapacity?: number;
    tonnage?: number;
    restaurants?: string[];
    pools?: number;
    entertainment?: string[];
    amenities?: string[];
    rating?: number;
  };
  /** Destination market data */
  destinationInsight?: {
    avgPricePpd?: number;
    bestValueMonths?: string[];
    peakSeasonMonths?: string[];
    priceTrend?: string;
  };
  /** Market comparison for this cruise line */
  marketComparison?: {
    avgPricePpd?: number;
    overallRating?: number;
    bestValueRating?: number;
  };
  /** Trip type: 'leisure', 'business', 'family', 'honeymoon', etc. */
  tripType?: string;
  /** Preferred cabin order (e.g. ['Balcony', 'Oceanview', 'Inside']) */
  cabinPriorities?: string[];
}

export interface CompetingSailingData {
  sailingId: number;
  cruiseLine: string;
  shipName: string;
  departureDate: string;
  balconyPrice: number;
}
