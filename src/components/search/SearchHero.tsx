"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Dropdown from "@/components/ui/Dropdown";
import { fetchFilterOptions } from "@/services/cruiseApi";
import { useLiveData } from "@/hooks/useLiveData";

const STATS_API = process.env.NEXT_PUBLIC_API_URL || '';

function CompassIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M16 8l-2 6-6 2 2-6 6-2z" />
    </svg>
  );
}

function ShipIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l1.5-6h15L21 17" />
      <path d="M5.5 11V6h4V4h5v2h1l1.5 5" />
      <path d="M2 20c1.5 1 3.5 1 5 0s3.5-1 5 0 3.5 1 5 0 3.5-1 5 0" />
    </svg>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="font-mono-tab">
      <span className="font-semibold text-ink">{value}</span> {label}
    </span>
  );
}

function Dot() {
  return <span className="hidden h-1 w-1 rounded-full bg-ink-faint/50 sm:inline-block" />;
}

export default function Hero() {
  const router = useRouter();
  const fetcher = useMemo(() => fetchFilterOptions, []);
  const { data, loading } = useLiveData(fetcher);

  // Fetch live sailing count
  const statsFetcher = useMemo(
    () => async () => {
      const res = await fetch(`${STATS_API}/api/stats`);
      return res.json();
    },
    []
  );
  const { data: stats } = useLiveData(statsFetcher);
  const trackedCount = stats?.trackedSailings ?? 0;
  const formattedCount = trackedCount.toLocaleString('en-US');

  const destinations = data ? ["Any Destination", ...data.destinations] : ["Any Destination"];
  const cruiseLines = data ? ["Any Cruise Line", ...data.cruiseLines] : ["Any Cruise Line"];

  const [destination, setDestination] = useState(destinations[0]);
  const [cruiseLine, setCruiseLine] = useState(cruiseLines[0]);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (destination && destination !== "Any Destination") params.set("destination", destination);
    if (cruiseLine && cruiseLine !== "Any Cruise Line") params.set("cruiseLine", cruiseLine);
    if (adults !== 2) params.set("adults", String(adults));
    if (children > 0) params.set("children", String(children));
    router.push(`/deals?${params.toString()}`);
  };

  return (
    <section id="top" className="relative px-4 pb-20 pt-36 sm:px-6 sm:pt-44 lg:pt-48">
      {/* Ambient artistic backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-16 h-[520px] w-[1100px] -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-mist to-transparent opacity-70 blur-3xl" />
        <svg
          className="absolute left-0 top-[22rem] hidden opacity-[0.35] sm:block"
          width="100%"
          height="220"
          viewBox="0 0 1440 220"
          fill="none"
          preserveAspectRatio="none"
        >
          <path d="M0 130C240 80 480 180 720 120C960 60 1200 160 1440 100" stroke="#2A44E7" strokeWidth="1.5" />
          <path d="M0 170C240 120 480 210 720 160C960 110 1200 190 1440 140" stroke="#A9F3E0" strokeWidth="2" />
        </svg>
      </div>

      <div className="mx-auto max-w-5xl text-center">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft shadow-float">
          <span className={`h-1.5 w-1.5 rounded-full ${loading ? "animate-pulse bg-coral" : "bg-mint-ink"}`} />
          Live price intelligence · {formattedCount} sailings tracked
        </div>

        <h1 className="text-balance font-display text-[clamp(2rem,5vw,4.1rem)] font-extrabold leading-[1.15] tracking-tight text-ink sm:leading-[1.1] lg:leading-[1.1]">
          Track the Absolute <span className="text-indigo">Out-the-Door Cost</span> of Your Next Voyage.
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-ink-soft sm:text-xl">
          Catch the deal before the tide rolls out.
        </p>
      </div>

      {/* Search Deck Widget */}
      <div className="mx-auto mt-12 max-w-5xl rounded-[28px] border border-black/[0.05] bg-white p-3 shadow-float-lg sm:p-4">
        <div className="flex flex-col divide-y divide-black/[0.06] rounded-3xl lg:flex-row lg:divide-x lg:divide-y-0">
          <Dropdown label="Destination" value={destination} options={destinations} onChange={setDestination} icon={<CompassIcon />} disabled={loading} />
          <Dropdown label="Cruise Line" value={cruiseLine} options={cruiseLines} onChange={setCruiseLine} icon={<ShipIcon />} disabled={loading} />

          <div className="flex flex-1 items-center justify-between gap-4 px-6 py-4" data-testid="guest-selector">
            <div className="flex min-w-0 flex-col text-left">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Guests</span>
              <span className="font-mono-tab text-lg font-semibold text-ink">
                {adults + children} Guest{adults + children > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {/* Adults counter */}
                      <div className="flex items-center gap-1" data-testid="adults-counter">
                        <span className="text-xs font-semibold text-ink-soft mr-1">Adults</span>
                        <span className="flex min-h-[44px] min-w-[44px] items-center justify-center">
                          <button
                            aria-label="Decrease adults"
                            onClick={() => setAdults((p) => Math.max(1, p - 1))}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink shadow-sm hover:text-indigo active:scale-90 disabled:opacity-30"
                            disabled={adults <= 1}
                          >
                            −
                          </button>
                        </span>
                        <span className="w-5 text-center font-mono-tab text-sm font-semibold">{adults}</span>
                        <span className="flex min-h-[44px] min-w-[44px] items-center justify-center">
                          <button
                            aria-label="Increase adults"
                            onClick={() => setAdults((p) => Math.min(8, p + 1))}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink shadow-sm hover:text-indigo active:scale-90 disabled:opacity-30"
                            disabled={adults >= 8}
                          >
                            +
                          </button>
                        </span>
                      </div>
                      {/* Children counter */}
                      <div className="flex items-center gap-1" data-testid="children-counter">
                        <span className="text-xs font-semibold text-ink-soft mr-1">Children</span>
                        <span className="flex min-h-[44px] min-w-[44px] items-center justify-center">
                          <button
                            aria-label="Decrease children"
                            onClick={() => setChildren((p) => Math.max(0, p - 1))}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink shadow-sm hover:text-indigo active:scale-90 disabled:opacity-30"
                            disabled={children <= 0}
                          >
                            −
                          </button>
                        </span>
                        <span className="w-5 text-center font-mono-tab text-sm font-semibold">{children}</span>
                        <span className="flex min-h-[44px] min-w-[44px] items-center justify-center">
                          <button
                            aria-label="Increase children"
                            onClick={() => setChildren((p) => Math.min(6, p + 1))}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink shadow-sm hover:text-indigo active:scale-90 disabled:opacity-30"
                            disabled={children >= 6}
                          >
                            +
                          </button>
                        </span>
                      </div>
            </div>
          </div>

          <div className="flex items-center p-2 lg:pl-2">
            <button
              aria-label="Search Voyages"
              onClick={handleSearch}
              className="flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-indigo px-8 py-4 text-sm font-bold text-white shadow-[0_12px_24px_-8px_rgba(42,68,231,0.55)] hover:bg-indigo-dark active:scale-[0.98] lg:w-auto"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              Search Voyages
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-ink-faint">
        <Stat value="2.1M+" label="prices tracked daily" />
        <Dot />
        <Stat value="34%" label="avg. drop caught" />
        <Dot />
        <Stat value="180+" label="ships covered" />
      </div>
    </section>
  );
}