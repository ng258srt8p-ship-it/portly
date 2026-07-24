export type BadgeType = "drop" | "solo" | "gold";

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
  id: number;
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
  sailingId: number;
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
  sort?: 'price-asc' | 'price-desc' | 'nights-asc' | 'nights-desc' | 'date-asc' | 'date-desc' | 'drop-desc';
  cabinType?: ('Inside' | 'Oceanview' | 'Balcony' | 'Suite')[];
  adults?: number;           // 1-8, default 2
  children?: number;         // 0-6, default 0
  childAges?: number[];      // ages 0-17 for each child
}
