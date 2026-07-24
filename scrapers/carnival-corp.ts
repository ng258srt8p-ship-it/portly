import { SourceAdapter, SailingRecord, SailingDetail } from './base';

// ============================================================
// Stub adapters with realistic cruise data — 22 sailings across 9 lines.
// Each sailing includes cabin pricing + synthetic price history + itinerary.
// Replace with real adapters in Loop 2.
// ============================================================

// Helper: generate 5-point synthetic price history (90-day trend)
// Uses a deterministic seed from currentPrice + originalPrice so each sailing
// gets a unique curve shape, not the same linear interpolation every time.
function genHistory(currentPrice: number, originalPrice: number): number[] {
  const delta = originalPrice - currentPrice;
  // Deterministic pseudo-random based on price values
  const seed = (currentPrice * 9301 + originalPrice * 49297) % 233280;
  const rng = (offset: number) => {
    const x = Math.sin(seed + offset * 137.5) * 10000;
    return x - Math.floor(x);
  };

  // Pick a curve shape based on the seed
  const shapeType = Math.floor(rng(0) * 4);
  switch (shapeType) {
    case 0: // Steady decline (original)
      return [
        Math.round(originalPrice),
        Math.round(originalPrice - delta * 0.25),
        Math.round(originalPrice - delta * 0.5),
        Math.round(originalPrice - delta * 0.75),
        Math.round(currentPrice),
      ];
    case 1: { // Decline with mid-cycle bump (promo pulled then re-applied)
      const bumpFactor = 0.15 + rng(1) * 0.10;
      return [
        Math.round(originalPrice),
        Math.round(originalPrice - delta * 0.35),
        Math.round(originalPrice - delta * (0.35 - bumpFactor)), // bump up
        Math.round(originalPrice - delta * 0.60),
        Math.round(currentPrice),
      ];
    }
    case 2: { // V-shape: big drop then partial recovery
      return [
        Math.round(originalPrice),
        Math.round(originalPrice - delta * 0.55),
        Math.round(originalPrice - delta * (0.85 + rng(2) * 0.10)), // bottom
        Math.round(originalPrice - delta * (0.35 + rng(3) * 0.15)), // partial recovery
        Math.round(currentPrice),
      ];
    }
    case 3: { // Stair-step: flat then sudden drop
      const stepPoint = 1 + Math.floor(rng(4) * 2); // step at index 1 or 2
      const vals: number[] = [];
      for (let i = 0; i < 5; i++) {
        if (i <= stepPoint) {
          vals.push(Math.round(originalPrice - delta * (i / stepPoint) * 0.20));
        } else {
          vals.push(Math.round(originalPrice - delta * (0.20 + (i - stepPoint) / (5 - stepPoint) * 0.80)));
        }
      }
      vals[vals.length - 1] = Math.round(currentPrice);
      return vals;
    }
    default:
      return [Math.round(originalPrice), Math.round(currentPrice)];
  }
}

// Helper: generate 4 cabin categories from a base price
function genCabins(basePrice: number, _nights: number) {
  return [
    { cabinClass: 'Inside' as const, baseFarePerPerson: Math.round(basePrice * 0.75), portTaxPerPerson: 180, gratuityPerPersonPerNight: 18.5 },
    { cabinClass: 'Oceanview' as const, baseFarePerPerson: basePrice, portTaxPerPerson: 180, gratuityPerPersonPerNight: 18.5 },
    { cabinClass: 'Balcony' as const, baseFarePerPerson: Math.round(basePrice * 1.65), portTaxPerPerson: 180, gratuityPerPersonPerNight: 18.5 },
    { cabinClass: 'Suite' as const, baseFarePerPerson: Math.round(basePrice * 3.4), portTaxPerPerson: 250, gratuityPerPersonPerNight: 22.5 },
  ];
}

export { genHistory, genCabins, genPriceHistoryDates, genMultiCabinPriceHistory };

