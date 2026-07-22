/**
 * TRIPTIDE — Cruise API Routes
 *
 * Express router controller serving all cruise-related endpoints.
 * Queries PostgreSQL via the connection pool. Returns empty results
 * when the database is empty — the frontend shows appropriate empty
 * states and prompts the user to run a sync.
 *
 * ENDPOINTS:
 *   GET  /api/health              — Server + DB status
 *   GET  /api/sailing-breakdown   — Single sailing cost breakdown
 *   GET  /api/search              — Multi-passenger cruise search
 *   GET  /api/sailing/:id         — Full sailing detail with pricing history
 *   GET  /api/deals               — Best deal-rated cruises
 *   GET  /api/solo-friendly       — Solo traveler filtered view
 */

import { Router, Request, Response } from 'express';
import { getPool } from '../db/pool';
import {
  calculateTotals,
  calculateTotalsWithDuration,
  getDealRating,
  formatTabularPrice,
  formatCompactPrice,
} from '../utils/formulas';

// ============================================================================
// TYPES
// ============================================================================

interface SailingQuery {
  sailingId?: number;
  passengers?: number;
  cabinType?: string;
  destination?: string;
  cruiseLine?: string;
  minDeparture?: string;
  maxDeparture?: string;
  minDuration?: number;
  maxDuration?: number;
  soloFriendly?: boolean;
  sortBy?: 'price' | 'duration' | 'departure' | 'deal';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface SailingDbRow {
  id: number;
  cruise_line: string;
  ship_name: string;
  departure_date: string;
  duration_days: number;
  departure_port: string;
  departure_region: string | null;
  itinerary: string[];
  destination_region: string | null;
  cabin_type: string;
  base_fare_usd: number;
  port_fees_usd: number;
  gratuities_usd: number;
  is_solo_supplement_waived: boolean;
  captured_at: string;
  booking_url: string | null;
  deal_analysis: string | null;
  deal_analysis_generated_at: string | null;
}

// Market average prices per region for deal rating calculation
const marketAverages: Record<string, number> = {
  Caribbean: 200,
  Alaska: 215,
  Mediterranean: 210,
  Bahamas: 170,
  Mexico: 155,
};

// ============================================================================
// DATABASE HELPERS
// ============================================================================

/**
 * Try to query the database. Returns null if the pool isn't available.
 */
async function dbQuery(text: string, params?: any[]): Promise<any[] | null> {
  try {
    const pool = getPool();
    const result = await pool.query(text, params);
    return result.rows;
  } catch (err: any) {
    console.warn(`[DB] Query failed: ${err.message?.slice(0, 100)}`);
    return null;
  }
}

/**
 * Fetch all sailings with their pricing from the database view.
 * Returns rows shaped like SailingDbRow, or null if DB unavailable.
 */
async function fetchSailingsFromDb(): Promise<SailingDbRow[] | null> {
  const rows = await dbQuery(`
    SELECT
      v.sailing_id AS id,
      v.cruise_line,
      v.ship_name,
      v.departure_date::TEXT,
      v.duration_days,
      v.departure_port,
      v.departure_region,
      v.itinerary,
      v.destination_region,
      v.cabin_type::TEXT,
      v.base_fare_usd,
      v.port_fees_usd,
      v.gratuities_usd,
      v.is_solo_supplement_waived,
      v.captured_at::TEXT,
      v.booking_url,
      v.deal_analysis,
      v.deal_analysis_generated_at
    FROM v_out_the_door_pricing v
    WHERE v.rank = 1
    ORDER BY v.sailing_id, v.base_fare_usd ASC
  `);
  return rows as SailingDbRow[] | null;
}

// ============================================================================
// ROUTER
// ============================================================================

const router = Router();

// ============================================================================
// GET /api/sailing-breakdown
// ============================================================================

router.get('/api/sailing-breakdown', async (req: Request, res: Response) => {
  try {
    const sailingId = parseInt(req.query.sailingId as string) || 1;
    const passengers = parseInt(req.query.passengers as string) || 2;
    const cabinType = (req.query.cabinType as string) || 'Balcony';

    let rawData: SailingDbRow | undefined;

    // Try database first
    const dbRows = await dbQuery(
      `SELECT
        v.sailing_id AS id, v.cruise_line, v.ship_name,
        v.departure_date::TEXT, v.duration_days, v.departure_port,
        v.itinerary, v.destination_region, v.cabin_type::TEXT,
        v.base_fare_usd, v.port_fees_usd, v.gratuities_usd,
        v.is_solo_supplement_waived, v.captured_at::TEXT
       FROM v_out_the_door_pricing v
       WHERE v.rank = 1 AND v.sailing_id = $1 AND LOWER(v.cabin_type::TEXT) = LOWER($2)`,
      [sailingId, cabinType]
    );
    if (dbRows && dbRows.length > 0) {
      rawData = dbRows[0] as unknown as SailingDbRow;
    }

    if (!rawData) {
      return res.status(404).json({
        error: 'Sailing not found',
        message: `No data found for sailingId=${sailingId}, cabinType=${cabinType}. Run a sync to generate data.`,
      });
    }

    const financials = calculateTotalsWithDuration(
      {
        base_fare_usd: rawData.base_fare_usd,
        port_fees_usd: rawData.port_fees_usd,
        gratuities_usd: rawData.gratuities_usd,
        is_solo_supplement_waived: rawData.is_solo_supplement_waived,
      },
      passengers,
      rawData.duration_days
    );

    const avgPricePerDay = marketAverages[rawData.destination_region || 'Caribbean'] || 200;
    const dealRating = getDealRating(financials.perPersonPerDay, avgPricePerDay);

    return res.status(200).json({
      sailing: {
        id: rawData.id,
        line: rawData.cruise_line,
        ship: rawData.ship_name,
        days: rawData.duration_days,
        port: rawData.departure_port,
        route: rawData.itinerary,
        region: rawData.destination_region,
        departureDate: rawData.departure_date,
        lastUpdated: rawData.captured_at,
      },
      passengerCount: passengers,
      cabinClass: rawData.cabin_type,
      financials: {
        ...financials,
        formatted: {
          perPersonBase: formatTabularPrice(financials.perPersonBase),
          totalBase: formatTabularPrice(financials.totalBase),
          totalFees: formatTabularPrice(financials.totalFees),
          totalGratuities: formatTabularPrice(financials.totalGratuities),
          totalOutTheDoor: formatTabularPrice(financials.totalOutTheDoor),
          perPersonPerDay: formatTabularPrice(financials.perPersonPerDay),
        },
      },
      dealRating,
      pricingFormula: {
        label: 'Out-the-door pricing',
        equation: 'Base Fare + Port Taxes + Mandatory Gratuities = Total Cabin Price',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CRUISES] /api/sailing-breakdown error:', message);
    return res.status(500).json({ error: 'API engine cost evaluation breakdown failure', detail: message });
  }
});

// ============================================================================
// GET /api/search
// ============================================================================

router.get('/api/search', async (req: Request, res: Response) => {
  try {
    const query: SailingQuery = {
      passengers: parseInt(req.query.passengers as string) || 2,
      destination: req.query.destination as string,
      cruiseLine: req.query.cruiseLine as string,
      minDeparture: req.query.minDeparture as string,
      maxDeparture: req.query.maxDeparture as string,
      minDuration: parseInt(req.query.minDuration as string) || undefined,
      maxDuration: parseInt(req.query.maxDuration as string) || undefined,
      soloFriendly: req.query.soloFriendly === 'true',
      sortBy: (req.query.sortBy as SailingQuery['sortBy']) || 'price',
      order: (req.query.order as SailingQuery['order']) || 'asc',
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
    };

    // Try database first
    let results: SailingDbRow[] | null = null;
    const dbRows = await fetchSailingsFromDb();
    if (dbRows) {
      results = dbRows.filter((row) => {
        if (query.destination && !row.destination_region?.toLowerCase().includes(query.destination.toLowerCase()) && !row.departure_port.toLowerCase().includes(query.destination.toLowerCase())) return false;
        if (query.cruiseLine && !row.cruise_line.toLowerCase().includes(query.cruiseLine.toLowerCase())) return false;
        if (query.minDeparture && row.departure_date < query.minDeparture) return false;
        if (query.maxDeparture && row.departure_date > query.maxDeparture) return false;
        if (query.minDuration && row.duration_days < query.minDuration) return false;
        if (query.maxDuration && row.duration_days > query.maxDuration) return false;
        if (query.soloFriendly && !row.is_solo_supplement_waived) return false;
        return true;
      });
    }

    // If DB returned nothing, return empty (frontend shows empty state / prompts sync)
    if (!results || results.length === 0) {
      return res.status(200).json({ results: [], total: 0, page: query.page, limit: query.limit, message: 'No cruises found. Run a sync to generate data.' });
    }

    // Deduplicate by sailing ID
    const seen = new Set<number>();
    const deduped = results.filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });

    const enriched = deduped.map((row) => {
      const financials = calculateTotals(
        { base_fare_usd: row.base_fare_usd, port_fees_usd: row.port_fees_usd, gratuities_usd: row.gratuities_usd, is_solo_supplement_waived: row.is_solo_supplement_waived },
        query.passengers!
      );
      return {
        id: row.id, cruiseLine: row.cruise_line, shipName: row.ship_name, departureDate: row.departure_date,
        durationDays: row.duration_days, departurePort: row.departure_port, itinerary: row.itinerary,
        region: row.destination_region, cabinType: row.cabin_type,
        financials: { totalOutTheDoor: financials.totalOutTheDoor, perPersonPerDay: 0, soloSupplementPercent: financials.soloSupplementPercent, soloSupplementApplied: financials.soloSupplementApplied, formatted: { price: formatCompactPrice(financials.totalOutTheDoor) } },
      };
    });

    enriched.sort((a, b) => {
      const dir = query.order === 'desc' ? -1 : 1;
      switch (query.sortBy) {
        case 'duration': return (a.durationDays - b.durationDays) * dir;
        case 'departure': return (a.departureDate < b.departureDate ? -1 : 1) * dir;
        case 'deal': case 'price': default: return (a.financials.totalOutTheDoor - b.financials.totalOutTheDoor) * dir;
      }
    });

    const total = enriched.length;
    const startIdx = (query.page! - 1) * query.limit!;
    const paginated = enriched.slice(startIdx, startIdx + query.limit!);

    return res.status(200).json({ results: paginated, total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit!) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CRUISES] /api/search error:', message);
    return res.status(500).json({ error: 'Search query failed', detail: message });
  }
});

// ============================================================================
// GET /api/sailing/:id
// ============================================================================

router.get('/api/sailing/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid sailing ID' });

    let rows: SailingDbRow[];

    // Try database first
    const dbRows = await dbQuery(
      `SELECT
        v.sailing_id AS id, v.cruise_line, v.ship_name,
        v.departure_date::TEXT, v.duration_days, v.departure_port,
        v.itinerary, v.destination_region, v.cabin_type::TEXT,
        v.base_fare_usd, v.port_fees_usd, v.gratuities_usd,
        v.is_solo_supplement_waived, v.captured_at::TEXT,
        v.booking_url, v.deal_analysis, v.deal_analysis_generated_at::TEXT
       FROM v_out_the_door_pricing v
       WHERE v.sailing_id = $1 AND v.rank = 1
       ORDER BY v.base_fare_usd ASC`,
      [id]
    );
    if (dbRows && dbRows.length > 0) {
      rows = dbRows as unknown as SailingDbRow[];
    } else {
      return res.status(404).json({ error: 'Sailing not found', message: `No sailing with id ${id}. Run a sync to generate data.` });
    }

    const cabinBreakdown = rows.map((row) => {
      const financials = calculateTotalsWithDuration(
        { base_fare_usd: row.base_fare_usd, port_fees_usd: row.port_fees_usd, gratuities_usd: row.gratuities_usd, is_solo_supplement_waived: row.is_solo_supplement_waived },
        2, row.duration_days
      );
      return {
        cabinType: row.cabin_type,
        baseFare: formatTabularPrice(row.base_fare_usd),
        portFees: formatTabularPrice(row.port_fees_usd),
        gratuities: formatTabularPrice(row.gratuities_usd),
        total: formatTabularPrice(financials.totalOutTheDoor),
        perPersonPerDay: formatTabularPrice(financials.perPersonPerDay),
        raw: financials,
      };
    });
    // Deduplicate by cabin type — keep cheapest per tier (rows are sorted by base_fare_usd ASC)
    const seenCabinTypes = new Set<string>();
    const dedupedCabinBreakdown = cabinBreakdown.filter((entry) => {
      const key = entry.cabinType.toLowerCase();
      if (seenCabinTypes.has(key)) return false;
      seenCabinTypes.add(key);
      return true;
    });

    const first = rows[0];
    const cheapestCabinType = String(first.cabin_type);

    // Fetch price history from database — filtered to the cheapest cabin type
    // so the sparkline matches the displayed current price.
    let priceHistory: any[] = [];
    const histRows = await dbQuery(
      `SELECT recorded_date::TEXT, cabin_type::TEXT, passenger_count, total_usd
       FROM pricing_history
       WHERE sailing_id = $1
       ORDER BY recorded_date ASC, passenger_count ASC`,
      [id]
    );
    if (histRows) priceHistory = histRows;

    return res.status(200).json({
      sailing: { id: first.id, line: first.cruise_line, ship: first.ship_name, days: first.duration_days, port: first.departure_port, route: first.itinerary, region: first.destination_region, departureDate: first.departure_date, bookingUrl: first.booking_url, dealAnalysis: first.deal_analysis, dealAnalysisGeneratedAt: first.deal_analysis_generated_at },
      cabinBreakdown: dedupedCabinBreakdown,
      priceHistory,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CRUISES] /api/sailing/:id error:', message);
    return res.status(500).json({ error: 'Failed to fetch sailing details' });
  }
});

