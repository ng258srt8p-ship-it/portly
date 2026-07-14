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
  history: number[];
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
