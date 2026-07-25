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

// Fingerprint helper (mirrors scrapers/dedup.ts)
export function makeFingerprint(s: { cruiseLine: string; sailDate: string; ship: string; departurePort: string; nights: number }): string {
  return `${s.cruiseLine.toLowerCase().replace(/\s+/g, '-')}|${s.sailDate}|${s.ship.toLowerCase().replace(/\s+/g, '-')}|${s.departurePort.toLowerCase().replace(/\s+/g, '-')}|${s.nights}`;
}