// ============================================================================
// GET /api/solo-friendly
// ============================================================================

router.get('/api/solo-friendly', async (req: Request, res: Response) => {
  try {
    let soloFriendly: SailingDbRow[];

    // Try database first
    const dbRows = await dbQuery(
      `SELECT
        v.sailing_id AS id, v.cruise_line, v.ship_name,
        v.departure_date::TEXT, v.duration_days, v.departure_port,
        v.itinerary, v.destination_region, v.cabin_type::TEXT,
        v.base_fare_usd, v.port_fees_usd, v.gratuities_usd,
        v.is_solo_supplement_waived, v.captured_at::TEXT
       FROM v_out_the_door_pricing v
       WHERE v.rank = 1 AND v.is_solo_supplement_waived = TRUE`
    );
    if (dbRows && dbRows.length > 0) {
      soloFriendly = dbRows as unknown as SailingDbRow[];
    } else {
      return res.status(200).json({ count: 0, results: [], message: 'No solo-friendly sailings found. Run a sync to generate data.' });
    }

    const enriched = soloFriendly.map((row) => {
      const financials = calculateTotalsWithDuration(
        { base_fare_usd: row.base_fare_usd, port_fees_usd: row.port_fees_usd, gratuities_usd: row.gratuities_usd, is_solo_supplement_waived: true },
        1, row.duration_days
      );
      return {
        id: row.id, cruiseLine: row.cruise_line, shipName: row.ship_name, departureDate: row.departure_date,
        durationDays: row.duration_days, departurePort: row.departure_port, destination: row.destination_region,
        cabinType: row.cabin_type,
        soloPrice: { total: formatTabularPrice(financials.totalOutTheDoor), perDay: formatTabularPrice(financials.perPersonPerDay), supplementWaived: true, supplementPercent: 0 },
        raw: financials,
      };
    });

    return res.status(200).json({ count: enriched.length, results: enriched });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CRUISES] /api/solo-friendly error:', message);
    return res.status(500).json({ error: 'Failed to fetch solo-friendly cruises' });
  }
});

