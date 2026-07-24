import { SourceAdapter, SailingRecord, SailingDetail } from './base';
import { genHistory, genCabins, genMultiCabinPriceHistory } from './carnival-corp';

// Additional cruise line stubs: Norwegian, MSC, Disney, Celebrity

export class NorwegianAdapter extends SourceAdapter {
  get name(): string { return 'Norwegian Cruise Line'; }
  get baseUrl(): string { return 'https://www.ncl.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return [
      { id: 'ncl_encore_2026-02-15_miami_7', cruiseLine: 'Norwegian Cruise Line', ship: 'Norwegian Encore', destination: 'Eastern Caribbean', departurePort: 'Miami', departureRegion: 'Florida', duration: '7 nights', nights: 7, sailDate: '2026-02-15', price: 699, originalPrice: 999, dropPercent: 30, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(699, 999), bookingUrl: 'https://www.ncl.com/cruise-search', bookingLabel: 'NCL', itinerary: ['Miami', 'Puerto Plata', 'St. Thomas', 'Tortola', 'Great Stirrup Cay', 'Miami'] },
      { id: 'ncl_prima_2026-09-10_rome_10', cruiseLine: 'Norwegian Cruise Line', ship: 'Norwegian Prima', destination: 'Greek Isles', departurePort: 'Rome', departureRegion: 'Europe', duration: '10 nights', nights: 10, sailDate: '2026-09-10', price: 1499, originalPrice: 1999, dropPercent: 25, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(1499, 1999), bookingUrl: 'https://www.ncl.com/cruise-search', bookingLabel: 'NCL', itinerary: ['Rome (Civitavecchia)', 'Florence/Pisa', 'Cannes', 'Palma de Mallorca', 'Barcelona', 'Naples', 'Rome (Civitavecchia)'] },
    ];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    const sailings = await this.fetchSailings();
    const s = sailings.find(x => x.id === id);
    if (!s) return null;
    return { ...s, cabins: genCabins(s.price, s.nights), priceHistory: genMultiCabinPriceHistory(s.price, s.originalPrice, s.sailDate, s.id) };
  }
}

export class MSCAdapter extends SourceAdapter {
  get name(): string { return 'MSC Cruises'; }
  get baseUrl(): string { return 'https://www.msccruises.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return [
      { id: 'msc_seascape_2026-03-01_miami_7', cruiseLine: 'MSC Cruises', ship: 'MSC Seascape', destination: 'Western Caribbean', departurePort: 'Miami', departureRegion: 'Florida', duration: '7 nights', nights: 7, sailDate: '2026-03-01', price: 549, originalPrice: 799, dropPercent: 31, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(549, 799), bookingUrl: 'https://www.msccruises.com/en-us', bookingLabel: 'MSC', itinerary: ['Miami', 'Cozumel', 'George Town, Cayman Islands', 'Ocho Rios, Jamaica', 'Ocean Cay MSC Marine Reserve', 'Miami'] },
      { id: 'msc_virtuosa_2026-06-20_dubai_7', cruiseLine: 'MSC Cruises', ship: 'MSC Virtuosa', destination: 'Arabian Gulf', departurePort: 'Dubai', departureRegion: 'Middle East', duration: '7 nights', nights: 7, sailDate: '2026-06-20', price: 799, originalPrice: 1099, dropPercent: 27, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(799, 1099), bookingUrl: 'https://www.msccruises.com/en-us', bookingLabel: 'MSC', itinerary: ['Dubai', 'Abu Dhabi', 'Sir Bani Yas Island', 'Doha, Qatar', 'Dubai'] },
    ];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    const sailings = await this.fetchSailings();
    const s = sailings.find(x => x.id === id);
    if (!s) return null;
    return { ...s, cabins: genCabins(s.price, s.nights), priceHistory: genMultiCabinPriceHistory(s.price, s.originalPrice, s.sailDate, s.id) };
  }
}

export class DisneyAdapter extends SourceAdapter {
  get name(): string { return 'Disney Cruise Line'; }
  get baseUrl(): string { return 'https://disneycruise.disney.go.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return [
      { id: 'disney_wish_2026-04-18_port-canaveral_4', cruiseLine: 'Disney Cruise Line', ship: 'Disney Wish', destination: 'Bahamas', departurePort: 'Port Canaveral', departureRegion: 'Florida', duration: '4 nights', nights: 4, sailDate: '2026-04-18', price: 1599, originalPrice: 2099, dropPercent: 24, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(1599, 2099), bookingUrl: 'https://disneycruise.disney.go.com', bookingLabel: 'Disney', itinerary: ['Port Canaveral', 'Nassau, Bahamas', 'Castaway Cay', 'Port Canaveral'] },
      { id: 'disney_fantasy_2026-12-05_port-canaveral_7', cruiseLine: 'Disney Cruise Line', ship: 'Disney Fantasy', destination: 'Eastern Caribbean', departurePort: 'Port Canaveral', departureRegion: 'Florida', duration: '7 nights', nights: 7, sailDate: '2026-12-05', price: 2299, originalPrice: 2899, dropPercent: 21, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(2299, 2899), bookingUrl: 'https://disneycruise.disney.go.com', bookingLabel: 'Disney', itinerary: ['Port Canaveral', 'St. Thomas', 'Tortola', 'Castaway Cay', 'Port Canaveral'] },
    ];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    const sailings = await this.fetchSailings();
    const s = sailings.find(x => x.id === id);
    if (!s) return null;
    return { ...s, cabins: genCabins(s.price, s.nights), priceHistory: genMultiCabinPriceHistory(s.price, s.originalPrice, s.sailDate, s.id) };
  }
}

export class CelebrityAdapter extends SourceAdapter {
  get name(): string { return 'Celebrity Cruises'; }
  get baseUrl(): string { return 'https://www.celebritycruises.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return [
      { id: 'celebrity_apex_2026-01-25_fort-lauderdale_7', cruiseLine: 'Celebrity Cruises', ship: 'Celebrity Apex', destination: 'Southern Caribbean', departurePort: 'Fort Lauderdale', departureRegion: 'Florida', duration: '7 nights', nights: 7, sailDate: '2026-01-25', price: 899, originalPrice: 1249, dropPercent: 28, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(899, 1249), bookingUrl: 'https://www.celebritycruises.com', bookingLabel: 'Celebrity', itinerary: ['Fort Lauderdale', 'Philipsburg, St. Maarten', 'San Juan, Puerto Rico', 'Puerto Plata, DR', 'Fort Lauderdale'] },
      { id: 'celebrity_beyond_2026-07-05_civitavecchia_10', cruiseLine: 'Celebrity Cruises', ship: 'Celebrity Beyond', destination: 'Italian Mediterranean', departurePort: 'Civitavecchia', departureRegion: 'Europe', duration: '10 nights', nights: 10, sailDate: '2026-07-05', price: 1799, originalPrice: 2399, dropPercent: 25, badgeType: 'drop', badgeText: 'Price Drop', history: genHistory(1799, 2399), bookingUrl: 'https://www.celebritycruises.com', bookingLabel: 'Celebrity', itinerary: ['Civitavecchia (Rome)', 'Florence/Pisa', 'Cannes, France', 'Palma de Mallorca', 'Barcelona', 'Valencia', 'Seville', 'Lisbon', 'Civitavecchia (Rome)'] },
    ];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    const sailings = await this.fetchSailings();
    const s = sailings.find(x => x.id === id);
    if (!s) return null;
    return { ...s, cabins: genCabins(s.price, s.nights), priceHistory: genMultiCabinPriceHistory(s.price, s.originalPrice, s.sailDate, s.id) };
  }
}
