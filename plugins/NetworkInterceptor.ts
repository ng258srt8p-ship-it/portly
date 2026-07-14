/**
 * NetworkInterceptor — XHR/Fetch payload capturer
 * 
 * Attaches to a Playwright browser session and intercepts all network
 * traffic. Filters for XHR/Fetch requests related to search queries,
 * price history, and cruise data APIs. Captures JSON payloads for
 * reverse-engineering the data schema.
 */

import { Page, Request, Response, Route } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// Types
// ============================================================

export interface InterceptedRequest {
  url: string;
  method: string;
  resourceType: string;
  headers: Record<string, string>;
  postData: string | null;
  timestamp: number;
}

export interface InterceptedResponse {
  url: string;
  status: number;
  headers: Record<string, string>;
  contentType: string;
  body: string;
  timestamp: number;
  duration: number;
}

export interface APICall {
  url: string;
  method: string;
  resourceType: string;
  queryParams: Record<string, string[]>;
  requestHeaders: Record<string, string>;
  postData: string | null;
  responseStatus: number;
  responseBody: string | null;
  responseContentType: string;
  timestamp: number;
  duration: number;
  isPriceAPI: boolean;
  isSearchAPI: boolean;
  isBookingAPI: boolean;
}

export interface InterceptorConfig {
  /** Log all requests (verbose) */
  verbose?: boolean;
  /** Save intercepted payloads to disk */
  saveToDisk?: boolean;
  /** Output directory for saved payloads */
  outputDir?: string;
  /** Only capture URLs matching these patterns */
  urlFilters?: RegExp[];
  /** Maximum body size to capture (bytes) */
  maxBodySize?: number;
}

export interface InterceptorAnalysis {
  totalRequests: number;
  totalResponses: number;
  apiCalls: APICall[];
  priceAPIs: APICall[];
  searchAPIs: APICall[];
  bookingAPIs: APICall[];
  uniqueEndpoints: string[];
  dataPayloads: Record<string, any>;
  summary: {
    domains: Record<string, number>;
    methods: Record<string, number>;
    contentTypes: Record<string, number>;
  };
}

// ============================================================
// API Pattern Detection
// ============================================================

const PRICE_API_PATTERNS = [
  /price/i, /pricing/i, /fare/i, /rate/i, /cost/i,
  /history/i, /trend/i, /drop/i, /sale/i, /deal/i,
  /perperson/i, /cabin/i, /stateroom/i, /suite/i,
];

const SEARCH_API_PATTERNS = [
  /search/i, /find/i, /lookup/i, /discover/i, /browse/i,
  /results/i, /listing/i, /cruise/i, /voyage/i, /sail/i,
  /destination/i, /itinerary/i, /port/i, /depart/i,
];

const BOOKING_API_PATTERNS = [
  /book/i, /reserve/i, /checkout/i, /cart/i, /order/i,
  /payment/i, /pay/i, /confirm/i, /redirect/i, /booknow/i,
];

const API_KEYWORDS = [
  '/api/', '/graphql', '.json', 'api.', 'search', 'cruise',
  'price', 'booking', 'voyage', 'sail', 'cabin',
];

// ============================================================
// NetworkInterceptor Class
// ============================================================

export class NetworkInterceptor {
  private config: Required<InterceptorConfig>;
  private requests: Map<string, InterceptedRequest> = new Map();
  private responses: Map<string, InterceptedResponse> = new Map();
  private apiCalls: APICall[] = [];
  private isActive: boolean = false;

