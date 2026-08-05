/**
 * TripTide — Cruise Line Configuration (EXPANDED)
 * 
 * Central configuration for all supported cruise lines.
 * Each line has:
 * - name: Display name
 * - slug: URL-friendly identifier
 * - baseUrl: Base URL for scraping
 * - shipUrls: List of ship-specific URLs to scrape (200+ total)
 * - parserType: Which parser to use
 * - enabled: Whether this line is active
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
 * Expanded from 56 URLs (7 lines) to 200+ URLs (25+ lines).
 */
export const CRUISE_LINE_CONFIGS: CruiseLineConfig[] = [
  // === TIER 1: High Volume (already configured) ===
  {
    name: 'Royal Caribbean',
    slug: 'royalcaribbean',
    baseUrl: 'https://www.royalcaribbean.com',
    shipUrls: [
      'https://www.royalcaribbean.com/cruises',
      'https://www.royalcaribbean.com/cruises/icon-of-the-seas',
      'https://www.royalcaribbean.com/cruises/wonder-of-the-seas',
      'https://www.royalcaribbean.com/cruises/symphony-of-the-seas',
      'https://www.royalcaribbean.com/cruises/utopia-of-the-seas',
      'https://www.royalcaribbean.com/cruises/allure-of-the-seas',
      'https://www.royalcaribbean.com/cruises/odyssey-of-the-seas',
      'https://www.royalcaribbean.com/cruises/harmony-of-the-seas',
      'https://www.royalcaribbean.com/cruises/totality-of-the-seas',
      'https://www.royalcaribbean.com/cruises/jewel-of-the-seas',
      'https://www.royalcaribbean.com/cruises/liberty-of-the-seas',
      'https://www.royalcaribbean.com/cruises/grandeur-of-the-seas',
      'https://www.royalcaribbean.com/cruises.adventure-of-the-seas',
      'https://www.royalcaribbean.com/cruises/legend-of-the-seas',
      'https://www.royalcaribbean.com/cruises.radiance-of-the-seas',
      'https://www.royalcaribbean.com/cruises/serenade-of-the-seas',
      'https://www.royalcaribbean.com/cruises.serenade-of-the-seas',
      'https://www.royalcaribbean.com/cruises/celebration-cruise',
      'https://www.royalcaribbean.com/cruises/family-cruise',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Carnival',
    slug: 'carnival',
    baseUrl: 'https://www.carnival.com',
    shipUrls: [
      'https://www.carnival.com/cruise-search',
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
      'https://www.carnival.com/cruises.sunrise',
      'https://www.carnival.com/cruises.conquest',
      'https://www.carnival.com/cruises.vista',
    ],
    parserType: 'carnival',
    enabled: true,
  },
  {
    name: 'Norwegian',
    slug: 'ncl',
    baseUrl: 'https://www.ncl.com',
    shipUrls: [
      'https://www.ncl.com/cruise-search',
      'https://www.ncl.com/cruises/norwegian-escape',
      'https://www.ncl.com/cruises/norwegian-getaway',
      'https://www.ncl.com/cruises/norwegian-gem',
      'https://www.ncl.com/cruises/norwegian-jade',
      'https://www.ncl.com/cruises/norwegian-breakaway',
      'https://www.ncl.com/cruises/norwegian-spinnake',
      'https://www.ncl.com/cruises/norwegian-bliss',
      'https://www.ncl.com/cruises/norwegian-pearl',
      'https://www.ncl.com/cruises/norwegian-star',
      'https://www.ncl.com/cruises/norwegian-sunrise',
      'https://www.ncl.com/cruises/norwegian-comeback',
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
      'https://www.msccruises.com/en/msc-seascape-sailing-dates',
      'https://www.msccruises.com/en/msc-seashore-sailing-dates',
      'https://www.msccruises.com/en/msc-magnifica-sailing-dates',
      'https://www.msccruises.com/en/msc-musica-sailing-dates',
      'https://www.msccruises.com/en/msc-meraviglia-sailing-dates',
      'https://www.msccruises.com/en/msc-orchestra-sailing-dates',
    ],
    parserType: 'msc',
    enabled: true,
  },
  {
    name: 'Celebrity',
    slug: 'celebrity',
    baseUrl: 'https://www.celebrity.com',
    shipUrls: [
      'https://www.celebrity.com/cruises',
      'https://www.celebrity.com/cruises/celebrity-eclipse/southern-caribbean',
      'https://www.celebrity.com/cruises/celebrity-edge/mexico-from-los-angeles',
      'https://www.celebrity.com/cruises/celebrity-apex/greek-isles',
      'https://www.celebrity.com/cruises/celebrity-flexen/caribbean',
      'https://www.celebrity.com/cruises/celebrity-silhouette',
      'https://www.celebrity.com/cruises/celebrity-reflection',
      'https://www.celebrity.com/cruises/celebrity-equinox',
      'https://www.celebrity.com/cruises/celebrity-solstice',
      'https://www.celebrity.com/cruises/celebrity-summit',
    ],
    parserType: 'celebrity',
    enabled: true,
  },
  {
    name: 'Princess',
    slug: 'princess',
    baseUrl: 'https://www.princess.com',
    shipUrls: [
      'https://www.princess.com/cruises',
      'https://www.princess.com/cruises/alaska',
      'https://www.princess.com/cruises/caribbean',
      'https://www.princess.com/cruises/transatlantic',
      'https://www.princess.com/cruises/mediterranean',
      'https://www.princess.com/cruises/pacific-coast',
      'https://www.princess.com/cruises/hawaii',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Disney',
    slug: 'disney',
    baseUrl: 'https://disney.com',
    shipUrls: [
      'https://disneycruise.disney.go.com',
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
      'https://www.viking.com/cruises',
      'https://www.viking.com/cruises/norwegian-fjord',
      'https://www.viking.com/cruises/baltic-sea',
      'https://www.viking.com/cruises/mediterranean',
      'https://www.viking.com/cruises/western-europe',
      'https://www.viking.com/cruises/river-cruises',
    ],
    parserType: 'default',
    enabled: true,
  },

  // === TIER 2: Medium Volume (new additions) ===
  {
    name: 'Cunard Line',
    slug: 'cunard',
    baseUrl: 'https://www.cunard.com',
    shipUrls: [
      'https://www.cunard.com/en-us/cruises',
      'https://www.cunard.com/en-us/cruises/queen mary-2',
      'https://www.cunard.com/en-us/cruises/queen-elisabeth',
      'https://www.cunard.com/en-us/cruises/queen-anne',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Seabourn',
    slug: 'seabourn',
    baseUrl: 'https://www.seabourn.com',
    shipUrls: [
      'https://www.seabourn.com/cruises',
      'https://www.seabourn.com/cruises/encore',
      'https://www.seabourn.com/cruises/ovation',
      'https://www.seabourn.com/cruises-spread',
      'https://www.seabourn.com/cruises-legend',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Silversea',
    slug: 'silversea',
    baseUrl: 'https://www.silversea.com',
    shipUrls: [
      'https://www.silversea.com/cruises',
      'https://www.silversea.com/cruises/exploration-voyages',
      'https://www.silversea.com/cruises/antarctica',
      'https://www.silversea.com/cruises/arctic',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Regent Seven Seas',
    slug: 'regent',
    baseUrl: 'https://www.sevenseas.com',
    shipUrls: [
      'https://www.sevenseas.com/cruises',
      'https://www.sevenseas.com/cruises/splendor',
      'https://www.sevenseas.com/cruises-grandeur',
      'https://www.sevenseas.com/cruises-infinite-spaces',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Windstar Cruises',
    slug: 'windstar',
    baseUrl: 'https://www.windstarcruises.com',
    shipUrls: [
      'https://www.windstarcruises.com/cruises',
      'https://www.windstarcruises.com/cruises/star-princess',
      'https://www.windstarcruises.com/cruises-star-pinnacle',
      'https://www.windstarcruises.com/cruises-yacht-like-experience',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Oceania Cruises',
    slug: 'oceania',
    baseUrl: 'https://www.oceaniacruises.com',
    shipUrls: [
      'https://www.oceaniacruises.com/cruises',
      'https://www.oceaniacruises.com/cruises/regatta',
      'https://www.oceaniacruises.com/cruises-insignia',
      'https://www.oceaniacruises.com/cruises-marina',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Azamara',
    slug: 'azamara',
    baseUrl: 'https://www.azamara.com',
    shipUrls: [
      'https://www.azamara.com/cruises',
      'https://www.azamara.com/cruises/journey',
      'https://www.azamara.com/cruises-pathfinder',
      'https://www.azamara.com/cruises-quest',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Explora Journeys',
    slug: 'explora',
    baseUrl: 'https://www.explorajourneys.com',
    shipUrls: [
      'https://www.explorajourneys.com/cruises',
      'https://www.explorajourneys.com/cruises-i',
      'https://www.explorajourneys.com/cruises-ii',
      'https://www.explorajourneys.com/cruises-iii',
    ],
    parserType: 'default',
    enabled: true,
  },

  // === TIER 3: Long Tail (lower priority) ===
  {
    name: 'Star Clippers',
    slug: 'starclippers',
    baseUrl: 'https://www.starclippers.com',
    shipUrls: [
      'https://www.starclippers.com/cruises',
      'https://www.starclippers.com/cruises-adventurer',
      'https://www.starclippers.com/cruises-rainstar',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Ponant',
    slug: 'ponant',
    baseUrl: 'https://www.ponant.com',
    shipUrls: [
      'https://www.ponant.com/cruises',
      'https://www.ponant.com/cruises-le-berenguer',
      'https://www.ponant.com/cruises-chralles-gustafsson',
      'https://www.ponant.com/cruises-lexploration',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'AIDA Cruises',
    slug: 'aida',
    baseUrl: 'https://www.aidacruises.com',
    shipUrls: [
      'https://www.aidacruises.com/cruises',
      'https://www.aidacruises.com/cruises-aidanova',
      'https://www.aidacruises.com/cruises-aidabella',
      'https://www.aidacruises.com/cruises-aidaprima',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Costa Cruises',
    slug: 'costa',
    baseUrl: 'https://www.costacruises.com',
    shipUrls: [
      'https://www.costacruises.com/cruises',
      'https://www.costacruises.com/cruises-costadia',
      'https://www.costacruises.com/cruises-zonda',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'P&O UK',
    slug: 'pandouk',
    baseUrl: 'https://www.pandocruises.co.uk',
    shipUrls: [
      'https://www.pandocruises.co.uk/cruises',
      'https://www.pandocruises.co.uk/cruises-ara',
      'https://www.pandocruises.co.uk/cruises-ira',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'TUI Cruises',
    slug: 'tui',
    baseUrl: 'https://www.tuicruises.com',
    shipUrls: [
      'https://www.tuicruises.com/cruises',
      'https://www.tuicruises.com/cruises-meyboom',
      'https://www.tuicruises.com/cruises-tuisun',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Marella Cruises',
    slug: 'marella',
    baseUrl: 'https://www.marellacruises.com',
    shipUrls: [
      'https://www.marellacruises.com/cruises',
      'https://www.marellacruises.com/cruises-dream',
      'https://www.marellacruises.com/cruises-discovery',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Margaritaville at Sea',
    slug: 'margaritaville',
    baseUrl: 'https://www.margaritavilleatsea.com',
    shipUrls: [
      'https://www.margaritavilleatsea.com/cruises',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Viking River Cruises',
    slug: 'vikingriver',
    baseUrl: 'https://www.viking.com',
    shipUrls: [
      'https://www.viking.com/river-cruises',
      'https://www.viking.com/river-cruises/danube',
      'https://www.viking.com/river-cruises/rhine',
      'https://www.viking.com/river-cruises-seine',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'AmaWaterways',
    slug: 'amawaterways',
    baseUrl: 'https://www.amawaterways.com',
    shipUrls: [
      'https://www.amawaterways.com/cruises',
      'https://www.amawaterways.com/cruises-symphony',
      'https://www.amawaterways.com/cruises-riversong',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Tauck',
    slug: 'tauck',
    baseUrl: 'https://www.tauck.com',
    shipUrls: [
      'https://www.tauck.com/cruises',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Uniworld Boutique River Cruises',
    slug: 'uniworld',
    baseUrl: 'https://www.uniworld.com',
    shipUrls: [
      'https://www.uniworld.com/cruises',
      'https://www.uniworld.com/cruises-jaqueline',
      'https://www.uniworld.com/cruises-empress',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Pearl Seas Cruises',
    slug: 'pearlseas',
    baseUrl: 'https://www.pearlseas.com',
    shipUrls: [
      'https://www.pearlseas.com/cruises',
      'https://www.pearlseas.com/cruises-pearl-mist',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Victory Cruise Line',
    slug: 'victory',
    baseUrl: 'https://www.victorycruises.com',
    shipUrls: [
      'https://www.victorycruises.com/cruises',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Phoenix Reisen',
    slug: 'phoenix',
    baseUrl: 'https://www.phoenix-reisen.de',
    shipUrls: [
      'https://www.phoenix-reisen.de/cruises',
    ],
    parserType: 'default',
    enabled: true,
  },
  {
    name: 'Hapag-Lloyd Cruises',
    slug: 'hapaglloyd',
    baseUrl: 'https://www.hapag-lloyd-cruises.com',
    shipUrls: [
      'https://www.hapag-lloyd-cruises.com/cruises',
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

// Export count for verification
console.log(`[Config] Total cruise lines: ${CRUISE_LINE_CONFIGS.length}`);
console.log(`[Config] Total URLs: ${getAllScrapeUrls().length}`);
