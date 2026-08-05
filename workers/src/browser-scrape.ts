/**
 * DEPRECATED — Superseded by scheduled-scrape.ts (2026-08-05)
 * This file referenced @cloudflare/puppeteer which is not installed.
 * It was never wired into the worker. Uses Jina Reader instead.
 * 
 * This is a one-time cost to populate the database, then we cache results.
 */

import type { Browser } from '@cloudflare/puppeteer';

interface ScrapeResult {
  success: boolean;
  html?: string;
  error?: string;
}

/**
 * Scrape a URL using Cloudflare Browser Rendering API.
 * This bypasses Cloudflare, Akamai, and other WAFs by using real Chromium.
 */
export async function scrapeWithBrowser(
  browser: Browser,
  url: string,
  timeoutMs: number = 30000
): Promise<ScrapeResult> {
  try {
    const page = await browser.newPage();
    
    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to URL with timeout
    const response = await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: timeoutMs 
    });

    if (!response) {
      return { success: false, error: 'No response' };
    }

    if (response.status() !== 200) {
      return { success: false, error: `HTTP ${response.status()}` };
    }

    // Get page content
    const html = await page.content();
    
    // Close page (browser stays open for reuse)
    await page.close();

    return { success: true, html };
  } catch (err) {
    return { 
      success: false, 
      error: (err as Error).message 
    };
  }
}

/**
 * Parse cruise line data from HTML.
 */
export function parseCruiseData(html: string, url: string): any[] {
  const results: any[] = [];
  
  // Extract ship names (common patterns)
  const shipPatterns = [
    /(?:ship|vessel|cruise)\s+(?:on\s+)?([A-Z][a-zA-Z\s]+)(?:\s+-|\s+from|\s+cruise)/i,
    /([A-Z][a-z]+\s+of\s+the\s+Seas)/i,
    /([A-Z][a-z]+\s+Carnival)/i,
  ];
  
  let shipName: string | undefined;
  for (const pattern of shipPatterns) {
    const match = html.match(pattern);
    if (match) {
      shipName = match[1].trim();
      break;
    }
  }
  
  if (!shipName) return results;
  
  // Extract prices (all dollar amounts)
  const priceMatches = html.match(/\$[\d,]+/g) || [];
  if (priceMatches.length === 0) return results;
  
  // Extract dates
  const datePatterns = [
    /(\w+\s+\d{1,2},\s+\d{4})/,
    /(\d{4}-\d{2}-\d{2})/,
  ];
  
  let sailDate: string | undefined;
  for (const pattern of datePatterns) {
    const match = html.match(pattern);
    if (match) {
      sailDate = match[1];
      break;
    }
  }
  
  if (!sailDate) return results;
  
  // Extract departure port
  const portPatterns = [
    /from\s+([A-Z][a-zA-Z\s]+)/i,
    /departing?\s+from\s+([A-Z][a-zA-Z\s]+)/i,
  ];
  
  let departurePort: string | undefined;
  for (const pattern of portPatterns) {
    const match = html.match(pattern);
    if (match) {
      departurePort = match[1].trim();
      break;
    }
  }
  
  if (!departurePort) departurePort = 'Unknown';
  
  // Create results
  for (const priceStr of priceMatches) {
    const price = parseInt(priceStr.replace(/[$,]/g, ''), 10);
    if (price > 0 && price < 100000) {
      results.push({
        ship: shipName,
        price,
        sailDate,
        departurePort,
        url,
      });
    }
  }
  
  return results;
}

// Export for use in worker
export { scrapeWithBrowser, parseCruiseData };
