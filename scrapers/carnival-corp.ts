import { SourceAdapter, SailingRecord, SailingDetail } from './base';

// ============================================================
// Stub adapters with realistic cruise data — 22 sailings across 8 lines.
// Each sailing includes cabin pricing + synthetic price history.
// Replace with real adapters in Loop 2.
// ============================================================

// Helper: generate 5-point synthetic price history (90-day trend)
function genHistory(currentPrice: number, originalPrice: number): number[] {
  const delta = originalPrice - currentPrice;
  return [
    Math.round(originalPrice),
    Math.round(originalPrice - delta * 0.25),
    Math.round(originalPrice - delta * 0.5),
    Math.round(originalPrice - delta * 0.75),
    Math.round(currentPrice),
  ];
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

export { genHistory, genCabins };

export class CarnivalAdapter extends SourceAdapter {
  get name(): string { return 'Carnival'; }
  get baseUrl(): string { return 'https://www.carnival.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return [
      { id: 'carnival_mardi-gras_2026-01-15_galveston_7', cruiseLine: 'Carnival', ship: 'Mardi Gras', destination: 'Western Caribbean', departurePort: 'Galveston', departureRegion: 'Texas', duration: '7 nights', nights: 7, sailDate: '2026-01-15', price: 649, originalPrice: 899, dropPercent: 28, badgeType: 'drop', badgeText: '🔥 Price Drop', history: genHistory(649, 899), bookingUrl: 'https://www.carnival.com/cruises/mardi-gras', bookingLabel: 'Carnival' },
      { id: 'carnival_vista_2026-02-10_miami_5', cruiseLine: 'Carnival', ship: 'Carnival Vista', destination: 'Eastern Caribbean', departurePort: 'Miami', departureRegion: 'Florida', duration: '5 nights', nights: 5, sailDate: '2026-02-10', price: 429, originalPrice: 549, dropPercent: 22, badgeType: 'drop', badgeText: '🔥 Price Drop', history: genHistory(429, 549), bookingUrl: 'https://www.carnival.com/cruises/carnival-vista', bookingLabel: 'Carnival' },
      { id: 'carnival_panorama_2026-03-20_long-beach_7', cruiseLine: 'Carnival', ship: 'Carnival Panorama', destination: 'Mexican Riviera', departurePort: 'Long Beach', departureRegion: 'California', duration: '7 nights', nights: 7, sailDate: '2026-03-20', price: 549, originalPrice: 749, dropPercent: 27, badgeType: 'drop', badgeText: '🔥 Price Drop', history: genHistory(549, 749), bookingUrl: 'https://www.carnival.com/cruises/carnival-panorama', bookingLabel: 'Carnival' },
      { id: 'carnival_jubilee_2026-04-05_galveston_7', cruiseLine: 'Carnival', ship: 'Carnival Jubilee', destination: 'Western Caribbean', departurePort: 'Galveston', departureRegion: 'Texas', duration: '7 nights', nights: 7, sailDate: '2026-04-05', price: 729, originalPrice: 999, dropPercent: 27, badgeType: 'drop', badgeText: '🔥 Price Drop', history: genHistory(729, 999), bookingUrl: 'https://www.carnival.com/cruises/carnival-jubilee', bookingLabel: 'Carnival' },
    ];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    const sailings = await this.fetchSailings();
    const s = sailings.find(x => x.id === id);
    if (!s) return null;
    return { ...s, cabins: genCabins(s.price, s.nights), priceHistory: genHistory(s.price, s.originalPrice).map((price, i) => ({ price, date: `2025-10-${15 + i * 15}` })) };
  }
}

