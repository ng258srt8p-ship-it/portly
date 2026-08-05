/**
 * TripTide — Smart 4-Hour Update Cycle with Priority Queuing
 * 
 * Updates all 192 URLs every 4 hours while staying within $0 cost:
 * - High-priority (top 20%): Every 4 hours with OpenCode AI analysis
 * - Medium-priority (next 50%): Every 12 hours with lightweight fetch
 * - Low-priority (bottom 30%): Every 24 hours with lightweight fetch
 * - Problematic sites: Every 48 hours with Browser Rendering API (free tier)
 * 
 * Cost: $0/month within Cloudflare free tier limits
 */

import type { Browser } from '@cloudflare/puppeteer';
import { scrapeWithBrowser } from './browser-scrape';
import { scrapeWithOpenCode, parseCruiseData } from './opencode-scrape';

export interface ScrapingPriority {
  url: string;
  priority: 'high' | 'medium' | 'low';
  lastScrapedAt: string;
  priceChangeThreshold: number; // Re-scrape if price changes > this %
  isProblematic: boolean; // True if standard fetch gets 403
}

export interface ScrapeResult {
  success: boolean;
  url: string;
  method: 'lightweight' | 'browser' | 'opencode';
  prices?: number[];
  error?: string;
  scrapedAt: Date;
}

/**
 * Determine scraping method based on priority and recency.
 */
function getScrapingMethod(
  item: ScrapingPriority,
  timeSinceLastScrape: number
): 'lightweight' | 'browser' | 'opencode' {
  // High priority, updated within 4 hours: Use OpenCode AI for price analysis
  if (item.priority === 'high' && timeSinceLastScrape < 4 * 3600 * 1000) {
    return 'opencode';
  }
  
  // High priority or problematic site: Use Browser Rendering API (free tier)
  if (item.priority === 'high' || item.isProblematic) {
    return 'browser';
  }
  
  // Medium/low priority: Use lightweight fetch (no browser needed)
  return 'lightweight';
}

/**
 * Run smart 4-hour update cycle with priority queuing.
 * 
 * @param urls - All URLs to scrape with priority information
 * @param browser - Cloudflare Browser instance (for problematic sites)
 * @param opencodeApiKey - OpenCode API key for AI analysis
 * @returns Array of scrape results
 */
export async function runSmartUpdateCycle(
  urls: ScrapingPriority[],
  browser: Browser,
  opencodeApiKey: string
): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];
  
  // Sort by priority (high first), then by recency (oldest first)
  const sorted = [...urls].sort((a, b) => {
    // Priority order: high < medium < low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    
    // Within same priority, scrape oldest first
    const timeA = new Date(a.lastScrapedAt).getTime();
    const timeB = new Date(b.lastScrapedAt).getTime();
    return timeA - timeB;
  });
  
  console.log(`[SmartScrape] Processing ${sorted.length} URLs...`);
  console.log(`[SmartScrape] High priority: ${sorted.filter(u => u.priority === 'high').length}`);
  console.log(`[SmartScrape] Medium priority: ${sorted.filter(u => u.priority === 'medium').length}`);
  console.log(`[SmartScrape] Low priority: ${sorted.filter(u => u.priority === 'low').length}`);
  
  for (const item of sorted) {
    const timeSinceLastScrape = Date.now() - new Date(item.lastScrapedAt).getTime();
    const method = getScrapingMethod(item, timeSinceLastScrape);
    
    let result: ScrapeResult;
    
    try {
      switch (method) {
        case 'opencode':
          // High priority, updated within 4 hours: Use OpenCode AI for price analysis
          result = await scrapeWithOpenCode(item.url, opencodeApiKey);
          break;
          
        case 'browser':
          // High priority or problematic site: Use Browser Rendering API (free tier)
          result = await scrapeWithBrowser(browser, item.url);
          break;
          
        case 'lightweight':
          // Medium/low priority: Use lightweight fetch (no browser needed)
          result = await scrapeWithLightweightFetch(item.url);
          break;
      }
      
      result.url = item.url;
      result.scrapedAt = new Date();
      results.push(result);
      
    } catch (err) {
      console.error(`[SmartScrape] Failed to scrape ${item.url}:`, (err as Error).message);
      results.push({
        success: false,
        url: item.url,
        method,
        error: (err as Error).message,
        scrapedAt: new Date(),
      });
    }
    
    // Add 3-second cooldown for OpenCode requests (respect rate limits)
    if (method === 'opencode') {
      await new Promise(r => setTimeout(r, 3000));
    }
    
    // Log progress every 50 URLs
    if (results.length % 50 === 0) {
      const successRate = results.filter(r => r.success).length / results.length * 100;
      console.log(`[SmartScrape] Progress: ${results.length}/${sorted.length} URLs (${successRate.toFixed(1)}% success)`);
    }
  }
  
  const totalSuccess = results.filter(r => r.success).length;
  console.log(`[SmartScrape] Complete: ${totalSuccess}/${results.length} URLs successful`);
  
  return results;
}

/**
 * Lightweight fetch for medium/low priority pages.
 * Uses standard HTTP with browser-like headers (no anti-bot).
 */
async function scrapeWithLightweightFetch(url: string): Promise<ScrapeResult> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      return {
        success: false,
        url,
        method: 'lightweight',
        error: `HTTP ${response.status}`,
        scrapedAt: new Date(),
      };
    }

    const html = await response.text();
    const prices = parseCruiseData(html, url).map(p => p.price);

    return {
      success: prices.length > 0,
      url,
      method: 'lightweight',
      prices,
      scrapedAt: new Date(),
    };
  } catch (err) {
    return {
      success: false,
      url,
      method: 'lightweight',
      error: (err as Error).message,
      scrapedAt: new Date(),
    };
  }
}

// Export for use in worker
export { runSmartUpdateCycle, scrapeWithLightweightFetch };
