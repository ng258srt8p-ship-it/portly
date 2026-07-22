/**
 * TRIPTIDE — API Server Entry Point
 *
 * Express server with the hybrid sourcing engine,
 * pricing math layer, and cruise route controllers.
 *
 * Usage:
 *   npm run server          # Start production server
 *   npm run server:dev     # Start with ts-node (development)
 *   npm run server:sync    # Run hybrid sync cycle once
 */

import express from 'express';
import cors from 'cors';
import dealsRouter from './routes/cruises';
import analyticsRouter from './routes/analytics';
import enrichmentRouter from './routes/enrichment';
import enhancedRouter from './routes/enhanced';
import { initializeOptimizedSync, getLastSyncReport, getEngineConfig } from './services/hybridEngineOptimized';
import { getPool, testConnection, closePool } from './db/pool';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ============================================================================
// MIDDLEWARE
// ============================================================================

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', 
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path} ${JSON.stringify(req.query)}`);
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Cruise API routes
app.use('/', dealsRouter);

// Analytics routes
app.use('/api/analytics', analyticsRouter);

// Data enrichment routes
app.use('/api/enrichment', enrichmentRouter);

// Enhanced analytics routes
app.use('/api/enhanced', enhancedRouter);

// Health check
app.get('/api/health', async (_req, res) => {
  const syncReport = getLastSyncReport();
  const dbConnected = await testConnection();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    engine: getEngineConfig(),
    lastSync: syncReport
      ? {
          status: syncReport.status,
          completedAt: syncReport.completedAt,
          b2bRecords: syncReport.b2bRecordsFetched,
          checkoutSuccesses: syncReport.checkoutSuccesses,
          errors: syncReport.errors,
        }
      : null,
    database: dbConnected ? 'connected' : 'disconnected',
  });
});

// Stats endpoint for dashboard badges
app.get('/api/stats', async (_req, res) => {
  try {
    const pool = getPool();
    const sailingCount = await pool.query("SELECT COUNT(*) AS count FROM sailings WHERE sync_status = 'active'");
    const pricingCount = await pool.query('SELECT COUNT(*) AS count FROM pricing_snapshots');
    const shipCount = await pool.query('SELECT COUNT(*) AS c FROM ship_details');
    const destCount = await pool.query('SELECT COUNT(*) AS c FROM destination_insights');
    res.json({
      trackedSailings: parseInt(sailingCount.rows[0].count, 10),
      pricingSnapshots: parseInt(pricingCount.rows[0].count, 10),
      shipsDetailed: parseInt(shipCount.rows[0].c, 10),
      destinationsTracked: parseInt(destCount.rows[0].c, 10),
    });
  } catch {
    res.json({ trackedSailings: 0, pricingSnapshots: 0, shipsDetailed: 0, destinationsTracked: 0 });
  }
});

// Engine control
app.post('/api/engine/sync', async (_req, res) => {
  try {
    const { runOptimizedSyncCycle } = await import('./services/hybridEngineOptimized');
    const report = await runOptimizedSyncCycle();
    res.json({ message: 'Sync cycle completed', report });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Sync cycle failed', detail: message });
  }
});

// ============================================================================
// STARTUP
// ============================================================================

if (process.env.RUN_SYNC_ONLY === 'true') {
  // Standalone sync mode: run once and exit
  import('./services/hybridEngineOptimized').then(({ runOptimizedSyncCycle }) => {
    runOptimizedSyncCycle()
      .then((report) => {
        console.log('[SERVER] Standalone sync complete:', report.status);
        process.exit(report.status === 'failed' ? 1 : 0);
      })
      .catch((err) => {
        console.error('[SERVER] Standalone sync failed:', err);
        process.exit(1);
      });
  });
} else {
  // Normal server mode
  app.listen(PORT, () => {
    console.log('');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log(`│  TRIPTIDE API SERVER                                      │`);
    console.log(`│  Port: ${PORT}                                               │`);
    console.log(`│  Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}              │`);
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│  ENDPOINTS:                                                │');
    console.log('│  GET  /api/health           — Server status + engine state │');
    console.log('│  GET  /api/sailing-breakdown — Single sailing cost breakdown│');
    console.log('│  GET  /api/search           — Multi-passenger cruise search │');
    console.log('│  GET  /api/deals            — Best deal-rated cruises       │');
    console.log('│  GET  /api/solo-friendly    — Solo traveler filtered view   │');
    console.log('│  POST /api/engine/sync      — Trigger hybrid sync cycle     │');
    console.log('│  GET  /api/analytics/market-summary  — AI market report     │');
    console.log('│  GET  /api/analytics/deal-analysis/:id  — AI deal analysis  │');
    console.log('│  GET  /api/analytics/price-forecast/:id — AI price forecast  │');
    console.log('│  POST /api/analytics/analyze-all  — Batch AI analysis       │');
    console.log('│  GET  /api/enrichment/ships        — Ship details            │');
    console.log('│  GET  /api/enrichment/destinations — Destination insights    │');
    console.log('│  GET  /api/enrichment/market-comparisons — Line benchmarks   │');
    console.log('│  GET  /api/enrichment/booking-insights — Booking windows     │');
    console.log('│  GET  /api/enrichment/price-forecasts/:id — Price forecasts  │');
    console.log('│  GET  /api/enrichment/stats        — Enrichment stats        │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    console.log('');

    // Initialize the hybrid sourcing engine
    initializeOptimizedSync();

    // Initialize database pool (warm it up)
    getPool();
    testConnection().then((ok) => {
      console.log(`│  Database: ${ok ? '✓ connected' : '✗ disconnected'}                         │`);
    });
  });
}

export default app;