export class PrincessAdapter extends SourceAdapter {
  get name(): string { return 'Princess Cruises'; }
  get baseUrl(): string { return 'https://www.princess.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return [
      { id: 'princess_discovery_2026-03-05_los-angeles_10', cruiseLine: 'Princess Cruises', ship: 'Discovery Princess', destination: 'Mexican Riviera', departurePort: 'Los Angeles', departureRegion: 'California', duration: '10 nights', nights: 10, sailDate: '2026-03-05', price: 1299, originalPrice: 1599, dropPercent: 19, badgeType: 'drop', badgeText: '🔥 Price Drop', history: genHistory(1299, 1599), bookingUrl: 'https://www.princess.com/find/cruise/search', bookingLabel: 'Princess' },
      { id: 'princess_regal_2026-01-20_fort-lauderdale_7', cruiseLine: 'Princess Cruises', ship: 'Regal Princess', destination: 'Eastern Caribbean', departurePort: 'Fort Lauderdale', departureRegion: 'Florida', duration: '7 nights', nights: 7, sailDate: '2026-01-20', price: 799, originalPrice: 1149, dropPercent: 30, badgeType: 'drop', badgeText: '🔥 Price Drop', history: genHistory(799, 1149), bookingUrl: 'https://www.princess.com/find/cruise/search', bookingLabel: 'Princess' },
      { id: 'princess_sapphire_2026-05-09_seattle_7', cruiseLine: 'Princess Cruises', ship: 'Sapphire Princess', destination: 'Alaska Inside Passage', departurePort: 'Seattle', departureRegion: 'Washington', duration: '7 nights', nights: 7, sailDate: '2026-05-09', price: 999, originalPrice: 1399, dropPercent: 29, badgeType: 'drop', badgeText: '🔥 Price Drop', history: genHistory(999, 1399), bookingUrl: 'https://www.princess.com/find/cruise/search', bookingLabel: 'Princess' },
    ];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    const sailings = await this.fetchSailings();
    const s = sailings.find(x => x.id === id);
    if (!s) return null;
    return { ...s, cabins: genCabins(s.price, s.nights), priceHistory: genHistory(s.price, s.originalPrice).map((price, i) => ({ price, date: `2025-10-${15 + i * 15}` })) };
  }
}

export class HollandAmericaAdapter extends SourceAdapter {
  get name(): string { return 'Holland America Line'; }
  get baseUrl(): string { return 'https://www.hollandamerica.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return [
      { id: 'hal_nieuw-amsterdam_2026-04-12_fort-lauderdale_14', cruiseLine: 'Holland America Line', ship: 'Nieuw Amsterdam', destination: 'Panama Canal', departurePort: 'Fort Lauderdale', departureRegion: 'Florida', duration: '14 nights', nights: 14, sailDate: '2026-04-12', price: 2199, originalPrice: 2799, dropPercent: 21, badgeType: 'drop', badgeText: '🔥 Price Drop', history: genHistory(2199, 2799), bookingUrl: 'https://www.hollandamerica.com/cruises', bookingLabel: 'HAL' },
      { id: 'hal_koningsdam_2026-05-15_vancouver_7', cruiseLine: 'Holland America Line', ship: 'Koningsdam', destination: 'Alaska Glacier Bay', departurePort: 'Vancouver', departureRegion: 'Canada', duration: '7 nights', nights: 7, sailDate: '2026-05-15', price: 1249, originalPrice: 1699, dropPercent: 26, badgeType: 'drop', badgeText: '🔥 Price Drop', history: genHistory(1249, 1699), bookingUrl: 'https://www.hollandamerica.com/cruises', bookingLabel: 'HAL' },
    ];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    const sailings = await this.fetchSailings();
    const s = sailings.find(x => x.id === id);
    if (!s) return null;
    return { ...s, cabins: genCabins(s.price, s.nights), priceHistory: genHistory(s.price, s.originalPrice).map((price, i) => ({ price, date: `2025-10-${15 + i * 15}` })) };
  }
}