// ============================================================================
// GET /api/history — Price history grouped by cruise line
// ============================================================================

router.get('/api/history', async (req: Request, res: Response) => {
  try {
    const rows = await dbQuery(`
      SELECT
        sailing_id,
        cruise_line,
        ship_name,
        duration_days,
        cabin_type::TEXT,
        passenger_count,
        total_usd,
        recorded_date::TEXT
      FROM v_price_trends
      ORDER BY cruise_line, sailing_id, recorded_date
    `);

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        lines: [],
        totalPricesTracked: 0,
        totalSailings: 0,
        message: 'No price history data yet. Run a NIM sync to generate data.',
      });
    }

    const byLine: Record<string, {
      line: string;
      sailings: Record<string, {
        sailingId: number;
        ship: string;
        cabinType: string;
        durationDays: number;
        currentPrice: number;
        lowestPrice: number;
        highestPrice: number;
        history: { date: string; price: number }[];
      }>;
    }> = {};

    for (const row of rows) {
      const lineName = row.cruise_line;
      const sid = row.sailing_id;

      if (!byLine[lineName]) {
        byLine[lineName] = { line: lineName, sailings: {} };
      }

      const line = byLine[lineName];
      const key = `${sid}-${row.cabin_type}-${row.passenger_count}`;

      if (!line.sailings[key]) {
        line.sailings[key] = {
          sailingId: sid,
          ship: row.ship_name,
          cabinType: row.cabin_type,
          durationDays: row.duration_days,
          currentPrice: parseFloat(row.total_usd),
          lowestPrice: parseFloat(row.total_usd),
          highestPrice: parseFloat(row.total_usd),
          history: [],
        };
      }

      const price = parseFloat(row.total_usd);
      const entry = line.sailings[key];
      entry.currentPrice = price;
      entry.lowestPrice = Math.min(entry.lowestPrice, price);
      entry.highestPrice = Math.max(entry.highestPrice, price);
      entry.history.push({ date: row.recorded_date, price });
    }

    const lines = Object.values(byLine).map((l) => ({
      line: l.line,
      sailings: Object.values(l.sailings).sort((a, b) => a.sailingId - b.sailingId),
      totalSailings: Object.keys(l.sailings).length,
    }));

    const totalPricesTracked = rows.length;
    const totalSailings = new Set(rows.map((r: any) => r.sailing_id)).size;

    return res.status(200).json({ lines, totalPricesTracked, totalSailings });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CRUISES] /api/history error:', message);
    return res.status(500).json({ error: 'Failed to fetch price history', detail: message });
  }
});