  constructor(config: InterceptorConfig = {}) {
    this.config = {
      verbose: config.verbose ?? false,
      saveToDisk: config.saveToDisk ?? false,
      outputDir: config.outputDir || './output/intercepted',
      urlFilters: config.urlFilters || [],
      maxBodySize: config.maxBodySize || 500000, // 500KB max
    };

    if (this.config.saveToDisk) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  /**
   * Start intercepting network traffic on a page
   */
  async startInterception(page: Page): Promise<void> {
    if (this.isActive) {
      console.warn('[NetworkInterceptor] Already intercepting. Call stopInterception() first.');
      return;
    }

    this.isActive = true;
    console.log('[NetworkInterceptor] Starting network interception...');

    // Intercept requests
    await page.route('**/*', async (route: Route, request: Request) => {
      const url = request.url();
      const method = request.method();
      const resourceType = request.resourceType();
      const headers = request.headers();
      const postData = request.postData();

      // Only capture XHR, Fetch, and Document requests
      if (resourceType === 'xhr' || resourceType === 'fetch' || 
          resourceType === 'document' || resourceType === 'websocket') {
        
        const intercepted: InterceptedRequest = {
          url,
          method,
          resourceType,
          headers,
          postData: postData ? postData.substring(0, 5000) : null,
          timestamp: Date.now(),
        };

        this.requests.set(url + method, intercepted);

        if (this.config.verbose) {
          console.log(`[NetworkInterceptor] REQ: ${method} ${url.substring(0, 120)}`);
        }
      }

      await route.continue();
    });

    // Capture responses
    page.on('response', async (response: Response) => {
      const url = response.url();
      const status = response.status();
      const headers = response.headers();
      const contentType = headers['content-type'] || '';
      const startTime = this.requests.get(url + response.request().method())?.timestamp || Date.now();

      // Only capture API-like responses (JSON or API paths)
      if (this._isApiResponse(url, contentType, status)) {
        try {
          let body = '';
          try {
            // Try to get JSON body
            const json = await response.json();
            body = JSON.stringify(json);
          } catch {
            try {
              body = await response.text();
            } catch {
              body = `[Non-text response: ${contentType}]`;
            }
          }

          // Truncate if too large
          if (body.length > this.config.maxBodySize) {
            body = body.substring(0, this.config.maxBodySize) + '... [TRUNCATED]';
          }

          const intercepted: InterceptedResponse = {
            url,
            status,
            headers,
            contentType,
            body,
            timestamp: Date.now(),
            duration: Date.now() - startTime,
          };

          this.responses.set(url, intercepted);

          // Categorize the API call
          const apiCall = this._categorizeApiCall(response.request(), intercepted);
          this.apiCalls.push(apiCall);

          if (this.config.verbose) {
            console.log(`[NetworkInterceptor] RSP: ${status} ${url.substring(0, 120)} (${(body.length / 1024).toFixed(1)}KB)`);
          }

          // Save to disk if configured
          if (this.config.saveToDisk) {
            await this._savePayload(apiCall);
          }
        } catch (err: any) {
          if (this.config.verbose) {
            console.error(`[NetworkInterceptor] Error capturing response: ${url.substring(0, 80)} — ${err.message}`);
          }
        }
      }
    });

    console.log('[NetworkInterceptor] Network interception active');
  }

  /**
   * Stop intercepting network traffic
   */
  async stopInterception(page: Page): Promise<void> {
    if (!this.isActive) return;
    
    await page.unroute('**/*');
    this.isActive = false;
    console.log(`[NetworkInterceptor] Stopped. Captured ${this.apiCalls.length} API calls.`);
  }

  /**
   * Get all captured API calls
   */
  getApiCalls(): APICall[] {
    return [...this.apiCalls];
  }

  /**
   * Get price-related API calls
   */
  getPriceAPIs(): APICall[] {
    return this.apiCalls.filter(c => c.isPriceAPI);
  }

  /**
   * Get search-related API calls
   */
  getSearchAPIs(): APICall[] {
    return this.apiCalls.filter(c => c.isSearchAPI);
  }

  /**
   * Get booking-related API calls
   */
  getBookingAPIs(): APICall[] {
    return this.apiCalls.filter(c => c.isBookingAPI);
  }

  /**
   * Analyze all intercepted traffic and return structured analysis
   */
  analyze(): InterceptorAnalysis {
    const domains: Record<string, number> = {};
    const methods: Record<string, number> = {};
    const contentTypes: Record<string, number> = {};
    const endpoints: Set<string> = new Set();

    for (const call of this.apiCalls) {
      try {
        const urlObj = new URL(call.url);
        domains[urlObj.hostname] = (domains[urlObj.hostname] || 0) + 1;
        endpoints.add(call.url.replace(/\?.*$/, '').replace(/\/\d+/g, '/:id'));
      } catch {}
      methods[call.method] = (methods[call.method] || 0) + 1;
      contentTypes[call.responseContentType] = (contentTypes[call.responseContentType] || 0) + 1;
    }

    // Extract data payloads for schema inference
    const dataPayloads: Record<string, any> = {};
    for (const call of this.apiCalls) {
      if (call.responseBody) {
        try {
          const parsed = JSON.parse(call.responseBody);
          if (typeof parsed === 'object' && parsed !== null) {
            const key = call.url.replace(/\?.*$/, '').split('/').pop() || 'unknown';
            if (!dataPayloads[key]) {
              dataPayloads[key] = parsed;
            }
          }
        } catch {}
      }
    }

    return {
      totalRequests: this.requests.size,
      totalResponses: this.responses.size,
      apiCalls: this.apiCalls,
      priceAPIs: this.getPriceAPIs(),
      searchAPIs: this.getSearchAPIs(),
      bookingAPIs: this.getBookingAPIs(),
      uniqueEndpoints: [...endpoints].slice(0, 30),
      dataPayloads,
      summary: {
        domains,
        methods,
        contentTypes,
      },
    };
  }

  /**
   * Clear all captured data
   */
  clear(): void {
    this.requests.clear();
    this.responses.clear();
    this.apiCalls = [];
    console.log('[NetworkInterceptor] Cleared all captured data');
  }

  /**
   * Get statistics about intercepted traffic
   */
  getStats(): { totalRequests: number; totalResponses: number; apiCalls: number; priceAPIs: number; searchAPIs: number; bookingAPIs: number } {
    return {
      totalRequests: this.requests.size,
      totalResponses: this.responses.size,
      apiCalls: this.apiCalls.length,
      priceAPIs: this.getPriceAPIs().length,
      searchAPIs: this.getSearchAPIs().length,
      bookingAPIs: this.getBookingAPIs().length,
    };
  }

  // ============================================================
  // Private Helpers
  // ============================================================

  private _isApiResponse(url: string, contentType: string, status: number): boolean {
    if (status !== 200) return false;
    
    // Check content type for JSON
    if (contentType.includes('json') || contentType.includes('application/json')) {
      return true;
    }

    // Check URL for API keywords
    const urlLower = url.toLowerCase();
    for (const keyword of API_KEYWORDS) {
      if (urlLower.includes(keyword)) return true;
    }

    // Check custom filters
    for (const filter of this.config.urlFilters) {
      if (filter.test(url)) return true;
    }

    return false;
  }

  private _categorizeApiCall(request: Request, response: InterceptedResponse): APICall {
    const url = response.url;
    const urlLower = url.toLowerCase();

    const queryParams: Record<string, string[]> = {};
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.forEach((value, key) => {
        if (!queryParams[key]) queryParams[key] = [];
        queryParams[key].push(value);
      });
    } catch {}

    const isPriceAPI = PRICE_API_PATTERNS.some(p => p.test(urlLower));
    const isSearchAPI = SEARCH_API_PATTERNS.some(p => p.test(urlLower));
    const isBookingAPI = BOOKING_API_PATTERNS.some(p => p.test(urlLower));

    return {
      url,
      method: request.method(),
      resourceType: request.resourceType(),
      queryParams,
      requestHeaders: request.headers(),
      postData: request.postData()?.substring(0, 5000) || null,
      responseStatus: response.status,
      responseBody: response.body,
      responseContentType: response.contentType,
      timestamp: response.timestamp,
      duration: response.duration,
      isPriceAPI,
      isSearchAPI,
      isBookingAPI,
    };
  }

