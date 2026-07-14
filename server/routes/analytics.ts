import { Router, Request, Response } from 'express';
import { getPool } from '../db/pool';
import {
  analyzeSailingDealOptimized,
  generatePriceForecast,
  analyzeAllSailingsOptimized
} from '../services/analyticsOptimized';
import { generateMarketSummary } from '../services/analytics';

// ---- In-memory cache for market summary (5-minute TTL) ----
let marketSummaryCache: { data: string; generatedAt: number } | null = null;
const MARKET_SUMMARY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const router = Router();

/**
 * GET /api/analytics/market-summary
 * Returns an AI-generated market conditions report based on all sailing data.
 */
router.get('/market-summary', async (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (marketSummaryCache && (now - marketSummaryCache.generatedAt) < MARKET_SUMMARY_CACHE_TTL_MS) {
      res.json({ success: true, data: marketSummaryCache.data, generatedAt: new Date(marketSummaryCache.generatedAt).toISOString(), cached: true });
      return;
    }
    const summary = await generateMarketSummary(false);
    marketSummaryCache = { data: summary, generatedAt: now };
    res.json({ success: true, data: summary, generatedAt: new Date(now).toISOString(), cached: false });
  } catch (err: any) {
    console.error('[Analytics] Market summary error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/deal-analysis/:sailingId
 * Returns the cached deal analysis from the database.
 * No NIM calls at page-load time — analysis is pre-generated during sync cycles.
 */
router.get('/deal-analysis/:sailingId', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT deal_analysis, deal_analysis_generated_at::TEXT
       FROM sailings WHERE id = $1`,
      [req.params.sailingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Sailing not found' });
    }

    const row = result.rows[0];

    if (row.deal_analysis) {
      return res.json({
        success: true,
        data: row.deal_analysis,
        generatedAt: row.deal_analysis_generated_at,
        cached: true,
      });
    }

    // No analysis yet — will be generated on next sync cycle
    return res.json({
      success: true,
      data: null,
      generatedAt: null,
      cached: false,
      note: 'Analysis not yet generated. It will be available after the next sync cycle.',
    });
  } catch (err: any) {
    console.error('[Analytics] Deal analysis error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/price-forecast/:sailingId
 * Returns the cached price forecast from the database.
 * No NIM calls at page-load time — forecast is pre-generated during sync cycles.
 */
router.get('/price-forecast/:sailingId', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT price_forecast, price_forecast_generated_at::TEXT
       FROM sailings WHERE id = $1`,
      [req.params.sailingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Sailing not found' });
    }

    const row = result.rows[0];

    if (row.price_forecast) {
      return res.json({
        success: true,
        data: row.price_forecast,
        generatedAt: row.price_forecast_generated_at,
        cached: true,
      });
    }

    // No forecast yet — will be generated on next sync cycle
    return res.json({
      success: true,
      data: null,
      generatedAt: null,
      cached: false,
      note: 'Forecast not yet generated. It will be available after the next sync cycle.',
    });
  } catch (err: any) {
    console.error('[Analytics] Price forecast error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/analytics/analyze-all
 * Batch-analyze all sailings. Returns results inline and stores to DB.
 * This is an admin action — normally Phase 3 of the sync cycle handles this.
 */
router.post('/analyze-all', async (_req: Request, res: Response) => {
  try {
    const results = await analyzeAllSailingsOptimized(false);
    res.json({ success: true, data: results, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error('[Analytics] Batch analysis error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
