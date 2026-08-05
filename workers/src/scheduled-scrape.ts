/**
 * TripTide — Scheduled Cruise Data Scraper (Jina Reader)
 * 
 * Cloudflare Worker cron handler that runs every 4 hours.
 * Scrapes real cruise data from actual cruise line websites using Jina Reader.
 * Feeds results into D1 via ingestRealSailing.
 * 
 * Cost: $0 (Jina Reader is free, no API key required)
 * Frequency: Every 4 hours via Cloudflare Worker cron trigger
 * 
 * Cron schedule: every 4 hours (configured in wrangler.toml)
 */

import { getAllScrapeUrls } from '../../server/services/cruiseLineConfig';
import { JinaReader } from '../../server/services/jinaReader';
import { ingestRealSailing, type RealSailingPayload } from './real-ingest';

// ── Parsing helpers — extract structured sailing data from Jina markdown ──────

/**
 * Parse a sail date string into ISO-8601 YYYY-MM-DD format.
 * Handles: "September 1, 2026", "2026-09-01", "Sep 1 2026", etc.
 */
function parseSailDate(raw: string): string | null {
  const trimmed = raw.trim();
  
  // Already ISO-8601
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  
  // "Month D, YYYY" or "Month D YYYY" (e.g., "September 1, 2026")
  const monthNames: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
    jan: '01', feb: '02', mar: '03', apr: '04',
    jun: '06', jul: '07', aug: '08',
    sep: '09', oct: '10', nov: '11', dec: '12',
  };
  
  // Pattern: "Month D, YYYY" or "Month D YYYY"
  const match1 = trimmed.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (match1) {
    const month = monthNames[match1[1].toLowerCase()];
    const day = match1[2].padStart(2, '0');
    return `${match1[3]}-${month}-${day}`;
  }
  
  // Pattern: "D Month YYYY" (e.g., "1 September 2026")
  const match2 = trimmed.match(/(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i);
  if (match2) {
    const month = monthNames[match2[2].toLowerCase()];
    const day = match2[1].padStart(2, '0');
    return `${match2[3]}-${month}-${day}`;
  }
  
  return null;
}

/**
 * Extract all dollar prices from text.
 */
function extractPrices(text: string): number[] {
  const matches = text.match(/\$[\d,]+/g) || [];
  return matches
    .map(p => parseInt(p.replace(/[$,]/g, ''), 10))
    .filter(p => p > 0 && p < 100000);
}

/**
 * Extract ship name from markdown text using multiple heuristics.
 */
function extractShipName(markdown: string, url: string): string | null {
  // Check URL path for ship name (most reliable signal)
  const urlShip = extractShipFromUrl(url);
  if (urlShip) return urlShip;
  
  // Check for "of the Seas" patterns (Royal Caribbean)
  const ofTheSeas = markdown.match(/([A-Z][a-z]+\s+of\s+the\s+Seas)/i);
  if (ofTheSeas) return ofTheSeas[1];
  
  // Check for "[Ship] [Cruise Line]" patterns
  const namedShip = markdown.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(Carnival|Royal Caribbean|Norwegian|MSC|Celebrity|Princess|Disney|Viking|Cunard|Seabourn)/i);
  if (namedShip) return namedShip[1];
  
  // Check for "Carnival [Name]" patterns
  const carnivalShip = markdown.match(/Carnival\s+([A-Z][a-z]+)/i);
  if (carnivalShip) return `Carnival ${carnivalShip[1]}`;
  
  // Check for "Norwegian [Name]" patterns
  const nclShip = markdown.match(/Norwegian\s+([A-Z][a-z]+)/i);
  if (nclShip) return `Norwegian ${nclShip[1]}`;
  
  // Check for "MSC [Name]" patterns
  const mscShip = markdown.match(/MSC\s+([A-Z][a-z]+)/i);
  if (mscShip) return `MSC ${mscShip[1]}`;
  
  // Check for "Disney [Name]" patterns
  const disneyShip = markdown.match(/Disney\s+([A-Z][a-z]+)/i);
  if (disneyShip) return `Disney ${disneyShip[1]}`;
  
  // Check for "Queen [Name]" patterns (Cunard)
  const queenShip = markdown.match(/Queen\s+[A-Z][a-z]+/i);
  if (queenShip) return queenShip[0];
  
  // Check for "Oasis-class" or "Icon-class" mentions near ship names
  const megaShip = markdown.match(/([A-Z][a-z]+\s+of\s+the\s+Seas|[A-Z][a-z]+\s+[A-Z][a-z]+)/g);
  if (megaShip && megaShip.length > 0) {
    // Return the longest plausible ship name
    return megaShip.sort((a, b) => b.length - a.length)[0] || null;
  }
  
  return null;
}

