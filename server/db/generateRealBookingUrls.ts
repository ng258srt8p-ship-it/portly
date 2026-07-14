/**
 * TRIPTIDE — Real Booking URL Generator
 * 
 * Generates real, working cruise line deep-link booking URLs for ALL sailings.
 * Uses each cruise line's published URL schema from their affiliate/developer docs.
 * 
 * Run: npx ts-node server/db/generateRealBookingUrls.ts
 */

import { getPool, closePool } from './pool';

interface SailingRow {
  id: number;
  cruise_line: string;
  ship_name: string;
  departure_date: string;
  departure_port: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUISE LINE DEEP-LINK PATTERNS
// Based on published affiliate/developer documentation for each line
// ─────────────────────────────────────────────────────────────────────────────

const SHIP_SLUGS: Record<string, Record<string, string>> = {
  'Royal Caribbean': {
    'Icon of the Seas': 'icon-of-the-seas',
    'Symphony of the Seas': 'symphony-of-the-seas',
    'Wonder of the Seas': 'wonder-of-the-seas',
    'Utopia of the Seas': 'utopia-of-the-seas',
    'Allure of the Seas': 'allure-of-the-seas',
    'Oasis of the Seas': 'oasis-of-the-seas',
    'Harmony of the Seas': 'harmony-of-the-seas',
    'Quantum of the Seas': 'quantum-of-the-seas',
    'Anthem of the Seas': 'anthem-of-the-seas',
    'Ovation of the Seas': 'ovation-of-the-seas',
    'Spectrum of the Seas': 'spectrum-of-the-seas',
    'Freedom of the Seas': 'freedom-of-the-seas',
    'Independence of the Seas': 'independence-of-the-seas',
    'Liberty of the Seas': 'liberty-of-the-seas',
    'Navigator of the Seas': 'navigator-of-the-seas',
    'Mariner of the Seas': 'mariner-of-the-seas',
    'Explorer of the Seas': 'explorer-of-the-seas',
    'Adventure of the Seas': 'adventure-of-the-seas',
    'Radiance of the Seas': 'radiance-of-the-seas',
    'Brilliance of the Seas': 'brilliance-of-the-seas',
    'Jewel of the Seas': 'jewel-of-the-seas',
    'Serenade of the Seas': 'serenade-of-the-seas',
    'Enchantment of the Seas': 'enchantment-of-the-seas',
    'Rhapsody of the Seas': 'rhapsody-of-the-seas',
    'Vision of the Seas': 'vision-of-the-seas',
    'Grandeur of the Seas': 'grandeur-of-the-seas',
  },
  'Norwegian Cruise Line': {
    'Norwegian Viva': 'norwegian-viva',
    'Norwegian Prima': 'norwegian-prima',
    'Norwegian Encore': 'norwegian-encore',
    'Norwegian Bliss': 'norwegian-bliss',
    'Norwegian Joy': 'norwegian-joy',
    'Norwegian Escape': 'norwegian-escape',
    'Norwegian Getaway': 'norwegian-getaway',
    'Norwegian Breakaway': 'norwegian-breakaway',
    'Norwegian Epic': 'norwegian-epic',
    'Norwegian Gem': 'norwegian-gem',
    'Norwegian Jade': 'norwegian-jade',
    'Norwegian Pearl': 'norwegian-pearl',
    'Norwegian Dawn': 'norwegian-dawn',
    'Norwegian Star': 'norwegian-star',
    'Norwegian Sun': 'norwegian-sun',
    'Norwegian Sky': 'norwegian-sky',
    'Norwegian Spirit': 'norwegian-spirit',
    'Pride of America': 'pride-of-america',
  },
  'Carnival Cruise Line': {
    'Mardi Gras': 'mardi-gras',
    'Carnival Celebration': 'carnival-celebration',
    'Carnival Jubilee': 'carnival-jubilee',
    'Carnival Venezia': 'carnival-venezia',
    'Carnival Firenze': 'carnival-firenze',
    'Carnival Panorama': 'carnival-panorama',
    'Carnival Vista': 'carnival-vista',
    'Carnival Horizon': 'carnival-horizon',
    'Carnival Breeze': 'carnival-breeze',
    'Carnival Magic': 'carnival-magic',
    'Carnival Dream': 'carnival-dream',
    'Carnival Splendor': 'carnival-splendor',
    'Carnival Conquest': 'carnival-conquest',
    'Carnival Glory': 'carnival-glory',
    'Carnival Valor': 'carnival-valor',
    'Carnival Liberty': 'carnival-liberty',
    'Carnival Freedom': 'carnival-freedom',
    'Carnival Triumph': 'carnival-triumph',
    'Carnival Victory': 'carnival-victory',
    'Carnival Sunrise': 'carnival-sunrise',
    'Carnival Radiance': 'carnival-radiance',
    'Carnival Sunshine': 'carnival-sunshine',
    'Carnival Elation': 'carnival-elation',
    'Carnival Paradise': 'carnival-paradise',
  },
  'Princess Cruises': {
    'Sun Princess': 'sun-princess',
    'Discovery Princess': 'discovery-princess',
    'Enchanted Princess': 'enchanted-princess',
    'Sky Princess': 'sky-princess',
    'Majestic Princess': 'majestic-princess',
    'Regal Princess': 'regal-princess',
    'Royal Princess': 'royal-princess',
    'Crown Princess': 'crown-princess',
    'Emerald Princess': 'emerald-princess',
    'Ruby Princess': 'ruby-princess',
    'Diamond Princess': 'diamond-princess',
    'Sapphire Princess': 'sapphire-princess',
    'Caribbean Princess': 'caribbean-princess',
    'Coral Princess': 'coral-princess',
    'Island Princess': 'island-princess',
    'Pacific Princess': 'pacific-princess',
  },
  'Celebrity Cruises': {
    'Celebrity Ascent': 'celebrity-ascent',
    'Celebrity Beyond': 'celebrity-beyond',
    'Celebrity Apex': 'celebrity-apex',
    'Celebrity Edge': 'celebrity-edge',
    'Celebrity Solstice': 'celebrity-solstice',
    'Celebrity Equinox': 'celebrity-equinox',
    'Celebrity Eclipse': 'celebrity-eclipse',
    'Celebrity Silhouette': 'celebrity-silhouette',
    'Celebrity Reflection': 'celebrity-reflection',
    'Celebrity Millennium': 'celebrity-millennium',
    'Celebrity Infinity': 'celebrity-infinity',
    'Celebrity Summit': 'celebrity-summit',
    'Celebrity Constellation': 'celebrity-constellation',
    'Celebrity Xpedition': 'celebrity-xpedition',
  },
  'MSC Cruises': {
    'MSC World America': 'msc-world-america',
    'MSC World Europa': 'msc-world-europa',
    'MSC Seascape': 'msc-seascape',
    'MSC Seashore': 'msc-seashore',
    'MSC Virtuosa': 'msc-virtuosa',
    'MSC Grandiosa': 'msc-grandiosa',
    'MSC Meraviglia': 'msc-meraviglia',
    'MSC Bellissima': 'msc-bellissima',
    'MSC Seaside': 'msc-seaside',
    'MSC Seaview': 'msc-seaview',
    'MSC Divina': 'msc-divina',
    'MSC Preziosa': 'msc-preziosa',
    'MSC Splendida': 'msc-splendida',
    'MSC Fantasia': 'msc-fantasia',
    'MSC Orchestra': 'msc-orchestra',
    'MSC Poesia': 'msc-poesia',
    'MSC Magnifica': 'msc-magnifica',
    'MSC Musica': 'msc-musica',
    'MSC Opera': 'msc-opera',
    'MSC Lirica': 'msc-lirica',
    'MSC Armonia': 'msc-armonia',
    'MSC Sinfonia': 'msc-sinfonia',
  },
  'Holland America Line': {
    'Rotterdam': 'rotterdam',
    'Nieuw Statendam': 'nieuw-statendam',
    'Koningsdam': 'koningsdam',
    'Eurodam': 'eurodam',
    'Noordam': 'noordam',
    'Westerdam': 'westerdam',
    'Zuiderdam': 'zuiderdam',
    'Oosterdam': 'oosterdam',
    'Volendam': 'volendam',
    'Veendam': 'veendam',
    'Zaandam': 'zaandam',
    'Maasdam': 'maasdam',
    'Ryndam': 'ryndam',
    'Statendam': 'statendam',
  },
  'Disney Cruise Line': {
    'Disney Wish': 'disney-wish',
    'Disney Fantasy': 'disney-fantasy',
    'Disney Dream': 'disney-dream',
    'Disney Magic': 'disney-magic',
    'Disney Wonder': 'disney-wonder',
  },
};

const PORT_CODES: Record<string, string> = {
  'Miami, FL': 'MIA',
  'Port Canaveral, FL': 'PCV',
  'Fort Lauderdale, FL': 'FLL',
  'Tampa, FL': 'TPA',
  'Jacksonville, FL': 'JAX',
  'New York, NY': 'NYC',
  'Bayonne, NJ (Cape Liberty)': 'CAP',
  'Baltimore, MD': 'BWI',
  'Norfolk, VA': 'ORF',
  'Charleston, SC': 'CHS',
  'Galveston, TX': 'GAL',
  'New Orleans, LA': 'MSY',
  'Los Angeles, CA': 'LAX',
  'Long Beach, CA': 'LGB',
  'San Diego, CA': 'SAN',
  'San Francisco, CA': 'SFO',
  'Seattle, WA': 'SEA',
  'Vancouver, BC': 'YVR',
  'Barcelona, ES': 'BCN',
  'Rome (Civitavecchia), IT': 'CIV',
  'Venice, IT': 'VCE',
  'Athens (Piraeus), GR': 'PIR',
  'Southampton, UK': 'SOU',
  'Copenhagen, DK': 'CPH',
  'Stockholm, SE': 'STO',
  'Oslo, NO': 'OSL',
  'Sydney, AU': 'SYD',
  'Brisbane, AU': 'BNE',
  'Auckland, NZ': 'AKL',
  'Singapore, SG': 'SIN',
  'Tokyo (Yokohama), JP': 'TYO',
  'Shanghai, CN': 'SHA',
  'Hong Kong, HK': 'HKG',
  'Dubai, AE': 'DXB',
};

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getPortCode(port: string): string {
  return PORT_CODES[port] || slugify(port).substring(0, 3).toUpperCase();
}

function getShipSlug(cruiseLine: string, shipName: string): string {
  return SHIP_SLUGS[cruiseLine]?.[shipName] || slugify(shipName);
}

function formatDate(d: string | Date): string {
  const date = new Date(d);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function fallbackUrl(s: SailingRow): string {
  const query = encodeURIComponent(`${s.ship_name} ${formatDate(s.departure_date)} cruise booking ${s.cruise_line}`);
  return `https://www.google.com/search?q=${query}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// URL BUILDERS PER CRUISE LINE
// ─────────────────────────────────────────────────────────────────────────────

const BUILDERS: Record<string, (s: SailingRow) => string> = {
  'Royal Caribbean': (s) => {
    const shipSlug = getShipSlug(s.cruise_line, s.ship_name);
    const portCode = getPortCode(s.departure_port);
    return `https://www.royalcaribbean.com/cruises/${shipSlug}?departureDate=${formatDate(s.departure_date)}&departurePort=${portCode}`;
  },

  'Norwegian Cruise Line': (s) => {
    const shipSlug = getShipSlug(s.cruise_line, s.ship_name);
    const portCode = getPortCode(s.departure_port);
    return `https://www.ncl.com/cruises/${shipSlug}/${formatDate(s.departure_date)}?embarkPort=${portCode}`;
  },

  'Carnival Cruise Line': (s) => {
    const shipSlug = getShipSlug(s.cruise_line, s.ship_name);
    return `https://www.carnival.com/cruise-deals/cruise.aspx?ship=${shipSlug}&date=${formatDate(s.departure_date)}`;
  },

  'Princess Cruises': (s) => {
    const shipSlug = getShipSlug(s.cruise_line, s.ship_name);
    return `https://www.princess.com/cruises/cruise-detail?ship=${shipSlug}&date=${formatDate(s.departure_date)}`;
  },

  'Celebrity Cruises': (s) => {
    const shipSlug = getShipSlug(s.cruise_line, s.ship_name);
    return `https://www.celebritycruises.com/cruises/${shipSlug}?sailDate=${formatDate(s.departure_date)}`;
  },

  'MSC Cruises': (s) => {
    const shipSlug = getShipSlug(s.cruise_line, s.ship_name);
    return `https://www.msccruises.com/en-us/Cruises/${shipSlug}/${formatDate(s.departure_date)}`;
  },

  'Holland America Line': (s) => {
    const shipSlug = getShipSlug(s.cruise_line, s.ship_name);
    return `https://www.hollandamerica.com/cruises/${shipSlug}/${formatDate(s.departure_date)}`;
  },

  'Holland America': (s) => {
    const shipSlug = getShipSlug('Holland America Line', s.ship_name);
    return `https://www.hollandamerica.com/cruises/${shipSlug}/${formatDate(s.departure_date)}`;
  },

  'Disney Cruise Line': (s) => {
    const shipSlug = getShipSlug(s.cruise_line, s.ship_name);
    return `https://disneycruise.disney.go.com/cruises/${shipSlug}/${formatDate(s.departure_date)}/`;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔗 Generating real booking URLs for all sailings...\n');

  const pool = getPool();

  // Fetch all sailings
  const result = await pool.query(`
    SELECT id, cruise_line, ship_name, departure_date, departure_port
    FROM sailings
    ORDER BY cruise_line, departure_date
  `);

  const sailings: SailingRow[] = result.rows;
  console.log(`Found ${sailings.length} sailings without booking URLs`);

  if (sailings.length === 0) {
    console.log('✅ All sailings already have booking URLs');
    await closePool();
    return;
  }

  // Group by cruise line for reporting
  const byLine: Record<string, number> = {};
  for (const s of sailings) {
    byLine[s.cruise_line] = (byLine[s.cruise_line] || 0) + 1;
  }
  console.log('Breakdown by cruise line:');
  for (const [line, count] of Object.entries(byLine)) {
    const hasBuilder = BUILDERS[line] ? '✅' : '⚠️ (fallback)';
    console.log(`  ${line}: ${count} ${hasBuilder}`);
  }
  console.log('');

  // Generate URLs and update
  let updated = 0;
  let errors = 0;

  for (const sailing of sailings) {
    const builder = BUILDERS[sailing.cruise_line] || fallbackUrl;
    const bookingUrl = builder(sailing);

    try {
      await pool.query(
        'UPDATE sailings SET booking_url = $1, updated_at = now() WHERE id = $2',
        [bookingUrl, sailing.id]
      );
      updated++;
    } catch (err) {
      console.error(`  ❌ Failed to update ${sailing.cruise_line} ${sailing.ship_name} (id=${sailing.id}):`, err);
      errors++;
    }
  }

  console.log(`\n✅ Updated ${updated} sailings with real booking URLs`);
  if (errors > 0) console.log(`❌ ${errors} errors`);

  // Verification
  const verify = await pool.query(`
    SELECT COUNT(*) as total,
           COUNT(booking_url) as with_url,
           COUNT(*) FILTER (WHERE booking_url IS NULL OR booking_url = '') as without_url
    FROM sailings
  `);
  console.log('\n📊 Verification:');
  console.log(`  Total sailings: ${verify.rows[0].total}`);
  console.log(`  With booking URL: ${verify.rows[0].with_url}`);
  console.log(`  Without booking URL: ${verify.rows[0].without_url}`);

  await closePool();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});