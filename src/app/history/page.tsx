'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/Footer';
import MaterialIcon from '@/components/ui/MaterialIcon';
import Sparkline from '@/components/ui/Sparkline';
import { fetchPriceHistory } from '@/services/cruiseApi';
import { useLiveData } from '@/hooks/useLiveData';
import type { HistoryLine } from '@/types/cruise';

function formatPrice(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** Number of grid columns at a given breakpoint — used to compute the row index
 *  so we can insert the detail panel directly after the active card's row.
 *  Matches the `grid-cols-X` classes on the cards container. */
const COLS = { mobile: 1, tablet: 2, desktop: 3 } as const;

/** Client-side breakpoint tracker so the panel lands after the correct row. */
function useBreakpoint() {
  const [cols, setCols] = useState<number>(COLS.desktop);
  useEffect(() => {
    const mqDesktop = window.matchMedia('(min-width: 1024px)');
    const mqTablet = window.matchMedia('(min-width: 768px)');
    const update = () => setCols(mqDesktop.matches ? COLS.desktop : mqTablet.matches ? COLS.tablet : COLS.mobile);
    update();
    mqDesktop.addEventListener('change', update);
    mqTablet.addEventListener('change', update);
    return () => {
      mqDesktop.removeEventListener('change', update);
      mqTablet.removeEventListener('change', update);
    };
  }, []);
  return cols;
}

/** Compute line-aggregate metrics shared by the card and the panel.
 *  Pure function (not a hook) so it's safe to call in a loop. */
function computeLineMetrics(line: HistoryLine) {
  const allPrices = line.sailings.flatMap((s) => s.history.map((p) => p.price));
  const avgPrice = allPrices.length > 0
    ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length)
    : 0;
  const lineLowest = allPrices.length ? Math.min(...allPrices) : 0;
  const lineHighest = allPrices.length ? Math.max(...allPrices) : 0;
  const recentPrice = allPrices.length ? allPrices[allPrices.length - 1] : 0;
  const pctAboveLow = lineLowest > 0 ? Math.round(((recentPrice - lineLowest) / lineLowest) * 100) : 0;
  const trendDirection = allPrices.length >= 2
    ? (allPrices[allPrices.length - 1] >= allPrices[0] ? 'rising' : 'falling')
    : 'stable';
  return { allPrices, avgPrice, lineLowest, lineHighest, recentPrice, pctAboveLow, trendDirection };
}