/**
 * Extract ship name from URL path.
 */
function extractShipFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    
    // Royal Caribbean: /cruises/wonder-of-the-seas
    const rocMatch = path.match(/\/cruises\/([a-z-]+(?:ofthe)?[a-z-]*)/);
    if (rocMatch) {
      const name = rocMatch[1]
        .replace(/ofthe/g, ' of the')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
      if (name.split(' ').length >= 2) return name;
    }
    
    // Carnival: /cruises/carnival-splendor
    const carnivalMatch = path.match(/\/cruises\/carnival-([a-z-]+)/);
    if (carnivalMatch) return `Carnival ${carnivalMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`;
    
    // NCL: /cruises/norwegian-escape
    const nclMatch = path.match(/\/cruises\/norwegian-([a-z-]+)/);
    if (nclMatch) return `Norwegian ${nclMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`;
    
    // MSC: /msc-[a-z]+-sailing-dates
    const mscMatch = path.match(/\/(msc-[a-z]+)/);
    if (mscMatch) return `MSC ${mscMatch[1].split('-').slice(1).join(' ')}`;
    
    // Celebrity: /cruises/celebrity-[a-z]+
    const celebMatch = path.match(/\/cruises\/celebrity-([a-z]+)/);
    if (celebMatch) return `Celebrity ${celebMatch[1].replace(/\b\w/g, c => c.toUpperCase())}`;
    
    // Disney: /cruise/[a-z]+
    const disneyMatch = path.match(/\/cruise\/([a-z]+)/);
    if (disneyMatch) return `Disney ${disneyMatch[1].replace(/\b\w/g, c => c.toUpperCase())}`;
    
    // Princess: generic — return null (will use URL-based fallback)
  } catch {
    // Invalid URL, skip
  }
  
  return null;
}

/**
 * Extract departure port from markdown text.
 */
