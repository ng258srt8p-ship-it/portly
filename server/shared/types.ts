/**
 * TRIPTIDE / PORTLY — Shared API Contract Types
 *
 * These types define the contract between the Express API server (port 3001)
 * and the Next.js frontend (port 3000). Both sides must agree on these shapes.
 */

// ============================================================================
// DEAL — Frontend card display type (used by DealsGrid, CruiseCard)
// ============================================================================

export type BadgeType = "drop" | "solo" | "gold";

export interface Deal {
  id: string;
  cruiseLine: string;
  ship: string;
  destination: string;
  departurePort: string;
  duration: string;
  nights: number;
  sailDate: string;
  price: number;
  originalPrice: number;
  dropPercent: number;
  badgeType: BadgeType;
  badgeText: string;
  /** 10-point price history for sparkline rendering */
  history: number[];
}

// ============================================================================
// ITINERARY — Cabin breakdown for PriceComparisonTable
// ============================================================================

export interface CabinRate {
  cabinClass: "Inside" | "Oceanview" | "Balcony" | "Suite";
  baseFarePerPerson: number;
  portTaxPerPerson: number;
  gratuityPerPersonPerNight: number;
}

export interface Itinerary {
  id: string;
  cruiseLine: string;
  ship: string;
  route: string;
  nights: number;
  sailDate: string;
  cabins: CabinRate[];
}

// ============================================================================
// FILTER OPTIONS — Derived from available data
// ============================================================================

export interface FilterOptions {
  destinations: string[];
  cruiseLines: string[];
}

// ============================================================================
// SEARCH — Query and response shapes
// ============================================================================

export interface SearchQuery {
  destination?: string;
  cruiseLine?: string;
  passengers?: number;
  minDeparture?: string;
  maxDeparture?: string;
  minDuration?: number;
  maxDuration?: number;
  soloFriendly?: boolean;
  sortBy?: 'price' | 'duration' | 'departure' | 'deal';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  id: number;
  cruiseLine: string;
  shipName: string;
  departureDate: string;
  durationDays: number;
  departurePort: string;
  itinerary: string[];
  region: string | null;
  cabinType: string;
  financials: {
    totalOutTheDoor: number;
    perPersonPerDay: number;
    soloSupplementPercent: number;
    soloSupplementApplied: boolean;
    formatted: {
      price: string;
    };
  };
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// SOLO FRIENDLY — Solo traveler view
// ============================================================================

export interface SoloFriendlyResult {
  id: number;
  cruiseLine: string;
  shipName: string;
  departureDate: string;
  durationDays: number;
  departurePort: string;
  destination: string | null;
  cabinType: string;
  soloPrice: {
    total: string;
    perDay: string;
    supplementWaived: boolean;
    supplementPercent: number;
  };
}

// ============================================================================
// HEALTH
// ============================================================================

export interface HealthResponse {
  status: string;
  uptime: number;
  timestamp: string;
  engine: {
    b2bSources: string[];
    stealthEnabled: boolean;
    syncCronSchedule: string;
  };
  lastSync: {
    status: string;
    completedAt: string;
    b2bRecords: number;
    checkoutSuccesses: number;
  } | null;
  database: 'connected' | 'disconnected';
}

// ============================================================================
// SHIP DETAILS — Enriched ship metadata
// ============================================================================

export interface ShipDetails {
  shipName: string;
  cruiseLine: string;
  shipClass: string | null;
  yearBuilt: number | null;
  passengerCapacity: number | null;
  crewCount: number | null;
  tonnage: number | null;
  restaurants: string[];
  pools: number;
  entertainment: string[];
  amenities: string[];
  deckCount: number;
  cabinCount: number;
  imageUrl: string | null;
}

// ============================================================================
// DESTINATION INSIGHT — Market intelligence per region
// ============================================================================

export interface DestinationInsight {
  destinationRegion: string;
  avgPricePpd: number | null;
  bestValueMonths: string[];
  peakSeasonMonths: string[];
  shoulderMonths: string[];
  avgDurationDays: number | null;
  totalActiveSailings: number;
  topCruiseLines: string[];
  priceTrend: 'rising' | 'falling' | 'stable';
  trendPct: number;
}

// ============================================================================
// MARKET COMPARISON — Cruise line benchmarks
// ============================================================================

export interface MarketComparison {
  cruiseLine: string;
  avgPricePpd: number | null;
  minPricePpd: number | null;
  maxPricePpd: number | null;
  avgDurationDays: number | null;
  destinationCount: number;
  sailingCount: number;
  overallRating: number | null;
  bestValueRating: number | null;
}

// ============================================================================
// PRICE FORECAST — AI-generated forecast per sailing
// ============================================================================

export interface PriceForecast {
  sailingId: number;
  cabinType: string;
  currentPriceUsd: number | null;
  forecast7d: number | null;
  forecast30d: number | null;
  confidenceScore: number | null;
  trendDirection: 'rising' | 'falling' | 'stable';
}

// ============================================================================
// BOOKING INSIGHT — Optimal booking window intelligence
// ============================================================================

export interface BookingInsight {
  destinationRegion: string;
  optimalBookingWindow: string | null;
  avgDaysBeforeDeparture: number | null;
  lastMinuteDealScore: number | null;
  earlyBirdDiscountPct: number | null;
}

// ============================================================================
// ENRICHED DEAL — Deal with ship details and forecast
// ============================================================================

export interface EnrichedDeal extends Deal {
  shipDetails?: ShipDetails | null;
  forecast?: PriceForecast | null;
  marketComparison?: MarketComparison | null;
}