export class CunardAdapter extends SourceAdapter {
  get name(): string { return 'Cunard Line'; }
  get baseUrl(): string { return 'https://www.cunard.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return [
      { id: 'cunard_qm2_2026-05-20_southampton_7', cruiseLine: 'Cunard Line', ship: 'Queen Mary 2', destination: 'Transatlantic', departurePort: 'Southampton', departureRegion: 'Europe', duration: '7 nights', nights: 7, sailDate: '2026-05-20', price: 1899, originalPrice: 2499, dropPercent: 24, badgeType: 'drop', badgeText: '🔥 Price Drop', history: genHistory(1899, 2499), bookingUrl: 'https://www.cunard.com/en-us/cruises', bookingLabel: 'Cunard' },
      { id: 'cunard_queen-anne_2026-08-01_hamburg_14', cruiseLine: 'Cunard Line', ship: 'Queen Anne', destination: 'Norwegian Fjords', departurePort: 'Hamburg', departureRegion: 'Europe', duration: '14 nights', nights: 14, sailDate: '2026-08-01', price: 2399, originalPrice: 3299, dropPercent: 27, badgeType: 'drop', badgeText: '🔥 Price Drop', history: genHistory(2399, 3299), bookingUrl: 'https://www.cunard.com/en-us/cruises', bookingLabel: 'Cunard' },
    ];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    const sailings = await this.fetchSailings();
    const s = sailings.find(x => x.id === id);
    if (!s) return null;
    return { ...s, cabins: genCabins(s.price, s.nights), priceHistory: genHistory(s.price, s.originalPrice).map((price, i) => ({ price, date: `2025-10-${15 + i * 15}` })) };
  }
}

export class RoyalCaribbeanAdapter extends SourceAdapter {
  get name(): string { return 'Royal Caribbean'; }
  get baseUrl(): string { return 'https://www.royalcaribbean.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return [
      { id: 'rci_wonder_2026-06-01_cape-canaveral_7', cruiseLine: 'Royal Caribbean', ship: 'Wonder of the Seas', destination: 'Eastern Caribbean', departurePort: 'Cape Canaveral', departureRegion: 'Florida', duration: '7 nights', nights: 7, sailDate: '2026-06-01', price: 799, originalPrice: 1099, dropPercent: 27, badgeType: 'drop', badgeText: '🔥 Price Drop', history: genHistory(799, 1099), bookingUrl: 'https://www.royalcaribbean.com/cruises', bookingLabel: 'Royal Caribbean' },
      { id: 'rci_harmony_2026-07-10_barcelona_7', cruiseLine: 'Royal Caribbean', ship: 'Harmony of the Seas', destination: 'Western Mediterranean', departurePort: 'Barcelona', departureRegion: 'Europe', duration: '7 nights', nights: 7, sailDate: '2026-07-10', price: 949, originalPrice: 1249, dropPercent: 24, badgeType: 'drop', badgeText: '🔥 Price Drop', history: genHistory(949, 1249), bookingUrl: 'https://www.royalcaribbean.com/cruises', bookingLabel: 'Royal Caribbean' },
      { id: 'rci_icon_2026-01-10_miami_7', cruiseLine: 'Royal Caribbean', ship: 'Icon of the Seas', destination: 'Eastern Caribbean', departurePort: 'Miami', departureRegion: 'Florida', duration: '7 nights', nights: 7, sailDate: '2026-01-10', price: 899, originalPrice: 1299, dropPercent: 31, badgeType: 'drop', badgeText: '🔥 Price Drop', history: genHistory(899, 1299), bookingUrl: 'https://www.royalcaribbean.com/cruises', bookingLabel: 'Royal Caribbean' },
    ];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    const sailings = await this.fetchSailings();
    const s = sailings.find(x => x.id === id);
    if (!s) return null;
    return { ...s, cabins: genCabins(s.price, s.nights), priceHistory: genHistory(s.price, s.originalPrice).map((price, i) => ({ price, date: `2025-10-${15 + i * 15}` })) };
  }
}
