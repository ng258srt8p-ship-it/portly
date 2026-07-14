/**
 * StealthBrowser — Playwright-based stealth browser tool
 * 
 * Dynamically injects stealth headers, overrides JavaScript properties,
 * randomizes user agents, and uses residential proxy rotation schemas
 * to mimic a standard human desktop browser.
 * 
 * This is the CORE tool for bypassing Cloudflare and other anti-bot
 * protection systems on CruisePlum and similar travel sites.
 */

import { chromium, Browser, BrowserContext, Page, BrowserContextOptions } from 'playwright';

// ============================================================
// Types
// ============================================================

export interface StealthConfig {
  /** Proxy URL. Format: http://user:pass@host:port */
  proxyUrl?: string;
  /** Viewport dimensions */
  viewport?: { width: number; height: number };
  /** Locale for the browser */
  locale?: string;
  /** Timezone ID */
  timezoneId?: string;
  /** Whether to run headless */
  headless?: boolean;
  /** Custom user agent (if not randomized) */
  userAgent?: string;
  /** Extra launch args for Chromium */
  extraLaunchArgs?: string[];
  /** Geolocation coordinates */
  geolocation?: { latitude: number; longitude: number };
  /** Request timeout in ms */
  timeout?: number;
}

export interface StealthSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

// ============================================================
// User Agent Rotation
// ============================================================

const USER_AGENTS = [
  // Chrome 122 on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  // Chrome 122 on Windows 11
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  // Edge 122 on Windows 11
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
  // Firefox 123 on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',
  // Chrome 121 on Linux
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  // Safari 17.3 on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
];

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1366, height: 768 },
  { width: 1680, height: 1050 },
];

const LOCALES = ['en-US', 'en-GB', 'en-CA', 'en-AU'];
const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Australia/Sydney',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// Stealth Injection Script
// ============================================================

const STEALTH_INIT_SCRIPT = `
// Override webdriver property
Object.defineProperty(navigator, 'webdriver', { get: () => false });

// Override plugins array to appear as a normal browser
Object.defineProperty(navigator, 'plugins', {
  get: () => [
    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
    { name: 'Native Client', filename: 'internal-nacl-plugin' },
  ].map(p => ({ ...p, description: p.name, length: 1 }))
});

// Override languages
Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

// Override hardwareConcurrency for realistic thread count
Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => Math.floor(Math.random() * 4) + 4 });

// Override deviceMemory
Object.defineProperty(navigator, 'deviceMemory', { get: () => Math.floor(Math.random() * 4) + 4 });

// Remove Chrome automation runtime flags
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) => (
  parameters.name === 'notifications' 
    ? Promise.resolve({ state: Notification.permission, onchange: null })
    : originalQuery(parameters)
);

// WebGL vendor spoofing (basic)
const getParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(parameter) {
  if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
  if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
  return getParameter.call(this, parameter);
};
`;

// ============================================================
// Main StealthBrowser Class
// ============================================================

export class StealthBrowser {
  private config: Required<StealthConfig>;
  private session: StealthSession | null = null;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;

  constructor(config: StealthConfig = {}) {
    this.config = {
      proxyUrl: config.proxyUrl ?? '',
      viewport: config.viewport ?? randomItem(VIEWPORTS),
      locale: config.locale ?? randomItem(LOCALES),
      timezoneId: config.timezoneId ?? randomItem(TIMEZONES),
      headless: config.headless ?? true,
      userAgent: config.userAgent ?? randomItem(USER_AGENTS),
      extraLaunchArgs: config.extraLaunchArgs || [],
      geolocation: config.geolocation || { latitude: 40.7128, longitude: -74.006 },
      timeout: config.timeout || 30000,
    };
  }

  /**
   * Launch a new stealth browser session
   */
  async launch(): Promise<StealthSession> {
    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-dev-shm-usage',
      '--window-size=' + this.config.viewport.width + ',' + this.config.viewport.height,
      ...this.config.extraLaunchArgs,
    ];

    const browser = await chromium.launch({
      headless: this.config.headless,
      args: launchArgs,
    });

    const contextOptions: BrowserContextOptions = {
      viewport: this.config.viewport,
      userAgent: this.config.userAgent,
      locale: this.config.locale,
      timezoneId: this.config.timezoneId,
      geolocation: this.config.geolocation,
      permissions: ['geolocation'],
    };

