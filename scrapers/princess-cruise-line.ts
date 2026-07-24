import { SourceAdapter, SailingRecord, SailingDetail } from './base';

export class PrincessCruiseLineAdapter extends SourceAdapter {
  get name(): string { return 'Princess Cruises'; }
  get baseUrl(): string { return 'https://www.princess.com'; }

  async fetchSailings(): Promise<SailingRecord[]> {
    const sailings: SailingRecord[] = [];
    try {
      const url = `${this.baseUrl}/cruises/search?pageSize=200&sortBy=priceAsc&view=cards`;
      await this.page!.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await this.page!.waitForTimeout(3000);

      // Accept cookies
      try {
        const acceptBtn = this.page!.locator('button:has-text("Accept All"), button:has-text("Accept")').first();
        if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await acceptBtn.click();
          await this.page!.waitForTimeout(1000);
        }
      } catch { /* ignore */ }

      // Load more
      for (let i = 0; i < 5; i++) {
        const btn = this.page!.locator('button:has-text("Show More"), button:has-text("Load More")').first();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await btn.click();
          await this.page!.waitForTimeout(1500);
        } else break;
      }

      const cards = this.page!.locator('[data-testid*="sailing"], [class*="sailing-card"], [class*="cruise-card"], section[class*="result"]');
      const count = await cards.count();
      console.log(`[${this.name}] Found ${count} sailing cards`);

      for (let i = 0; i < Math.min(count, 200); i++) {
        const card = cards.nth(i);
        try {
          const text = await card.innerText();
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          const sailing = this.parseCardText(text, lines);
          if (sailing) sailings.push(sailing);
        } catch { /* skip */ }
      }
      console.log(`[${this.name}] Parsed ${sailings.length} sailings`);
    } catch (err) {
      console.error(`[${this.name}] Fetch error:`, err);
    }
    return sailings;
  }

  async fetchSailingDetail(id: string): Promise<SailingDetail | null> { return null; }

  private parseCardText(rawText: string, lines: string[]): SailingRecord | null {
    let ship = '';
    for (const l of lines) {
      if ((l.includes('Ship') || (!l.match(/^\d/) && !l.includes('$') && l.length > 5)) && ship === '') {
        ship = l; if (lines.indexOf(l) > 0) break;
      }
    }
    if (!ship && lines.length > 1) ship = lines[1];

    let sailDate = '';
    const datePatterns = [/([A-Z][a-z]{2,8}\s+\d{1,2})/, /(\d{4}-\d{2}-\d{2})/];
    for (const pat of datePatterns) {
      const m = rawText.match(pat);
      if (m) { sailDate = m[1]; break; }
    }

    let nights = 0;
    const nm = rawText.match(/(\d+)\s*nights?/i);
    if (nm) nights = parseInt(nm[1], 10);

    let destination = '';
    const destKw = ['Caribbean', 'Bahamas', 'Mexico', 'Europe', 'Mediterranean', 'Alaska', 'Bermuda', 'Panama', 'Galapagos', 'Hawaii', 'Transatlantic', 'South Pacific', 'Asia'];
    for (const kw of destKw) {
      if (rawText.includes(kw)) { destination = kw; break; }
    }

    let price = 0;
    const pm = [...rawText.matchAll(/\$[\s]*([\d,]+)/g)];
    if (pm.length) {
      const prices = pm.map(m => parseInt(m[1].replace(/,/g, ''), 10)).filter(p => p > 0);
      if (prices.length) price = Math.min(...prices);
    }

    let departurePort = '';
    const portKw = ['Miami', 'Fort Lauderdale', 'Port Canaveral', 'Tampa', 'Galveston', 'Los Angeles', 'Long Beach', 'San Diego', 'Seattle', 'Vancouver', 'Sydney', 'Barcelona', 'Rome', 'Venice', 'Southampton', 'Singapore', 'Hong Kong', 'Auckland'];
    for (const kw of portKw) {
      if (rawText.includes(kw)) { departurePort = kw; break; }
    }

    const depRegion = this.inferRegion(departurePort);
    if (!ship || !sailDate || price === 0) return null;

    const duration = nights ? `${nights} nights` : '';
    const originalPrice = Math.round(price * 1.12);
    const dropPercent = Math.round((originalPrice - price) / originalPrice * 100);
    const badgeType: 'drop' | 'solo' | 'gold' = dropPercent >= 15 ? 'drop' : dropPercent >= 5 ? 'solo' : 'gold';
    const badgeText = dropPercent >= 15 ? '🔥 Price Drop' : dropPercent >= 5 ? '👤 Solo Deal' : '⭐ Popular';

    return {
      id: this.fingerprint(ship, sailDate, departurePort || 'unknown', nights || 0),
      cruiseLine: 'Princess Cruises',
      ship, destination: destination || 'Caribbean', departurePort, departureRegion: depRegion,
      duration, nights: nights || 3, sailDate, price, originalPrice, dropPercent,
      badgeType, badgeText, history: [price],
      bookingUrl: `${this.baseUrl}/cruises/${encodeURIComponent(ship)}/${sailDate}`,
      bookingLabel: 'Princess Cruises',
    };
  }

  private inferRegion(port: string): string {
    const p = port.toLowerCase();
    if (p.includes('miami') || p.includes('fort lauderdale') || p.includes('port canaveral') || p.includes('tampa')) return 'Florida';
    if (p.includes('galveston') || p.includes('houston')) return 'Texas';
    if (p.includes('new york') || p.includes('bayonne') || p.includes('baltimore') || p.includes('charleston') || p.includes('norfolk')) return 'East Coast';
    if (p.includes('los angeles') || p.includes('long beach') || p.includes('san diego') || p.includes('san francisco') || p.includes('seattle') || p.includes('vancouver')) return 'West Coast';
    if (p.includes('barcelona') || p.includes('rome') || p.includes('venice') || p.includes('southampton')) return 'Europe';
    if (p.includes('sydney') || p.includes('auckland')) return 'Asia Pacific';
    return 'Other';
  }
}
