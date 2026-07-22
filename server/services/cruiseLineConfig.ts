/**
 * TripTide — Cruise Line Configuration
 * 
 * Central configuration for all supported cruise lines.
 * Each line has:
 * - name: Display name
 * - slug: URL-friendly identifier
 * - baseUrl: Base URL for scraping
 * - shipUrls: List of ship-specific URLs to scrape
 * - parserType: Which parser to use (default, carnival, ncl, etc.)
 */

export interface CruiseLineConfig {
  name: string;
  slug: string;
  baseUrl: string;
  shipUrls: string[];
  parserType: 'default' | 'carnival' | 'ncl' | 'msc' | 'celebrity' | 'princess' | 'disney' | 'viking';
  enabled: boolean;
}

/**
 * All supported cruise lines with their scraping configurations.
 */
export const CRUISE_LINE_CONFIGS: CruiseLineConfig[] = [
  {
    name: 'Royal Caribbean',
    slug: 'royalcaribbean',
    baseUrl: 'https://www.royalcaribbean.com',
    shipUrls: [
      'https://www.royalcaribbean.com/cruises/icon-of-the-seas',
      'https://www.royalcaribbean.com/cruises/wonder-of-the-seas',
      'https://www.royalcaribbean.com/cruises/symphony-of-the-seas',
      'https://www.royalcaribbean.com/cruises/utopia-of-the-seas',
      'https://www.royalcaribbean.com/cruises/allure-of-the-seas',
      'https://www.royalcaribbean.com/cruises/odyssey-of-the-seas',
      'https://www.royalcaribbean.com/cruises/harmony-of-the-seas',
      'https://www.royalcaribbean.com/cruises/totality-of-the-seas',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Carnival',
    slug: 'carnival',
    baseUrl: 'https://www.carnival.com',
    shipUrls: [
      'https://www.carnival.com/cruises/breeze',
      'https://www.carnival.com/cruises/mardi-gras',
      'https://www.carnival.com/cruises/horizon',
      'https://www.carnival.com/cruises/splendor',
      'https://www.carnival.com/cruises/festivity',
      'https://www.carnival.com/cruises/ecstasy',
      'https://www.carnival.com/cruises/imagination',
      'https://www.carnival.com/cruises/inspiration',
      'https://www.carnival.com/cruises/joy',
      'https://www.carnival.com/cruises/liberty',
      'https://www.carnival.com/cruises/destination',
      'https://www.carnival.com/cruises/paradise',
      'https://www.carnival.com/cruises/panorama',
      'https://www.carnival.com/cruises/radiance',
      'https://www.carnival.com/cruises/sensation',
    ],
    parserType: 'carnival',
    enabled: true,
  },
  {
    name: 'Norwegian',
    slug: 'ncl',
    baseUrl: 'https://www.ncl.com',
    shipUrls: [
      'https://www.ncl.com/cruises/norwegian-escape',
      'https://www.ncl.com/cruises/norwegian-getaway',
      'https://www.ncl.com/cruises/norwegian-gem',
      'https://www.ncl.com/cruises/norwegian-jade',
      'https://www.ncl.com/cruises/norwegian-breakaway',
      'https://www.ncl.com/cruises/norwegian-spinnake',
      'https://www.ncl.com/cruises/norwegian-bliss',
      'https://www.ncl.com/cruises/norwegian-pearl',
    ],
    parserType: 'ncl',
    enabled: true,
  },
  {
    name: 'MSC Cruises',
    slug: 'msc',
    baseUrl: 'https://www.msccruises.com',
    shipUrls: [
      'https://www.msccruises.com/en/msc-bellevue-sailing-dates',
      'https://www.msccruises.com/en/msc-world-mediterraneo-sailing-dates',
      'https://www.msccruises.com/en/msc-divine-sailing-dates',
      'https://www.msccruises.com/en/msc-seaside-sailing-dates',
    ],
    parserType: 'msc',
    enabled: true,
  },
  {
    name: 'Celebrity',
    slug: 'celebrity',
    baseUrl: 'https://www.celebrity.com',
    shipUrls: [
      'https://www.celebrity.com/cruises/celebrity-eclipse/southern-caribbean',
      'https://www.celebrity.com/cruises/celebrity-edge/mexico-from-los-angeles',
      'https://www.celebrity.com/cruises/celebrity-apex/greek-isles',
      'https://www.celebrity.com/cruises/celebrity-flexen/caribbean',
    ],
    parserType: 'celebrity',
    enabled: true,
  },
  {
    name: 'Princess',
    slug: 'princess',
    baseUrl: 'https://www.princess.com',
    shipUrls: [
      'https://www.princess.com/cruises/alaska',
      'https://www.princess.com/cruises/caribbean',
      'https://www.princess.com/cruises/transatlantic',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Disney',
    slug: 'disney',
    baseUrl: 'https://disney.com',
    shipUrls: [
      'https://disney.com/cruise/dream',
      'https://disney.com/cruise/wish',
      'https://disney.com/cruise-perfect-world',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Viking',
    slug: 'viking',
    baseUrl: 'https://www.viking.com',
    shipUrls: [
      'https://www.viking.com/cruises/norwegian-fjord',
      'https://www.viking.com/cruises/baltic-sea',
      'https://www.viking.com/cruises/mediterranean',
    ],
    parserType: 'default',
    enabled: true,
  },
];

/**
 * Get all active URLs from configured cruise lines.
 */
export function getAllScrapeUrls(): string[] {
  return CRUISE_LINE_CONFIGS
    .filter(config => config.enabled)
    .flatMap(config => config.shipUrls);
}

/**
 * Get cruise line config by name.
 */
export function getCruiseLineConfig(name: string): CruiseLineConfig | undefined {
  return CRUISE_LINE_CONFIGS.find(config => config.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get all cruise line names.
 */
export function getAllCruiseLineNames(): string[] {
  return CRUISE_LINE_CONFIGS.map(config => config.name);
}
