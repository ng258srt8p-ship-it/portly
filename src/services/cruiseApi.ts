import type { Deal, Itinerary, FilterOptions, CabinRate, SoloSailing, HistoryData, DealFilters } from "@/types/cruise";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * TripTide Data Backbone — LIVE API Edition
 * ─────────────────────────────────────────────────────────────────────────
 * This module now calls the TripTide Express API server (port 3001)
 * instead of static JSON files under /data/. All the drift/jitter
 * simulation has been removed — the server provides real(ish) data.
 * ─────────────────────────────────────────────────────────────────────────
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "TripTideApiError";
    this.status = status;
  }
}

async function getJSON<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new ApiError(
      `TripTide API responded with ${response.status} for ${url}`,
      response.status
    );
  }

  return (await response.json()) as T;
}

/** Fetch the latest cruise deals (rated by value) */
export async function fetchDeals(limit: number | 'all' = 20, filters?: DealFilters): Promise<Deal[]> {
  const params = new URLSearchParams();
  // Send `limit=all` for unlimited / numeric otherwise. The Worker caps at
  // 500 to prevent it from burning the 30 s CPU budget.
  if (limit === 'all') {
    params.set('limit', 'all');
  } else if (typeof limit === 'number' && limit > 0) {
    params.set('limit', String(Math.min(limit, 500)));
  }
  // omit limit entirely → server defaults to 20.
  if (filters) {
    if (filters.cruiseLine?.length) params.set('cruiseLine', filters.cruiseLine.join(','));
    if (filters.destination?.length) params.set('destination', filters.destination.join(','));
    if (filters.departurePort?.length) params.set('departurePort', filters.departurePort.join(','));
    if (filters.departureRegion?.length) params.set('departureRegion', filters.departureRegion.join(','));
    if (filters.minNights !== undefined) params.set('minNights', String(filters.minNights));
    if (filters.maxNights !== undefined) params.set('maxNights', String(filters.maxNights));
    if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
    if (filters.badgeType?.length) params.set('badgeType', filters.badgeType.join(','));
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.adults !== undefined && filters.adults !== 2) params.set('adults', String(filters.adults));
    if (filters.children !== undefined && filters.children > 0) params.set('children', String(filters.children));
    if (filters.ship?.length) params.set('ship', filters.ship.join(','));
  }
  return getJSON<Deal[]>(`${API_BASE}/api/deals?${params}`).then(deals =>
    deals.map(d => ({
      ...d,
      itinerary: typeof d.itinerary === 'string' ? safeParseItinerary(d.itinerary) : d.itinerary,
    }))
  );
}

function safeParseItinerary(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Fetch cabin pricing breakdown for a specific sailing.
 * Returns a list of Itinerary objects that PriceComparisonTable can consume.
 */
export async function fetchItineraries(
  sailingId?: number
): Promise<Itinerary[]> {
  const params = new URLSearchParams();
  if (sailingId) params.set("sailingId", String(sailingId));

  const data = await getJSON<any>(
    `${API_BASE}/api/sailing-breakdown?${params.toString()}`
  );

  // Transform the backend response into the Itinerary[] shape expected
  // by PriceComparisonTable
  const itinerary: Itinerary = {
    id: String(data.sailing.id),
    cruiseLine: data.sailing.line,
    ship: data.sailing.ship,
    route: data.sailing.route?.join(" · ") || data.sailing.region,
    nights: data.sailing.days,
    sailDate: data.sailing.departureDate,
    cabins: [
      {
        cabinClass: data.cabinClass as CabinRate["cabinClass"],
        baseFarePerPerson: data.financials.perPersonBase,
        portTaxPerPerson: data.financials.totalFees,
        gratuityPerPersonPerNight:
          data.financials.totalGratuities / data.sailing.days,
      },
    ],
  };

  return [itinerary];
}

/**
 * Fetch filter options (destinations + cruise lines) from the backend.
 * Hits the cheap /api/filters endpoint instead of pulling limit=0 deals.
 */
export async function fetchFilterOptions(): Promise<FilterOptions> {
  const data = await getJSON<{
    cruiseLines?: string[];
    destinations?: string[];
  }>(`${API_BASE}/api/filters`);
  return {
    destinations: data.destinations || [],
    cruiseLines: data.cruiseLines || [],
  };
}

/** Fetch every filter dimension in one pass (used by the deals page). */
export async function fetchAllFilterOptions(): Promise<{
  cruiseLines: string[];
  destinations: string[];
  ships: string[];
  departurePorts: string[];
  departureRegions: string[];
  badgeTypes: string[];
}> {
  return getJSON<any>(`${API_BASE}/api/filters`);
}

/** Fetch solo-friendly sailings */
export async function fetchSoloFriendly(): Promise<SoloSailing[]> {
  const data = await getJSON<{ count: number; results: SoloSailing[] }>(
    `${API_BASE}/api/solo-friendly`
  );
  return data.results;
}

/** Fetch price history grouped by cruise line */
export async function fetchPriceHistory(): Promise<HistoryData> {
  return getJSON<HistoryData>(`${API_BASE}/api/history`);
}

export { ApiError };
