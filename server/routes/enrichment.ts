/**
 * TripTide — Data Enrichment Routes
 *
 * Serves ship details, destination insights, market comparisons,
 * booking insights, and price forecasts from the database.
 *
 * All data is pre-generated during sync cycles — no AI calls at page-load time.
 */
import { Router, Request, Response } from 'express';
import { getPool } from '../db/pool';

const router = Router();

// ============================================================================
// SHIP DETAILS
// ============================================================================

/**
 * GET /api/enrichment/ships
 * Returns all ship details, optionally filtered by cruise line.
 */
router.get('/ships', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { cruiseLine } = req.query;

    let query = `
      SELECT 
        ship_name AS "shipName",
        cruise_line AS "cruiseLine",
        ship_class AS "shipClass",
        year_built AS "yearBuilt",
        passenger_capacity AS "passengerCapacity",
        crew_count AS "crewCount",
        tonnage,
        restaurants,
        pools,
        entertainment,
        amenities,
        deck_count AS "deckCount",
        cabin_count AS "cabinCount",
        image_url AS "imageUrl"
      FROM ship_details
    `;
    const params: any[] = [];

    if (cruiseLine) {
      query += ` WHERE cruise_line = $1`;
      params.push(String(cruiseLine));
    }

    query += ` ORDER BY cruise_line, ship_name`;
    const result = await pool.query(query, params);

    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err: any) {
    console.error('[ENRICHMENT] Ships error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/enrichment/ships/:shipName
 * Returns details for a specific ship.
 */
router.get('/ships/:shipName', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT 
        ship_name AS "shipName",
        cruise_line AS "cruiseLine",
        ship_class AS "shipClass",
        year_built AS "yearBuilt",
        passenger_capacity AS "passengerCapacity",
        crew_count AS "crewCount",
        tonnage,
        restaurants,
        pools,
        entertainment,
        amenities,
        deck_count AS "deckCount",
        cabin_count AS "cabinCount",
        image_url AS "imageUrl"
      FROM ship_details WHERE ship_name = $1`,
      [req.params.shipName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ship not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('[ENRICHMENT] Ship detail error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// DESTINATION INSIGHTS
// ============================================================================

/**
 * GET /api/enrichment/destinations
 * Returns market intelligence for all destination regions.
 */
router.get('/destinations', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT 
        destination_region AS "destinationRegion",
        avg_price_ppd AS "avgPricePpd",
        best_value_months AS "bestValueMonths",
        peak_season_months AS "peakSeasonMonths",
        shoulder_months AS "shoulderMonths",
        avg_duration_days AS "avgDurationDays",
        total_active_sailings AS "totalActiveSailings",
        top_cruise_lines AS "topCruiseLines",
        price_trend AS "priceTrend",
        trend_pct AS "trendPct",
        last_updated AS "lastUpdated"
      FROM destination_insights
      ORDER BY destination_region`
    );

    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err: any) {
    console.error('[ENRICHMENT] Destinations error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/enrichment/destinations/:region
 * Returns insight for a specific destination region.
 */
router.get('/destinations/:region', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT 
        destination_region AS "destinationRegion",
        avg_price_ppd AS "avgPricePpd",
        best_value_months AS "bestValueMonths",
        peak_season_months AS "peakSeasonMonths",
        shoulder_months AS "shoulderMonths",
        avg_duration_days AS "avgDurationDays",
        total_active_sailings AS "totalActiveSailings",
        top_cruise_lines AS "topCruiseLines",
        price_trend AS "priceTrend",
        trend_pct AS "trendPct",
        last_updated AS "lastUpdated"
      FROM destination_insights WHERE destination_region = $1`,
      [req.params.region]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Destination not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('[ENRICHMENT] Destination detail error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// MARKET COMPARISONS
// ============================================================================

/**
 * GET /api/enrichment/market-comparisons
 * Returns cruise line pricing benchmarks.
 */
router.get('/market-comparisons', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT 
        cruise_line AS "cruiseLine",
        avg_price_ppd AS "avgPricePpd",
        min_price_ppd AS "minPricePpd",
        max_price_ppd AS "maxPricePpd",
        avg_duration_days AS "avgDurationDays",
        destination_count AS "destinationCount",
        sailing_count AS "sailingCount",
        overall_rating AS "overallRating",
        best_value_rating AS "bestValueRating",
        last_updated AS "lastUpdated"
      FROM market_comparisons
      ORDER BY overall_rating DESC NULLS LAST`
    );

    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err: any) {
    console.error('[ENRICHMENT] Market comparisons error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/enrichment/market-comparisons/:cruiseLine
 * Returns benchmark for a specific cruise line.
 */
router.get('/market-comparisons/:cruiseLine', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT 
        cruise_line AS "cruiseLine",
        avg_price_ppd AS "avgPricePpd",
        min_price_ppd AS "minPricePpd",
        max_price_ppd AS "maxPricePpd",
        avg_duration_days AS "avgDurationDays",
        destination_count AS "destinationCount",
        sailing_count AS "sailingCount",
        overall_rating AS "overallRating",
        best_value_rating AS "bestValueRating",
        last_updated AS "lastUpdated"
      FROM market_comparisons WHERE cruise_line = $1`,
      [req.params.cruiseLine]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cruise line not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('[ENRICHMENT] Market comparison error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// BOOKING INSIGHTS
// ============================================================================

/**
 * GET /api/enrichment/booking-insights
 * Returns optimal booking window intelligence per destination.
 */
router.get('/booking-insights', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT 
        destination_region AS "destinationRegion",
        optimal_booking_window AS "optimalBookingWindow",
        avg_days_before_departure AS "avgDaysBeforeDeparture",
        last_minute_deal_score AS "lastMinuteDealScore",
        early_bird_discount_pct AS "earlyBirdDiscountPct",
        last_updated AS "lastUpdated"
      FROM booking_insights
      ORDER BY destination_region`
    );

    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err: any) {
    console.error('[ENRICHMENT] Booking insights error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// PRICE FORECASTS
// ============================================================================

/**
 * GET /api/enrichment/price-forecasts/:sailingId
 * Returns price forecast for a specific sailing.
 */
router.get('/price-forecasts/:sailingId', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT 
        sailing_id AS "sailingId",
        cabin_type AS "cabinType",
        current_price_usd AS "currentPriceUsd",
        forecast_7d AS "forecast7d",
        forecast_30d AS "forecast30d",
        confidence_score AS "confidenceScore",
        trend_direction AS "trendDirection",
        generated_at AS "generatedAt"
      FROM price_forecasts
      WHERE sailing_id = $1
      ORDER BY cabin_type, generated_at DESC`,
      [req.params.sailingId]
    );

    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err: any) {
    console.error('[ENRICHMENT] Price forecasts error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/enrichment/stats
 * Returns aggregate enrichment stats for dashboard display.
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();

    const shipCount = await pool.query('SELECT COUNT(*) AS c FROM ship_details');
    const destCount = await pool.query('SELECT COUNT(*) AS c FROM destination_insights');
    const marketCount = await pool.query('SELECT COUNT(*) AS c FROM market_comparisons');
    const bookingCount = await pool.query('SELECT COUNT(*) AS c FROM booking_insights');
    const forecastCount = await pool.query('SELECT COUNT(*) AS c FROM price_forecasts');

    res.json({
      success: true,
      data: {
        shipsWithDetails: parseInt(shipCount.rows[0].c, 10),
        destinationsTracked: parseInt(destCount.rows[0].c, 10),
        marketComparisons: parseInt(marketCount.rows[0].c, 10),
        bookingInsights: parseInt(bookingCount.rows[0].c, 10),
        priceForecasts: parseInt(forecastCount.rows[0].c, 10),
      },
    });
  } catch (err: any) {
    console.error('[ENRICHMENT] Stats error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
