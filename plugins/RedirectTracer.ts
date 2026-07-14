/**
 * RedirectTracer — Affiliate link tracker
 * 
 * Intercepts clicking actions on outbound booking options and follows
 * HTTP 301/302 redirects recursively, capturing every intermediary URL
 * to parse out affiliate tracking variables.
 * 
 * Identifies: affiliate_id, subID, utm_source, partner_id, click_id,
 * and other tracking parameters used by major affiliate networks.
 */

import { Page } from 'playwright';

// ============================================================
// Types
// ============================================================

export interface RedirectHop {
  from: string;
  to: string;
  statusCode: number;
  headers: Record<string, string>;
  timestamp: number;
}

export interface TracedLink {
  originalUrl: string;
  finalUrl: string;
  redirectChain: RedirectHop[];
  totalHops: number;
  totalDurationMs: number;
  affiliateNetwork: string | null;
  trackingParams: Record<string, string>;
  isAffiliate: boolean;
  isTravelTech: boolean;
  detectedNetworks: string[];
  error?: string;
}

export interface RedirectTraceResult {
  totalTraced: number;
  successfulTraces: number;
  failedTraces: number;
  traces: TracedLink[];
  aggregateAnalysis: {
    affiliateNetworksFound: string[];
    trackingParamsFound: string[];
    travelTechFound: string[];
    uniqueDomains: string[];
  };
}

// ============================================================
// Affiliate Network Detection
// ============================================================

const AFFILIATE_NETWORKS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /impact-radius\.com/i, name: 'Impact Radius' },
  { pattern: /impact\.com/i, name: 'Impact' },
  { pattern: /tkqlhce\.com/i, name: 'Impact Radius' },
  { pattern: /cj\.com/i, name: 'CJ Affiliate' },
  { pattern: /awin1\.com/i, name: 'Awin' },
  { pattern: /rakutenadvertising\.com/i, name: 'Rakuten' },
  { pattern: /shareasale\.com/i, name: 'ShareASale' },
  { pattern: /clickbank\.com/i, name: 'ClickBank' },
  { pattern: /travelpayouts\.com/i, name: 'Travelpayouts' },
  { pattern: /payouts\.com/i, name: 'Travelpayouts' },
  { pattern: /partner-?boost/i, name: 'PartnerBoost' },
  { pattern: /pntra\.com/i, name: 'Pntra' },
  { pattern: /prf\.hn/i, name: 'PRF.HN' },
  { pattern: /viglink\.com/i, name: 'VigLink' },
  { pattern: /skimlinks\.com/i, name: 'Skimlinks' },
  { pattern: /skimresources\.com/i, name: 'Skimlinks' },
  { pattern: /refersion\.com/i, name: 'Refersion' },
  { pattern: /firstpromoter\.com/i, name: 'FirstPromoter' },
  { pattern: /postaffiliatepro\.com/i, name: 'Post Affiliate Pro' },
  { pattern: /hasoffers/i, name: 'HasOffers/TUNE' },
  { pattern: /cake\.com/i, name: 'CAKE' },
  { pattern: /everflow\.io/i, name: 'Everflow' },
  { pattern: /partnerstack\.com/i, name: 'PartnerStack' },
  { pattern: /tapfiliate\.com/i, name: 'Tapfiliate' },
  { pattern: /commissionfactory\.com/i, name: 'Commission Factory' },
  { pattern: /adcell\.com/i, name: 'ADCELL' },
  { pattern: /tradedoubler\.com/i, name: 'TradeDoubler' },
  { pattern: /webgains\.com/i, name: 'Webgains' },
  { pattern: /zanox\.com/i, name: 'Zanox/Affilinet' },
];

const TRAVEL_TECH_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /sabre/i, name: 'Sabre' },
  { pattern: /amadeus/i, name: 'Amadeus' },
  { pattern: /travelport/i, name: 'Travelport' },
  { pattern: /galileo/i, name: 'Galileo' },
  { pattern: /apollo/i, name: 'Apollo GDS' },
  { pattern: /worldspan/i, name: 'Worldspan' },
  { pattern: /hotelbeds/i, name: 'Hotelbeds' },
  { pattern: /tourico/i, name: 'Tourico' },
  { pattern: /expedia/i, name: 'Expedia Group' },
  { pattern: /booking\.com/i, name: 'Booking Holdings' },
  { pattern: /priceline/i, name: 'Priceline' },
  { pattern: /travel\.com/i, name: 'Travel.com' },
  { pattern: /cruise\.com/i, name: 'Cruise.com' },
  { pattern: /vacationstogo/i, name: 'Vacations To Go' },
  { pattern: /cruisecritic/i, name: 'Cruise Critic' },
  { pattern: /icruise\.com/i, name: 'iCruise' },
  { pattern: /cruiseplanners/i, name: 'Cruise Planners' },
];