function LineCardSkeleton() {
  return (
    <div className="rounded-3xl border border-black/[0.05] bg-white p-6 shadow-float">
      <div className="mb-4 h-6 w-40 animate-pulse rounded bg-black/[0.06]" />
      <div className="space-y-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-black/[0.05]" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-black/[0.05]" />
        <div className="mt-3 h-16 animate-pulse rounded-2xl bg-black/[0.04]" />
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
 * Compact, uniform-height card. Never renders expanded content itself — that
 * lives in the full-width DetailPanel sibling, so grid rows never stretch.
 * ─────────────────────────────────────────────────────────────────────────── */
function LineCard({
  line,
  expanded,
  onToggle,
  metrics,
}: {
  line: HistoryLine;
  expanded: boolean;
  onToggle: () => void;
  metrics: ReturnType<typeof computeLineMetrics>;
}) {
  const { allPrices, avgPrice, trendDirection } = metrics;
  return (
    <div
      className={`flex h-full flex-col rounded-3xl border bg-white p-6 transition-[box-shadow,border-color] duration-200 ${
        expanded
          ? 'border-indigo/40 shadow-[0_12px_40px_-8px_rgba(42,68,231,0.22)] ring-1 ring-indigo/10'
          : 'border-black/[0.05] shadow-float hover:border-black/[0.1] hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.08)]'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`panel-${line.line.replace(/\s+/g, '-')}`}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-bold text-ink">{line.line}</h3>
            <span className="rounded-full bg-black/[0.04] px-2.5 py-0.5 text-[11px] font-semibold text-ink-soft">
              {line.totalSailings}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {line.totalSailings} sailing{line.totalSailings !== 1 ? 's' : ''} · avg ${avgPrice.toLocaleString()}
          </p>
        </div>
        <MaterialIcon
          name={expanded ? 'expand_less' : 'expand_more'}
          size="md"
          className={`mt-1 shrink-0 transition-transform duration-200 ${expanded ? 'text-indigo' : 'text-ink-faint'}`}
        />
      </button>

      {/* Always-visible collapsed preview sparkline */}
      {allPrices.length > 0 && (
        <div className="mt-4">
          <Sparkline data={allPrices} positive={trendDirection !== 'rising'} />
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
 * Full-width detail panel. Rendered as a grid item with grid-column: 1 / -1
 * so it occupies its own row spanning all columns directly below the active
 * card's row. Contains a header bar with close button, left metrics column,
 * and right sailing inventory table.
 * ─────────────────────────────────────────────────────────────────────────── */
function DetailPanel({
  line,
  metrics,
  onClose,
}: {
  line: HistoryLine;
  metrics: ReturnType<typeof computeLineMetrics>;
  onClose: () => void;
}) {
  const { allPrices, lineLowest, lineHighest, recentPrice, pctAboveLow, trendDirection } = metrics;
  const panelRef = useRef<HTMLDivElement>(null);

  // Smooth open transition using grid-template-rows 0fr → 1fr
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // Defer to next frame so the initial 0fr state is painted before expanding
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      ref={panelRef}
      id={`panel-${line.line.replace(/\s+/g, '-')}`}
      role="region"
      aria-label={`${line.line} price history details`}
      className="col-span-full grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out"
      style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
    >
      {/* Inner wrapper needed for the 0fr→1fr animation technique */}
      <div className="overflow-hidden">
        <div className="mt-2 rounded-3xl border border-indigo/15 bg-gradient-to-br from-white to-indigo/[0.02] shadow-[0_16px_48px_-12px_rgba(42,68,231,0.2)] ring-1 ring-indigo/5">
          {/* ─── Header bar ─── */}
          <div className="flex items-center justify-between gap-4 border-b border-black/[0.06] px-6 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo/10 text-indigo">
                <MaterialIcon name="directions_boat_filled" size="sm" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-display text-xl font-bold text-ink">{line.line}</h2>
                <p className="text-xs text-ink-faint">
                  {line.totalSailings} sailing{line.totalSailings !== 1 ? 's' : ''} · {allPrices.length} price points tracked · avg ${metrics.avgPrice.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-indigo/10 px-2.5 py-1 text-[11px] font-semibold text-indigo sm:inline">
                Active Filter
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${line.line} details`}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-black/[0.05] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo"
              >
                <MaterialIcon name="close" size="md" />
              </button>
            </div>
          </div>

          {/* ─── Body: 2-column dashboard ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-0">
            {/* Left column — metrics + trend chart */}
            <div className="border-b border-black/[0.06] p-6 lg:border-b-0 lg:border-r">
              {/* Key stats grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl bg-canvas p-3">
                  <p className="text-[10px] uppercase tracking-wide text-ink-faint">Current Fare</p>
                  <p className="mt-1 font-mono-tab text-lg font-bold text-ink">{formatPrice(recentPrice)}</p>
                  <p className={`mt-0.5 text-[10px] font-semibold ${pctAboveLow > 5 ? 'text-coral-ink' : 'text-mint-ink'}`}>
                    {pctAboveLow > 0 ? `${pctAboveLow}% above low` : 'at all-time low'}
                  </p>
                </div>
                <div className="rounded-xl bg-canvas p-3">
                  <p className="text-[10px] uppercase tracking-wide text-ink-faint">90-Day Low</p>
                  <p className="mt-1 font-mono-tab text-lg font-bold text-mint-ink">{formatPrice(lineLowest)}</p>
                  <p className="mt-0.5 text-[10px] text-ink-faint">best fare recorded</p>
                </div>
                <div className="rounded-xl bg-canvas p-3">
                  <p className="text-[10px] uppercase tracking-wide text-ink-faint">90-Day High</p>
                  <p className="mt-1 font-mono-tab text-lg font-bold text-ink-soft">{formatPrice(lineHighest)}</p>
                  <p className="mt-0.5 text-[10px] text-ink-faint">peak fare recorded</p>
                </div>
                <div className="rounded-xl bg-canvas p-3">
                  <p className="text-[10px] uppercase tracking-wide text-ink-faint">Trend</p>
                  <p className={`mt-1 flex items-center gap-1 text-lg font-bold ${trendDirection === 'falling' ? 'text-mint-ink' : trendDirection === 'rising' ? 'text-coral-ink' : 'text-ink-soft'}`}>
                    <MaterialIcon name={trendDirection === 'falling' ? 'trending_down' : trendDirection === 'rising' ? 'trending_up' : 'trending_flat'} size="sm" />
                    <span className="capitalize">{trendDirection}</span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-ink-faint">{allPrices.length} data points</p>
                </div>
              </div>

              {/* Trend chart */}
              {allPrices.length > 1 && (
                <div className="mt-4 rounded-xl bg-canvas p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">90-Day Price Trend</p>
                    {pctAboveLow <= 5 && (
                      <span className="rounded-full bg-mint-soft px-2 py-0.5 text-[10px] font-semibold text-mint-ink">
                        Lowest in 90d
                      </span>
                    )}
                  </div>
                  <Sparkline data={allPrices} positive={trendDirection !== 'rising'} width={320} height={72} />
                  <div className="mt-1 flex justify-between text-[10px] text-ink-faint">
                    <span>90 days ago</span>
                    <span>Today</span>
                  </div>
                </div>
              )}

              {/* Recommendation */}
              <div className={`mt-4 flex items-start gap-2 rounded-xl p-3 ${pctAboveLow <= 5 ? 'bg-mint-soft' : 'bg-amber-50'}`}>
                <MaterialIcon
                  name={pctAboveLow <= 5 ? 'check_circle' : 'schedule'}
                  size="sm"
                  className={`mt-0.5 shrink-0 ${pctAboveLow <= 5 ? 'text-mint-ink' : 'text-amber-600'}`}
                />
                <p className={`text-xs font-medium ${pctAboveLow <= 5 ? 'text-mint-ink' : 'text-amber-700'}`}>
                  {pctAboveLow <= 5
                    ? 'Good Time to Buy — fares are at or near the 90-day low.'
                    : `Prices are ${pctAboveLow}% above the 90-day low. Prices typically drop 30–45 days before sailing.`}
                </p>
              </div>
            </div>

            {/* Right column — sailing inventory table */}
            <div className="p-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                  {line.sailings.length} Active Sailing{line.sailings.length !== 1 ? 's' : ''}
                </p>
                <Link
                  href={`/deals?cruiseLine=${encodeURIComponent(line.line)}`}
                  className="flex items-center gap-0.5 text-[11px] font-medium text-indigo hover:underline"
                >
                  All {line.line} deals
                  <MaterialIcon name="arrow_forward" size="sm" />
                </Link>
              </div>

              <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {line.sailings.map((s) => {
                  const perNight = s.durationDays > 0 ? Math.round(s.currentPrice / s.durationDays) : 0;
                  const dropPct = s.highestPrice > 0 && s.currentPrice < s.highestPrice
                    ? Math.round(((s.highestPrice - s.currentPrice) / s.highestPrice) * 100)
                    : 0;
                  const isLow = s.currentPrice <= s.lowestPrice * 1.02;
                  return (
                    <div
                      key={`${s.sailingId}-${s.cabinType}`}
                      className="flex items-center gap-3 rounded-xl border border-black/[0.05] bg-white px-3 py-2.5 transition-colors hover:border-indigo/20 hover:bg-indigo/[0.02]"
                    >
                      {/* Ship + meta */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{s.ship}</p>
                        <p className="mt-0.5 text-[11px] text-ink-faint">
                          {s.durationDays} nights · {s.cabinType} · ${perNight}/night
                        </p>
                      </div>
                      {/* Mini sparkline */}
                      {s.history.length > 1 && (
                        <div className="hidden shrink-0 sm:block">
                          <Sparkline data={s.history.map((h) => h.price)} positive={s.currentPrice >= s.lowestPrice} width={72} height={28} />
                        </div>
                      )}
                      {/* Price + badge + CTA */}
                      <div className="shrink-0 text-right">
                        <p className="font-mono-tab text-sm font-bold text-ink">{formatPrice(s.currentPrice)}</p>
                        {dropPct >= 10 && (
                          <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold ${isLow ? 'bg-mint-soft text-mint-ink' : 'bg-indigo/10 text-indigo'}`}>
                            −{dropPct}%
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/sailing/${s.sailingId}`}
                        className="shrink-0 rounded-full bg-ink/[0.04] px-2.5 py-1 text-[10px] font-semibold text-ink-soft transition-colors hover:bg-indigo hover:text-white"
                        aria-label={`View ${s.ship} sailing details`}
                      >
                        View
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Footer CTAs */}
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-black/[0.06] pt-4">
                <Link
                  href={`/alerts?sailing=/sailing/${encodeURIComponent(line.sailings[0]?.sailingId || '')}`}
                  className="flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-indigo"
                >
                  <MaterialIcon name="notifications_active" size="sm" />
                  Track Price Alert
                </Link>
                <Link
                  href={`/deals?cruiseLine=${encodeURIComponent(line.line)}`}
                  className="flex items-center gap-1 rounded-full bg-indigo px-4 py-2 text-xs font-semibold text-white shadow-[0_6px_16px_-4px_rgba(42,68,231,0.5)] transition-all hover:bg-indigo-dark active:scale-[0.97] min-h-[36px]"
                >
                  View Deal Details
                  <MaterialIcon name="arrow_forward" size="sm" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const fetcher = useMemo(() => fetchPriceHistory, []);
  const { data: history, loading, error, lastSyncedAt, refresh } = useLiveData(fetcher, { pollIntervalMs: 30000 });

  const [expandedLine, setExpandedLine] = useState<string | null>(null);
  const cols = useBreakpoint();

  // Recompute seconds-ago every second for freshness indicator
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Pre-compute metrics for every line (cheap — pure JS over cached arrays)
  const metricsByLine = useMemo(() => {
    const map: Record<string, ReturnType<typeof computeLineMetrics>> = {};
    history?.lines.forEach((l) => { map[l.line] = computeLineMetrics(l); });
    return map;
  }, [history]);

  // Build the flat render list: for each card, optionally insert its detail panel
  // directly after it. Because the panel uses `col-span-full`, CSS Grid places it
  // on its own row beneath the active card's row — no row stretching.
  const renderItems: Array<{ type: 'card'; line: HistoryLine } | { type: 'panel'; line: HistoryLine }> = useMemo(() => {
    if (!history) return [];
    const items: Array<{ type: 'card'; line: HistoryLine } | { type: 'panel'; line: HistoryLine }> = [];
    for (const line of history.lines) {
      items.push({ type: 'card', line });
      if (expandedLine === line.line) {
        items.push({ type: 'panel', line });
      }
    }
    return items;
  }, [history, expandedLine]);

  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-extrabold text-ink sm:text-5xl">Cruise Line Price History</h1>
              <p className="mt-4 max-w-2xl text-lg text-ink-soft">
                Track how cruise fares have moved over time across every major line and destination.
              </p>
            </div>
            <Link
              href="/deals"
              className="shrink-0 whitespace-nowrap rounded-full border border-black/[0.06] bg-white px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-indigo hover:text-indigo shadow-float"
            >
              <MaterialIcon name="arrow_back" size="sm" className="mr-1" />
              Back to Deals
            </Link>
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm text-ink-faint">
            {!loading && history && (
              <>
                <span className="flex items-center gap-1.5">
                  <MaterialIcon name="trending_up" size="sm" />
                  {history.lines.length} cruise line{history.lines.length !== 1 ? 's' : ''} tracked
                </span>
                {lastSyncedAt && (
                  <span className="font-mono-tab text-[11px]">
                    Updated {Math.max(0, Math.floor((Date.now() - lastSyncedAt) / 1000))}s ago
                  </span>
                )}
              </>
            )}
          </div>

          {/* Stats bar */}
          {history && !loading && (
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-ink-faint">
              <span className="flex items-center gap-1.5">
                <MaterialIcon name="bar_chart" size="sm" />
                {history.totalPricesTracked} prices tracked
              </span>
              <span className="h-1 w-1 rounded-full bg-ink-faint/30" />
              <span className="flex items-center gap-1.5">
                <MaterialIcon name="directions_boat" size="sm" />
                {history.totalSailings} sailings
              </span>
              <span className="h-1 w-1 rounded-full bg-ink-faint/30" />
              <span className="flex items-center gap-1.5">
                <MaterialIcon name="groups" size="sm" />
                {history.lines.length} cruise lines
              </span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-3xl border border-coral-ink/15 bg-coral-soft p-6 sm:flex-row sm:items-center">
              <p className="text-sm font-medium text-coral-ink">
                Couldn't load price history. {error}
              </p>
              <button
                onClick={refresh}
                className="shrink-0 rounded-full bg-coral-ink px-4 py-2 text-xs font-bold text-white hover:opacity-90"
              >
                Retry
              </button>
            </div>
          )}

          {/* Cards grid — panels are inserted as col-span-full siblings */}
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Loading skeletons */}
            {loading && !history
              ? Array.from({ length: 6 }).map((_, i) => <LineCardSkeleton key={i} />)
              : null}

            {/* Real cards + active detail panel */}
            {renderItems.map((item) =>
              item.type === 'card' ? (
                <LineCard
                  key={`card-${item.line.line}`}
                  line={item.line}
                  expanded={expandedLine === item.line.line}
                  onToggle={() => setExpandedLine(expandedLine === item.line.line ? null : item.line.line)}
                  metrics={metricsByLine[item.line.line]}
                />
              ) : (
                <DetailPanel
                  key={`panel-${item.line.line}`}
                  line={item.line}
                  metrics={metricsByLine[item.line.line]}
                  onClose={() => setExpandedLine(null)}
                />
              ),
            )}
          </div>

          {/* Empty state */}
          {!loading && history && history.lines.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <MaterialIcon name="search" size="3xl" className="text-ink-faint/40" />
              <p className="mt-4 font-display text-xl font-bold text-ink">No price history yet</p>
              <p className="mt-1 max-w-xs text-sm text-ink-soft">
                Price history data requires sailings with multiple pricing snapshots. Run a NIM sync to generate data.
              </p>
              <button
                onClick={refresh}
                className="mt-6 rounded-full bg-ink px-6 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo"
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
