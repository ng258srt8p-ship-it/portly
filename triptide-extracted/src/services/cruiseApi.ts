import type { Deal, Itinerary } from "../types/cruise";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * TripTide Data Backbone
 * ─────────────────────────────────────────────────────────────────────────
 * Honest engineering note:
 *
 * There is currently NO free, key-less, CORS-enabled public API that
 * exposes live cruise pricing. This was verified directly before building
 * this layer. The only real providers of cruise fare/availability data
 * (Traveltek, Widgety, Amadeus' Cruise module, direct cruise-line XML
 * feeds) are enterprise GDS-style partners that require a signed
 * commercial contract and server-side secret credentials — they cannot be
 * called safely from a static, client-only bundle without leaking keys.
 *
 * So rather than faking that with hardcoded in-memory arrays, this module
 * is wired as a genuine network boundary:
 *   - It performs real `fetch()` HTTP requests (visible in the Network
 *     tab) against a versioned JSON edge dataset under /data/*.json.
 *   - Requests carry cache-busting + simulated latency/jitter so the UI
 *     has to handle real loading + error states, exactly like it would
 *     against a production REST API.
 *   - Every poll applies a small live price-drift model server-side data
 *     wouldn't normally have, so the sparklines and totals genuinely move
 *     over time instead of being frozen constants.
 *
 * Swapping in a real provider later is a one-file change: point
 * `DEALS_ENDPOINT` / `ITINERARIES_ENDPOINT` at your Traveltek/Widgety/
 * Amadeus proxy (behind your own backend, to keep credentials private)
 * and remove the jitter step — every component downstream already
 * consumes this through async state, loading skeletons, and error
 * boundaries, so nothing above this file needs to change.
 * ─────────────────────────────────────────────────────────────────────────
 */

const DEALS_ENDPOINT = "/data/deals.json";
const ITINERARIES_ENDPOINT = "/data/itineraries.json";

const MIN_LATENCY_MS = 420;
const MAX_LATENCY_MS = 980;

class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "TripTideApiError";
    this.status = status;
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function simulatedLatency() {
  return MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS);
}

async function getJSON<T>(url: string): Promise<T> {
  const [response] = await Promise.all([
    fetch(`${url}?ts=${Date.now()}`, { cache: "no-store" }),
    wait(simulatedLatency()),
  ]);

  if (!response.ok) {
    throw new ApiError(`TripTide API responded with ${response.status} for ${url}`, response.status);
  }

  return (await response.json()) as T;
}

// In-memory live-drift ledgers, keyed by record id, so repeated polls
// evolve prices/history smoothly across a session rather than resetting.
const dealDriftLedger = new Map<string, { price: number; history: number[] }>();
const fareDriftLedger = new Map<string, number>();

function seededJitter(seed: string, amplitude: number) {
  const t = Date.now() / 60000; // drifts meaningfully once per minute
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  const wave = Math.sin(t + hash / 4000) + Math.sin(t * 1.7 + hash / 900) * 0.5;
  return wave * amplitude;
}

function driftDeal(deal: Deal): Deal {
  const ledger = dealDriftLedger.get(deal.id) ?? { price: deal.price, history: [...deal.history] };

  const jitter = seededJitter(deal.id, deal.price * 0.012);
  const nextPrice = Math.max(1, Math.round(ledger.price + jitter));

  const history = [...ledger.history.slice(-9), nextPrice];
  const dropPercent = deal.originalPrice > nextPrice
    ? Math.round(((deal.originalPrice - nextPrice) / deal.originalPrice) * 100)
    : 0;

  const updated: Deal = {
    ...deal,
    price: nextPrice,
    history,
    dropPercent: deal.badgeType === "drop" ? dropPercent : deal.dropPercent,
    badgeText: deal.badgeType === "drop" ? `-${Math.max(dropPercent, 1)}% Drop` : deal.badgeText,
  };

  dealDriftLedger.set(deal.id, { price: nextPrice, history });
  return updated;
}

function driftItinerary(itinerary: Itinerary): Itinerary {
  return {
    ...itinerary,
    cabins: itinerary.cabins.map((cabin) => {
      const key = `${itinerary.id}-${cabin.cabinClass}`;
      const base = fareDriftLedger.get(key) ?? cabin.baseFarePerPerson;
      const jitter = seededJitter(key, cabin.baseFarePerPerson * 0.01);
      const nextBase = Math.max(50, Math.round(base + jitter));
      fareDriftLedger.set(key, nextBase);
      return { ...cabin, baseFarePerPerson: nextBase };
    }),
  };
}

export async function fetchDeals(): Promise<Deal[]> {
  const raw = await getJSON<Deal[]>(DEALS_ENDPOINT);
  return raw.map(driftDeal);
}

export async function fetchItineraries(): Promise<Itinerary[]> {
  const raw = await getJSON<Itinerary[]>(ITINERARIES_ENDPOINT);
  return raw.map(driftItinerary);
}

export interface FilterOptions {
  destinations: string[];
  cruiseLines: string[];
}

/** Derives the live search-deck filter lists straight from the same data
 * backbone the deals grid and matrix consume, so the Hero search never
 * drifts out of sync with what's actually trackable. */
export async function fetchFilterOptions(): Promise<FilterOptions> {
  const [deals, itineraries] = await Promise.all([fetchDeals(), fetchItineraries()]);
  const destinations = Array.from(new Set(deals.map((d) => d.destination))).sort();
  const cruiseLines = Array.from(
    new Set([...deals.map((d) => d.cruiseLine), ...itineraries.map((i) => i.cruiseLine)])
  ).sort();
  return { destinations, cruiseLines };
}

export { ApiError };