const TRACKING_PARAMS = [
  'affiliate_id', 'aff_id', 'affiliateId', 'affiliateid', 'affid', 'aid',
  'sub_id', 'subid', 'subId', 'sid', 's_id',
  'click_id', 'clickid', 'clickId', 'cid',
  'partner_id', 'partnerId', 'partnerid', 'pid', 'p_id',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'ref', 'referrer', 'referral', 'source',
  'campaign_id', 'campaignid', 'camp', 'c_id',
  'site_id', 'siteid', 'si',
  'ad_id', 'adid', 'ad',
  'pub_id', 'pubid', 'publisher',
  'transaction_id', 'trans_id', 'txn_id',
  'token', 'key', 'sig', 'hash',
  'a_aid', 'a_bid', 'a_cid', 'b_aid', 'b_bid',
  'redirect', 'to', 'url', 'target', 'rurl', 'ru', 'goto',
  'data', 'eid', 'mid', 'lid', 'listing_id',
  'agent_id', 'agency_id', 'host_id',
  'promo', 'promo_code', 'coupon', 'code',
  'offer_id', 'offerid', 'oid',
];

// ============================================================
// RedirectTracer Class
// ============================================================

export class RedirectTracer {
  private traces: TracedLink[] = [];
  private activeTraces: Map<string, TracedLink> = new Map();

  /**
   * Trace the redirect chain of a single URL by clicking it in the browser
   */
  async traceUrl(page: Page, url: string): Promise<TracedLink> {
    const redirectChain: RedirectHop[] = [];
    const startTime = Date.now();
    let finalUrl = url;
    let detectedNetworks: string[] = [];
    let error: string | undefined;

    // Listen for redirect responses
    const responseHandler = async (response: any) => {
      const status = response.status();
      const headers = response.headers();
      const respUrl = response.url();

      if (status >= 300 && status < 400) {
        const location = headers['location'] || 'unknown';
        const hop: RedirectHop = {
          from: respUrl,
          to: location,
          statusCode: status,
          headers,
          timestamp: Date.now(),
        };
        redirectChain.push(hop);
        
        // Detect affiliate networks in this hop
        const networks = this._detectNetworks(location);
        detectedNetworks.push(...networks);
        
        console.log(`[RedirectTracer] ${status} redirect: ${respUrl.substring(0, 60)} → ${location.substring(0, 60)}`);
      }

      finalUrl = respUrl;
    };

    page.on('response', responseHandler);

    try {
      // Navigate to the URL — this will follow all redirects automatically
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      
      finalUrl = page.url();
      
      // Also extract tracking params from final URL
      const trackingParams = this._extractTrackingParams(finalUrl);
      
      // Process redirect chain
      const cleanedDetectedNetworks = [...new Set(detectedNetworks)];
      const affiliateNetwork = this._identifyPrimaryNetwork(cleanedDetectedNetworks);
      const travelTech = this._detectTravelTech(finalUrl);

      const trace: TracedLink = {
        originalUrl: url,
        finalUrl,
        redirectChain,
        totalHops: redirectChain.length,
        totalDurationMs: Date.now() - startTime,
        affiliateNetwork,
        trackingParams,
        isAffiliate: cleanedDetectedNetworks.length > 0,
        isTravelTech: travelTech.length > 0,
        detectedNetworks: cleanedDetectedNetworks,
      };

      this.traces.push(trace);
      return trace;

    } catch (err: any) {
      error = err.message;
      
      const trace: TracedLink = {
        originalUrl: url,
        finalUrl,
        redirectChain,
        totalHops: redirectChain.length,
        totalDurationMs: Date.now() - startTime,
        affiliateNetwork: null,
        trackingParams: {},
        isAffiliate: false,
        isTravelTech: false,
        detectedNetworks: [],
        error,
      };
      
      this.traces.push(trace);
      return trace;
      
    } finally {
      page.removeListener('response', responseHandler);
    }
  }

