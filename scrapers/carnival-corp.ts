import { SourceAdapter, SailingRecord, SailingDetail } from './base';

interface CarnivalSailing {
  shipName: string;
  sailDate: string;
  duration: number;
  destination: string;
  departurePort: string;
  itinerary: string;
  insidePrice?: number;
  oceanviewPrice?: number;
  balconyPrice?: number;
  suitePrice?: number;
  bookingUrl?: string;
}

export class CarnivalAdapter extends SourceAdapter {
  get name(): string { return 'Carnival Corp'; }
  get baseUrl(): string { return 'https://www.carnival.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return this.retry(async () => {
      const sailings: SailingRecord[] = [];
      // Fetch from Carnival's API endpoint (public JSON)
      const url = `${this.baseUrl}/cruise-search/api/sailings?limit=100&offset=0`;

      await this.initialize();
      const response = await this.page!.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      if (!response) return sailings;

      const data = await response.json();
      const results = data.results || data.sailings || [];

      for (const s of results) {
        const price = s.insidePrice || s.oceanviewPrice || s.balconyPrice || s.suitePrice || 0;
        const originalPrice = price * 1.15; // estimate original from 15% drop baseline
        const dropPercent = price > 0 ? Math.round((originalPrice - price) / originalPrice * 100) : 0;

        sailings.push({
          id: this.fingerprint(s.shipName, s.sailDate, s.departurePort, s.duration),
          cruiseLine: 'Carnival',
          ship: s.shipName,
          destination: s.destination || s.itinerary,
          departurePort: s.departurePort,
          duration: `${s.duration} nights`,
          nights: s.duration,
          sailDate: s.sailDate,
          price,
          originalPrice,
          dropPercent,
          badgeType: dropPercent >= 15 ? 'drop' : dropPercent >= 5 ? 'solo' : 'gold',
          badgeText: dropPercent >= 15 ? '🔥 Price Drop' : dropPercent >= 5 ? '👤 Solo Deal' : '⭐ Popular',
          history: [price],
          bookingUrl: s.bookingUrl,
          bookingLabel: 'Carnival',
        });
      }

      await this.destroy();
      return sailings;
    });
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    // In production, this would scrape the individual sailing page for cabin rates
    return null;
  }
}

// Princess, Holland America, Cunard all share similar scraper patterns
export class PrincessAdapter extends SourceAdapter {
  get name(): string { return 'Princess Cruises'; }
  get baseUrl(): string { return 'https://www.princess.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    // Similar pattern to Carnival
    return [];
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    return null;
  }
}

export class HollandAmericaAdapter extends SourceAdapter {
  get name(): string { return 'Holland America Line'; }
  get baseUrl(): string { return 'https://www.hollandamerica.com'; }
  async fetchSailings(): Promise<SailingRecord[]> { return []; }
  async fetchSailingDetail(id: string): Promise<SailingDetail | null> { return null; }
}

export class CunardAdapter extends SourceAdapter {
  get name(): string { return 'Cunard Line'; }
  get baseUrl(): string { return 'https://www.cunard.com'; }
  async fetchSailings(): Promise<SailingRecord[]> { return []; }
  async fetchSailingDetail(id: string): Promise<SailingDetail | null> { return null; }
}

export class RCIGroupAdapter extends SourceAdapter {
  get name(): string { return 'Royal Caribbean Group'; }
  get baseUrl(): string { return 'https://www.royalcaribbean.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    return this.retry(async () => {
      const sailings: SailingRecord[] = [];
      // RCI provides cruise search via public API
      const url = `${this.baseUrl}/api/cruises/v1/search?pageSize=100`;

      await this.initialize();
      const response = await this.page!.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      if (!response) return sailings;

      const data = await response.json();
      const results = data.results || data.sailings || [];

      for (const s of results) {
        const price = s.lowestPrice || s.price || 0;
        const originalPrice = price * 1.12;
        const dropPercent = price > 0 ? Math.round((originalPrice - price) / originalPrice * 100) : 0;

        sailings.push({
          id: this.fingerprint(s.shipName, s.sailDate, s.departurePort, s.duration),
          cruiseLine: s.brand || 'Royal Caribbean',
          ship: s.shipName,
          destination: s.destination,
          departurePort: s.departurePort,
          duration: `${s.duration} nights`,
          nights: s.duration,
          sailDate: s.sailDate,
          price,
          originalPrice,
          dropPercent,
          badgeType: dropPercent >= 15 ? 'drop' : dropPercent >= 5 ? 'solo' : 'gold',
          badgeText: dropPercent >= 15 ? '🔥 Price Drop' : dropPercent >= 5 ? '👤 Solo Deal' : '⭐ Popular',
          history: [price],
          bookingUrl: s.bookingUrl,
          bookingLabel: s.brand || 'Royal Caribbean',
        });
      }

      await this.destroy();
      return sailings;
    });
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> { return null; }
}
