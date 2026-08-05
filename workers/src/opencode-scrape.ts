/**
 * DEPRECATED — Superseded by scheduled-scrape.ts (2026-08-05)
 * This file referenced a non-existent endpoint (YOUR_WORKER_URL/zen).
 * It was never wired into the worker. Uses Jina Reader instead.
 * 
 * Cost: $0 (free tier)
 */

export interface ScrapeResult {
  success: boolean;
  url: string;
  method: 'opencode';
  prices?: number[];
  error?: string;
}

/**
 * Scrape a URL using OpenCode free model with 3-second cooldown.
 */
export async function scrapeWithOpenCode(
  url: string,
  opencodeApiKey: string
): Promise<ScrapeResult> {
  try {
    const response = await fetch('https://YOUR_WORKER_URL/zen', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${opencodeApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        model: 'minimax-m2.5-free',
        messages: [{ role: 'user', content: `Extract cruise data from: ${url}` }]
      }),
    });

    if (!response.ok) {
      return { 
        success: false, 
        url, 
        method: 'opencode',
        error: `HTTP ${response.status}` 
      };
    }

    const data = await response.json();
    const html = data.choices?.[0]?.message?.content || '';
    const prices = parseCruiseData(html, url).map(p => p.price);

    return { 
      success: prices.length > 0,
      url,
      method: 'opencode',
      prices,
    };
  } catch (err) {
    return { 
      success: false, 
      url, 
      method: 'opencode',
      error: (err as Error).message 
    };
  }
}

/**
 * Parse cruise data from HTML using regex patterns.
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
export { scrapeWithOpenCode, parseCruiseData };
