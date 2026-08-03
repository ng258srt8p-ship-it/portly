// STUB DATA — NOT REAL SCRAPED DATA
//
// This file contains 81 hand-typed sailing records with manually entered
// prices, dates, and itineraries. No HTTP requests are made to any cruise
// line. Some data is factually incorrect (e.g., Carnival Horizon listed as
// departing Miami when it actually sails from Galveston, TX). The expander
// and bulk-import modules generate variants from these 81 bases.
//
// See docs/data-pipeline/real-data-research.md for the replacement plan.
//
// Stub cruise data for the scheduled sync handler.
// Mirrors scrapers/carnival-corp.ts + scrapers/additional-lines.ts but self-contained
// (no playwright/dotenv deps — safe for Workers runtime).
// 22 sailings across 9 cruise lines, each with cabin pricing + price history.

// ── Deterministic RNG helpers ───────────────────────────

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function sailingSeed(id: string, price: number, sailDate: string): number {
  return hashString(id + price + sailDate);
}

function cabinSeed(sailingSeed: number, cabinClass: string): number {
  return sailingSeed + hashString(cabinClass) * 17;
}

// ── Price history generation ────────────────────────────

// 5-point synthetic history (90-day trend) with 10 visually distinct shapes
function genHistory(currentPrice: number, originalPrice: number, sailingId?: string, sailDate?: string): number[] {
  const delta = originalPrice - currentPrice;
  const seed = sailingId && sailDate
    ? hashString(sailingId + currentPrice + sailDate)
    : (currentPrice * 9301 + originalPrice * 49297) % 233280;
  const rng = (offset: number) => {
    const x = Math.sin(seed + offset * 137.5) * 10000;
    return x - Math.floor(x);
  };

  const dropPercent = delta / originalPrice;
  const dropVariance = (rng(10) - 0.5) * 0.08;
  const effectiveDrop = Math.max(0.02, Math.min(0.6, dropPercent + dropVariance));
  const effectiveDelta = originalPrice * effectiveDrop;
  const adjustedCurrent = Math.round(originalPrice - effectiveDelta);

  const noise = (base: number, idx: number) => {
    const n = (rng(20 + idx) - 0.5) * 0.07;
    return Math.round(base * (1 + n));
  };

  const shapeType = Math.floor(rng(0) * 10);
  switch (shapeType) {
    case 0:
      return [
        Math.round(originalPrice),
        noise(originalPrice - effectiveDelta * 0.25, 1),
        noise(originalPrice - effectiveDelta * 0.50, 2),
        noise(originalPrice - effectiveDelta * 0.75, 3),
        adjustedCurrent,
      ];
    case 1: {
      const bumpFactor = 0.15 + rng(1) * 0.10;
      return [
        Math.round(originalPrice),
        noise(originalPrice - effectiveDelta * 0.35, 1),
        noise(originalPrice - effectiveDelta * (0.35 - bumpFactor), 2),
        noise(originalPrice - effectiveDelta * 0.60, 3),
        adjustedCurrent,
      ];
    }
    case 2:
      return [
        Math.round(originalPrice),
        noise(originalPrice - effectiveDelta * 0.55, 1),
        noise(originalPrice - effectiveDelta * (0.85 + rng(2) * 0.10), 2),
        noise(originalPrice - effectiveDelta * (0.35 + rng(3) * 0.15), 3),
        adjustedCurrent,
      ];
    case 3: {
      const stepPoint = 1 + Math.floor(rng(4) * 2);
      const vals: number[] = [];
      for (let i = 0; i < 5; i++) {
        if (i <= stepPoint) {
          vals.push(Math.round(originalPrice - effectiveDelta * (i / stepPoint) * 0.20));
        } else {
          vals.push(Math.round(originalPrice - effectiveDelta * (0.20 + (i - stepPoint) / (5 - stepPoint) * 0.80)));
        }
      }
      vals[vals.length - 1] = adjustedCurrent;
      for (let i = 1; i < 4; i++) vals[i] = noise(vals[i], i);
      return vals;
    }
    case 4:
      return [
        Math.round(originalPrice),
        noise(originalPrice - effectiveDelta * 0.60, 1),
        noise(originalPrice - effectiveDelta * 0.65, 2),
        noise(originalPrice - effectiveDelta * 0.70, 3),
        adjustedCurrent,
      ];
    case 5:
      return [
        Math.round(originalPrice),
        noise(originalPrice - effectiveDelta * 0.10, 1),
        noise(originalPrice - effectiveDelta * 0.15, 2),
        noise(originalPrice - effectiveDelta * 0.50, 3),
        adjustedCurrent,
      ];
    case 6:
      return [
        Math.round(originalPrice),
        noise(originalPrice - effectiveDelta * 0.40, 1),
        noise(originalPrice - effectiveDelta * 0.25, 2),
        noise(originalPrice - effectiveDelta * 0.55, 3),
        adjustedCurrent,
      ];
    case 7:
      return [
        Math.round(originalPrice),
        noise(originalPrice + effectiveDelta * 0.10, 1),
        noise(originalPrice + effectiveDelta * 0.05, 2),
        noise(originalPrice - effectiveDelta * 0.30, 3),
        adjustedCurrent,
      ];
    case 8:
      return [
        Math.round(originalPrice),
        noise(originalPrice - effectiveDelta * 0.30, 1),
        noise(originalPrice - effectiveDelta * 0.10, 2),
        noise(originalPrice - effectiveDelta * 0.50, 3),
        adjustedCurrent,
      ];
    case 9:
      return [
        Math.round(originalPrice),
        noise(originalPrice - effectiveDelta * 0.05, 1),
        noise(originalPrice - effectiveDelta * 0.08, 2),
        noise(originalPrice - effectiveDelta * 0.15, 3),
        adjustedCurrent,
      ];
    default:
      return [Math.round(originalPrice), adjustedCurrent];
  }
}

