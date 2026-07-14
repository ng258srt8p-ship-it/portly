/**
 * ScrapeAgent — Stealth Data Harvester
 * 
 * Handles reverse-engineering & anti-bot bypass for CruisePlum.
 * Uses StealthBrowser for navigation and NetworkInterceptor for
 * capturing API payloads. Falls back to Wayback Machine when
 * Cloudflare challenges persist.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { StealthBrowser } from '../plugins/StealthBrowser';
import { NetworkInterceptor, APICall, InterceptorAnalysis } from '../plugins/NetworkInterceptor';

// ============================================================
// Types
// ============================================================

export interface ScrapeTarget {
  name: string;
  url: string;
  interaction?: {
    searchFor?: string;
    clickSelectors?: string[];
    waitForSelector?: string;
    waitAfterLoad?: number;
  };
}

export interface ScrapedPage {
  name: string;
  url: string;
  title: string;
  htmlSnippet: string;
  textContent: string;
  links: Array<{ text: string; href: string }>;
  metaTags: Record<string, string>;
  structuredData: string[];
  wasCloudflareProtected: boolean;
  waybackUsed: boolean;
  error?: string;
  timestamp: string;
}

export interface AgentConfig {
  outputDir: string;
  headless: boolean;
  waybackFallback: boolean;
  maxRetries: number;
}

export interface ScrapeAgentResult {
  pages: ScrapedPage[];
  apiAnalysis: InterceptorAnalysis;
  endpoints: string[];
  cloudflareAssessment: {
    protected: boolean;
    challengeType: string;
    bypassSuccessful: boolean;
    fallbackUsed: boolean;
  };
  waybackSnapshots: ScrapedPage[];
}

// ============================================================
// Wayback Machine Helper
// ============================================================

async function fetchWaybackSnapshot(url: string): Promise<{ html: string; timestamp: string; waybackUrl: string } | null> {
  try {
    // Check availability
    const availUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
    const availBody = await new Promise<string>((resolve, reject) => {
      https.get(availUrl, { timeout: 10000 }, (res: any) => {
        let data = '';
        res.on('data', (chunk: string) => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });

    const avail = JSON.parse(availBody);
    const snapshot = avail.archived_snapshots?.closest;
    if (!snapshot?.available) return null;

    // Fetch the actual page
    const waybackUrl = `https://web.archive.org/web/2024/${url.replace(/^https?:\/\//, '')}`;
    const html = await new Promise<string>((resolve, reject) => {
      https.get(waybackUrl, { timeout: 15000 }, (res: any) => {
        let data = '';
        res.on('data', (chunk: string) => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });

    return { html, timestamp: snapshot.timestamp, waybackUrl };
  } catch (err: any) {
    console.error(`[ScrapeAgent] Wayback fetch error: ${err.message}`);
    return null;
  }
}

function extractText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  return match ? match[1] : '';
}

function extractMetaTags(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  const regex = /<meta\s[^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const name = match[0].match(/name=["']([^"']*)/i) || match[0].match(/property=["']([^"']*)/i);
    const content = match[0].match(/content=["']([^"']*)/i);
    if (name && content) result[name[1]] = content[1];
  }
  return result;
}

function extractStructuredData(html: string): string[] {
  const results: string[] = [];
  const regex = /<script\s[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis;
  let match;
  while ((match = regex.exec(html)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

// ============================================================
// ScrapeAgent
// ============================================================

export class ScrapeAgent {
  private config: AgentConfig;
  private browser: StealthBrowser | null = null;
  private interceptor: NetworkInterceptor | null = null;

  constructor(config?: Partial<AgentConfig>) {
    this.config = {
      outputDir: config?.outputDir || './output/scrape_results',
      headless: config?.headless ?? true,
      waybackFallback: config?.waybackFallback ?? true,
      maxRetries: config?.maxRetries ?? 3,
    };
    fs.mkdirSync(this.config.outputDir, { recursive: true });
  }

  /**
   * Initialize the browser and interceptor
   */
  async initialize(): Promise<void> {
    this.browser = new StealthBrowser({
      headless: this.config.headless,
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      timeout: 45000,
    });

    this.interceptor = new NetworkInterceptor({
      verbose: true,
      saveToDisk: true,
      outputDir: path.join(this.config.outputDir, 'intercepted'),
    });

    await this.browser.launch();
    console.log('[ScrapeAgent] Initialized browser + interceptor');
  }

  /**
   * Scrape a single page with network interception
   */
  async scrapePage(target: ScrapeTarget): Promise<ScrapedPage> {
    if (!this.browser) throw new Error('Agent not initialized. Call initialize() first.');

    console.log(`\n[ScrapeAgent] Scraping: ${target.name} — ${target.url}`);

    try {
      // Navigate with stealth
      await this.browser.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      
      // Check for Cloudflare
      const isCloudflare = await this.browser.isCloudflareChallenge();
      
      if (isCloudflare && this.config.waybackFallback) {
        console.log('[ScrapeAgent] Cloudflare detected! Falling back to Wayback Machine...');
        
        const wayback = await fetchWaybackSnapshot(target.url);
        if (wayback) {
          const scraped: ScrapedPage = {
            name: target.name,
            url: target.url,
            title: extractTitle(wayback.html),
            htmlSnippet: wayback.html.substring(0, 100000),
            textContent: extractText(wayback.html).substring(0, 50000),
            links: this._extractLinksFromHtml(wayback.html),
            metaTags: extractMetaTags(wayback.html),
            structuredData: extractStructuredData(wayback.html),
            wasCloudflareProtected: true,
            waybackUsed: true,
            timestamp: new Date().toISOString(),
          };

          this._savePageToDisk(scraped);
          return scraped;
        }
      }

      // Perform interactions if specified
      if (target.interaction) {
        await this._performInteractions(target.interaction);
      }

      // Wait for lazy-loaded content
      await this.browser.waitFor(target.interaction?.waitAfterLoad || 2000);

      // Extract page data
      const title = await this.browser.getTitle();
      const textContent = await this.browser.getText();
      const links = await this.browser.extractLinks();
      const metaTags = await this.browser.extractMetaTags();
      const structuredData = await this.browser.extractStructuredData();

      const scraped: ScrapedPage = {
        name: target.name,
        url: target.url,
        title,
        htmlSnippet: (await this.browser.getContent()).substring(0, 100000),
        textContent: textContent.substring(0, 50000),
        links,
        metaTags,
        structuredData,
        wasCloudflareProtected: isCloudflare,
        waybackUsed: false,
        timestamp: new Date().toISOString(),
      };

      this._savePageToDisk(scraped);
      return scraped;

    } catch (err: any) {
      console.error(`[ScrapeAgent] Error scraping ${target.name}: ${err.message}`);

      // Fallback to Wayback on error
      if (this.config.waybackFallback) {
        const wayback = await fetchWaybackSnapshot(target.url);
        if (wayback) {
          return {
            name: target.name,
            url: target.url,
            title: extractTitle(wayback.html),
            htmlSnippet: wayback.html.substring(0, 100000),
            textContent: extractText(wayback.html).substring(0, 50000),
            links: this._extractLinksFromHtml(wayback.html),
            metaTags: extractMetaTags(wayback.html),
            structuredData: extractStructuredData(wayback.html),
            wasCloudflareProtected: true,
            waybackUsed: true,
            error: `Primary scrape failed: ${err.message}`,
            timestamp: new Date().toISOString(),
          };
        }
      }

      return {
        name: target.name,
        url: target.url,
        title: '',
        htmlSnippet: '',
        textContent: '',
        links: [],
        metaTags: {},
        structuredData: [],
        wasCloudflareProtected: false,
        waybackUsed: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Run a full search flow on CruisePlum with network interception
   */
  async searchCruises(searchParams: {
    destination?: string;
    duration?: string;
    cruiseLine?: string;
  }): Promise<{
    pages: ScrapedPage[];
    apiAnalysis: InterceptorAnalysis;
    endpoints: string[];
  }> {
    if (!this.browser || !this.interceptor) throw new Error('Agent not initialized');
    if (!this.browser['session']) {
      await this.initialize();
    }

    console.log('[ScrapeAgent] ========================================');
    console.log('[ScrapeAgent] Running Cruise Search Flow with Interception');
    console.log('[ScrapeAgent] ========================================');

    const pages: ScrapedPage[] = [];
    const targets: ScrapeTarget[] = [
      { name: 'homepage', url: 'https://www.cruiseplum.com/' },
      { name: 'search', url: 'https://www.cruiseplum.com/cruises' },
      { name: 'deals', url: 'https://www.cruiseplum.com/cruise-deals' },
      { name: 'price_drops', url: 'https://www.cruiseplum.com/price-drops' },
      { name: 'solo_deals', url: 'https://www.cruiseplum.com/solo-supplement-deals' },
    ];

    // Scrape each target with interception
    for (const target of targets) {
      const page = await this.scrapePage(target);
      pages.push(page);
      
      // Save raw HTML
      const htmlPath = path.join(this.config.outputDir, `${target.name}.html`);
      fs.writeFileSync(htmlPath, page.htmlSnippet);
      console.log(`[ScrapeAgent] Saved HTML: ${htmlPath} (${page.htmlSnippet.length / 1024}KB)`);
    }

    // Analyze intercepted traffic
    const apiAnalysis = this.interceptor.analyze();

    // Extract unique endpoints
    const endpoints = [...new Set(
      apiAnalysis.apiCalls.map(c => {
        try {
          const u = new URL(c.url);
          return `${c.method} ${u.hostname}${u.pathname}`;
        } catch { return c.url; }
      })
    )];

    console.log(`\n[ScrapeAgent] Interception Complete:`);
    console.log(`  Pages scraped: ${pages.length}`);
    console.log(`  API calls captured: ${apiAnalysis.apiCalls.length}`);
    console.log(`  Price APIs: ${apiAnalysis.priceAPIs.length}`);
    console.log(`  Search APIs: ${apiAnalysis.searchAPIs.length}`);
    console.log(`  Unique endpoints: ${endpoints.length}`);

    return { pages, apiAnalysis, endpoints };
  }

  /**
   * Run a simulated cruise search with date/destination selection
   */
  async simulateSearch(destination: string = 'Caribbean', duration: string = '7'): Promise<any> {
    console.log(`\n[ScrapeAgent] Simulating search: ${destination}, ${duration} nights`);
    
    // Navigate to search page
    const searchUrl = `https://www.cruiseplum.com/search?destination=${encodeURIComponent(destination)}&duration=${duration}`;
    
    await this.browser!.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await this.browser!.waitFor(3000);

    // Scroll to trigger lazy loading
    await this.browser!.scrollToBottom();
    await this.browser!.scrollTo(0);

    // Check for price data in the page
    const priceData = await this.browser!.evaluate(() => {
      const bodyText = document.body.innerText;
      const priceRegex = /\$[\d,]+\.?\d*/g;
      const prices = bodyText.match(priceRegex);
      return {
        priceCount: prices?.length || 0,
        samplePrices: prices?.slice(0, 20) || [],
        hasCabinTypes: bodyText.includes('Inside') || bodyText.includes('Oceanview') || bodyText.includes('Balcony'),
        hasTaxes: bodyText.toLowerCase().includes('tax') || bodyText.toLowerCase().includes('fee'),
        hasGratuities: bodyText.toLowerCase().includes('gratuit') || bodyText.toLowerCase().includes('tip'),
      };
    });

    console.log('[ScrapeAgent] Search Results Analysis:', JSON.stringify(priceData, null, 2));

    return {
      searchUrl,
      destination,
      duration,
      priceData,
      apiAnalysis: this.interceptor?.analyze(),
    };
  }

  /**
   * Get the network interceptor instance
   */
  getInterceptor(): NetworkInterceptor | null {
    return this.interceptor;
  }

  /**
   * Clean up resources
   */
  async shutdown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    console.log('[ScrapeAgent] Shutdown complete');
  }

  // ============================================================
  // Private Helpers
  // ============================================================

  private async _performInteractions(interaction: ScrapeTarget['interaction']): Promise<void> {
    if (!this.browser) return;
    if (!interaction) return;

    // Wait for specific selector
    if (interaction.waitForSelector) {
      await this.browser.waitForSelector(interaction.waitForSelector);
    }

    // Click specified elements
    if (interaction.clickSelectors) {
      for (const selector of interaction.clickSelectors) {
        try {
          await this.browser.click(selector);
          await this.browser.waitFor(1000);
        } catch (err: any) {
          console.warn(`[ScrapeAgent] Could not click "${selector}": ${err.message}`);
        }
      }
    }
  }

  private _extractLinksFromHtml(html: string): Array<{ text: string; href: string }> {
    const links: Array<{ text: string; href: string }> = [];
    const regex = /<a\s[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      links.push({
        text: match[2].replace(/<[^>]*>/g, '').trim().substring(0, 100),
        href: match[1],
      });
    }
    return links.slice(0, 200);
  }

  private _savePageToDisk(page: ScrapedPage): void {
    const filepath = path.join(this.config.outputDir, `${page.name}_meta.json`);
    const meta = {
      name: page.name,
      url: page.url,
      title: page.title,
      linkCount: page.links.length,
      wasCloudflareProtected: page.wasCloudflareProtected,
      waybackUsed: page.waybackUsed,
      timestamp: page.timestamp,
      error: page.error,
    };
    fs.writeFileSync(filepath, JSON.stringify(meta, null, 2));
  }
}

/**
 * Create a pre-configured ScrapeAgent for CruisePlum analysis
 */
export function createScrapeAgent(headless: boolean = true): ScrapeAgent {
  return new ScrapeAgent({
    headless,
    outputDir: './output/scrape_results',
    waybackFallback: true,
    maxRetries: 3,
  });
}

export default ScrapeAgent;
