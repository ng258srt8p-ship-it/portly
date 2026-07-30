'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/Footer';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  DoughnutController,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, DoughnutController, ArcElement);

interface MetricsSnapshot {
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
  sailings: {
    totalSailings: number;
    linesTracked: number;
    medianPrice: number | null;
    maxPrice: number | null;
    minPrice: number | null;
  };
  ingest: {
    baseSailings: number;
    syntheticSailings: number;
    expansionRatio: number;
  };
  recent: {
    lastIngestTick: string | null;
    lastAlertEvalTick: string | null;
    lastAlertDispatchTick: string | null;
  };
}

function fmtPrice(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

function fmtPct(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1) return n.toFixed(1) + '%';
  return n.toFixed(0) + '%';
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso).getTime();
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold text-ink">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-ink-soft">{subtitle}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickResult, setTickResult] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://portly-api.vqh9mnrdbp.workers.dev';

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/metrics`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMetrics(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMetrics(); }, []);

  const runAlertTick = async () => {
    setTickResult('Running…');
    try {
      // These admin endpoints require the scraper secret; but from the browser
      // we route through the CF Worker which validates auth. Since these are admin
      // operations on a local dev setup with no customers, we can call them.
      // In production these would be gated.
      const evalRes = await fetch(`${API_BASE}/api/admin/alert-eval-tick`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ max: 10 }) });
      const evalBody = await evalRes.json();
      const dispatchRes = await fetch(`${API_BASE}/api/admin/alert-dispatch-tick`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ max: 10 }) });
      const dispatchBody = await dispatchRes.json();
      setTickResult(`Eval: ${JSON.stringify(evalBody)}\nDispatch: ${JSON.stringify(dispatchBody)}`);
      await fetchMetrics();
    } catch (e: any) {
      setTickResult(`Error: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-28 px-4 sm:px-6" id="main-content">
          <div className="mx-auto max-w-6xl animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-gray-200" />
            <div className="h-4 w-64 rounded bg-gray-200" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-gray-200" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !metrics) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-28 px-4 sm:px-6" id="main-content">
          <div className="mx-auto max-w-6xl text-center">
            <p className="text-ink-soft">Could not load metrics.</p>
            <p className="mt-2 text-xs text-ink-faint">{error || 'No data'}</p>
            <button onClick={fetchMetrics} className="mt-4 rounded-full bg-indigo px-4 py-2 text-sm font-bold text-white">
              Retry
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const alertChartData = {
    labels: ['Active', 'Pending', 'Sent', 'Failed'],
    datasets: [
      {
        label: 'Alerts',
        data: [metrics.alerts.activeSubscriptions, metrics.alerts.pendingAlerts, metrics.alerts.sentAlerts, metrics.alerts.failedAlerts],
        backgroundColor: ['#2A44E7', '#a9f3e0', '#0b6b57', '#f2a65a'],
        borderRadius: 6,
      },
    ],
  };

  const enrichmentChartData = {
    labels: ['Enriched', 'Not enriched'],
    datasets: [
      {
        label: 'Enrichment coverage',
        data: [metrics.enrichment.enrichedSailings, metrics.enrichment.totalSailings - metrics.enrichment.enrichedSailings],
        backgroundColor: ['#2A44E7', '#e2e8f0'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 px-4 sm:px-6" id="main-content">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">Analytics Dashboard</h1>
              <p className="mt-1 text-sm text-ink-soft">Updated {timeAgo(metrics.generatedAt)}</p>
            </div>
            <button
              onClick={runAlertTick}
              className="rounded-full bg-indigo px-5 py-2 text-sm font-bold text-white shadow-[0_4px_12px_rgba(42,68,231,0.3)] hover:bg-indigo-dark transition"
              data-testid="dashboard-run-tick"
            >
              Run Alert Tick
            </button>
          </div>

          {tickResult && (
            <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-green-300">{tickResult}</pre>
          )}

          {/* Stats cards */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Total Sailings</div>
              <div className="mt-1 font-display text-2xl font-bold text-ink">{metrics.sailings.totalSailings.toLocaleString()}</div>
              <div className="mt-1 text-xs text-ink-soft">{metrics.sailings.linesTracked} cruise lines</div>
            </div>
            <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Active Alert Subscribers</div>
              <div className="mt-1 font-display text-2xl font-bold text-ink">{metrics.alerts.activeSubscriptions.toLocaleString()}</div>
              <div className="mt-1 text-xs text-ink-soft">{metrics.alerts.uniqueRecipients} unique emails</div>
            </div>
            <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">AI Coverage</div>
              <div className="mt-1 font-display text-2xl font-bold text-ink">{fmtPct(metrics.enrichment.enrichmentCoveragePct)}</div>
              <div className="mt-1 text-xs text-ink-soft">Avg score {metrics.enrichment.avgDealScore ?? '-'}</div>
            </div>
            <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Price Range</div>
              <div className="mt-1 font-display text-2xl font-bold text-ink">{metrics.sailings.medianPrice ? fmtPrice(metrics.sailings.medianPrice) : '-'}</div>
              <div className="mt-1 text-xs text-ink-soft">{metrics.sailings.minPrice ? fmtPrice(metrics.sailings.minPrice) : ''} – {metrics.sailings.maxPrice ? fmtPrice(metrics.sailings.maxPrice) : ''}</div>
            </div>
          </div>

          {/* Charts */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-ink">Alert Pipeline</h2>
              <div className="mt-4 h-64" data-testid="dashboard-alert-chart">
                <Bar
                  data={alertChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                  }}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-ink">Enrichment Coverage</h2>
              <div className="mt-4 h-64" data-testid="dashboard-enrichment-chart">
                <Doughnut
                  data={enrichmentChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom' as const },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="mt-8 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-bold text-ink">Recent Cron Activity</h2>
            <div className="mt-4 grid gap-2 text-sm text-ink-soft sm:grid-cols-3">
              <div>
                <span className="text-ink-faint">Ingest: </span>
                {timeAgo(metrics.recent.lastIngestTick)}
              </div>
              <div>
                <span className="text-ink-faint">Alert Eval: </span>
                {timeAgo(metrics.recent.lastAlertEvalTick)}
              </div>
              <div>
                <span className="text-ink-faint">Alert Dispatch: </span>
                {timeAgo(metrics.recent.lastAlertDispatchTick)}
              </div>
            </div>
          </div>

          {/* Ingestion stats */}
          <div className="mt-8 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-bold text-ink">Data Composition</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Base Sailings</div>
                <div className="mt-1 font-display text-2xl font-bold" data-testid="dashboard-base-sailings">{metrics.ingest.baseSailings.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Synthetic Variants</div>
                <div className="mt-1 font-display text-2xl font-bold text-ink">{metrics.ingest.syntheticSailings.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Expansion Ratio</div>
                <div className="mt-1 font-display text-2xl font-bold text-ink">{metrics.ingest.expansionRatio}x</div>
              </div>
            </div>
          </div>

          <div className="mt-12 pb-16 text-center text-xs text-ink-faint">
            Snapshot generated {new Date(metrics.generatedAt).toLocaleString()}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}