// Helper: generate 5 ISO date strings spaced over the 90 days before sail date
function genPriceHistoryDates(sailDate: string): string[] {
  const sail = new Date(sailDate);
  const out: string[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(sail);
    d.setDate(d.getDate() - i * 18); // 72, 54, 36, 18, 0 days before sail
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// Cabin price multipliers: Inside ×0.75, Oceanview ×1, Balcony ×1.65, Suite ×3.4
const CABIN_MULTIPLIERS: Record<string, number> = {
  Inside: 0.75,
  Oceanview: 1.0,
  Balcony: 1.65,
  Suite: 3.4,
};

// Each cabin type has its own pricing behavior:
// - Inside: deepest discounts (cruise lines discount lead-in fares hardest to fill cabins)
// - Oceanview: moderate discounts
// - Balcony: smaller discounts (premium inventory, lines protect yield)
// - Suite: minimal discounts, sometimes price increases (luxury inventory holds value)
// Additionally, each cabin type gets a different curve SHAPE so charts don't look identical:
// - Inside: steady decline (linear waterfall)
// - Oceanview: decline with a mid-cycle price bump (temporary promo reversal)
// - Balcony: V-shape (drop then partial recovery as inventory tightens)
// - Suite: mostly flat with slight uptick (yield protection)
interface CabinPriceBehavior {
  multiplier: number;
  dropPercent: number;      // how much this cabin drops from its own peak
  curveShape: 'linear' | 'bump' | 'vshape' | 'uptick';
}

const CABIN_BEHAVIORS: Record<string, CabinPriceBehavior> = {
  Inside:    { multiplier: 0.75, dropPercent: 0.30, curveShape: 'linear' },
  Oceanview: { multiplier: 1.0,  dropPercent: 0.22, curveShape: 'bump' },
  Balcony:   { multiplier: 1.65, dropPercent: 0.15, curveShape: 'vshape' },
  Suite:     { multiplier: 3.4,  dropPercent: 0.06, curveShape: 'uptick' },
};

// Generate a 5-point price trajectory for a single cabin type
function genCabinHistory(baseFare: number, behavior: CabinPriceBehavior): number[] {
  const peak = Math.round(baseFare / (1 - behavior.dropPercent));
  const current = Math.round(baseFare);
  const drop = peak - current;

  switch (behavior.curveShape) {
    case 'linear': {
      // Steady decline: peak → 75% drop → 50% → 25% → current
      return [
        peak,
        Math.round(peak - drop * 0.25),
        Math.round(peak - drop * 0.50),
        Math.round(peak - drop * 0.75),
        current,
      ];
    }
    case 'bump': {
      // Decline with mid-cycle bump: peak → partial drop → temporary reversal → resume drop → current
      return [
        peak,
        Math.round(peak - drop * 0.35),
        Math.round(peak - drop * 0.20), // bump up (promo reversal)
        Math.round(peak - drop * 0.55),
        current,
      ];
    }
    case 'vshape': {
      // V-shape: peak → big drop → deeper drop → partial recovery → current
      return [
        peak,
        Math.round(peak - drop * 0.55),
        Math.round(peak - drop * 0.85), // bottom of V
        Math.round(peak - drop * 0.40), // partial recovery
        current,
      ];
    }
    case 'uptick': {
      // Mostly flat with slight uptick: start slightly below peak → flat → slight rise → higher
      const startVal = Math.round(peak - drop * 0.30);
      return [
        startVal,
        Math.round(startVal - (current - startVal) * 0.10),
        Math.round(startVal + (current - startVal) * 0.30),
        Math.round(startVal + (current - startVal) * 0.65),
        current, // current is the highest point
      ];
    }
    default:
      return [peak, peak, peak, peak, current];
  }
}

// Helper: generate multi-cabin price history (5 dates × 4 cabin types = 20 entries)
// Each cabin gets its own independent trajectory with realistic pricing behavior.
function genMultiCabinPriceHistory(currentInsidePrice: number, _originalPrice: number, sailDate: string) {
  const dates = genPriceHistoryDates(sailDate);
  const entries: Array<{ price: number; date: string; cabinClass: string }> = [];

  for (const [cabinClass, behavior] of Object.entries(CABIN_BEHAVIORS)) {
    const baseFare = Math.round(currentInsidePrice * behavior.multiplier);
    const prices = genCabinHistory(baseFare, behavior);
    for (let i = 0; i < dates.length; i++) {
      entries.push({
        price: prices[i],
        date: dates[i],
        cabinClass,
      });
    }
  }
  return entries;
}

export class CarnivalAdapter extends SourceAdapter {
  get name(): string { return 'Carnival'; }
  get baseUrl(): string { return 'https://www.carnival.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return [
      { id: 'carnival_mardi-gras_2026-01-15_galveston_7', cruiseLine: 'Carnival', ship: 'Mardi Gras', destination: 'Western Caribbean', departurePort: 'Galveston', departureRegion: 'Texas', duration: '7 nights', nights: 7, sailDate: '2026-01-15', price: 649, originalPrice: 899, dropPercent: 28, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(649, 899), bookingUrl: 'https://www.carnival.com/cruises/mardi-gras', bookingLabel: 'Carnival', itinerary: ['Galveston', 'Cozumel', 'Costa Maya', 'Mahogany Bay', 'Galveston'] },
      { id: 'carnival_vista_2026-02-10_miami_5', cruiseLine: 'Carnival', ship: 'Carnival Vista', destination: 'Eastern Caribbean', departurePort: 'Miami', departureRegion: 'Florida', duration: '5 nights', nights: 5, sailDate: '2026-02-10', price: 429, originalPrice: 549, dropPercent: 22, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(429, 549), bookingUrl: 'https://www.carnival.com/cruises/carnival-vista', bookingLabel: 'Carnival', itinerary: ['Miami', 'Amber Cove', 'Grand Turk', 'Miami'] },
      { id: 'carnival_panorama_2026-03-20_long-beach_7', cruiseLine: 'Carnival', ship: 'Carnival Panorama', destination: 'Mexican Riviera', departurePort: 'Long Beach', departureRegion: 'California', duration: '7 nights', nights: 7, sailDate: '2026-03-20', price: 549, originalPrice: 749, dropPercent: 27, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(549, 749), bookingUrl: 'https://www.carnival.com/cruises/carnival-panorama', bookingLabel: 'Carnival', itinerary: ['Long Beach', 'Puerto Vallarta', 'Mazatlan', 'Cabo San Lucas', 'Long Beach'] },
      { id: 'carnival_jubilee_2026-04-05_galveston_7', cruiseLine: 'Carnival', ship: 'Carnival Jubilee', destination: 'Western Caribbean', departurePort: 'Galveston', departureRegion: 'Texas', duration: '7 nights', nights: 7, sailDate: '2026-04-05', price: 729, originalPrice: 999, dropPercent: 27, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(729, 999), bookingUrl: 'https://www.carnival.com/cruises/carnival-jubilee', bookingLabel: 'Carnival', itinerary: ['Galveston', 'Cozumel', 'Costa Maya', 'Isla Roatan', 'Galveston'] },
    ];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    const sailings = await this.fetchSailings();
    const s = sailings.find(x => x.id === id);
    if (!s) return null;
    return { ...s, cabins: genCabins(s.price, s.nights), priceHistory: genMultiCabinPriceHistory(s.price, s.originalPrice, s.sailDate) };
  }
}

export class PrincessAdapter extends SourceAdapter {
  get name(): string { return 'Princess Cruises'; }
  get baseUrl(): string { return 'https://www.princess.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return [
      { id: 'princess_discovery_2026-03-05_los-angeles_10', cruiseLine: 'Princess Cruises', ship: 'Discovery Princess', destination: 'Mexican Riviera', departurePort: 'Los Angeles', departureRegion: 'California', duration: '10 nights', nights: 10, sailDate: '2026-03-05', price: 1299, originalPrice: 1599, dropPercent: 19, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(1299, 1599), bookingUrl: 'https://www.princess.com/find/cruise/search', bookingLabel: 'Princess', itinerary: ['Los Angeles', 'Puerto Vallarta', 'Mazatlan', 'Cabo San Lucas', 'Ensenada', 'Los Angeles'] },
      { id: 'princess_regal_2026-01-20_fort-lauderdale_7', cruiseLine: 'Princess Cruises', ship: 'Regal Princess', destination: 'Eastern Caribbean', departurePort: 'Fort Lauderdale', departureRegion: 'Florida', duration: '7 nights', nights: 7, sailDate: '2026-01-20', price: 799, originalPrice: 1149, dropPercent: 30, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(799, 1149), bookingUrl: 'https://www.princess.com/find/cruise/search', bookingLabel: 'Princess', itinerary: ['Fort Lauderdale', 'Princess Cays', 'St. Thomas', 'St. Maarten', 'Fort Lauderdale'] },
      { id: 'princess_sapphire_2026-05-09_seattle_7', cruiseLine: 'Princess Cruises', ship: 'Sapphire Princess', destination: 'Alaska Inside Passage', departurePort: 'Seattle', departureRegion: 'Washington', duration: '7 nights', nights: 7, sailDate: '2026-05-09', price: 999, originalPrice: 1399, dropPercent: 29, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(999, 1399), bookingUrl: 'https://www.princess.com/find/cruise/search', bookingLabel: 'Princess', itinerary: ['Seattle', 'Ketchikan', 'Juneau', 'Skagway', 'Victoria', 'Seattle'] },
    ];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    const sailings = await this.fetchSailings();
    const s = sailings.find(x => x.id === id);
    if (!s) return null;
    return { ...s, cabins: genCabins(s.price, s.nights), priceHistory: genMultiCabinPriceHistory(s.price, s.originalPrice, s.sailDate) };
  }
}

