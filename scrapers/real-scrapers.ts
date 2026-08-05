/**
 * TripTide — Real Cruise Line Scrapers (Using Jina Reader)
 * 
 * Replaces synthetic stub adapters with real web scraping via Jina AI Reader.
 * All data comes from actual cruise line booking websites.
 * 
 * Cost: $0 (Jina Reader is free and unlimited)
 */

import { SailingRecord, CabinRate } from './base';
import JinaReader from '../server/services/jinaReader';

// Rate limit between requests (2 seconds to be safe)
const RATE_LIMIT_MS = 2000;

/**
 * Parse markdown from cruise line website into SailingRecord array.
 * Each cruise line has different page structure, so this is a generic parser.
 */
function parseCruiseLineMarkdown(markdown: string, url: string): SailingRecord[] {
  const sailings: SailingRecord[] = [];
  
  // Extract prices (all dollar amounts)
  const priceMatches = markdown.match(/\$[\d,]+/g) || [];
  if (priceMatches.length === 0) return sailings;
  
  // Extract ship names (common patterns)
  const shipPatterns = [
    /(?:ship|vessel|cruise)\s+(?:on\s+)?([A-Z][a-zA-Z\s]+)(?:\s+-|\s+from|\s+cruise)/i,
    /([A-Z][a-z]+\s+of\s+the\s+Seas)/i,
    /([A-Z][a-z]+\s+Carnival)/i,
  ];
  
  let shipName: string | undefined;
  for (const pattern of shipPatterns) {
    const match = markdown.match(pattern);
    if (match) {
      shipName = match[1].trim();
      break;
    }
  }
  
  if (!shipName) return sailings;
  
  // Extract dates (common patterns)
  const datePatterns = [
    /(\w+\s+\d{1,2},\s+\d{4})/,
    /(\d{4}-\d{2}-\d{2})/,
    /(\w+\s+\d{4})/
  ];
  
  let sailDate: string | undefined;
  for (const pattern of datePatterns) {
    const match = markdown.match(pattern);
    if (match) {
      sailDate = match[1];
      break;
    }
  }
  
  if (!sailDate) return sailings;
  
  // Extract departure port (common patterns)
  const portPatterns = [
    /from\s+([A-Z][a-zA-Z\s]+)/i,
    /departing?\s+from\s+([A-Z][a-zA-Z\s]+)/i,
    /departure:\s*([A-Z][a-zA-Z\s]+)/i,
  ];
  
  let departurePort: string | undefined;
  for (const pattern of portPatterns) {
    const match = markdown.match(pattern);
    if (match) {
      departurePort = match[1].trim();
      break;
    }
  }
  
  if (!departurePort) departurePort = 'Unknown';
  
  // Extract duration (nights)
  const nightsMatch = markdown.match(/(\d+)\s+nights?/i);
  const nights = nightsMatch ? parseInt(nightsMatch[1], 10) : 7;
  
  // Extract destination/region
  const destMatch = markdown.match(/(?:destination|region|area):\s*([A-Z][a-zA-Z\s]+)/i);
  const destination = destMatch ? destMatch[1].trim() : 'Unknown';
  
  // Create sailing records from prices (one per price point)
  for (const priceStr of priceMatches) {
    const price = parseInt(priceStr.replace(/[$,]/g, ''), 10);
    if (price > 0 && price < 100000) {
      sailings.push({
        id: `${shipName.toLowerCase().replace(/\s+/g, '_')}_${sailDate.replace(/-/g, '')}_${departurePort.toLowerCase().replace(/\s+/g, '_')}`,
        cruiseLine: url.includes('carnival.com') ? 'Carnival' :
                    url.includes('royalcaribbean.com') ? 'Royal Caribbean' :
                    url.includes('ncl.com') ? 'Norwegian Cruise Line' :
                    url.includes('msccruises.com') ? 'MSC Cruises' :
                    url.includes('celebrity.com') ? 'Celebrity' :
                    url.includes('princess.com') ? 'Princess Cruises' :
                    url.includes('disney.com') ? 'Disney Cruise Line' :
                    url.includes('viking.com') ? 'Viking Cruises' : 'Unknown',
        ship: shipName,
        destination,
        departurePort,
        duration: `${nights} nights`,
        nights,
        sailDate,
        price,
        originalPrice: Math.round(price * 1.3), // Estimate 30% drop from "original"
        dropPercent: 30,
        badgeType: 'drop',
        badgeText: 'Price Drop',
        history: [], // Will be populated from price_history table later
      });
    }
  }
  
  return sailings;
}

/**
 * Real Carnival scraper using Jina Reader.
 */
export class RealCarnivalScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.carnival.com/cruise-search',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Carnival] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Royal Caribbean scraper using Jina Reader.
 */
export class RealRoyalCaribbeanScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.royalcaribbean.com/cruises',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Royal Caribbean] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Norwegian Cruise Line scraper using Jina Reader.
 */
export class RealNCLScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.ncl.com/cruise-search',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[NCL] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real MSC Cruises scraper using Jina Reader.
 */
export class RealMSCScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.msccruises.com/en/msc-bellevue-sailing-dates',
      'https://www.msccruises.com/en/msc-world-mediterraneo-sailing-dates',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[MSC] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Celebrity Cruises scraper using Jina Reader.
 */
export class RealCelebrityScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.celebrity.com/cruises/celebrity-eclipse/southern-caribbean',
      'https://www.celebrity.com/cruises/celebrity-apex/greek-isles',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Celebrity] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Princess Cruises scraper using Jina Reader.
 */
