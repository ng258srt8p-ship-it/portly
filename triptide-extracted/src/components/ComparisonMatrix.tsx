import { useMemo, useState } from "react";
import type { CabinRate } from "../types/cruise";
import SyncStatus from "./SyncStatus";
import { fetchItineraries } from "../services/cruiseApi";
import { useLiveData } from "../hooks/useLiveData";

const cabinAccent: Record<CabinRate["cabinClass"], string> = {
  Inside: "bg-black/[0.04] text-ink-soft",
  Oceanview: "bg-indigo-mist text-indigo",
  Balcony: "bg-mint-soft text-mint-ink",
  Suite: "bg-coral-soft text-coral-ink",
};

function computeRow(cabin: CabinRate, nights: number, passengers: number) {
  const baseFare = cabin.baseFarePerPerson * passengers;
  const portTaxes = cabin.portTaxPerPerson * passengers;
  const gratuities = cabin.gratuityPerPersonPerNight * nights * passengers;
  const total = baseFare + portTaxes + gratuities;
  return { baseFare, portTaxes, gratuities, total };
}

export default function ComparisonMatrix() {
  const [passengers, setPassengers] = useState(2);
  const fetcher = useMemo(() => fetchItineraries, []);
  const { data: itineraries, loading, error, lastSyncedAt, refresh } = useLiveData(fetcher, { pollIntervalMs: 45000 });

  const handleSyncComplete = () => {
    // Toast is managed at the App level — this callback triggers it
  };

  const rows = useMemo(() => {
    if (!itineraries) return [];
    return itineraries.flatMap((it) =>
      it.cabins.map((cabin) => ({
        itineraryId: it.id,
        cruiseLine: it.cruiseLine,
        ship: it.ship,
        route: it.route,
        nights: it.nights,
        sailDate: it.sailDate,
        cabin,
        ...computeRow(cabin, it.nights, passengers),
      }))
    );
  }, [itineraries, passengers]);

  return (
    <section className="px-4 py-24 sm:px-6" id="matrix">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo">The core engine</span>
            <h2 className="mt-3 font-display text-4xl font-extrabold text-ink sm:text-5xl">
              Transparent Checkout Matrix
            </h2>
            <p className="mt-3 max-w-xl text-ink-soft">
              No surprise line items. Every fare, tax, and gratuity broken out — recalculated live as your party size
              changes.
            </p>
            <div className="mt-4">
              <SyncStatus loading={loading} lastSyncedAt={lastSyncedAt} onRefresh={refresh} onSyncComplete={handleSyncComplete} />
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-black/[0.06] bg-white p-2 pl-5 shadow-float">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Passengers</span>
            <div className="flex items-center gap-1 rounded-full bg-black/[0.04] p-1">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setPassengers(n)}
                  className={`h-11 w-11 rounded-full font-mono-tab text-sm font-bold transition-all ${
                    passengers === n
                      ? "bg-indigo text-white shadow-[0_6px_14px_-4px_rgba(42,68,231,0.6)]"
                      : "text-ink-soft hover:bg-white hover:text-ink"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-3xl border border-coral-ink/15 bg-coral-soft p-6 sm:flex-row sm:items-center">
            <p className="text-sm font-medium text-coral-ink">Couldn't reach the TripTide fare service. {error}</p>
            <button
              onClick={refresh}
              className="shrink-0 rounded-full bg-coral-ink px-4 py-2 text-xs font-bold text-white hover:opacity-90"
            >
              Retry
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-[28px] border border-black/[0.06] bg-white shadow-float-lg">
          {loading && rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <svg className="mb-4 h-12 w-12 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-lg font-semibold text-ink-soft">No itineraries found</p>
              <p className="mt-1 text-sm text-ink-faint">Check back soon — new fares are being monitored.</p>
            </div>
          ) : (
            <div className="scrollbar-none overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse text-left">
              <thead>
                <tr className="border-b border-black/[0.06] bg-canvas/70 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  <th className="px-6 py-4 font-semibold">Cruise Line</th>
                  <th className="px-4 py-4 font-semibold">Ship</th>
                  <th className="px-4 py-4 font-semibold">Cabin Class</th>
                  <th className="px-4 py-4 text-right font-semibold">Base Fare</th>
                  <th className="px-4 py-4 text-right font-semibold">Port Taxes</th>
                  <th className="px-4 py-4 text-right font-semibold">Gratuities</th>
                  <th className="px-4 py-4 text-right font-semibold">Out-The-Door Total</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0
                  ? Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
                  : rows.map((row, idx) => {
                      const isFirstOfGroup = idx === 0 || rows[idx - 1].itineraryId !== row.itineraryId;
                      return (
                        <tr
                          key={`${row.itineraryId}-${row.cabin.cabinClass}`}
                          className={`group border-b border-black/[0.045] transition-colors hover:bg-indigo-mist/40 ${
                            isFirstOfGroup ? "border-t-2 border-t-black/[0.06]" : ""
                          }`}
                        >
                          <td className="px-6 py-4 align-top">
                            {isFirstOfGroup && (
                              <>
                                <p className="font-semibold text-ink">{row.cruiseLine}</p>
                                <p className="mt-0.5 text-xs text-ink-faint">
                                  {row.route} · {row.nights}N · {row.sailDate}
                                </p>
                              </>
                            )}
                          </td>
                          <td className="px-4 py-4 align-top text-ink-soft">{isFirstOfGroup ? row.ship : ""}</td>
                          <td className="px-4 py-4 align-top">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cabinAccent[row.cabin.cabinClass]}`}>
                              {row.cabin.cabinClass}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right align-top font-mono-tab text-sm text-ink-soft">
                            ${row.baseFare.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-4 py-4 text-right align-top font-mono-tab text-sm text-ink-soft">
                            ${row.portTaxes.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-4 py-4 text-right align-top font-mono-tab text-sm text-ink-soft">
                            ${row.gratuities.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-4 py-4 text-right align-top font-mono-tab text-base font-bold text-ink">
                            ${row.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-6 py-4 text-right align-top">
                            <button aria-label={`View analytics deal — ${row.cabin.cabinClass} in ${row.cruiseLine}`} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-black/[0.08] px-3.5 py-2 text-xs font-bold text-ink transition-all group-hover:border-indigo group-hover:bg-indigo group-hover:text-white active:scale-95">
                              View Analytics Deal
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                              >
                                <path d="M7 17L17 7M17 7H9M17 7v8" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-ink-faint">
          Rates shown reflect live-tracked averages for {passengers} passenger{passengers > 1 ? "s" : ""} sharing one
          stateroom. Gratuities calculated per person, per night.
        </p>
      </div>
    </section>
  );
}

function RowSkeleton() {
  return (
    <tr className="border-b border-black/[0.045]">
      <td className="px-6 py-4">
        <div className="h-3 w-28 animate-pulse rounded bg-black/[0.06]" />
      </td>
      <td className="px-4 py-4">
        <div className="h-3 w-20 animate-pulse rounded bg-black/[0.05]" />
      </td>
      <td className="px-4 py-4">
        <div className="h-5 w-16 animate-pulse rounded-full bg-black/[0.06]" />
      </td>
      <td className="px-4 py-4 text-right">
        <div className="ml-auto h-3 w-12 animate-pulse rounded bg-black/[0.05]" />
      </td>
      <td className="px-4 py-4 text-right">
        <div className="ml-auto h-3 w-12 animate-pulse rounded bg-black/[0.05]" />
      </td>
      <td className="px-4 py-4 text-right">
        <div className="ml-auto h-3 w-12 animate-pulse rounded bg-black/[0.05]" />
      </td>
      <td className="px-4 py-4 text-right">
        <div className="ml-auto h-4 w-16 animate-pulse rounded bg-black/[0.06]" />
      </td>
      <td className="px-6 py-4 text-right">
        <div className="ml-auto h-8 w-28 animate-pulse rounded-full bg-black/[0.06]" />
      </td>
    </tr>
  );
}