export class HollandAmericaAdapter extends SourceAdapter {
  get name(): string { return 'Holland America Line'; }
  get baseUrl(): string { return 'https://www.hollandamerica.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return [
      { id: 'hal_nieuw-amsterdam_2026-04-12_fort-lauderdale_14', cruiseLine: 'Holland America Line', ship: 'Nieuw Amsterdam', destination: 'Panama Canal', departurePort: 'Fort Lauderdale', departureRegion: 'Florida', duration: '14 nights', nights: 14, sailDate: '2026-04-12', price: 2199, originalPrice: 2799, dropPercent: 21, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(2199, 2799), bookingUrl: 'https://www.hollandamerica.com/cruises', bookingLabel: 'HAL', itinerary: ['Fort Lauderdale', 'Oranjestad, Aruba', 'Willemstad, Curacao', 'Cartagena', 'Panama Canal Transit', 'Puerto Limon', 'Fort Lauderdale'] },
      { id: 'hal_koningsdam_2026-05-15_vancouver_7', cruiseLine: 'Holland America Line', ship: 'Koningsdam', destination: 'Alaska Glacier Bay', departurePort: 'Vancouver', departureRegion: 'Canada', duration: '7 nights', nights: 7, sailDate: '2026-05-15', price: 1249, originalPrice: 1699, dropPercent: 26, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(1249, 1699), bookingUrl: 'https://www.hollandamerica.com/cruises', bookingLabel: 'HAL', itinerary: ['Vancouver', 'Juneau', 'Glacier Bay', 'Ketchikan', 'Vancouver'] },
    ];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    const sailings = await this.fetchSailings();
    const s = sailings.find(x => x.id === id);
    if (!s) return null;
    return { ...s, cabins: genCabins(s.price, s.nights), priceHistory: genMultiCabinPriceHistory(s.price, s.originalPrice, s.sailDate) };
  }
}

