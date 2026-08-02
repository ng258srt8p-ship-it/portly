export type BadgeType = "drop" | "solo" | "gold";
export interface EvaluatorDto {
 pageMetrics: PageMetrics;
 result: EvaluatePageResult;
}

/* ============================================================
 CRUISE INSIDER — Goal-Loop Refactor: Evaluation Gate
 ============================================================ */

export function evaluateHermesPage(metrics: PageMetrics): EvaluatePageResult {
 const errors: string[] = [];
 if (metrics.totalWordCount < 800) {
  errors.push(`Copy density failure: ${metrics.totalWordCount} words. Minimum required is 800.`);
 }
 if (metrics.clutterBadgeCount > 6) {
  errors.push(`Visual clutter failure: ${metrics.clutterBadgeCount} badges detected. Max allowed is 6.`);
 }
 if (metrics.sectionPaddingMinPx < 32) {
  errors.push(`Spacing violation: Section vertical padding is below 32px.`);
 }
 return { pass: errors.length === 0, errors };
}

export interface Deal {
  id: string;
  cruiseLine: string;
  ship: string;
  destination: string;
  departurePort: string;
  departureRegion?: string;
  duration: string;
  nights: number;
  sailDate: string;
  price: number;
  originalPrice: number;
  dropPercent: number;
  badgeType: BadgeType;
  badgeText: string;
  history: number[];
  bookingUrl?: string;        // NEW — deep link to cruise line booking page
  bookingLabel?: string;      // NEW — cruise line name for button label
  itinerary?: string[];       // JSON array of ports from DB
}

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

export interface FilterOptions {
  destinations: string[];
  cruiseLines: string[];
}

export interface SoloPrice {
  total: string;
  perDay: string;
  supplementWaived: boolean;
  supplementPercent: number;
}

export interface SoloSailing {
  id: number | string;
  cruiseLine: string;
  shipName: string;
  departureDate: string;
  durationDays: number;
  departurePort: string;
  destination: string;
  cabinType: string;
  soloPrice: SoloPrice;
  raw: {
    totalOutTheDoor: number;
    perPersonPerDay: number;
    soloSupplementPercent: number;
    soloSupplementApplied: boolean;
  };
}

export interface HistoryPricePoint {
  date: string;
  price: number;
}

export interface HistorySailing {
  sailingId: number | string;
  ship: string;
  cabinType: string;
  durationDays: number;
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  history: HistoryPricePoint[];
}

export interface HistoryLine {
  line: string;
  sailings: HistorySailing[];
  totalSailings: number;
}

export interface HistoryData {
  lines: HistoryLine[];
  totalPricesTracked: number;
  totalSailings: number;
}

export interface DealFilters {
 cruiseLine?: string[];
 destination?: string[];
 departurePort?: string[];
 departureRegion?: string[];
 minNights?: number;
 maxNights?: number;
 minPrice?: number;
 maxPrice?: number;
 badgeType?: ('drop' | 'solo' | 'gold')[];
 sort?: 'price-asc' | 'price-desc' | 'nights-asc' | 'nights-desc' | 'date-asc' | 'date-desc' | 'drop-desc' | 'diverse';
 cabinType?: ('Inside' | 'Oceanview' | 'Balcony' | 'Suite')[];
 adults?: number; // 1-8, default 2
 children?: number; // 0-6, default 0
 childAges?: number[]; // ages 0-17 for each child
 ship?: string[];
}

/* ============================================================
 CRUISE INSIDER — Goal-Loop Refactor Schema
 ============================================================ */

export interface SailingSummary {
 insider_verdict: string;
 target_traveler: string;
}

export interface ShipIntel {
 deck_plan_warnings: string[];
 secret_spots: string[];
 dining_strategy: string;
}

export interface PortTactic {
 port_name: string;
 dock_type: 'Docked' | 'Tender' | 'Anchor';
 insider_tip: string;
 diy_transport: string;
 crowd_warning: string;
}

export interface CruiseInsiderContent {
 sailing_summary: SailingSummary;
 ship_intel: ShipIntel;
 port_tactics: PortTactic[];
}

export interface PageMetrics {
 totalWordCount: number;
 clutterBadgeCount: number;
 sectionPaddingMinPx: number;
 hasInsiderKeywords: boolean;
}

export interface EvaluatePageResult {
 pass: boolean;
 errors: string[];
}
