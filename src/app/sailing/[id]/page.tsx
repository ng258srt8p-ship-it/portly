'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import Header from '@/components/layout/Header';
import PriceComparisonTable from '@/components/PriceComparisonTable';
import Footer from '@/components/Footer';
import { useLiveData } from '@/hooks/useLiveData';
import SailingHero from '@/components/sailing/SailingHero';
import ItineraryTimeline from '@/components/sailing/ItineraryTimeline';
import PriceHistoryPanel from '@/components/sailing/PriceHistoryPanel';
import EnhancedDealAnalysis from '@/components/sailing/EnhancedDealAnalysis';
import EnhancedPriceForecast from '@/components/sailing/EnhancedPriceForecast';
import SailingInfoPanel from '@/components/sailing/SailingInfoPanel';

interface SailingData {
  sailing: {
    id: number;
    line: string;
    ship: string;
    days: number;
    port: string;
    route: string[];
    region: string;
    departureDate: string;
    bookingUrl?: string;
  };
  cabinBreakdown: any[];
  priceHistory: any[];
}

export default function SailingDetailPage() {
  const params = useParams();
  const sailingId = params?.id as string;

  const fetcher = useMemo(
    () => async () => {
      const res = await fetch(`/api/sailing/${sailingId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load sailing');
      return res.json();
    },
    [sailingId]
  );

  const { data, loading, error } = useLiveData<SailingData>(fetcher);

  if (!sailingId) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-28 px-4 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-3xl border border-coral-ink/15 bg-coral-soft p-8">
              <p className="text-coral-ink">No sailing ID provided.</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          {loading && (
            <div className="space-y-6">
              <div className="h-48 animate-pulse rounded-3xl bg-black/[0.04]" />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="h-64 animate-pulse rounded-3xl bg-black/[0.04]" />
                <div className="h-64 animate-pulse rounded-3xl bg-black/[0.04]" />
              </div>
              <div className="h-72 animate-pulse rounded-3xl bg-black/[0.04]" />
            </div>
          )}

          {error && (
            <div className="rounded-3xl border border-coral-ink/15 bg-coral-soft p-8">
              <p className="text-coral-ink">Failed to load sailing details: {error}</p>
              <p className="mt-2 text-sm text-coral-ink/60">
                Sailing may not exist. Try running a sync to generate data, or go back to{' '}
                <a href="/" className="underline">the homepage</a>.
              </p>
            </div>
          )}

          {data && (
            <div className="space-y-6">
              {/* Hero */}
              <SailingHero
                ship={data.sailing.ship}
                line={data.sailing.line}
                region={data.sailing.region}
                port={data.sailing.port}
                days={data.sailing.days}
                departureDate={data.sailing.departureDate}
                price={data?.cabinBreakdown?.[0]?.raw?.totalOutTheDoor || 0}
                cabinType={data?.cabinBreakdown?.[0]?.cabinType || ''}
              />

              {/* Itinerary + Info 2-col on desktop */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <ItineraryTimeline
                    ports={data.sailing.route}
                    days={data.sailing.days}
                    departurePort={data.sailing.port}
                  />
                </div>
                <div>
                  <SailingInfoPanel
                    ship={data.sailing.ship}
                    line={data.sailing.line}
                    region={data.sailing.region}
                    port={data.sailing.port}
                    days={data.sailing.days}
                    totalCabins={data?.cabinBreakdown?.length || undefined}
                    cabinCategories={data?.cabinBreakdown?.map((c: any) => c.cabinType).filter(Boolean) || undefined}
                    itinerary={data.sailing.route}
                  />
                </div>
              </div>

              {/* Price History + NIM Analysis 2-col */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <PriceHistoryPanel
                  priceHistory={data.priceHistory}
                  currentPrice={data?.cabinBreakdown?.[0]?.raw?.totalOutTheDoor || 0}
                  cabinBreakdown={data.cabinBreakdown}
                />
              </div>
              {/* Enhanced Deal Analysis (Phase 2) */}
              <EnhancedDealAnalysis sailingId={data.sailing.id} />

              {/* Cabin Pricing */}
              <div id="cabin-pricing" className="rounded-3xl border border-black/[0.05] bg-white p-6 shadow-float">
                <h2 className="mb-6 font-display text-2xl font-bold text-ink">Cabin Pricing</h2>
                <PriceComparisonTable sailingId={data.sailing.id} />
              </div>

              {/* Enhanced Price Forecast (Phase 2) */}
              <EnhancedPriceForecast sailingId={data.sailing.id} />

              {/* Book CTA */}
              {data.sailing.bookingUrl && (
                <div className="flex justify-center pb-12">
                  <a
                    href={data.sailing.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-indigo px-12 py-4 text-base font-bold text-white shadow-[0_12px_24px_-8px_rgba(42,68,231,0.55)] hover:bg-indigo-dark active:scale-[0.98]"
                  >
                    Book This Cruise
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
