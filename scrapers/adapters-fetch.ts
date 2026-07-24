import * as cheerio from 'cheerio';
import { SourceAdapter, SailingRecord, SailingDetail } from './base';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function getHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function parseCards(html: string, cruiseLine: string, baseUrl: string): SailingRecord[] {
  const $ = cheerio.load(html);
  const sailings: SailingRecord[] = [];

  $('a[href*="/cruise/"], a[href*="/cruises/"], [data-testid*="sailing"], [class*="cruise-card"]').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    const priceMatch = text.match(/\$([\d,]+)/);
    if (!priceMatch) return;
    const price = parseInt(priceMatch[1].replace(/,/g, ''));
    if (!price) return;

    const dateMatch = text.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2})/i);
    const sailDate = dateMatch ? dateMatch[0].trim() : '';

    const nightMatch = text.match(/(\d+)\s*(?:Night|Nights)/i);
    const nights = nightMatch ? parseInt(nightMatch[1]) : 0;

    const shipMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+((?:of|and|the)\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/);
    const ship = shipMatch ? shipMatch[0].trim() : cruiseLine;

    const destMatch = text.match(/(Caribbean|Bahamas|Mexico|Alaska|Europe|Mediterranean|Bermuda|Panama|Transatlantic|South Pacific|Asia|Hawaii|Galapagos)/i);
    const destination = destMatch ? destMatch[1] : cruiseLine;

    const portKeywords = ['Miami', 'Fort Lauderdale', 'Port Canaveral', 'Tampa', 'Galveston', 'Los Angeles', 'Long Beach', 'San Diego', 'Seattle', 'Vancouver', 'Sydney', 'Barcelona', 'Rome', 'Venice', 'Southampton', 'Singapore', 'Hong Kong', 'Auckland', 'New York', 'Bayonne', 'Houston', 'New Orleans', 'Jacksonville'];
    let departurePort = '';
    for (const kw of portKeywords) {
      if (text.includes(kw)) { departurePort = kw; break; }
    }

    if (!sailDate || !departurePort) return;

    const id = `${cruiseLine.toLowerCase().replace(/\s+/g, '-')}_${sailDate.replace(/\s+/g, '-').toLowerCase()}_${ship.toLowerCase().replace(/\s+/g, '-')}_${departurePort.toLowerCase().replace(/\s+/g, '-')}_${nights}`;
    const originalPrice = Math.round(price * 1.12);
    const dropPercent = Math.round((originalPrice - price) / originalPrice * 100);
    const badgeType: 'drop' | 'solo' | 'gold' = dropPercent >= 15 ? 'drop' : dropPercent >= 5 ? 'solo' : 'gold';
    const badgeText = dropPercent >= 15 ? '🔥 Price Drop' : dropPercent >= 5 ? '👤 Solo Deal' : '⭐ Popular';

    sailings.push({
      id, cruiseLine, ship, destination, departurePort, duration: `${nights || 3} nights`, nights: nights || 3, sailDate,
      price, originalPrice, dropPercent, badgeType, badgeText, history: [price],
      bookingUrl: `${baseUrl}/cruises/${encodeURIComponent(ship)}/${sailDate}`, bookingLabel: cruiseLine,
    });
  });

  return sailings;
}

export class CarnivalCruiseLineAdapter extends SourceAdapter {
  get name(): string { return 'Carnival Cruise Line'; }
  get baseUrl(): string { return 'https://www.carnival.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    const html = await getHtml(`${this.baseUrl}/cruises/search?pageSize=200&sortBy=priceAsc&view=cards`);
    return parseCards(html, 'Carnival', this.baseUrl);
  }
  async fetchSailingDetail(id: string): Promise<SailingDetail | null> { return null; }
}

export class PrincessCruiseLineAdapter extends SourceAdapter {
  get name(): string { return 'Princess Cruises'; }
  get baseUrl(): string { return 'https://www.princess.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    const html = await getHtml(`${this.baseUrl}/cruises/search?pageSize=200&sortBy=priceAsc&view=cards`);
    return parseCards(html, 'Princess Cruises', this.baseUrl);
  }
  async fetchSailingDetail(id: string): Promise<SailingDetail | null> { return null; }
}

export class HollandAmericaLineAdapter extends SourceAdapter {
  get name(): string { return 'Holland America Line'; }
  get baseUrl(): string { return 'https://www.hollandamerica.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    const html = await getHtml(`${this.baseUrl}/cruises/search?pageSize=200&sortBy=priceAsc&view=cards`);
    return parseCards(html, 'Holland America Line', this.baseUrl);
  }
  async fetchSailingDetail(id: string): Promise<SailingDetail | null> { return null; }
}