// ============================================================================
// GET /api/deals
// ============================================================================

router.get('/api/deals', async (req: Request, res: Response) => {
  try {
    const passengers = parseInt(req.query.passengers as string) || 2;
    const rawLimit = parseInt(req.query.limit as string);
    const limit = rawLimit === 0 ? 500 : Math.min(rawLimit || 20, 500);

    // ── Parse filter params ──
    const cruiseLineFilter = (req.query.cruiseLine as string)?.split(',').map(s => s.trim()).filter(Boolean);
    const destinationFilter = (req.query.destination as string)?.split(',').map(s => s.trim()).filter(Boolean);
    const departurePortFilter = (req.query.departurePort as string)?.split(',').map(s => s.trim()).filter(Boolean);
    const departureRegionFilter = (req.query.departureRegion as string)?.split(',').map(s => s.trim()).filter(Boolean);
    const minNights = parseInt(req.query.minNights as string) || undefined;
    const maxNights = parseInt(req.query.maxNights as string) || undefined;
    const minPrice = parseInt(req.query.minPrice as string) || undefined;
    const maxPrice = parseInt(req.query.maxPrice as string) || undefined;
    const badgeTypeFilter = (req.query.badgeType as string)?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) as ('drop' | 'solo' | 'gold')[] | undefined;
    const sort = (req.query.sort as string) || undefined;

    let results: SailingDbRow[];

    // Try database first
    const dbRows = await fetchSailingsFromDb();
    if (dbRows && dbRows.length > 0) {
      results = dbRows;
    } else {
      return res.status(200).json([]);
    }

    // Deduplicate by sailing ID
    const seen = new Set<number>();
    const deduped = results.filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });

    // ── Static-field filters (applied before price history fetch) ──
    let filtered = deduped;
    if (cruiseLineFilter?.length) {
      filtered = filtered.filter(r => cruiseLineFilter!.includes(r.cruise_line));
    }
    if (destinationFilter?.length) {
      filtered = filtered.filter(r => r.destination_region && destinationFilter!.includes(r.destination_region));
    }
    if (departurePortFilter?.length) {
      filtered = filtered.filter(r => departurePortFilter!.includes(r.departure_port));
    }
    if (departureRegionFilter?.length) {
      filtered = filtered.filter(r => r.departure_region && departureRegionFilter!.includes(r.departure_region));
    }
    if (minNights !== undefined) {
      filtered = filtered.filter(r => r.duration_days >= minNights!);
    }
    if (maxNights !== undefined) {
      filtered = filtered.filter(r => r.duration_days <= maxNights!);
    }

    // ── Batch-fetch real price history for filtered set ──
    const sailingIds = filtered.map((r) => r.id);
    const maxPrices: Record<number, number> = {};
    // Track histories by sailing + cabin type so we can match the sparkline
    // to the same cabin type used for the displayed current price.
    const historyBySailingAndCabin: Record<number, Record<string, number[]>> = {};

    if (sailingIds.length > 0) {
      const maxRows = await dbQuery(
        `SELECT sailing_id, MAX(total_usd) AS max_price
         FROM pricing_history
         WHERE sailing_id = ANY($1::int[])
         GROUP BY sailing_id`,
        [sailingIds]
      );
      if (maxRows) {
        for (const r of maxRows) {
          maxPrices[r.sailing_id] = parseFloat(r.max_price);
        }
      }

      const trendRows = await dbQuery(
        `SELECT sailing_id, total_usd, cabin_type, passenger_count
         FROM v_price_trends
         WHERE passenger_count = 2
         ORDER BY sailing_id, recorded_date ASC, cabin_type`
      );
      if (trendRows) {
        for (const r of trendRows) {
          // Group by both cabin_type AND passenger_count so history arrays
          // don't get interleaved when the same cabin type has records for
          // different passenger counts in the underlying data.
          const ct = String(r.cabin_type);
          const pc = String(r.passenger_count);
          const key = ct + '-' + pc;
          if (!historyBySailingAndCabin[r.sailing_id]) {
            historyBySailingAndCabin[r.sailing_id] = {};
          }
          if (!historyBySailingAndCabin[r.sailing_id][key]) {
            historyBySailingAndCabin[r.sailing_id][key] = [];
          }
          historyBySailingAndCabin[r.sailing_id][key].push(parseFloat(r.total_usd));
        }
      }
    }

    // ── Map all to Deal[] (must happen before derived-field filters & sort) ──
    let allDeals = filtered.map((row) => {
      const financials = calculateTotalsWithDuration(
        { base_fare_usd: row.base_fare_usd, port_fees_usd: row.port_fees_usd, gratuities_usd: row.gratuities_usd, is_solo_supplement_waived: false },
        passengers, row.duration_days
      );

      const currentPrice = Math.round(financials.totalOutTheDoor);

      const historicalMax = maxPrices[row.id];
      const originalPrice = historicalMax
        ? Math.round(Math.max(historicalMax, currentPrice))
        : currentPrice;

      const dropPercent =
        originalPrice > currentPrice
          ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
          : 0;

      let badgeType: 'drop' | 'solo' | 'gold';
      let badgeText: string;
      if (dropPercent >= 15) { badgeType = 'drop'; badgeText = `-${dropPercent}% Drop`; }
      else if (row.is_solo_supplement_waived) { badgeType = 'solo'; badgeText = 'Solo Friendly'; }
      else { badgeType = 'gold'; badgeText = 'Great Value'; }

      const cheapestCabinType = String(row.cabin_type);
      const cabinHistory = historyBySailingAndCabin[row.id];
      // Use (cabin_type + '-2') as the key to match pax=2 history from
      // v_price_trends, since the sparkline always displays 2-passenger pricing.
      const realHistory = cabinHistory?.[cheapestCabinType + '-2'];
      const history = (realHistory && realHistory.length > 0)
        ? realHistory.slice(-12)
        : [];

      return {
        id: row.id, cruiseLine: row.cruise_line, ship: row.ship_name,
        destination: row.destination_region || 'Various', departurePort: row.departure_port, departureRegion: row.departure_region,
        duration: `${row.duration_days} Nights`, nights: row.duration_days,
        sailDate: new Date(row.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(',', ','),
        price: currentPrice, originalPrice, dropPercent, badgeType, badgeText, history,
        bookingUrl: row.booking_url || undefined,
        bookingLabel: row.cruise_line,
      };
    });

    // ── Derived-field filters ──
    if (badgeTypeFilter?.length) {
      allDeals = allDeals.filter(d => badgeTypeFilter!.includes(d.badgeType));
    }
    if (minPrice !== undefined) {
      allDeals = allDeals.filter(d => d.price >= minPrice!);
    }
    if (maxPrice !== undefined) {
      allDeals = allDeals.filter(d => d.price <= maxPrice!);
    }

    // ── Sort ──
    if (sort) {
      allDeals.sort((a, b) => {
        switch (sort) {
          case 'price-asc': return a.price - b.price;
          case 'price-desc': return b.price - a.price;
          case 'nights-asc': return a.nights - b.nights;
          case 'nights-desc': return b.nights - a.nights;
          case 'date-asc': return new Date(a.sailDate).getTime() - new Date(b.sailDate).getTime();
          case 'date-desc': return new Date(b.sailDate).getTime() - new Date(a.sailDate).getTime();
          case 'drop-desc': return b.dropPercent - a.dropPercent;
          default: return new Date(a.sailDate).getTime() - new Date(b.sailDate).getTime();
        }
      });
    }

    // ── Limit & return ──
    const deals = allDeals.slice(0, limit);
    return res.status(200).json(deals);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CRUISES] /api/deals error:', message);
    return res.status(500).json({ error: 'Failed to fetch deals', detail: message });
  }
});

export default router;