  /**
   * Batch trace multiple URLs
   */
  async traceMultiple(page: Page, urls: string[], concurrency: number = 3): Promise<RedirectTraceResult> {
    console.log(`[RedirectTracer] Tracing ${urls.length} URLs (concurrency: ${concurrency})...`);
    
    const results: TracedLink[] = [];
    
    // Process in batches
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(url => this.traceUrl(page, url).catch(err => ({
          originalUrl: url,
          finalUrl: url,
          redirectChain: [],
          totalHops: 0,
          totalDurationMs: 0,
          affiliateNetwork: null,
          trackingParams: {},
          isAffiliate: false,
          isTravelTech: false,
          detectedNetworks: [],
          error: err.message,
        } as TracedLink)))
      );
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + concurrency < urls.length) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    return this._aggregateResults(results);
  }

  /**
   * Extract affiliate/booking links from a page and trace them
   */
  async traceOutboundLinks(page: Page, domainFilter?: string): Promise<RedirectTraceResult> {
    console.log('[RedirectTracer] Extracting outbound links...');
    
    // Get all links from the page
    const links = await page.evaluate((domainFilter?: string) => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({
          text: (a.textContent || '').trim().substring(0, 100),
          href: (a as HTMLAnchorElement).href,
        }))
        .filter(link => {
          if (!link.href || link.href.startsWith('javascript:') || link.href.startsWith('#')) return false;
          if (domainFilter && link.href.includes(domainFilter)) return false;
          return true;
        });
    }, domainFilter);

    // Filter for potential booking/affiliate links
    const bookingKeywords = ['book', 'price', 'deal', 'view', 'check', 'buy', 'reserve', 'quote', 'offer'];
    const potentialAffiliateLinks = links.filter(link => {
      const text = link.text.toLowerCase();
      const href = link.href.toLowerCase();
      return bookingKeywords.some(kw => text.includes(kw)) || 
             this._looksLikeAffiliateUrl(link.href);
    });

    console.log(`[RedirectTracer] Found ${potentialAffiliateLinks.length} potential affiliate links out of ${links.length} total links`);

    // Take top 20 links to trace
    const urlsToTrace = potentialAffiliateLinks.slice(0, 20).map(l => l.href);

    if (urlsToTrace.length === 0) {
      return {
        totalTraced: 0,
        successfulTraces: 0,
        failedTraces: 0,
        traces: [],
        aggregateAnalysis: {
          affiliateNetworksFound: [],
          trackingParamsFound: [],
          travelTechFound: [],
          uniqueDomains: [],
        },
      };
    }

    return await this.traceMultiple(page, urlsToTrace, 3);
  }

  /**
   * Get all traces collected so far
   */
  getTraces(): TracedLink[] {
    return [...this.traces];
  }

  /**
   * Clear all traces
   */
  clear(): void {
    this.traces = [];
    this.activeTraces.clear();
  }

  // ============================================================
  // Private Helpers
  // ============================================================

  private _detectNetworks(url: string): string[] {
    const detected: string[] = [];
    for (const { pattern, name } of AFFILIATE_NETWORKS) {
      if (pattern.test(url)) {
        detected.push(name);
      }
    }
    return detected;
  }

  private _detectTravelTech(url: string): string[] {
    const detected: string[] = [];
    for (const { pattern, name } of TRAVEL_TECH_PATTERNS) {
      if (pattern.test(url)) {
        detected.push(name);
      }
    }
    return detected;
  }

  private _extractTrackingParams(url: string): Record<string, string> {
    const params: Record<string, string> = {};
    try {
      const urlObj = new URL(url);
      for (const [key, value] of urlObj.searchParams.entries()) {
        const keyLower = key.toLowerCase();
        for (const trackingParam of TRACKING_PARAMS) {
          if (keyLower === trackingParam || keyLower.includes(trackingParam)) {
            params[key] = value;
            break;
          }
        }
      }
    } catch {}
    return params;
  }

  private _identifyPrimaryNetwork(networks: string[]): string | null {
    if (networks.length === 0) return null;
    // Return the most specific/well-known network
    const priority = ['Impact Radius', 'CJ Affiliate', 'Awin', 'Rakuten', 'ShareASale', 'Travelpayouts'];
    for (const p of priority) {
      if (networks.includes(p)) return p;
    }
    return networks[0];
  }

  private _looksLikeAffiliateUrl(url: string): boolean {
    const urlLower = url.toLowerCase();
    
    // Check for affiliate network domains
    for (const { pattern } of AFFILIATE_NETWORKS) {
      if (pattern.test(urlLower)) return true;
    }

    // Check for tracking parameters
    for (const param of TRACKING_PARAMS) {
      const regex = new RegExp(`[?&]${param}=`, 'i');
      if (regex.test(urlLower)) return true;
    }

    // Check for common redirect patterns
    if (urlLower.includes('/redirect?') || urlLower.includes('/out?') || 
        urlLower.includes('/go?') || urlLower.includes('/click?') ||
        urlLower.includes('/link?') || urlLower.includes('/track?')) {
      return true;
    }

    return false;
  }

  private _aggregateResults(traces: TracedLink[]): RedirectTraceResult {
    const successful = traces.filter(t => !t.error);
    const failed = traces.filter(t => t.error);
    
    const affiliateNetworks = new Set<string>();
    const trackingParams = new Set<string>();
    const travelTech = new Set<string>();
    const domains = new Set<string>();

    for (const trace of successful) {
      trace.detectedNetworks.forEach(n => affiliateNetworks.add(n));
      Object.keys(trace.trackingParams).forEach(p => trackingParams.add(p));
      
      // Detect travel tech in final URL
      const tech = this._detectTravelTech(trace.finalUrl);
      tech.forEach(t => travelTech.add(t));

      try {
        const domain = new URL(trace.finalUrl).hostname;
        domains.add(domain);
      } catch {}
    }

    return {
      totalTraced: traces.length,
      successfulTraces: successful.length,
      failedTraces: failed.length,
      traces,
      aggregateAnalysis: {
        affiliateNetworksFound: [...affiliateNetworks],
        trackingParamsFound: [...trackingParams],
        travelTechFound: [...travelTech],
        uniqueDomains: [...domains],
      },
    };
  }
}

/**
 * Create a pre-configured RedirectTracer
 */
export function createRedirectTracer(): RedirectTracer {
  return new RedirectTracer();
}

export default RedirectTracer;
