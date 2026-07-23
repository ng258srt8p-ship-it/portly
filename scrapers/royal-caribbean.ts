import { SourceAdapter, SailingRecord, SailingDetail } from './base';

// ============================================================
// Royal Caribbean Group — real adapter using public JSON API
// No Playwright needed; hits RCI's search endpoint directly.
// ============================================================

interface RCISailing {
  shipName: string;
  sailDate: string;
  duration: number;
  destination: string;
  departurePort: string;
  brand: string;
  lowestPrice: number;
  bookingUrl: string;
}

interface RCISearchResponse {
  results: RCISailing[];
  totalCount: number;
}

export class RCIGroupAdapter extends SourceAdapter {
  get name(): string { return 'Royal Caribbean Group'; }
  get baseUrl(): string { return 'https://www.royalcaribbean.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    const sailings: SailingRecord[] = [];

    try {
      // RCI public search API — no auth required
      const url = `${this.baseUrl}/api/cruises/v1/search?pageSize=200&sortBy=priceAsc`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`[${this.name}] API returned ${response.status}`);
        return sailings;
      }

      const data = await response.json() as RCISearchResponse;
      const results = data.results || [];

      for (const s of results) {
        const price = s.lowestPrice || 0;
        if (price === 0) continue;

        const originalPrice = price * 1.12;
        const dropPercent = Math.round((originalPrice - price) / originalPrice * 100);

        sailings.push({
          id: this.fingerprint(s.shipName, s.sailDate, s.departurePort, s.duration),
          cruiseLine: s.brand || 'Royal Caribbean',
          ship: s.shipName,
          destination: s.destination,
          departurePort: s.departurePort,
          departureRegion: this.inferRegion(s.departurePort),
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
    } catch (err) {
      console.error(`[${this.name}] Fetch error:`, err);
    }

    return sailings;
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> {
    return null;
  }

  private inferRegion(port: string): string {
    const p = port.toLowerCase();
    if (p.includes('miami') || p.includes('fort lauderdale') || p.includes('port canaveral') || p.includes('cape canaveral') || p.includes('tampa') || p.includes('jacksonville')) return 'Florida';
    if (p.includes('galveston') || p.includes('houston')) return 'Texas';
    if (p.includes('los angeles') || p.includes('long beach') || p.includes('san diego') || p.includes('san francisco') || p.includes('seattle') || p.includes('vancouver')) return 'West Coast';
    if (p.includes('new york') || p.includes('bayonne') || p.includes('baltimore') || p.includes('norfolk') || p.includes('charleston')) return 'East Coast';
    if (p.includes('barcelona') || p.includes('rome') || p.includes('venice') || p.includes('southampton') || p.includes('copenhagen') || p.includes('stockholm')) return 'Europe';
    if (p.includes('singapore') || p.includes('hong kong') || p.includes('sydney') || p.includes('auckland')) return 'Asia Pacific';
    return 'Other';
  }
}