function extractDeparturePort(markdown: string): string | null {
  // Look for "from [Port]" or "departing from [Port]" patterns
  const fromMatch = markdown.match(/(?:from|departing\s+from)\s+([A-Z][a-zA-Z\s]+?)(?:\s+(?:to|—|-|\,|\)))?/i);
  if (fromMatch) {
    const port = fromMatch[1].trim();
    if (port.length > 2 && port.length < 50) return port;
  }
  
  // Look for "Departure:" or "Port of Departure:" patterns
  const departMatch = markdown.match(/(?:departure|port\s+of\s+departure)\s*[:\-]\s*([A-Z][a-zA-Z\s]+)/i);
  if (departMatch) return departMatch[1].trim();
  
  // Look for common port city names in context
  const commonPorts = [
    'Miami', 'Port Canaveral', 'Fort Lauderdale', 'New York', 'Boston',
    'San Juan', 'Norfolk', 'Tampa', 'Galveston', 'Los Angeles',
    'San Diego', 'Seattle', 'Portland', 'Vancouver', 'San Francisco',
    'Southampton', 'London', 'Liverpool', 'Bristol', 'Plymouth',
    'Barcelona', 'Rome', 'Civitavecchia', 'Naples', 'Venice',
    'Marseille', 'Nice', 'Monte Carlo', 'Palma de Mallorca',
    'Athens', 'Istanbul', 'Valencia', 'Malaga', 'Dubrovnik',
    'Copenhagen', 'Stockholm', 'Helsinki', 'Oslo', 'Bergen',
    'Auckland', 'Sydney', 'Melbourne', 'Brisbane', 'Perth',
    'Tokyo', 'Yokohama', 'Osaka', 'Shanghai', 'Hong Kong',
    'Singapore', 'Bali', 'Fiji', 'Auckland', 'Wellington',
  ];
  
  // Find the first common port that appears in a departure context
  for (const port of commonPorts) {
    const regex = new RegExp(`(?:from|departing|departure|port)\\s*(?:of\\s*)?${port.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    if (regex.test(markdown)) return port;
  }
  
  return null;
}

/**
 * Extract itinerary (list of ports) from markdown text.
 */
function extractItinerary(markdown: string, departurePort?: string): string[] {
  const itinerary: string[] = [];
  
  // Look for "Ports:" or "Itinerary:" sections
  const portsSection = markdown.match(/(?:ports?|itinerary|route)\s*[:\-]\s*\n([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+\s[:\-]|\Z)/i);
  if (portsSection) {
    const ports = portsSection[1]
      .split(/[,;•·\n]/)
      .map(p => p.trim())
      .filter(p => p.length > 2 && !p.startsWith('$'));
    if (ports.length >= 2) {
      itinerary.push(...ports);
    }
  }
  
  // Look for "Day N: [Port]" patterns
  const dayPatterns = markdown.match(/(?:day|dayer)\s+(\d+)\s*[:\-]\s*([A-Z][a-zA-Z\s]+)/gi) || [];
  for (const match of dayPatterns) {
    const portMatch = match.match(/:(?:\s*)([A-Z][a-zA-Z\s]+)/);
    if (portMatch) {
      const port = portMatch[1].trim();
      if (port.length > 2 && !itinerary.includes(port)) {
        itinerary.push(port);
      }
    }
  }
  
  // If we have a departure port, ensure it's first and last (round trip)
  if (departurePort && itinerary.length > 0) {
    // Remove departure port from middle if present
    const idx = itinerary.indexOf(departurePort);
    if (idx > 0) itinerary.splice(idx, 1);
    // Add it back at the start if not there
    if (itinerary[0] !== departurePort) {
      itinerary.unshift(departurePort);
    }
    // Add it back at the end if not there (round trip)
    if (itinerary[itinerary.length - 1] !== departurePort && itinerary.length > 1) {
      itinerary.push(departurePort);
    }
  }
  
  return itinerary.length >= 2 ? itinerary : [];
}

/**
 * Determine cruise line from URL.
 */
function cruiseLineFromUrl(url: string): string {
  if (url.includes('carnival.com')) return 'Carnival';
  if (url.includes('royalcaribbean.com')) return 'Royal Caribbean';
  if (url.includes('/ncl.com')) return 'Norwegian Cruise Line';
  if (url.includes('msccruises.com')) return 'MSC Cruises';
  if (url.includes('celebrity.com')) return 'Celebrity Cruises';
  if (url.includes('princess.com')) return 'Princess Cruises';
  if (url.includes('disney') || url.includes('disneycruise')) return 'Disney Cruise Line';
  if (url.includes('viking.com')) return 'Viking Cruises';
  if (url.includes('cunard.com')) return 'Cunard Line';
  if (url.includes('seabourn.com')) return 'Seabourn Cruise Line';
  if (url.includes('silversea.com')) return 'Silversea Cruises';
  if (url.includes('sevenseas.com')) return 'Regent Seven Seas Cruises';
  if (url.includes('windstarcruises.com')) return 'Windstar Cruises';
  if (url.includes('oceaniacruises.com')) return 'Oceania Cruises';
  if (url.includes('azamara.com')) return 'Azamara Club Cruises';
  if (url.includes('explorajourneys.com')) return 'Explora Journeys';
  if (url.includes('starclippers.com')) return 'Star Clippers';
  if (url.includes('ponant.com')) return 'Ponant Cruises';
  if (url.includes('aidacruises.com')) return 'AIDA Cruises';
  if (url.includes('costacruises.com')) return 'Costa Cruises';
  if (url.includes('pandocruises.co.uk')) return 'P&O Cruises';
  if (url.includes('tuicruises.com')) return 'TUI Cruises';
  if (url.includes('marellacruises.com')) return 'Marella Cruises';
  if (url.includes('margaritavilleatsea.com')) return 'Margaritaville at Sea';
  if (url.includes('amawaterways.com')) return 'AmaWaterways';
  if (url.includes('tauck.com')) return 'Tauck';
  if (url.includes('uniworld.com')) return 'Uniworld Boutique River Cruises';
  if (url.includes('pearlseas.com')) return 'Pearl Seas Cruises';
  if (url.includes('victorycruises.com')) return 'Victory Cruise Line';
  if (url.includes('phoenix-reisen')) return 'Phoenix Reisen';
  if (url.includes('hapag-lloyd-cruises.com')) return 'Hapag-Lloyd Cruises';
  if (url.includes('hollandamerica.com')) return 'Holland America Line';
  if (url.includes('virginvoyages.com')) return 'Virgin Voyages';
  return 'Unknown';
}

/**
 * Extract nights/duration from markdown text.
 */
function extractNights(markdown: string): number {
  const match = markdown.match(/(\d+)\s*nights?/i);
  if (match) {
    const n = parseInt(match[1], 10);
    if (n >= 2 && n <= 365) return n;
  }
  // Fallback: look for "N-night" patterns
  const match2 = markdown.match(/(\d+)-night/i);
  if (match2) return parseInt(match2[1], 10);
  return 7; // Default assumption
}

/**
 * Parse Jina Reader markdown output into RealSailingPayload[].
 */
function parseMarkdownToSailings(markdown: string, url: string): RealSailingPayload[] {
  const sailings: RealSailingPayload[] = [];
  const cruiseLine = cruiseLineFromUrl(url);
  
  // Extract all prices from the markdown
  const prices = extractPrices(markdown);
  if (prices.length === 0) return sailings;
  
  // Extract ship name
  const shipName = extractShipName(markdown, url);
  if (!shipName) return sailings;
  
  // Extract departure port
  const departurePort = extractDeparturePort(markdown);
  
  // Extract itinerary
  const itinerary = extractItinerary(markdown, departurePort || undefined);
  
  // Extract nights
  const nights = extractNights(markdown);
  
  // Try to find sail dates — look for date patterns near prices
  const datePatterns = [
    /(\w+\s+\d{1,2},?\s+\d{4})\s*[:\-]?\s*\$[\d,]+/g,
    /(\$[\d,]+)\s*[:\-]?\s*(\w+\s+\d{1,2},?\s+\d{4})/g,
  ];
  
  const sailDates: string[] = [];
  for (const pattern of datePatterns) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(markdown)) !== null) {
      const dateRaw = match[1].includes('19') || match[1].includes('20') ? match[1] : match[2];
      const parsed = parseSailDate(dateRaw);
      if (parsed && !sailDates.includes(parsed)) {
        sailDates.push(parsed);
      }
    }
  }
  
  // If no date-price pairs found, try to extract any dates from the page
  if (sailDates.length === 0) {
    const allDateMatches = markdown.match(/(\w+\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})/g) || [];
    for (const raw of allDateMatches) {
      const parsed = parseSailDate(raw);
      if (parsed && !sailDates.includes(parsed)) {
        sailDates.push(parsed);
      }
    }
  }
  
  // Generate sailing records from price × date combinations
  const effectiveDates = sailDates.length > 0 ? sailDates : [null];
  
  for (const sailDate of effectiveDates) {
    // Use the lowest price as the primary listing
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const basePrice = sortedPrices[0];
    
    // Skip prices that are unrealistically low (< $200 for ocean cruises, < $100 for river)
    if (basePrice < 200 && cruiseLine !== 'Viking Cruises' && cruiseLine !== 'AmaWaterways' 
        && cruiseLine !== 'Uniworld Boutique River Cruises' && cruiseLine !== 'Viking River Cruises') {
      continue;
    }
    
    // Generate an ID for this sailing
    const shipSlug = shipName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const portSlug = (departurePort || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const dateSlug = sailDate ? sailDate.replace(/-/g, '') : 'tbd';
    const id = `scraped_${cruiseLine.toLowerCase().replace(/\s+/g, '_')}_${shipSlug}_${dateSlug}_${portSlug}_${nights}`;
    
    // Build itinerary if we have departure port
    const fullItinerary: string[] = [];
    if (departurePort) {
      fullItinerary.push(departurePort);
      // Add intermediate ports from itinerary (excluding departure/return)
      if (itinerary.length > 2) {
        fullItinerary.push(...itinerary.slice(1, -1));
      } else if (itinerary.length > 0) {
        fullItinerary.push(...itinerary);
      }
      fullItinerary.push(departurePort); // Return to departure
    } else if (itinerary.length >= 2) {
      fullItinerary.push(...itinerary);
    }
    
    // Determine destination from departure port context
    let destination = 'Caribbean';
    if (departurePort) {
      const port = departurePort.toLowerCase();
      if (port.includes('miami') || port.includes('fort lauderdale') || port.includes('port canaveral') 
          || port.includes('tampa') || port.includes('galveston') || port.includes('san juan')) {
        destination = 'Caribbean';
      } else if (port.includes('seattle') || port.includes('vancouver') || port.includes('los angeles') 
                 || port.includes('san diego') || port.includes('san francisco')) {
        destination = 'Alaska';
      } else if (port.includes('southampton') || port.includes('liverpool') || port.includes('plymouth')
                 || port.includes('barcelona') || port.includes('rome') || port.includes('venice')
                 || port.includes('nice') || port.includes('marseille')) {
        destination = 'Mediterranean';
      } else if (port.includes('new york') || port.includes('boston') || port.includes('norfolk')) {
        destination = 'Northeastern US';
      } else if (port.includes('sydney') || port.includes('melbourne') || port.includes('brisbane')) {
        destination = 'Australia & New Zealand';
      } else if (port.includes('tokyo') || port.includes('yokohama')) {
        destination = 'Japan';
      } else if (port.includes('auckland') || port.includes('wellington')) {
        destination = 'South Pacific';
      }
    }
    
    sailings.push({
      id,
      cruiseLine,
      ship: shipName,
      destination,
      departurePort: departurePort || 'TBD',
      nights,
      sailDate: sailDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      price: basePrice,
      originalPrice: Math.round(basePrice * 1.3), // Estimate 30% drop
      itinerary: fullItinerary.length >= 2 ? fullItinerary : [departurePort || 'TBD', destination, departurePort || 'TBD'],
      bookingUrl: url,
      bookingLabel: cruiseLine,
    });
  }
  
  return sailings;
}

// ── Scheduled handler — runs every 4 hours via Cloudflare Worker cron ────────

const JINA_BASE_URL = 'https://r.jina.ai';
const REQUEST_TIMEOUT_MS = 30_000; // 30s per URL
const DELAY_BETWEEN_REQUESTS_MS = 1000; // 1s between requests to be polite

export interface ScrapedSailing {
  success: boolean;
  url: string;
  sailingsCount: number;
  error?: string;
}

/**
 * Scrape a single URL via Jina Reader and parse into sailings.
 */
async function scrapeSingleUrl(url: string): Promise<ScrapedSailing> {
  try {
    const jinaUrl = `${JINA_BASE_URL}/${encodeURIComponent(url)}`;
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'application/json',
        'X-No-Cache': 'true',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { success: false, url, sailingsCount: 0, error: `HTTP ${response.status}` };
    }

    const text = await response.text();
    
    // Check if Jina returned useful content (not a block/error page)
    if (text.includes('403') || text.includes('blocked') || text.includes('captcha')) {
      return { success: false, url, sailingsCount: 0, error: 'Blocked by target site' };
    }

    const sailings = parseMarkdownToSailings(text, url);
    
    return {
      success: sailings.length > 0,
      url,
      sailingsCount: sailings.length,
      error: sailings.length === 0 ? 'No parseable data' : undefined,
    };
  } catch (err) {
    return { success: false, url, sailingsCount: 0, error: (err as Error).message };
  }
}

/**
 * Cloudflare Worker scheduled handler — runs every 4 hours.
 * Scrapes all configured cruise line URLs and upserts into D1.
 */
export async function scheduled(event: ScheduledEvent, env: any): Promise<void> {
  const startTime = Date.now();
  console.log('[ScheduledScrape] Starting 4-hour cruise data update cycle');
  
  // Get all URLs from configuration
  const urls = getAllScrapeUrls();
  console.log(`[ScheduledScrape] Configured with ${urls.length} URLs across cruise lines`);
  
  if (urls.length === 0) {
    console.log('[ScheduledScrape] No URLs configured — nothing to do');
    return;
  }

  // Track results for logging/metrics
  const results: ScrapedSailing[] = [];
  let totalSailingsInserted = 0;
  let totalErrors = 0;

  // Process URLs in batches to stay within Worker limits
  // Cloudflare Workers free tier: ~30s CPU, 128MB memory
  // Each Jina fetch is I/O (doesn't consume CPU), so we can process many in parallel
  // But we need to be careful about wall-clock time and D1 writes
  
  const BATCH_SIZE = 30; // Process 30 URLs per batch
  const batches: string[][] = [];
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    batches.push(urls.slice(i, i + BATCH_SIZE));
  }

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    console.log(`[ScheduledScrape] Processing batch ${batchIdx + 1}/${batches.length} (${batch.length} URLs)`);
    
    // Process batch sequentially with delays to be polite to Jina Reader
    for (const url of batch) {
      const scrapingResult = await scrapeSingleUrl(url);
      results.push(scrapingResult);

      if (scrapingResult.success && scrapingResult.sailingsCount > 0) {
        // Parse the markdown and upsert each sailing
        try {
          const jinaUrl = `${JINA_BASE_URL}/${encodeURIComponent(url)}`;
          const response = await fetch(jinaUrl, {
            headers: { 'Accept': 'application/json', 'X-No-Cache': 'true' },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          });

          if (response.ok) {
            const text = await response.text();
            const sailings = parseMarkdownToSailings(text, url);
            
            for (const sailing of sailings) {
              const ingestResult = await ingestRealSailing(env, sailing);
              if (ingestResult.ok && !ingestResult.duplicated) {
                totalSailingsInserted++;
              }
            }
          }
        } catch (err) {
          console.error(`[ScheduledScrape] Failed to upsert for ${url}:`, (err as Error).message);
          totalErrors++;
        }
      } else {
        totalErrors++;
      }

      // Small delay between requests to be polite
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS));
    }
    
    // Log batch progress
    const elapsed = Date.now() - startTime;
    console.log(`[ScheduledScrape] Batch ${batchIdx + 1} complete in ${elapsed}ms — ` +
      `${totalSailingsInserted} sailings inserted, ${results.filter(r => r.success).length}/${batch.length} successful scrapes`);
  }

  const totalElapsed = Date.now() - startTime;
  const successCount = results.filter(r => r.success).length;
  
  console.log(`[ScheduledScrape] Cycle complete in ${totalElapsed}ms`);
  console.log(`[ScheduledScrape] Total: ${urls.length} URLs, ${successCount} successful, ` +
    `${totalSailingsInserted} sailings upserted, ${totalErrors} errors`);
  
  // Store metrics in KV for monitoring
  try {
    await env.CACHE.put('last_scrape', JSON.stringify({
      timestamp: new Date().toISOString(),
      totalUrls: urls.length,
      successfulScrapes: successCount,
      sailingsInserted: totalSailingsInserted,
      errors: totalErrors,
      durationMs: totalElapsed,
    }), { expirationTtl: 60 * 60 * 24 * 7 }); // 7 days
  } catch (err) {
    console.warn('[ScheduledScrape] Failed to store metrics in KV:', (err as Error).message);
  }
}

// Re-export for use in index.ts if needed
export { parseMarkdownToSailings, scrapeSingleUrl };
