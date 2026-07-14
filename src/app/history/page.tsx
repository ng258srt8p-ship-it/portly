'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/Footer';
import MaterialIcon from '@/components/ui/MaterialIcon';
import Sparkline from '@/components/ui/Sparkline';
import { fetchPriceHistory } from '@/services/cruiseApi';
import { useLiveData } from '@/hooks/useLiveData';
import type { HistoryLine } from '@/types/cruise';

function formatPrice(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 0 });
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

export default function HistoryPage() {
  const fetcher = useMemo(() => fetchPriceHistory, []);
  const { data: history, loading, error, lastSyncedAt, refresh } = useLiveData(fetcher, { pollIntervalMs: 30000 });

  const [expandedLine, setExpandedLine] = useState<string | null>(null);

  // Recompute seconds-ago every second for freshness indicator
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-extrabold text-ink sm:text-5xl">Price History Maps</h1>
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
                Couldn&apos;t load price history. {error}
              </p>
              <button
                onClick={refresh}
                className="shrink-0 rounded-full bg-coral-ink px-4 py-2 text-xs font-bold text-white hover:opacity-90"
              >
                Retry
              </button>
            </div>
          )}

          {/* Cards grid */}
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Loading skeletons */}
            {loading && !history
              ? Array.from({ length: 6 }).map((_, i) => <LineCardSkeleton key={i} />)
              : null}

            {/* Real cards */}
            {history?.lines.map((line) => (
              <LineCard
                key={line.line}
                line={line}
                expanded={expandedLine === line.line}
                onToggle={() => setExpandedLine(expandedLine === line.line ? null : line.line)}
              />
            ))}
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

function LineCard({ line, expanded, onToggle }: { line: HistoryLine; expanded: boolean; onToggle: () => void }) {
  // Flatten history across all sailings for the mini sparkline
  const allPrices = line.sailings.flatMap((s) => s.history.map((p) => p.price));
  const avgPrice = allPrices.length > 0
    ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length)
    : 0;

  return (
    <div className="flex flex-col rounded-3xl border border-black/[0.05] bg-white p-6 shadow-float transition-all duration-200">
      {/* Card header */}
      <a
        href={`/deals?cruiseLine=${encodeURIComponent(line.line)}`}
        className="flex items-start justify-between gap-3 text-left"
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
          className="mt-1 shrink-0 text-ink-faint"
        />
      </a>

      {/* Mini sparkline */}
      {allPrices.length > 0 && (
        <div className="mt-4">
          <Sparkline data={allPrices} positive={allPrices[allPrices.length - 1] >= allPrices[0]} />
        </div>
      )}

      {/* Expanded sailing detail */}
      {expanded && (
        <div className="mt-4 space-y-2 border-t border-black/[0.06] pt-4">
          {line.sailings.map((s) => (
            <div
              key={`${s.sailingId}-${s.cabinType}`}
              className="rounded-xl bg-canvas p-3 transition-colors hover:bg-black/[0.03]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{s.ship}</p>
                  <p className="text-xs text-ink-faint">
                    {s.cabinType} · {s.durationDays}nt · {s.history.length} snapshot{s.history.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono-tab text-sm font-bold text-ink">{formatPrice(s.currentPrice)}</p>
                  <p className="text-xs text-ink-faint">
                    Low {formatPrice(s.lowestPrice)}
                  </p>
                </div>
              </div>
              {s.history.length > 1 && (
                <div className="mt-2 h-8">
                  <Sparkline data={s.history.map((h) => h.price)} positive={s.currentPrice >= s.lowestPrice} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}