import { SourceAdapter, SailingRecord, SailingDetail } from './base';

// ============================================================
// Stub adapters for Loop 1 pipeline validation
// These return hardcoded test data instantly — no network calls.
// Replace with real Playwright/Puppeteer scrapers in Loop 2.
// ============================================================

export class CarnivalAdapter extends SourceAdapter {
  get name(): string { return 'Carnival Corp'; }
  get baseUrl(): string { return 'https://www.carnival.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return [
      {
        id: 'carnival_stub_mardi-gras_2026-01-15_galveston_7',
        cruiseLine: 'Carnival',
        ship: 'Mardi Gras',
        destination: 'Western Caribbean',
        departurePort: 'Galveston',
        departureRegion: 'Texas',
        duration: '7 nights',
        nights: 7,
        sailDate: '2026-01-15',
        price: 649,
        originalPrice: 899,
        dropPercent: 28,
        badgeType: 'drop',
        badgeText: '🔥 Price Drop',
        history: [649],
        bookingUrl: 'https://www.carnival.com/booking/mardi-gras-2026-01-15',
        bookingLabel: 'Carnival',
      },
      {
        id: 'carnival_stub_vista_2026-02-10_miami_5',
        cruiseLine: 'Carnival',
        ship: 'Carnival Vista',
        destination: 'Eastern Caribbean',
        departurePort: 'Miami',
        departureRegion: 'Florida',
        duration: '5 nights',
        nights: 5,
        sailDate: '2026-02-10',
        price: 429,
        originalPrice: 549,
        dropPercent: 22,
        badgeType: 'drop',
        badgeText: '🔥 Price Drop',
        history: [429],
        bookingUrl: 'https://www.carnival.com/booking/vista-2026-02-10',
        bookingLabel: 'Carnival',
      },
    ];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    return null;
  }
}

export class PrincessAdapter extends SourceAdapter {
  get name(): string { return 'Princess Cruises'; }
  get baseUrl(): string { return 'https://www.princess.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return [
      {
        id: 'princess_stub_discovery_2026-03-05_los-angeles_10',
        cruiseLine: 'Princess Cruises',
        ship: 'Discovery Princess',
        destination: 'Mexican Riviera',
        departurePort: 'Los Angeles',
        departureRegion: 'California',
        duration: '10 nights',
        nights: 10,
        sailDate: '2026-03-05',
        price: 1299,
        originalPrice: 1599,
        dropPercent: 19,
        badgeType: 'drop',
        badgeText: '🔥 Price Drop',
        history: [1299],
        bookingUrl: 'https://www.princess.com/booking/discovery-2026-03-05',
        bookingLabel: 'Princess Cruises',
      },
    ];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    return null;
  }
}

export class HollandAmericaAdapter extends SourceAdapter {
  get name(): string { return 'Holland America Line'; }
  get baseUrl(): string { return 'https://www.hollandamerica.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return [
      {
        id: 'hal_stub-nieuw-amsterdam_2026-04-12_fort-lauderdale_14',
        cruiseLine: 'Holland America Line',
        ship: 'Nieuw Amsterdam',
        destination: 'Panama Canal',
        departurePort: 'Fort Lauderdale',
        departureRegion: 'Florida',
        duration: '14 nights',
        nights: 14,
        sailDate: '2026-04-12',
        price: 2199,
        originalPrice: 2799,
        dropPercent: 21,
        badgeType: 'drop',
        badgeText: '🔥 Price Drop',
        history: [2199],
        bookingUrl: 'https://www.hollandamerica.com/booking/nieuw-amsterdam-2026-04-12',
        bookingLabel: 'Holland America Line',
      },
    ];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    return null;
  }
}

export class CunardAdapter extends SourceAdapter {
  get name(): string { return 'Cunard Line'; }
  get baseUrl(): string { return 'https://www.cunard.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return [
      {
        id: 'cunard_stub_qm2_2026-05-20_southampton_7',
        cruiseLine: 'Cunard Line',
        ship: 'Queen Mary 2',
        destination: 'Transatlantic',
        departurePort: 'Southampton',
        departureRegion: 'Europe',
        duration: '7 nights',
        nights: 7,
        sailDate: '2026-05-20',
        price: 1899,
        originalPrice: 2499,
        dropPercent: 24,
        badgeType: 'drop',
        badgeText: '🔥 Price Drop',
        history: [1899],
        bookingUrl: 'https://www.cunard.com/booking/qm2-2026-05-20',
        bookingLabel: 'Cunard Line',
      },
    ];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    return null;
  }
}

export class RCIGroupAdapter extends SourceAdapter {
  get name(): string { return 'Royal Caribbean Group'; }
  get baseUrl(): string { return 'https://www.royalcaribbean.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return [
      {
        id: 'rci_stub-wonder_2026-06-01_cape-canaveral_7',
        cruiseLine: 'Royal Caribbean',
        ship: 'Wonder of the Seas',
        destination: 'Eastern Caribbean',
        departurePort: 'Cape Canaveral',
        departureRegion: 'Florida',
        duration: '7 nights',
        nights: 7,
        sailDate: '2026-06-01',
        price: 799,
        originalPrice: 1099,
        dropPercent: 27,
        badgeType: 'drop',
        badgeText: '🔥 Price Drop',
        history: [799],
        bookingUrl: 'https://www.royalcaribbean.com/booking/wonder-2026-06-01',
        bookingLabel: 'Royal Caribbean',
      },
      {
        id: 'rci_stub-harmony_2026-07-10_barcelona_7',
        cruiseLine: 'Royal Caribbean',
        ship: 'Harmony of the Seas',
        destination: 'Western Mediterranean',
        departurePort: 'Barcelona',
        departureRegion: 'Europe',
        duration: '7 nights',
        nights: 7,
        sailDate: '2026-07-10',
        price: 949,
        originalPrice: 1249,
        dropPercent: 24,
        badgeType: 'drop',
        badgeText: '🔥 Price Drop',
        history: [949],
        bookingUrl: 'https://www.royalcaribbean.com/booking/harmony-2026-07-10',
        bookingLabel: 'Royal Caribbean',
      },
    ];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    return null;
  }
}