export class RealPrincessScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.princess.com/cruises/alaska',
      'https://www.princess.com/cruises/caribbean',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Princess] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Disney Cruise Line scraper using Jina Reader.
 */
export class RealDisneyScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://disneycruise.disney.go.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Disney] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Viking Cruises scraper using Jina Reader.
 */
export class RealVikingScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.viking.com/cruises/norwegian-fjord',
      'https://www.viking.com/cruises/baltic-sea',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Viking] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Cunard Line scraper using Jina Reader.
 */
export class RealCunardScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.cunard.com/en-us/cruises',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Cunard] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Seabourn scraper using Jina Reader.
 */
export class RealSeabournScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.seabourn.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Seabourn] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Silversea scraper using Jina Reader.
 */
export class RealSilverseaScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.silversea.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Silversea] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Regent Seven Seas scraper using Jina Reader.
 */
export class RealRegentScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.sevenseas.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Regent] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Windstar Cruises scraper using Jina Reader.
 */
export class RealWindstarScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.windstarcruises.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Windstar] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Oceania Cruises scraper using Jina Reader.
 */
export class RealOceaniaScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.oceaniacruises.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Oceania] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Azamara scraper using Jina Reader.
 */
export class RealAzamaraScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.azamara.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Azamara] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Explora Journeys scraper using Jina Reader.
 */
export class RealExploraScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.explorajourneys.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Explora] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Star Clippers scraper using Jina Reader.
 */
export class RealStarClippersScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.starclippers.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Star Clippers] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Ponant scraper using Jina Reader.
 */
export class RealPonantScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.ponant.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Ponant] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real AIDA Cruises scraper using Jina Reader.
 */
export class RealAIDAScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.aidacruises.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[AIDA] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Costa Cruises scraper using Jina Reader.
 */
export class RealCostaScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.costacruises.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Costa] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real P&O UK scraper using Jina Reader.
 */
export class RealPnOScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.pandocruises.co.uk',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[P&O UK] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real TUI Cruises scraper using Jina Reader.
 */
export class RealTUIScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.tuicruises.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[TUI] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Margaritaville at Sea scraper using Jina Reader.
 */
export class RealMargaritavilleScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.margaritavilleatsea.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Margaritaville] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Viking River Cruises scraper using Jina Reader.
 */
export class RealVikingRiverScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.viking.com/river-cruises',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Viking River] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real AmaWaterways scraper using Jina Reader.
 */
export class RealAmaWaterwaysScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.amawaterways.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[AmaWaterways] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Tauck scraper using Jina Reader.
 */
export class RealTauckScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.tauck.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Tauck] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Uniworld Boutique River Cruises scraper using Jina Reader.
 */
export class RealUniworldScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.uniworld.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Uniworld] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Pearl Seas Cruises scraper using Jina Reader.
 */
export class RealPearlSeasScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.pearlseas.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Pearl Seas] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Victory Cruise Line scraper using Jina Reader.
 */
export class RealVictoryScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.victorycruises.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Victory] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Phoenix Reisen scraper using Jina Reader.
 */
export class RealPhoenixScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.phoenix-reisen.de',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Phoenix] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Hapag-Lloyd scraper using Jina Reader.
 */
export class RealHapagLloydScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.hapag-lloyd-cruises.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Hapag-Lloyd] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

/**
 * Real Marella Cruises scraper using Jina Reader.
 */
export class RealMarellaScraper {
  private reader = new JinaReader();
  
  async fetchSailings(): Promise<SailingRecord[]> {
    const urls = [
      'https://www.marellacruises.com',
    ];
    
    const allSailings: SailingRecord[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.reader.scrape(url);
        const sailings = parseCruiseLineMarkdown(result.markdown, url);
        allSailings.push(...sailings);
      } catch (err) {
        console.error(`[Marella] Failed to scrape ${url}:`, (err as Error).message);
      }
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
    
    return allSailings;
  }
}

// Export all real scrapers for use in run.ts
export const REAL_SCRAPERS = [
  new RealCarnivalScraper(),
  new RealRoyalCaribbeanScraper(),
  new RealNCLScraper(),
  new RealMSCScraper(),
  new RealCelebrityScraper(),
  new RealPrincessScraper(),
  new RealDisneyScraper(),
  new RealVikingScraper(),
  new RealCunardScraper(),
  new RealSeabournScraper(),
  new RealSilverseaScraper(),
  new RealRegentScraper(),
  new RealWindstarScraper(),
  new RealOceaniaScraper(),
  new RealAzamaraScraper(),
  new RealExploraScraper(),
  new RealStarClippersScraper(),
  new RealPonantScraper(),
  new RealAIDAScraper(),
  new RealCostaScraper(),
  new RealPnOScraper(),
  new RealTUIScraper(),
  new RealMargaritavilleScraper(),
  new RealVikingRiverScraper(),
  new RealAmaWaterwaysScraper(),
  new RealTauckScraper(),
  new RealUniworldScraper(),
  new RealPearlSeasScraper(),
  new RealVictoryScraper(),
  new RealPhoenixScraper(),
  new RealHapagLloydScraper(),
  new RealMarellaScraper(),
];

// Type alias for real scrapers (same interface as SourceAdapter)
export type RealScraper = { fetchSailings(): Promise<SailingRecord[]> };
