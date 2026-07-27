/**
 * Analytics aggregator — produces a metrics snapshot from D1 + KV.
 *
 * Exposes:
 *   - getMetricsSnapshot(env) → { alerts: {...}, enrichment: {...}, ingest: {...}, sailings: {...} }
 *
 * The snapshot powers both the JSON /api/admin/metrics endpoint and a future
 * front‑end dashboard. All numbers are derivable from existing tables; we
 * intentionally avoid a separate aggregation table for now (low scan cost on
 * 14 tables at this scale; can be promoted to a nightly rollup later if needed).
 */

export interface MetricsEnv {
  DB: D1Database;
  CACHE: KVNamespace;
}

export interface MetricsSnapshot {
  generatedAt: string;
  alerts: {
    activeSubscriptions: number;
    pendingAlerts: number;
    sentAlerts: number;
    failedAlerts: number;
    uniqueRecipients: number;
    recentAttempts: number;
  };
  enrichment: {
    totalSailings: number;
    enrichedSailings: number;
    enrichmentCoveragePct: number;
    avgDealScore: number | null;
    lastEnrichedAt: string | null;
  };
  ingest: {
    baseSailings: number;
    syntheticSailings: number;
    expansionRatio: number;
  };
  sailings: {
    totalSailings: number;
    linesTracked: number;
    medianPrice: number | null;
    maxPrice: number | null;
    minPrice: number | null;
  };
  shipClasses: { deck: string | null; cabin: string | null };
  recent: {
    lastIngestTick: string | null;
    lastAlertEvalTick: string | null;
    lastAlertDispatchTick: string | null;
  };
}

/** Build the full snapshot in one round trip per metric using efficient SQL. */
export async function getMetricsSnapshot(env: MetricsEnv): Promise<MetricsSnapshot> {
  // Single batched read using SELECTs against relatively small tables.
  // Each statement returns one row; D1 prepares these once per call.
  const [alertSums, enrichSums, sailingSums, shipClasses] = await Promise.all([
    env.DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM alerts WHERE is_active = 1) AS active_subs,
         (SELECT COUNT(*) FROM alerts WHERE is_active = 0) AS paused_subs,
         (SELECT COUNT(*) FROM alert_emails WHERE status='pending') AS pending_alerts,
         (SELECT COUNT(*) FROM alert_emails WHERE status='sent') AS sent_alerts,
         (SELECT COUNT(*) FROM alert_emails WHERE status='failed') AS failed_alerts,
         (SELECT COUNT(DISTINCT email) FROM alerts WHERE is_active=1) AS unique_recipients,
         (SELECT COUNT(*) FROM alert_email_log WHERE ts > datetime('now', '-1 day')) AS recent_attempts`
    ).first(),
    env.DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM sailings WHERE instr(id, '__v') = 0 AND instr(id, '__big_') = 0) AS total_bases,
         (SELECT COUNT(*) FROM sailings WHERE instr(id, '__v') > 0 OR instr(id, '__big_') > 0) AS synth,
         (SELECT COUNT(*) FROM sailings) AS total,
         (SELECT COUNT(*) FROM sailings WHERE ai_generated_at IS NOT NULL) AS enriched,
         (SELECT ROUND(AVG(ai_score), 1) FROM sailings WHERE ai_score IS NOT NULL) AS avg_score,
         (SELECT MAX(ai_generated_at) FROM sailings WHERE ai_generated_at IS NOT NULL) AS last_at`
    ).first(),
    env.DB.prepare(
      `SELECT
         (SELECT COUNT(DISTINCT cl.name)
            FROM sailings s JOIN cruise_lines cl ON s.cruise_line_id = cl.id
            WHERE s.price IS NOT NULL) AS lines,
         (SELECT ROUND(MIN(s.price), 2) FROM sailings s WHERE s.price IS NOT NULL) AS min_p,
         (SELECT ROUND(MAX(s.price), 2) FROM sailings s WHERE s.price IS NOT NULL) AS max_p,
         (SELECT ROUND(AVG(s.price), 2) FROM sailings s WHERE s.price IS NOT NULL) AS avg_p`
    ).first(),
    env.DB.prepare(
      `SELECT
         (SELECT ROUND(SUM(CASE WHEN s.departure_region LIKE '%Carib%' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1)
            FROM sailings s WHERE s.departure_region IS NOT NULL) AS caribbean_pct`
    ).first(),
  ]);

  const lastIngest = await env.CACHE.get('ingest:last_tick');
  const lastEval = await env.CACHE.get('alerts:last_eval_tick');
  const lastDispatch = await env.CACHE.get('alerts:last_dispatch_tick');

  const total = Number(enrichSums?.total) || 0;
  const enriched = Number(enrichSums?.enriched) || 0;

  return {
    generatedAt: new Date().toISOString(),
    alerts: {
      activeSubscriptions: Number(alertSums?.active_subs) || 0,
      pendingAlerts: Number(alertSums?.pending_alerts) || 0,
      sentAlerts: Number(alertSums?.sent_alerts) || 0,
      failedAlerts: Number(alertSums?.failed_alerts) || 0,
      uniqueRecipients: Number(alertSums?.unique_recipients) || 0,
      recentAttempts: Number(alertSums?.recent_attempts) || 0,
    },
    enrichment: {
      totalSailings: total,
      enrichedSailings: enriched,
      enrichmentCoveragePct: total > 0 ? Math.round((enriched / total) * 1000) / 10 : 0,
      avgDealScore: enrichSums?.avg_score != null ? Number(enrichSums.avg_score) : null,
      lastEnrichedAt: (enrichSums?.last_at as string | null) || null,
    },
    ingest: {
      baseSailings: Number(enrichSums?.total_bases) || 0,
      syntheticSailings: Number(enrichSums?.synth) || 0,
      expansionRatio: Number(enrichSums?.total_bases)
        ? Math.round((Number(enrichSums?.synth) / Number(enrichSums?.total_bases)) * 10) / 10
        : 0,
    },
    sailings: {
      totalSailings: total,
      linesTracked: Number(sailingSums?.lines) || 0,
      medianPrice: sailingSums?.avg_p != null ? Number(sailingSums.avg_p) : null,
      maxPrice: sailingSums?.max_p != null ? Number(sailingSums.max_p) : null,
      minPrice: sailingSums?.min_p != null ? Number(sailingSums.min_p) : null,
    },
    shipClasses: {
      deck: shipClasses?.caribbean_pct != null ? `${shipClasses.caribbean_pct}% Caribbean` : null,
      cabin: null,
    },
    recent: {
      lastIngestTick: lastIngest ? ((JSON.parse(lastIngest) as { ts: string }).ts as string) : null,
      lastAlertEvalTick: lastEval ? ((JSON.parse(lastEval) as { ts: string }).ts as string) : null,
      lastAlertDispatchTick: lastDispatch ? ((JSON.parse(lastDispatch) as { ts: string }).ts as string) : null,
    },
  };
}
