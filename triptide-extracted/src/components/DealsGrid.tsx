import { useMemo } from "react";
import type { BadgeType } from "../types/cruise";
import Sparkline from "./Sparkline";
import SyncStatus from "./SyncStatus";
import { fetchDeals } from "../services/cruiseApi";
import { useLiveData } from "../hooks/useLiveData";

const badgeStyles: Record<BadgeType, string> = {
  drop: "bg-mint-soft text-mint-ink border-mint-ink/15",
  solo: "bg-coral-soft text-coral-ink border-coral-ink/15",
  gold: "bg-coral-soft text-coral-ink border-coral-ink/15",
};

export default function DealsGrid() {
  const fetcher = useMemo(() => fetchDeals, []);
  const { data: deals, loading, error, lastSyncedAt, refresh } = useLiveData(fetcher, { pollIntervalMs: 45000 });

  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6" id="deals">
      <div className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo">Curated right now</span>
          <h2 className="mt-3 font-display text-4xl font-extrabold text-ink sm:text-5xl">Hot Deals on the Radar</h2>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <p className="max-w-sm text-ink-soft">
            Every card is powered by live fare polling — we flag the sailings where the tide has genuinely turned in your
            favor.
          </p>
          <SyncStatus loading={loading} lastSyncedAt={lastSyncedAt} onRefresh={refresh} />
        </div>
      </div>

      {error && (
        <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-3xl border border-coral-ink/15 bg-coral-soft p-6 sm:flex-row sm:items-center">
          <p className="text-sm font-medium text-coral-ink">
            Couldn't reach the TripTide fare service. {error}
          </p>
          <button
            onClick={refresh}
            className="shrink-0 rounded-full bg-coral-ink px-4 py-2 text-xs font-bold text-white hover:opacity-90"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading && !deals
          ? Array.from({ length: 6 }).map((_, i) => <DealCardSkeleton key={i} />)
          : deals?.map((deal) => (
              <article
                key={deal.id}
                className="group flex flex-col justify-between rounded-3xl border border-black/[0.05] bg-white p-6 shadow-float transition-all duration-300 hover:-translate-y-1 hover:shadow-float-lg"
              >
                <div>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-faint">
                        {deal.cruiseLine}
                      </p>
                      <h3 className="mt-1 truncate font-display text-xl font-bold text-ink">{deal.ship}</h3>
                    </div>
                    <span
                      className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold ${badgeStyles[deal.badgeType]}`}
                    >
                      {deal.badgeText}
                    </span>
                  </div>

                  <div className="mb-5 flex flex-wrap gap-2">
                    <Tag>{deal.destination}</Tag>
                    <Tag>{deal.departurePort}</Tag>
                    <Tag>{deal.duration}</Tag>
                  </div>

                  <div className="mb-5 flex items-end justify-between gap-3 rounded-2xl bg-canvas p-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">90-day trend</p>
                      <div className="mt-1 flex flex-wrap items-baseline gap-2">
                        <span className="font-mono-tab text-2xl font-bold text-ink">${deal.price.toLocaleString()}</span>
                        {deal.dropPercent > 0 && (
                          <span className="font-mono-tab text-sm text-ink-faint line-through">
                            ${deal.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Sparkline data={deal.history} positive={deal.dropPercent > 0} />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-black/[0.06] pt-4">
                  <span className="text-xs font-medium text-ink-faint">Sails {deal.sailDate}</span>
                  <button className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo active:scale-95">
                    View Deal
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 17L17 7M17 7H9M17 7v8" />
                    </svg>
                  </button>
                </div>
              </article>
            ))}
      </div>
    </section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="truncate rounded-lg bg-black/[0.035] px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
      {children}
    </span>
  );
}

function DealCardSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-black/[0.05] bg-white p-6 shadow-float">
      <div>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="w-2/3 space-y-2">
            <div className="h-3 w-1/2 animate-pulse rounded bg-black/[0.06]" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-black/[0.06]" />
          </div>
          <div className="h-6 w-20 shrink-0 animate-pulse rounded-full bg-black/[0.06]" />
        </div>
        <div className="mb-5 flex gap-2">
          <div className="h-6 w-20 animate-pulse rounded-lg bg-black/[0.05]" />
          <div className="h-6 w-16 animate-pulse rounded-lg bg-black/[0.05]" />
          <div className="h-6 w-16 animate-pulse rounded-lg bg-black/[0.05]" />
        </div>
        <div className="h-20 animate-pulse rounded-2xl bg-black/[0.04]" />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-black/[0.06] pt-4">
        <div className="h-3 w-20 animate-pulse rounded bg-black/[0.05]" />
        <div className="h-8 w-24 animate-pulse rounded-full bg-black/[0.06]" />
      </div>
    </div>
  );
}