export class CunardAdapter extends SourceAdapter {
  get name(): string { return 'Cunard Line'; }
  get baseUrl(): string { return 'https://www.cunard.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return [
      { id: 'cunard_qm2_2026-05-20_southampton_7', cruiseLine: 'Cunard Line', ship: 'Queen Mary 2', destination: 'Transatlantic', departurePort: 'Southampton', departureRegion: 'Europe', duration: '7 nights', nights: 7, sailDate: '2026-05-20', price: 1899, originalPrice: 2499, dropPercent: 24, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(1899, 2499), bookingUrl: 'https://www.cunard.com/en-us/cruises', bookingLabel: 'Cunard', itinerary: ['Southampton', 'At Sea', 'At Sea', 'At Sea', 'At Sea', 'New York'] },
      { id: 'cunard_queen-anne_2026-08-01_hamburg_14', cruiseLine: 'Cunard Line', ship: 'Queen Anne', destination: 'Norwegian Fjords', departurePort: 'Hamburg', departureRegion: 'Europe', duration: '14 nights', nights: 14, sailDate: '2026-08-01', price: 2399, originalPrice: 3299, dropPercent: 27, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(2399, 3299), bookingUrl: 'https://www.cunard.com/en-us/cruises', bookingLabel: 'Cunard', itinerary: ['Hamburg', 'Bergen', 'Geiranger', 'Alesund', 'Stavanger', 'Hamburg'] },
    ];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    const sailings = await this.fetchSailings();
    const s = sailings.find(x => x.id === id);
    if (!s) return null;
    return { ...s, cabins: genCabins(s.price, s.nights), priceHistory: genMultiCabinPriceHistory(s.price, s.originalPrice, s.sailDate) };
  }
}