  private async _savePayload(call: APICall): Promise<void> {
    const timestamp = call.timestamp;
    const category = call.isPriceAPI ? 'price' : call.isSearchAPI ? 'search' : call.isBookingAPI ? 'booking' : 'other';
    let filename = '';
    
    try {
      const urlObj = new URL(call.url);
      const pathName = urlObj.pathname.replace(/\//g, '_').substring(0, 50);
      filename = `${timestamp}_${category}_${pathName}.json`;
    } catch {
      filename = `${timestamp}_${category}_unknown.json`;
    }

    const filepath = path.join(this.config.outputDir, filename);
    
    try {
      const payload = {
        url: call.url,
        method: call.method,
        timestamp: new Date(call.timestamp).toISOString(),
        queryParams: call.queryParams,
        responseBody: call.responseBody ? JSON.parse(call.responseBody) : null,
        responseStatus: call.responseStatus,
      };
      fs.writeFileSync(filepath, JSON.stringify(payload, null, 2));
    } catch (err: any) {
      // If JSON parse fails, save as text
      try {
        fs.writeFileSync(filepath.replace('.json', '.txt'), call.responseBody || '');
      } catch {}
    }
  }
}

/**
 * Create a pre-configured NetworkInterceptor for CruisePlum analysis
 */
export function createCruisePlumInterceptor(saveToDisk: boolean = true): NetworkInterceptor {
  return new NetworkInterceptor({
    verbose: true,
    saveToDisk,
    outputDir: './output/intercepted/cruiseplum',
    urlFilters: [
      /cruiseplum/i,
      /cruise/i,
      /price/i,
      /search/i,
      /api/i,
    ],
  });
}

export default NetworkInterceptor;