    // Add proxy if configured
    if (this.config.proxyUrl) {
      contextOptions.proxy = { server: this.config.proxyUrl };
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    // Inject stealth scripts
    await page.addInitScript(STEALTH_INIT_SCRIPT);

    // Set default timeout
    page.setDefaultTimeout(this.config.timeout);

    // Set extra HTTP headers for realism
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
    });

    this.session = { browser, context, page };
    return this.session;
  }

  /**
   * Navigate to a URL with stealth
   */
  async goto(url: string, options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'; timeout?: number }): Promise<void> {
    if (!this.session) throw new Error('Browser not launched. Call launch() first.');

    // Rate limiting: max 5 requests per minute
    const now = Date.now();
    if (now - this.lastRequestTime < 12000 && this.requestCount > 0) {
      const delay = 12000 - (now - this.lastRequestTime);
      console.log(`[StealthBrowser] Rate limiting: waiting ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.requestCount++;
    this.lastRequestTime = Date.now();

    const waitUntil = options?.waitUntil || 'domcontentloaded';
    const timeout = options?.timeout || this.config.timeout;

    console.log(`[StealthBrowser] Navigating to: ${url} (${waitUntil}, ${timeout}ms)`);
    await this.session.page.goto(url, { waitUntil, timeout });
  }

  /**
   * Take a screenshot of the current page
   */
  async screenshot(path: string): Promise<void> {
    if (!this.session) throw new Error('Browser not launched');
    await this.session.page.screenshot({ path, fullPage: false });
  }

  /**
   * Get the current page content
   */
  async getContent(): Promise<string> {
    if (!this.session) throw new Error('Browser not launched');
    return await this.session.page.content();
  }

  /**
   * Evaluate JavaScript in the page context
   */
  async evaluate<T>(fn: () => T | Promise<T>): Promise<T> {
    if (!this.session) throw new Error('Browser not launched');
    return await this.session.page.evaluate(fn);
  }

  /**
   * Wait for a specified timeout
   */
  async waitFor(ms: number): Promise<void> {
    if (!this.session) throw new Error('Browser not launched');
    await this.session.page.waitForTimeout(ms);
  }

  /**
   * Wait for a selector to appear
   */
  async waitForSelector(selector: string, timeout?: number): Promise<void> {
    if (!this.session) throw new Error('Browser not launched');
    await this.session.page.waitForSelector(selector, { timeout: timeout || 10000 });
  }

  /**
   * Click an element
   */
  async click(selector: string): Promise<void> {
    if (!this.session) throw new Error('Browser not launched');
    await this.session.page.click(selector);
  }

  /**
   * Type text into an input
   */
  async type(selector: string, text: string): Promise<void> {
    if (!this.session) throw new Error('Browser not launched');
    await this.session.page.fill(selector, text);
  }

  /**
   * Get all cookies from the context
   */
  async getCookies() {
    if (!this.session) throw new Error('Browser not launched');
    return await this.session.context.cookies();
  }

  /**
   * Close the browser session
   */
  async close(): Promise<void> {
    if (this.session) {
      await this.session.context.close();
      await this.session.browser.close();
      this.session = null;
    }
  }

  /**
   * Check if the current page is behind a Cloudflare challenge
   */
  async isCloudflareChallenge(): Promise<boolean> {
    if (!this.session) return false;
    const title = await this.session.page.title();
    const content = await this.session.page.content();
    return (
      title.includes('Just a moment') ||
      content.includes('__cf_chl_') ||
      content.includes('cf-browser-verification') ||
      content.includes('cdn-cgi/challenge') ||
      content.includes('Performing security verification')
    );
  }

  /**
   * Get the current page URL
   */
  async getUrl(): Promise<string> {
    if (!this.session) return '';
    return this.session.page.url();
  }

  /**
   * Get the page title
   */
  async getTitle(): Promise<string> {
    if (!this.session) return '';
    return this.session.page.title();
  }

  /**
   * Extract all links from the page
   */
  async extractLinks(): Promise<Array<{ text: string; href: string; rel: string }>> {
    if (!this.session) return [];
    return await this.session.page.evaluate(() => {
      return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).map(a => ({
        text: (a.textContent || '').trim().substring(0, 100),
        href: a.href,
        rel: a.rel || '',
      }));
    });
  }

  /**
   * Extract all meta tags
   */
  async extractMetaTags(): Promise<Record<string, string>> {
    if (!this.session) return {};
    return await this.session.page.evaluate(() => {
      const result: Record<string, string> = {};
      document.querySelectorAll('meta').forEach(m => {
        const name = m.getAttribute('name') || m.getAttribute('property') || '';
        const content = m.getAttribute('content') || '';
        if (name && content) result[name] = content;
      });
      return result;
    });
  }

  /**
   * Extract structured data (JSON-LD)
   */
  async extractStructuredData(): Promise<string[]> {
    if (!this.session) return [];
    return await this.session.page.evaluate(() => {
      return Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      ).map(el => el.textContent || '');
    });
  }

  /**
   * Scroll the page to trigger lazy loading
   */
  async scrollToBottom(): Promise<void> {
    if (!this.session) return;
    await this.session.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.waitFor(1000);
  }

  /**
   * Scroll to a specific position
   */
  async scrollTo(y: number): Promise<void> {
    if (!this.session) return;
    await this.session.page.evaluate((y: number) => window.scrollTo(0, y), y);
    await this.waitFor(500);
  }

  /**
   * Get all visible text content
   */
  async getText(): Promise<string> {
    if (!this.session) return '';
    return await this.session.page.evaluate(() => document.body.innerText);
  }
}

/**
 * Create a pre-configured StealthBrowser instance with optimal defaults
 * for scraping CruisePlum and similar travel sites
 */
export function createCruisePlumStealthBrowser(headless: boolean = true): StealthBrowser {
  return new StealthBrowser({
    headless,
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    geolocation: { latitude: 25.7617, longitude: -80.1918 }, // Miami — cruise hub
    timeout: 45000,
  });
}

export default StealthBrowser;
