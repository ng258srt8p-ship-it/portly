/**
 * TripTide — Jina AI Reader Integration
 * 
 * Free, unlimited web scraping via Jina AI's reader service.
 * No API key required. No rate limits (as of 2026-07).
 * 
 * Usage:
 *   const jina = new JinaReader();
 *   const data = await jina.scrape('https://www.royalcaribbean.com/...');
 * 
 * Service: https://jina.ai/reader
 * Docs: https://jina.ai/reader
 */

export interface JinaScrapeResult {
  title: string;
  url: string;
  markdown: string;
  prices: string[];
  shipName?: string;
  sailDate?: string;
  itinerary?: string[];
}

export class JinaReader {
  private baseUrl = 'https://r.jina.ai';

  /**
   * Scrape any URL and get clean markdown + extracted data.
   */
  async scrape(url: string): Promise<JinaScrapeResult> {
    const jinaUrl = `${this.baseUrl}/${url}`;
    
    console.log(`[Jina] Scraping: ${url}`);
    
    // Rotate User-Agents to avoid blocking
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'TripTide Bot/1.0 (compatible; cruise data aggregator)',
    ];
    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    const res = await fetch(jinaUrl, {
      headers: {
        'X-No-Cache': 'true',
        'User-Agent': randomUA,
        'Accept': 'application/json, text/plain',
      }
    });

    if (!res.ok) {
      throw new Error(`Jina Reader failed: HTTP ${res.status}`);
    }

    const text = await res.text();
    
    // Parse metadata from Jina's output format
    const titleMatch = text.match(/Title:\s*(.+?)(?=\n)/);
    const urlMatch = text.match(/URL Source:\s*(.+?)(?=\n)/);
    const title = titleMatch ? titleMatch[1].trim() : 'Unknown';
    const sourceUrl = urlMatch ? urlMatch[1].trim() : url;
    
    // Extract prices
    const prices = text.match(/\$[\d,]+/g) || [];
    
    // Try to extract ship name (common patterns)
    const shipPatterns = [
      /(?:ship|vessel|cruise)\s+(?:on\s+)?([A-Z][a-zA-Z\s]+)(?:\s+-|\s+from|\s+cruise)/i,
      /([A-Z][a-z]+\s+of\s+the\s+Seas)/i,
      /([A-Z][a-z]+\s+Carnival)/i,
    ];
    let shipName: string | undefined;
    for (const pattern of shipPatterns) {
      const match = text.match(pattern);
      if (match) {
        shipName = match[1].trim();
        break;
      }
    }
    
    // Try to extract sail date
    const datePatterns = [
      /(\w+\s+\d{1,2},\s+\d{4})/,
      /(\d{4}-\d{2}-\d{2})/,
      /(\w+\s+\d{4})/
    ];
    let sailDate: string | undefined;
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        sailDate = match[1];
        break;
      }
    }
    
    // Try to extract itinerary (ports list)
    const portPattern = /ports?:?\s*[:\-]?\s*([^\n]+)/i;
    const portsMatch = text.match(portPattern);
    let itinerary: string[] | undefined;
    if (portsMatch) {
      itinerary = portsMatch[1]
        .split(/[,;•-]/)
        .map(p => p.trim())
        .filter(p => p.length > 2);
    }

    return {
      title,
      url: sourceUrl,
      markdown: text,
      prices,
      shipName,
      sailDate,
      itinerary,
    };
  }

  /**
   * Batch scrape multiple URLs (with simple rate limiting).
   */
  async batchScrape(urls: string[], delayMs: number = 500): Promise<JinaScrapeResult[]> {
    const results: JinaScrapeResult[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.scrape(url);
        results.push(result);
        
        if (delayMs > 0 && urls.indexOf(url) < urls.length - 1) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      } catch (err) {
        console.error(`[Jina] Failed to scrape ${url}:`, (err as Error).message);
        results.push({
          title: 'Error',
          url,
          markdown: '',
          prices: [],
        });
      }
    }
    
    return results;
  }
}

export default JinaReader;