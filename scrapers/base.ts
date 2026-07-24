import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

export interface SailingRecord {
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
  badgeType: 'drop' | 'solo' | 'gold';
  badgeText: string;
  history: number[];
  bookingUrl?: string;
  bookingLabel?: string;
}

export interface CabinRate {
  cabinClass: 'Inside' | 'Oceanview' | 'Balcony' | 'Suite';
  baseFarePerPerson: number;
  portTaxPerPerson: number;
  gratuityPerPersonPerNight: number;
}

export interface PriceHistoryEntry {
  price: number;
  date: string;
}

export interface SailingDetail extends SailingRecord {
  cabins: CabinRate[];
  priceHistory?: PriceHistoryEntry[];
}

export abstract class SourceAdapter {
  protected browser: Browser | null = null;
  protected page: Page | null = null;
  protected rateLimitMs: number;
  protected maxRetries: number;

  constructor(
    rateLimitMs: number = 2000,
    maxRetries: number = 3
  ) {
    this.rateLimitMs = rateLimitMs;
    this.maxRetries = maxRetries;
  }

  abstract get name(): string;
  abstract get baseUrl(): string;
  abstract fetchSailings(): Promise<SailingRecord[]>;
  abstract fetchSailingDetail(id: string): Promise<SailingDetail | null>;

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({ headless: true });
    this.page = await this.browser.newPage();
    await this.page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    });
  }

  async destroy(): Promise<void> {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }

  protected async sleep(): Promise<void> {
    const jitter = Math.random() * 1000;
    await new Promise(r => setTimeout(r, this.rateLimitMs + jitter));
  }

  protected async retry<T>(fn: () => Promise<T>, retries?: number): Promise<T> {
    const n = retries ?? this.maxRetries;
    for (let i = 0; i < n; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i === n - 1) throw err;
        console.warn(`[${this.name}] Retry ${i + 1}/${n}: ${err}`);
        await new Promise(r => setTimeout(r, 5000 * (i + 1)));
      }
    }
    throw new Error('Unreachable');
  }

  protected fingerprint(ship: string, sailDate: string, port: string, nights: number): string {
    return `${this.name.toLowerCase().replace(/\s+/g, '-')}_${sailDate}_${ship.toLowerCase().replace(/\s+/g, '-')}_${port.toLowerCase().replace(/\s+/g, '-')}_${nights}`;
  }
}
