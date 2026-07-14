'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/Footer';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { fetchSoloFriendly } from '@/services/cruiseApi';
import { useLiveData } from '@/hooks/useLiveData';
import type { SoloSailing } from '@/types/cruise';

type FilterMode = 'all' | 'waived' | 'low';

const FILTERS: { key: FilterMode; label: string; className: string }[] = [
  { key: 'all', label: 'All Solo-Friendly', className: 'border-mint-ink/15 bg-mint-soft text-mint-ink' },
  { key: 'waived', label: 'Supplement Waived', className: 'border-coral-ink/15 bg-coral-soft text-coral-ink' },
  { key: 'low', label: 'Low Supplement (≤25%)', className: 'border-amber-400/15 bg-amber-50 text-amber-700' },
];

function formatPrice(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CardSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-black/[0.05] bg-white p-6 shadow-float">
      <div className="space-y-3">
        <div className="h-3 w-1/3 animate-pulse rounded bg-black/[0.06]" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-black/[0.06]" />
        <div className="flex gap-2">
          <div className="h-5 w-20 animate-pulse rounded-full bg-black/[0.05]" />
          <div className="h-5 w-24 animate-pulse rounded-full bg-black/[0.05]" />
        </div>
        <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-black/[0.05]" />
        <div className="flex items-end justify-between pt-2">
          <div className="h-8 w-24 animate-pulse rounded bg-black/[0.05]" />
          <div className="h-8 w-20 animate-pulse rounded-full bg-black/[0.06]" />
        </div>
      </div>
    </div>
  );
}

export default function SoloPage() {
  const router = useRouter();
  const fetcher = useMemo(() => fetchSoloFriendly, []);
  const { data: sailings, loading, error, lastSyncedAt, refresh } = useLiveData(fetcher, { pollIntervalMs: 30000 });

  const [filter, setFilter] = useState<FilterMode>('all');

  // Recompute seconds-ago every second for freshness indicator
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => forceTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    if (!sailings) return [];
    switch (filter) {
      case 'waived':
        return sailings.filter((s) => s.soloPrice.supplementWaived);
      case 'low':
        return sailings.filter((s) => !s.soloPrice.supplementWaived && s.raw.soloSupplementPercent <= 25);
      default:
        return sailings;
    }
  }, [sailings, filter]);

  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <h1 className="font-display text-4xl font-extrabold text-ink sm:text-5xl">Solo Hub</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            Cruises where solo travelers don&apos;t pay the dreaded single supplement. We surface every sailing with waived or low solo fees.
          </p>

          {/* Stats */}
          {sailings && !loading && (
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-ink-faint">
              <span className="flex items-center gap-1.5">
                <MaterialIcon name="person" size="sm" />
                {sailings.length} solo-friendly sailing{sailings.length !== 1 ? 's' : ''} found
              </span>
              {lastSyncedAt && (
                <>
                  <span className="h-1 w-1 rounded-full bg-ink-faint/30" />
                  <span className="font-mono-tab text-[11px]">
                    Updated {Math.max(0, Math.floor((Date.now() - lastSyncedAt) / 1000))}s ago
                  </span>
                </>
              )}
              <span className="h-1 w-1 rounded-full bg-ink-faint/30" />
              <span className="flex items-center gap-1.5">
                <MaterialIcon name="check_circle" size="sm" className="text-mint-ink" />
                {sailings.filter((s) => s.soloPrice.supplementWaived).length} with waived supplement
              </span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-3xl border border-coral-ink/15 bg-coral-soft p-6 sm:flex-row sm:items-center">
              <p className="text-sm font-medium text-coral-ink">
                Couldn&apos;t load solo-friendly sailings. {error}
              </p>
              <button
                onClick={refresh}
                className="shrink-0 rounded-full bg-coral-ink px-4 py-2 text-xs font-bold text-white hover:opacity-90"
              >
                Retry
              </button>
            </div>
          )}

          {/* Filter pills */}
          {sailings && !loading && !error && (
            <div className="mt-8 flex flex-wrap gap-3">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition-all active:scale-95 ${
                    filter === f.key
                      ? f.className
                      : 'border-black/[0.06] bg-white text-ink-soft hover:border-black/[0.12]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Results */}
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loading && !sailings
              ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
              : null}

            {filtered.map((s) => (
              <article
                key={s.id}
                className="group flex flex-col justify-between rounded-3xl border border-black/[0.05] bg-white p-6 shadow-float transition-all duration-300 hover:-translate-y-1 hover:shadow-float-lg"
              >
                <div>
                  {/* Header */}
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-faint">
                        {s.cruiseLine}
                      </p>
                      <h3 className="mt-1 truncate font-display text-xl font-bold text-ink">{s.shipName}</h3>
                    </div>
                    <span
                      className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold ${
                        s.soloPrice.supplementWaived
                          ? 'border-coral-ink/15 bg-coral-soft text-coral-ink'
                          : 'border-amber-400/15 bg-amber-50 text-amber-700'
                      }`}
                    >
                      {s.soloPrice.supplementWaived ? 'Waived' : `${s.raw.soloSupplementPercent}% Suppl.`}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Tag>{s.destination}</Tag>
                    <Tag>{s.departurePort}</Tag>
                    <Tag>{s.durationDays}nt</Tag>
                    <Tag>{s.cabinType}</Tag>
                  </div>

                  {/* Price box */}
                  <div className="rounded-2xl bg-canvas p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                      Solo out-the-door
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-mono-tab text-2xl font-bold text-ink">
                        {s.soloPrice.total}
                      </span>
                      <span className="font-mono-tab text-sm text-ink-faint">
                        {s.soloPrice.perDay}/day
                      </span>
                    </div>
                    {!s.soloPrice.supplementWaived && s.raw.soloSupplementPercent > 0 && (
                      <p className="mt-1 text-xs text-amber-600">
                        Includes {s.raw.soloSupplementPercent}% single supplement
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-black/[0.06] pt-4">
                  <span className="text-xs font-medium text-ink-faint">
                    {new Date(s.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => router.push(`/sailing/${s.id}`)}
                    className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo active:scale-95"
                  >
                    View Deal
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 17L17 7M17 7H9M17 7v8" />
                    </svg>
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Empty state */}
          {!loading && sailings && filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <MaterialIcon name="search" size="3xl" className="text-ink-faint/40" />
              <p className="mt-4 font-display text-xl font-bold text-ink">
                {filter === 'all'
                  ? 'No solo-friendly sailings found'
                  : filter === 'waived'
                  ? 'No sailings with fully waived supplements right now'
                  : 'No sailings with low supplements right now'}
              </p>
              <p className="mt-1 max-w-xs text-sm text-ink-soft">
                {filter !== 'all'
                  ? 'Try changing the filter or check back after the next NIM sync.'
                  : 'Run a NIM sync to generate sailings, then check back.'}
              </p>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="mt-6 rounded-full bg-ink px-6 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo"
                >
                  Show All
                </button>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="truncate rounded-lg bg-black/[0.035] px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
      {children}
    </span>
  );
}