export class RoyalCaribbeanAdapter extends SourceAdapter {
  get name(): string { return 'Royal Caribbean'; }
  get baseUrl(): string { return 'https://www.royalcaribbean.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return [
      { id: 'rci_wonder_2026-06-01_cape-canaveral_7', cruiseLine: 'Royal Caribbean', ship: 'Wonder of the Seas', destination: 'Eastern Caribbean', departurePort: 'Cape Canaveral', departureRegion: 'Florida', duration: '7 nights', nights: 7, sailDate: '2026-06-01', price: 799, originalPrice: 1099, dropPercent: 27, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(799, 1099), bookingUrl: 'https://www.royalcaribbean.com/cruises', bookingLabel: 'Royal Caribbean', itinerary: ['Cape Canaveral', 'CocoCay, Bahamas', 'St. Thomas', 'St. Maarten', 'Cape Canaveral'] },
      { id: 'rci_harmony_2026-07-10_barcelona_7', cruiseLine: 'Royal Caribbean', ship: 'Harmony of the Seas', destination: 'Western Mediterranean', departurePort: 'Barcelona', departureRegion: 'Europe', duration: '7 nights', nights: 7, sailDate: '2026-07-10', price: 949, originalPrice: 1249, dropPercent: 24, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(949, 1249), bookingUrl: 'https://www.royalcaribbean.com/cruises', bookingLabel: 'Royal Caribbean', itinerary: ['Barcelona', 'Palma de Mallorca', 'Provence, France', 'Florence/Pisa', 'Rome', 'Naples', 'Barcelona'] },
      { id: 'rci_icon_2026-01-10_miami_7', cruiseLine: 'Royal Caribbean', ship: 'Icon of the Seas', destination: 'Eastern Caribbean', departurePort: 'Miami', departureRegion: 'Florida', duration: '7 nights', nights: 7, sailDate: '2026-01-10', price: 899, originalPrice: 1299, dropPercent: 31, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(899, 1299), bookingUrl: 'https://www.royalcaribbean.com/cruises', bookingLabel: 'Royal Caribbean', itinerary: ['Miami', 'CocoCay, Bahamas', 'St. Thomas', 'San Juan', 'Miami'] },
    ];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    const sailings = await this.fetchSailings();
    const s = sailings.find(x => x.id === id);
    if (!s) return null;
    return { ...s, cabins: genCabins(s.price, s.nights), priceHistory: genMultiCabinPriceHistory(s.price, s.originalPrice, s.sailDate) };
  }
}