// Generate 5 ISO date strings spaced over the 90 days before today
function genPriceHistoryDates(_sailDate: string): string[] {
  const today = new Date();
  const out: string[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i * 18);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const CABIN_MULTIPLIERS: Record<string, number> = { Inside: 0.75, Oceanview: 1.0, Balcony: 1.65, Suite: 3.4 };

function genCabins(basePrice: number, _nights: number) {
  return [
    { cabinClass: 'Inside' as const, baseFarePerPerson: Math.round(basePrice * 0.75), portTaxPerPerson: 180, gratuityPerPersonPerNight: 18.5 },
    { cabinClass: 'Oceanview' as const, baseFarePerPerson: basePrice, portTaxPerPerson: 180, gratuityPerPersonPerNight: 18.5 },
    { cabinClass: 'Balcony' as const, baseFarePerPerson: Math.round(basePrice * 1.65), portTaxPerPerson: 180, gratuityPerPersonPerNight: 18.5 },
    { cabinClass: 'Suite' as const, baseFarePerPerson: Math.round(basePrice * 3.4), portTaxPerPerson: 250, gratuityPerPersonPerNight: 22.5 },
  ];
}

interface CabinPriceBehavior {
  multiplier: number;
  dropPercent: number;
  curveShape: string;
}

const CABIN_BEHAVIORS: Record<string, CabinPriceBehavior> = {
  Inside: { multiplier: 0.75, dropPercent: 0.30, curveShape: 'linear' },
  Oceanview: { multiplier: 1.0, dropPercent: 0.22, curveShape: 'bump' },
  Balcony: { multiplier: 1.65, dropPercent: 0.15, curveShape: 'vshape' },
  Suite: { multiplier: 3.4, dropPercent: 0.06, curveShape: 'uptick' },
};

const ALL_SHAPES = ['linear', 'bump', 'vshape', 'uptick', 'early-drop', 'late-drop', 'w-shape', 'inverted-v'];

function genCabinHistory(baseFare: number, behavior: CabinPriceBehavior, seed: number): number[] {
  const rng = (offset: number) => {
    const x = Math.sin(seed + offset * 137.5) * 10000;
    return x - Math.floor(x);
  };

  const effectiveDropPercent = Math.max(0.02, Math.min(0.5, behavior.dropPercent + (rng(0) - 0.5) * 0.16));
  const shapeIndex = Math.floor(rng(1) * ALL_SHAPES.length);
  const effectiveShape = ALL_SHAPES[shapeIndex];

  const peak = Math.round(baseFare / (1 - effectiveDropPercent));
  const drop = peak - baseFare;
  const rng2 = (offset: number) => {
    const x = Math.sin(seed + offset * 137.5) * 10000;
    return x - Math.floor(x);
  };

  switch (effectiveShape) {
    case 'linear':
      return [peak, Math.round(peak - drop * 0.25), Math.round(peak - drop * 0.50), Math.round(peak - drop * 0.75), baseFare];
    case 'bump': {
      const bumpFactor = 0.15 + rng2(2) * 0.10;
      return [peak, Math.round(peak - drop * 0.35), Math.round(peak - drop * (0.35 - bumpFactor)), Math.round(peak - drop * 0.60), baseFare];
    }
    case 'vshape':
      return [peak, Math.round(peak - drop * 0.55), Math.round(peak - drop * (0.85 + rng2(2) * 0.10)), Math.round(peak - drop * (0.35 + rng2(3) * 0.15)), baseFare];
    case 'uptick': {
      const startVal = Math.round(peak - drop * 0.30);
      return [startVal, Math.round(startVal - (baseFare - startVal) * 0.10), Math.round(startVal + (baseFare - startVal) * 0.30), Math.round(startVal + (baseFare - startVal) * 0.65), baseFare];
    }
    case 'early-drop':
      return [peak, Math.round(peak - drop * 0.60), Math.round(peak - drop * 0.65), Math.round(peak - drop * 0.70), baseFare];
    case 'late-drop':
      return [peak, Math.round(peak - drop * 0.10), Math.round(peak - drop * 0.15), Math.round(peak - drop * 0.50), baseFare];
    case 'w-shape':
      return [peak, Math.round(peak - drop * 0.40), Math.round(peak - drop * 0.25), Math.round(peak - drop * 0.55), baseFare];
    case 'inverted-v':
      return [peak, Math.round(peak + drop * 0.10), Math.round(peak + drop * 0.05), Math.round(peak - drop * 0.30), baseFare];
    default:
      return [peak, baseFare];
  }
}

function genMultiCabinPriceHistory(currentInsidePrice: number, _originalPrice: number, sailDate: string, sailingId: string) {
  const dates = genPriceHistoryDates(sailDate);
  const entries: Array<{ price: number; date: string; cabinClass: string }> = [];
  for (const [cabinClass, behavior] of Object.entries(CABIN_BEHAVIORS)) {
    const baseFare = Math.round(currentInsidePrice * behavior.multiplier);
    const cSeed = cabinSeed(sailingSeed(sailingId, currentInsidePrice, sailDate), cabinClass);
    const prices = genCabinHistory(baseFare, behavior, cSeed);
    for (let i = 0; i < dates.length; i++) {
      entries.push({ price: prices[i], date: dates[i], cabinClass });
    }
  }
  return entries;
}

// ── Sailing record type ────────────────────────────────

export interface StubSailing {
  id: string;
  cruiseLine: string;
  ship: string;
  destination: string;
  departurePort: string;
  departureRegion?: string;
  duration: string;
  nights: number;
  sailDate: string;
  price: number;
  originalPrice: number;
  dropPercent: number;
  badgeType: 'drop' | 'solo' | 'gold';
  badgeText: string;
  history: number[];
  bookingUrl?: string;
  bookingLabel?: string;
  itinerary?: string[];
}

export interface StubSailingDetail extends StubSailing {
  cabins: Array<{ cabinClass: string; baseFarePerPerson: number; portTaxPerPerson: number; gratuityPerPersonPerNight: number }>;
  priceHistory: Array<{ price: number; date: string; cabinClass: string }>;
}

function makeSailing(
  id: string, cruiseLine: string, ship: string, destination: string,
  departurePort: string, departureRegion: string, nights: number, sailDate: string,
  price: number, originalPrice: number, dropPercent: number,
  bookingUrl: string, bookingLabel: string, itinerary: string[]
): StubSailing {
  return {
    id, cruiseLine, ship, destination, departurePort, departureRegion,
    duration: `${nights} nights`, nights, sailDate,
    price, originalPrice, dropPercent,
    badgeType: 'drop' as const, badgeText: 'Price Drop',
    history: genHistory(price, originalPrice, id, sailDate),
    bookingUrl, bookingLabel, itinerary,
  };
}

// ── All 22 sailings ─────────────────────────────────────

export function getAllSailings(): StubSailing[] {
  return [
    // Carnival (4)
    makeSailing('carnival_mardi-gras_2026-01-15_galveston_7', 'Carnival', 'Mardi Gras', 'Western Caribbean', 'Galveston', 'Texas', 7, '2026-01-15', 649, 899, 28, 'https://www.carnival.com/cruises/mardi-gras', 'Carnival', ['Galveston', 'Cozumel', 'Costa Maya', 'Mahogany Bay', 'Galveston']),
    makeSailing('carnival_vista_2026-02-10_miami_5', 'Carnival', 'Carnival Vista', 'Eastern Caribbean', 'Miami', 'Florida', 5, '2026-02-10', 429, 549, 22, 'https://www.carnival.com/cruises/carnival-vista', 'Carnival', ['Miami', 'Amber Cove', 'Grand Turk', 'Miami']),
    makeSailing('carnival_panorama_2026-03-20_long-beach_7', 'Carnival', 'Carnival Panorama', 'Mexican Riviera', 'Long Beach', 'California', 7, '2026-03-20', 549, 749, 27, 'https://www.carnival.com/cruises/carnival-panorama', 'Carnival', ['Long Beach', 'Puerto Vallarta', 'Mazatlan', 'Cabo San Lucas', 'Long Beach']),
    makeSailing('carnival_jubilee_2026-04-05_galveston_7', 'Carnival', 'Carnival Jubilee', 'Western Caribbean', 'Galveston', 'Texas', 7, '2026-04-05', 729, 999, 27, 'https://www.carnival.com/cruises/carnival-jubilee', 'Carnival', ['Galveston', 'Cozumel', 'Costa Maya', 'Isla Roatan', 'Galveston']),

    // Princess Cruises (3)
    makeSailing('princess_discovery_2026-03-05_los-angeles_10', 'Princess Cruises', 'Discovery Princess', 'Mexican Riviera', 'Los Angeles', 'California', 10, '2026-03-05', 1299, 1599, 19, 'https://www.princess.com/find/cruise/search', 'Princess', ['Los Angeles', 'Puerto Vallarta', 'Mazatlan', 'Cabo San Lucas', 'Ensenada', 'Los Angeles']),
    makeSailing('princess_regal_2026-01-20_fort-lauderdale_7', 'Princess Cruises', 'Regal Princess', 'Eastern Caribbean', 'Fort Lauderdale', 'Florida', 7, '2026-01-20', 799, 1149, 30, 'https://www.princess.com/find/cruise/search', 'Princess', ['Fort Lauderdale', 'Princess Cays', 'St. Thomas', 'St. Maarten', 'Fort Lauderdale']),
    makeSailing('princess_sapphire_2026-05-09_seattle_7', 'Princess Cruises', 'Sapphire Princess', 'Alaska Inside Passage', 'Seattle', 'Washington', 7, '2026-05-09', 999, 1399, 29, 'https://www.princess.com/find/cruise/search', 'Princess', ['Seattle', 'Ketchikan', 'Juneau', 'Skagway', 'Victoria', 'Seattle']),

    // Holland America (2)
    makeSailing('hal_nieuw-amsterdam_2026-04-12_fort-lauderdale_14', 'Holland America Line', 'Nieuw Amsterdam', 'Panama Canal', 'Fort Lauderdale', 'Florida', 14, '2026-04-12', 2199, 2799, 21, 'https://www.hollandamerica.com/cruises', 'HAL', ['Fort Lauderdale', 'Oranjestad, Aruba', 'Willemstad, Curacao', 'Cartagena', 'Panama Canal Transit', 'Puerto Limon', 'Fort Lauderdale']),
    makeSailing('hal_koningsdam_2026-05-15_vancouver_7', 'Holland America Line', 'Koningsdam', 'Alaska Glacier Bay', 'Vancouver', 'Canada', 7, '2026-05-15', 1249, 1699, 26, 'https://www.hollandamerica.com/cruises', 'HAL', ['Vancouver', 'Juneau', 'Glacier Bay', 'Ketchikan', 'Vancouver']),

    // Cunard (2)
    makeSailing('cunard_qm2_2026-05-20_southampton_7', 'Cunard Line', 'Queen Mary 2', 'Transatlantic', 'Southampton', 'Europe', 7, '2026-05-20', 1899, 2499, 24, 'https://www.cunard.com/en-us/cruises', 'Cunard', ['Southampton', 'At Sea', 'At Sea', 'At Sea', 'At Sea', 'New York']),
    makeSailing('cunard_queen-anne_2026-08-01_hamburg_14', 'Cunard Line', 'Queen Anne', 'Norwegian Fjords', 'Hamburg', 'Europe', 14, '2026-08-01', 2399, 3299, 27, 'https://www.cunard.com/en-us/cruises', 'Cunard', ['Hamburg', 'Bergen', 'Geiranger', 'Alesund', 'Stavanger', 'Hamburg']),

    // Royal Caribbean (3)
    makeSailing('rci_wonder_2026-06-01_cape-canaveral_7', 'Royal Caribbean', 'Wonder of the Seas', 'Eastern Caribbean', 'Cape Canaveral', 'Florida', 7, '2026-06-01', 799, 1099, 27, 'https://www.royalcaribbean.com/cruises', 'Royal Caribbean', ['Cape Canaveral', 'CocoCay, Bahamas', 'St. Thomas', 'St. Maarten', 'Cape Canaveral']),
    makeSailing('rci_harmony_2026-07-10_barcelona_7', 'Royal Caribbean', 'Harmony of the Seas', 'Western Mediterranean', 'Barcelona', 'Europe', 7, '2026-07-10', 949, 1249, 24, 'https://www.royalcaribbean.com/cruises', 'Royal Caribbean', ['Barcelona', 'Palma de Mallorca', 'Provence, France', 'Florence/Pisa', 'Rome', 'Naples', 'Barcelona']),
    makeSailing('rci_icon_2026-01-10_miami_7', 'Royal Caribbean', 'Icon of the Seas', 'Eastern Caribbean', 'Miami', 'Florida', 7, '2026-01-10', 899, 1299, 31, 'https://www.royalcaribbean.com/cruises', 'Royal Caribbean', ['Miami', 'CocoCay, Bahamas', 'St. Thomas', 'San Juan', 'Miami']),

    // Norwegian Cruise Line (2)
    makeSailing('ncl_encore_2026-02-15_miami_7', 'Norwegian Cruise Line', 'Norwegian Encore', 'Eastern Caribbean', 'Miami', 'Florida', 7, '2026-02-15', 699, 999, 30, 'https://www.ncl.com/cruise-search', 'NCL', ['Miami', 'Puerto Plata', 'St. Thomas', 'Tortola', 'Great Stirrup Cay', 'Miami']),
    makeSailing('ncl_prima_2026-09-10_rome_10', 'Norwegian Cruise Line', 'Norwegian Prima', 'Greek Isles', 'Rome', 'Europe', 10, '2026-09-10', 1499, 1999, 25, 'https://www.ncl.com/cruise-search', 'NCL', ['Rome (Civitavecchia)', 'Florence/Pisa', 'Cannes', 'Palma de Mallorca', 'Barcelona', 'Naples', 'Rome (Civitavecchia)']),

    // MSC Cruises (2)
    makeSailing('msc_seascape_2026-03-01_miami_7', 'MSC Cruises', 'MSC Seascape', 'Western Caribbean', 'Miami', 'Florida', 7, '2026-03-01', 549, 799, 31, 'https://www.msccruises.com/en-us', 'MSC', ['Miami', 'Cozumel', 'George Town, Cayman Islands', 'Ocho Rios, Jamaica', 'Ocean Cay MSC Marine Reserve', 'Miami']),
    makeSailing('msc_virtuosa_2026-06-20_dubai_7', 'MSC Cruises', 'MSC Virtuosa', 'Arabian Gulf', 'Dubai', 'Middle East', 7, '2026-06-20', 799, 1099, 27, 'https://www.msccruises.com/en-us', 'MSC', ['Dubai', 'Abu Dhabi', 'Sir Bani Yas Island', 'Doha, Qatar', 'Dubai']),

    // Disney Cruise Line (2)
    makeSailing('disney_wish_2026-04-18_port-canaveral_4', 'Disney Cruise Line', 'Disney Wish', 'Bahamas', 'Port Canaveral', 'Florida', 4, '2026-04-18', 1599, 2099, 24, 'https://disneycruise.disney.go.com', 'Disney', ['Port Canaveral', 'Nassau, Bahamas', 'Castaway Cay', 'Port Canaveral']),
    makeSailing('disney_fantasy_2026-12-05_port-canaveral_7', 'Disney Cruise Line', 'Disney Fantasy', 'Eastern Caribbean', 'Port Canaveral', 'Florida', 7, '2026-12-05', 2299, 2899, 21, 'https://disneycruise.disney.go.com', 'Disney', ['Port Canaveral', 'St. Thomas', 'Tortola', 'Castaway Cay', 'Port Canaveral']),

    // Celebrity Cruises (2)
    makeSailing('celebrity_apex_2026-01-25_fort-lauderdale_7', 'Celebrity Cruises', 'Celebrity Apex', 'Southern Caribbean', 'Fort Lauderdale', 'Florida', 7, '2026-01-25', 899, 1249, 28, 'https://www.celebritycruises.com', 'Celebrity', ['Fort Lauderdale', 'Philipsburg, St. Maarten', 'San Juan, Puerto Rico', 'Puerto Plata, DR', 'Fort Lauderdale']),
    makeSailing('celebrity_beyond_2026-07-05_civitavecchia_10', 'Celebrity Cruises', 'Celebrity Beyond', 'Italian Mediterranean', 'Civitavecchia', 'Europe', 10, '2026-07-05', 1799, 2399, 25, 'https://www.celebritycruises.com', 'Celebrity', ['Civitavecchia (Rome)', 'Florence/Pisa', 'Cannes, France', 'Palma de Mallorca', 'Barcelona', 'Valencia', 'Seville', 'Lisbon', 'Civitavecchia (Rome)']),

    // ── Additional Carnival sailings (6 more) ──
    makeSailing('carnival_breeze_2026-01-22_galveston_7', 'Carnival', 'Carnival Breeze', 'Western Caribbean', 'Galveston', 'Texas', 7, '2026-01-22', 549, 799, 31, 'https://www.carnival.com/cruises/carnival-breeze', 'Carnival', ['Galveston', 'Cozumel', 'Belize City', 'Mahogany Bay', 'Galveston']),
    makeSailing('carnival_horizon_2026-03-08_miami_6', 'Carnival', 'Carnival Horizon', 'Eastern Caribbean', 'Miami', 'Florida', 6, '2026-03-08', 599, 849, 29, 'https://www.carnival.com/cruises/carnival-horizon', 'Carnival', ['Miami', 'Amber Cove', 'Grand Turk', 'Half Moon Cay', 'Miami']),
    makeSailing('carnival_sunrise_2026-02-28_miami_5', 'Carnival', 'Carnival Sunrise', 'Bahamas', 'Miami', 'Florida', 5, '2026-02-28', 379, 549, 31, 'https://www.carnival.com/cruises/carnival-sunrise', 'Carnival', ['Miami', 'Nassau, Bahamas', 'Princess Cays', 'Miami']),
    makeSailing('carnival_pride_2026-04-20_baltimore_7', 'Carnival', 'Carnival Pride', 'Bahamas', 'Baltimore', 'Maryland', 7, '2026-04-20', 629, 879, 28, 'https://www.carnival.com/cruises/carnival-pride', 'Carnival', ['Baltimore', 'Port Canaveral', 'Nassau, Bahamas', 'Freeport, Bahamas', 'Baltimore']),
    makeSailing('carnival_glory_2026-05-10_new-orleans_7', 'Carnival', 'Carnival Glory', 'Western Caribbean', 'New Orleans', 'Louisiana', 7, '2026-05-10', 579, 799, 28, 'https://www.carnival.com/cruises/carnival-glory', 'Carnival', ['New Orleans', 'Cozumel', 'Costa Maya', 'Mahogany Bay', 'New Orleans']),
    makeSailing('carnival_magic_2026-06-15_galveston_7', 'Carnival', 'Carnival Magic', 'Western Caribbean', 'Galveston', 'Texas', 7, '2026-06-15', 699, 949, 26, 'https://www.carnival.com/cruises/carnival-magic', 'Carnival', ['Galveston', 'Cozumel', 'Costa Maya', 'Isla Roatan', 'Galveston']),

    // ── Additional Princess sailings (4 more) ──
    makeSailing('princess_sky_2026-02-14_los-angeles_7', 'Princess Cruises', 'Sky Princess', 'Mexican Riviera', 'Los Angeles', 'California', 7, '2026-02-14', 899, 1199, 25, 'https://www.princess.com/find/cruise/search', 'Princess', ['Los Angeles', 'Puerto Vallarta', 'Mazatlan', 'Cabo San Lucas', 'Los Angeles']),
    makeSailing('princess_island_2026-04-02_fort-lauderdale_7', 'Princess Cruises', 'Island Princess', 'Panama Canal', 'Fort Lauderdale', 'Florida', 10, '2026-04-02', 1499, 1999, 25, 'https://www.princess.com/find/cruise/search', 'Princess', ['Fort Lauderdale', 'Aruba', 'Cartagena', 'Panama Canal Transit', 'Puerto Limon', 'Fort Lauderdale']),
    makeSailing('princess_coral_2026-06-01_seattle_10', 'Princess Cruises', 'Coral Princess', 'Alaska Inside Passage', 'Seattle', 'Washington', 10, '2026-06-01', 1299, 1749, 26, 'https://www.princess.com/find/cruise/search', 'Princess', ['Seattle', 'Ketchikan', 'Juneau', 'Glacier Bay', 'Skagway', 'Victoria', 'Seattle']),
    makeSailing('princess_caribbean_2026-01-08_fort-lauderdale_7', 'Princess Cruises', 'Caribbean Princess', 'Eastern Caribbean', 'Fort Lauderdale', 'Florida', 7, '2026-01-08', 749, 1049, 29, 'https://www.princess.com/find/cruise/search', 'Princess', ['Fort Lauderdale', 'Princess Cays', 'St. Thomas', 'Turks and Caicos', 'Fort Lauderdale']),

    // ── Additional Holland America sailings (3 more) ──
    makeSailing('hal_zaandam_2026-09-15_vancouver_7', 'Holland America Line', 'Zaandam', 'Alaska Inside Passage', 'Vancouver', 'Canada', 7, '2026-09-15', 1099, 1499, 27, 'https://www.hollandamerica.com/cruises', 'HAL', ['Vancouver', 'Juneau', 'Tracy Arm Fjord', 'Ketchikan', 'Vancouver']),
    makeSailing('hal_nieuw_statendam_2026-03-10_fort-lauderdale_11', 'Holland America Line', 'Nieuw Statendam', 'Southern Caribbean', 'Fort Lauderdale', 'Florida', 11, '2026-03-10', 1599, 2149, 25, 'https://www.hollandamerica.com/cruises', 'HAL', ['Fort Lauderdale', 'Half Moon Cay', 'Aruba', 'Curacao', 'Bonaire', 'Fort Lauderdale']),
    makeSailing('hal_westerdam_2026-10-05_seattle_7', 'Holland America Line', 'Westerdam', 'Alaska Glacier Bay', 'Seattle', 'Washington', 7, '2026-10-05', 1199, 1599, 25, 'https://www.hollandamerica.com/cruises', 'HAL', ['Seattle', 'Juneau', 'Glacier Bay', 'Ketchikan', 'Victoria', 'Seattle']),

    // ── Additional Cunard sailings (2 more) ──
    makeSailing('cunard_qm2_2026-01-08_new-york_8', 'Cunard Line', 'Queen Mary 2', 'Transatlantic', 'New York', 'New York', 8, '2026-01-08', 1599, 2199, 27, 'https://www.cunard.com/en-us/cruises', 'Cunard', ['New York', 'At Sea', 'At Sea', 'At Sea', 'At Sea', 'Southampton']),
    makeSailing('cunard_queen-victoria_2026-04-25_southampton_7', 'Cunard Line', 'Queen Victoria', 'Western Europe', 'Southampton', 'Europe', 7, '2026-04-25', 1499, 1999, 25, 'https://www.cunard.com/en-us/cruises', 'Cunard', ['Southampton', 'Vigo, Spain', 'Lisbon', 'Cadiz', 'Southampton']),

    // ── Additional Royal Caribbean sailings (5 more) ──
    makeSailing('rci_symphony_2026-03-15_miami_7', 'Royal Caribbean', 'Symphony of the Seas', 'Eastern Caribbean', 'Miami', 'Florida', 7, '2026-03-15', 749, 1049, 29, 'https://www.royalcaribbean.com/cruises', 'Royal Caribbean', ['Miami', 'St. Thomas', 'St. Maarten', 'CocoCay, Bahamas', 'Miami']),
    makeSailing('rci_odyssey_2026-02-01_cape-liberty_7', 'Royal Caribbean', 'Odyssey of the Seas', 'Bermuda', 'Bayonne', 'New Jersey', 7, '2026-02-01', 899, 1249, 28, 'https://www.royalcaribbean.com/cruises', 'Royal Caribbean', ['Bayonne', 'Port Canaveral', 'Perfect Day at CocoCay', 'Bermuda', 'Bayonne']),
    makeSailing('rci_oasis_2026-05-20_miami_7', 'Royal Caribbean', 'Oasis of the Seas', 'Western Caribbean', 'Miami', 'Florida', 7, '2026-05-20', 699, 949, 26, 'https://www.royalcaribbean.com/cruises', 'Royal Caribbean', ['Miami', 'Cozumel', 'Costa Maya', 'Roatan', 'CocoCay, Bahamas', 'Miami']),
    makeSailing('rci_utopia_2026-01-17_port-canaveral_4', 'Royal Caribbean', 'Utopia of the Seas', 'Bahamas', 'Port Canaveral', 'Florida', 4, '2026-01-17', 549, 799, 31, 'https://www.royalcaribbean.com/cruises', 'Royal Caribbean', ['Port Canaveral', 'CocoCay, Bahamas', 'Nassau, Bahamas', 'Port Canaveral']),
    makeSailing('rci_anthem_2026-04-10_bayonne_7', 'Royal Caribbean', 'Anthem of the Seas', 'Bermuda', 'Bayonne', 'New Jersey', 7, '2026-04-10', 799, 1099, 27, 'https://www.royalcaribbean.com/cruises', 'Royal Caribbean', ['Bayonne', 'Bermuda', 'Bermuda', 'At Sea', 'Bayonne']),

    // ── Additional Norwegian sailings (4 more) ──
    makeSailing('ncl_bliss_2026-03-22_seattle_7', 'Norwegian Cruise Line', 'Norwegian Bliss', 'Alaska Inside Passage', 'Seattle', 'Washington', 7, '2026-03-22', 799, 1149, 30, 'https://www.ncl.com/cruise-search', 'NCL', ['Seattle', 'Juneau', 'Skagway', 'Glacier Bay', 'Victoria', 'Seattle']),
    makeSailing('ncl_escape_2026-01-30_miami_7', 'Norwegian Cruise Line', 'Norwegian Escape', 'Western Caribbean', 'Miami', 'Florida', 7, '2026-01-30', 649, 899, 28, 'https://www.ncl.com/cruise-search', 'NCL', ['Miami', 'Roatan', 'Harvest Caye', 'Costa Maya', 'Cozumel', 'Miami']),
    makeSailing('ncl_joy_2026-07-15_seattle_7', 'Norwegian Cruise Line', 'Norwegian Joy', 'Alaska Glacier Bay', 'Seattle', 'Washington', 7, '2026-07-15', 849, 1179, 28, 'https://www.ncl.com/cruise-search', 'NCL', ['Seattle', 'Juneau', 'Glacier Bay', 'Ketchikan', 'Victoria', 'Seattle']),
    makeSailing('ncl_viva_2026-05-01_rome_7', 'Norwegian Cruise Line', 'Norwegian Viva', 'Western Mediterranean', 'Rome', 'Europe', 7, '2026-05-01', 1199, 1599, 25, 'https://www.ncl.com/cruise-search', 'NCL', ['Rome (Civitavecchia)', 'Florence/Pisa', 'Cannes', 'Palma de Mallorca', 'Barcelona', 'Rome (Civitavecchia)']),

    // ── Additional MSC sailings (3 more) ──
    makeSailing('msc_europa_2026-04-01_miami_7', 'MSC Cruises', 'MSC Seascape', 'Eastern Caribbean', 'Miami', 'Florida', 7, '2026-04-01', 599, 849, 29, 'https://www.msccruises.com/en-us', 'MSC', ['Miami', 'Puerto Plata', 'San Juan', 'Ocean Cay MSC Marine Reserve', 'Miami']),
    makeSailing('msc_bellissima_2026-03-20_dubai_7', 'MSC Cruises', 'MSC Bellissima', 'Arabian Gulf', 'Dubai', 'Middle East', 7, '2026-03-20', 749, 1029, 27, 'https://www.msccruises.com/en-us', 'MSC', ['Dubai', 'Abu Dhabi', 'Sir Bani Yas Island', 'Doha', 'Dubai']),
    makeSailing('msc_divina_2026-01-12_miami_7', 'MSC Cruises', 'MSC Divina', 'Western Caribbean', 'Miami', 'Florida', 7, '2026-01-12', 479, 699, 31, 'https://www.msccruises.com/en-us', 'MSC', ['Miami', 'Falmouth, Jamaica', 'George Town, Cayman Islands', 'Cozumel', 'Miami']),

    // ── Additional Disney sailings (2 more) ──
    makeSailing('disney_magic_2026-03-15_galveston_7', 'Disney Cruise Line', 'Disney Magic', 'Western Caribbean', 'Galveston', 'Texas', 7, '2026-03-15', 1899, 2499, 24, 'https://disneycruise.disney.go.com', 'Disney', ['Galveston', 'Cozumel', 'Grand Cayman', 'Castaway Cay', 'Galveston']),
    makeSailing('disney_wonder_2026-05-02_vancouver_5', 'Disney Cruise Line', 'Disney Wonder', 'Alaska Inside Passage', 'Vancouver', 'Canada', 5, '2026-05-02', 1799, 2399, 25, 'https://disneycruise.disney.go.com', 'Disney', ['Vancouver', 'Juneau', 'Skagway', 'Vancouver']),

    // ── Additional Celebrity sailings (3 more) ──
    makeSailing('celebrity_edge_2026-03-01_fort-lauderdale_7', 'Celebrity Cruises', 'Celebrity Edge', 'Eastern Caribbean', 'Fort Lauderdale', 'Florida', 7, '2026-03-01', 849, 1199, 29, 'https://www.celebritycruises.com', 'Celebrity', ['Fort Lauderdale', 'Puerto Plata', 'St. Thomas', 'St. Maarten', 'Fort Lauderdale']),
    makeSailing('celebrity_summit_2026-06-10_civitavecchia_10', 'Celebrity Cruises', 'Celebrity Summit', 'Greek Isles', 'Civitavecchia', 'Europe', 10, '2026-06-10', 1599, 2149, 26, 'https://www.celebritycruises.com', 'Celebrity', ['Civitavecchia (Rome)', 'Santorini', 'Mykonos', 'Athens', 'Crete', 'Naples', 'Civitavecchia (Rome)']),
    makeSailing('celebrity_solstice_2026-02-15_sydney_12', 'Celebrity Cruises', 'Celebrity Solstice', 'Australia & New Zealand', 'Sydney', 'Australia', 12, '2026-02-15', 2099, 2799, 25, 'https://www.celebritycruises.com', 'Celebrity', ['Sydney', 'Melbourne', 'Hobart', 'Fiordland', 'Dunedin', 'Wellington', 'Sydney']),

    // ── New cruise lines: Virgin Voyages (3) ──
    makeSailing('virgin_scarlet_lady_2026-02-20_miami_5', 'Virgin Voyages', 'Scarlet Lady', 'Bahamas', 'Miami', 'Florida', 5, '2026-02-20', 799, 1149, 30, 'https://www.virginvoyages.com', 'Virgin', ['Miami', 'Bimini Beach Club', 'Miami']),
    makeSailing('virgin_valiant_lady_2026-04-15_miami_7', 'Virgin Voyages', 'Valiant Lady', 'Eastern Caribbean', 'Miami', 'Florida', 7, '2026-04-15', 999, 1349, 26, 'https://www.virginvoyages.com', 'Virgin', ['Miami', 'Puerto Plata', 'St. Maarten', 'Bimini Beach Club', 'Miami']),
    makeSailing('virgin_resilient_lady_2026-05-25_athens_7', 'Virgin Voyages', 'Resilient Lady', 'Greek Isles', 'Athens', 'Europe', 7, '2026-05-25', 1299, 1749, 26, 'https://www.virginvoyages.com', 'Virgin', ['Athens', 'Santorini', 'Mykonos', 'Crete', 'Athens']),

    // ── New cruise line: Oceania (3) ──
    makeSailing('oceania_marina_2026-03-08_miami_10', 'Oceania Cruises', 'Marina', 'Southern Caribbean', 'Miami', 'Florida', 10, '2026-03-08', 2499, 3299, 24, 'https://www.oceaniacruises.com', 'Oceania', ['Miami', 'Aruba', 'Curacao', 'Bonaire', 'Grenada', 'Barbados', 'Miami']),
    makeSailing('oceania_riviera_2026-06-05_barcelona_10', 'Oceania Cruises', 'Riviera', 'Western Mediterranean', 'Barcelona', 'Europe', 10, '2026-06-05', 2799, 3699, 24, 'https://www.oceaniacruises.com', 'Oceania', ['Barcelona', 'Monte Carlo', 'Florence/Pisa', 'Rome', 'Amalfi', 'Sicily', 'Barcelona']),
    makeSailing('oceania_regatta_2026-09-20_seattle_10', 'Oceania Cruises', 'Regatta', 'Alaska Inside Passage', 'Seattle', 'Washington', 10, '2026-09-20', 2299, 2999, 23, 'https://www.oceaniacruises.com', 'Oceania', ['Seattle', 'Juneau', 'Ketchikan', 'Sitka', 'Victoria', 'Seattle']),

    // ── New cruise line: Seabourn (2) ──
    makeSailing('seabourn_odyssey_2026-04-10_miami_14', 'Seabourn Cruise Line', 'Seabourn Odyssey', 'Panama Canal', 'Miami', 'Florida', 14, '2026-04-10', 3499, 4499, 22, 'https://www.seabourn.com', 'Seabourn', ['Miami', 'Aruba', 'Cartagena', 'Panama Canal Transit', 'Costa Rica', 'Miami']),
    makeSailing('seabourn_encore_2026-08-10_athens_14', 'Seabourn Cruise Line', 'Seabourn Encore', 'Greek Isles & Turkey', 'Athens', 'Europe', 14, '2026-08-10', 4999, 6499, 23, 'https://www.seabourn.com', 'Seabourn', ['Athens', 'Santorini', 'Mykonos', 'Istanbul', 'Kusadasi', 'Crete', 'Athens']),

    // ── New cruise line: Azamara (2) ──
    makeSailing('azamara_pursuit_2026-05-15_lisbon_12', 'Azamara Club Cruises', 'Azamara Pursuit', 'Western Europe', 'Lisbon', 'Europe', 12, '2026-05-15', 2999, 3899, 23, 'https://www.azamara.com', 'Azamara', ['Lisbon', 'Porto', 'Vigo', 'Bordeaux', 'Bilbao', 'Lisbon']),
    makeSailing('azamara_journey_2026-10-01_athens_10', 'Azamara Club Cruises', 'Azamara Journey', 'Greek Isles & Black Sea', 'Athens', 'Europe', 10, '2026-10-01', 2799, 3599, 22, 'https://www.azamara.com', 'Azamara', ['Athens', 'Istanbul', 'Varna', 'Constanza', 'Mykonos', 'Santorini', 'Athens']),

    // ── New cruise line: Princess additional (2 more) ──
    makeSailing('princess_majestic_2026-11-10_sydney_12', 'Princess Cruises', 'Majestic Princess', 'Australia & New Zealand', 'Sydney', 'Australia', 12, '2026-11-10', 1899, 2599, 27, 'https://www.princess.com/find/cruise/search', 'Princess', ['Sydney', 'Melbourne', 'Hobart', 'Fiordland', 'Dunedin', 'Wellington', 'Sydney']),
    makeSailing('princess_voyager_2026-08-10_seattle_7', 'Princess Cruises', 'Coral Princess', 'Alaska Glacier Bay', 'Seattle', 'Washington', 7, '2026-08-10', 1099, 1499, 27, 'https://www.princess.com/find/cruise/search', 'Princess', ['Seattle', 'Juneau', 'Glacier Bay', 'Ketchikan', 'Victoria', 'Seattle']),

    // ── New cruise line: Carnival additional (2 more) ──
    makeSailing('carnival_splendor_2026-09-01_long-beach_7', 'Carnival', 'Carnival Splendor', 'Mexican Riviera', 'Long Beach', 'California', 7, '2026-09-01', 599, 829, 28, 'https://www.carnival.com/cruises/carnival-splendor', 'Carnival', ['Long Beach', 'Puerto Vallarta', 'Mazatlan', 'Cabo San Lucas', 'Long Beach']),
    makeSailing('carnival_conquest_2026-03-12_miami_4', 'Carnival', 'Carnival Conquest', 'Bahamas', 'Miami', 'Florida', 4, '2026-03-12', 329, 499, 34, 'https://www.carnival.com/cruises/carnival-conquest', 'Carnival', ['Miami', 'Key West', 'Nassau, Bahamas', 'Miami']),

    // ── Royal Caribbean additional (2 more) ──
    makeSailing('rci_liberty_2026-11-20_fort-lauderdale_7', 'Royal Caribbean', 'Liberty of the Seas', 'Western Caribbean', 'Fort Lauderdale', 'Florida', 7, '2026-11-20', 649, 879, 26, 'https://www.royalcaribbean.com/cruises', 'Royal Caribbean', ['Fort Lauderdale', 'Cozumel', 'Costa Maya', 'CocoCay, Bahamas', 'Fort Lauderdale']),
    makeSailing('rci_grandeur_2026-06-20_baltimore_9', 'Royal Caribbean', 'Grandeur of the Seas', 'Bahamas & Bermuda', 'Baltimore', 'Maryland', 9, '2026-06-20', 899, 1199, 25, 'https://www.royalcaribbean.com/cruises', 'Royal Caribbean', ['Baltimore', 'Port Canaveral', 'CocoCay, Bahamas', 'Bermuda', 'Baltimore']),

    // ── Norwegian additional (2 more) ──
    makeSailing('ncl_sky_2026-04-25_miami_4', 'Norwegian Cruise Line', 'Norwegian Sky', 'Bahamas', 'Miami', 'Florida', 4, '2026-04-25', 399, 579, 31, 'https://www.ncl.com/cruise-search', 'NCL', ['Miami', 'Great Stirrup Cay', 'Nassau, Bahamas', 'Miami']),
    makeSailing('ncl_gem_2026-10-10_new-york_7', 'Norwegian Cruise Line', 'Norwegian Gem', 'Bermuda', 'New York', 'New York', 7, '2026-10-10', 749, 999, 25, 'https://www.ncl.com/cruise-search', 'NCL', ['New York', 'Bermuda', 'Bermuda', 'At Sea', 'New York']),

    // ── Disney additional (1 more) ──
    makeSailing('disney_destiny_2026-06-20_fort-lauderdale_4', 'Disney Cruise Line', 'Disney Destiny', 'Bahamas', 'Fort Lauderdale', 'Florida', 4, '2026-06-20', 1499, 1999, 25, 'https://disneycruise.disney.go.com', 'Disney', ['Fort Lauderdale', 'Nassau, Bahamas', 'Castaway Cay', 'Fort Lauderdale']),

    // ── Celebrity additional (1 more) ──
    makeSailing('celebrity_equinox_2026-02-10_fort-lauderdale_7', 'Celebrity Cruises', 'Celebrity Equinox', 'Western Caribbean', 'Fort Lauderdale', 'Florida', 7, '2026-02-10', 799, 1129, 29, 'https://www.celebritycruises.com', 'Celebrity', ['Fort Lauderdale', 'Key West', 'Cozumel', 'Costa Maya', 'Fort Lauderdale']),

    // ── Cunard additional (1 more) ──
    makeSailing('cunard_queen-anne_2026-10-15_southampton_14', 'Cunard Line', 'Queen Anne', 'Canary Islands', 'Southampton', 'Europe', 14, '2026-10-15', 2799, 3699, 24, 'https://www.cunard.com/en-us/cruises', 'Cunard', ['Southampton', 'Vigo', 'Lisbon', 'Funchal, Madeira', 'Santa Cruz de Tenerife', 'Arrecife', 'Southampton']),

    // ── MSC additional (1 more) ──
    makeSailing('msc_meraviglia_2026-11-05_miami_7', 'MSC Cruises', 'MSC Meraviglia', 'Western Caribbean', 'Miami', 'Florida', 7, '2026-11-05', 549, 799, 31, 'https://www.msccruises.com/en-us', 'MSC', ['Miami', 'Cozumel', 'George Town, Cayman Islands', 'Ocho Rios, Jamaica', 'Ocean Cay MSC Marine Reserve', 'Miami']),

    // ── Holland America additional (1 more) ──
    makeSailing('hal_noordam_2026-12-01_seattle_14', 'Holland America Line', 'Noordam', 'Antarctica', 'Ushuaia', 'Argentina', 14, '2026-12-01', 5999, 7999, 25, 'https://www.hollandamerica.com/cruises', 'HAL', ['Ushuaia', 'Antarctic Peninsula', 'Elephant Island', 'Falkland Islands', 'Ushuaia']),

    // ── Princess additional (1 more) ──
    makeSailing('princess_enchanted_2026-09-05_seattle_7', 'Princess Cruises', 'Enchanted Princess', 'Eastern Caribbean', 'Fort Lauderdale', 'Florida', 7, '2026-09-05', 849, 1199, 29, 'https://www.princess.com/find/cruise/search', 'Princess', ['Fort Lauderdale', 'Princess Cays', 'St. Thomas', 'St. Maarten', 'Fort Lauderdale']),

    // ── Carnival additional (1 more) ──
    makeSailing('carnival_radiance_2026-07-04_long-beach_4', 'Carnival', 'Carnival Radiance', 'Mexican Riviera', 'Long Beach', 'California', 4, '2026-07-04', 299, 449, 33, 'https://www.carnival.com/cruises/carnival-radiance', 'Carnival', ['Long Beach', 'Catalina Island', 'Ensenada', 'Long Beach']),

    // ── Royal Caribbean additional (1 more) ──
    makeSailing('rci_mariner_2026-12-10_port-canaveral_4', 'Royal Caribbean', 'Mariner of the Seas', 'Bahamas', 'Port Canaveral', 'Florida', 4, '2026-12-10', 499, 699, 29, 'https://www.royalcaribbean.com/cruises', 'Royal Caribbean', ['Port Canaveral', 'CocoCay, Bahamas', 'Nassau, Bahamas', 'Port Canaveral']),

    // ── Virgin additional (1 more) ──
    makeSailing('virgen_scarlet_lady_2026-10-15_miami_5', 'Virgin Voyages', 'Scarlet Lady', 'Halloween Caribbean', 'Miami', 'Florida', 5, '2026-10-15', 899, 1199, 25, 'https://www.virginvoyages.com', 'Virgin', ['Miami', 'Cozumel', 'Bimini Beach Club', 'Miami']),
  ];
}

export function getSailingDetail(id: string): StubSailingDetail | null {
  const s = getAllSailings().find(x => x.id === id);
  if (!s) return null;
  return {
    ...s,
    cabins: genCabins(s.price, s.nights),
    priceHistory: genMultiCabinPriceHistory(s.price, s.originalPrice, s.sailDate, s.id),
  };
}

// Apply per-tick price drift to a sailing — simulates real-world price fluctuations.
// Each tick, prices nudge up or down by ±0-3%. 70% of the time price drops (cruise lines
// discount over time); 30% it rises (inventory sells out / fare increases).
// This ensures the DB actually updates on every cron tick (price_history grows,
// last_updated_at changes) instead of skipping because prices are identical.
export function applyPriceDrift(s: StubSailing): StubSailing {
  const seed = hashString(s.id + Date.now());
  const rng = (offset: number) => {
    const x = Math.sin(seed + offset * 137.5) * 10000;
    return x - Math.floor(x);
  };

  // 70% chance of a price drop, 30% chance of a price increase
  const isDrop = rng(0) < 0.7;
  // Magnitude: 0.5% to 3%
  const magnitude = 0.005 + rng(1) * 0.025;
  const change = Math.round(s.price * magnitude);

  let newPrice: number;
  if (isDrop) {
    newPrice = Math.max(Math.round(s.price - change), Math.round(s.originalPrice * 0.35));
  } else {
    // Don't exceed originalPrice on the upside
    newPrice = Math.min(Math.round(s.price + change), s.originalPrice);
  }

  // Only update if the price actually changed by at least $1
  if (newPrice === s.price) return s;

  // Regenerate history with the new current price so sparklines stay consistent
  const newDropPercent = Math.round(((s.originalPrice - newPrice) / s.originalPrice) * 100);

  return {
    ...s,
    price: newPrice,
    dropPercent: newDropPercent,
    history: genHistory(newPrice, s.originalPrice, s.id, s.sailDate),
  };
}

// Fingerprint helper (mirrors scrapers/dedup.ts)
export function makeFingerprint(s: { cruiseLine: string; sailDate: string; ship: string; departurePort: string; nights: number }): string {
  return `${s.cruiseLine.toLowerCase().replace(/\s+/g, '-')}|${s.sailDate}|${s.ship.toLowerCase().replace(/\s+/g, '-')}|${s.departurePort.toLowerCase().replace(/\s+/g, '-')}|${s.nights}`;
}
