'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import Header from '@/components/layout/Header';
import PriceComparisonTable from '@/components/PriceComparisonTable';
import Footer from '@/components/Footer';
import { useLiveData } from '@/hooks/useLiveData';
import SailingHero from '@/components/sailing/SailingHero';
import SailingSubNav from '@/components/sailing/SailingSubNav';
import ItineraryTimeline from '@/components/sailing/ItineraryTimeline';
import PriceHistoryPanel from '@/components/sailing/PriceHistoryPanel';
import EnhancedDealAnalysis from '@/components/sailing/EnhancedDealAnalysis';
import EnhancedPriceForecast from '@/components/sailing/EnhancedPriceForecast';
import SailingInfoPanel from '@/components/sailing/SailingInfoPanel';
import SailingKeyTakeaways from '@/components/sailing/SailingKeyTakeaways';
import CabinUpgradeTracker from '@/components/sailing/CabinUpgradeTracker';
import ShipIntelSection from '@/components/sailing/ShipIntelSection';
import PortPlaybookSection from '@/components/sailing/PortPlaybookSection';

export interface SailingData {
  sailing: {
    id: number;
    sailing_id: string;  // string ID from API (e.g., "carnival_conquest_2026-03-12_miami_4")
    line: string;
    ship: string;
    days: number;
    port: string;
    route: string[];
    region: string;
    departureDate: string;
    bookingUrl?: string;
    price: number;
    originalPrice: number;
    dropPercent: number;
    history: number[];
    // AI-generated content (null if not yet enriched)
    aiInsiderSummary?: string | null;
    aiCabinStrategy?: string | null;
    aiExcursionStrategy?: string | null;
    aiDealScoreNarrative?: string | null;
    aiScore?: number | null;
    aiGeneratedAt?: string | null;
    shipClass?: string | null;
    shipLaunchedYear?: number | null;
  };
  cabinBreakdown: any[];
  priceHistory: any[];
}

interface SailingDetailPageProps {
  initialData?: SailingData | null;
}

export default function SailingDetailPage({ initialData }: SailingDetailPageProps = {}) {
  const params = useParams();
  const sailingId = params?.id as string;

  const fetcher = useMemo(
    () => async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/sailing/${sailingId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load sailing');
      return res.json();
    },
    [sailingId]
  );

  const { data, loading, error } = useLiveData<SailingData>(fetcher, { initialData });

  if (!sailingId) {
    return (
      <>
        <Header />
        <main className="min-h-screen scroll-pt-24 pt-20 pb-20 md:pb-8 px-4 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-3xl border border-coral-ink/15 bg-coral-soft p-8">
              <p className="text-coral-ink">No sailing ID provided</p>
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
      {/* Z-index stack (sailing detail page):
          z-50  Header (fixed top), Modals, Dropdowns
          z-20  Hero price callout card (sticky on lg+)
          z-10  Hero content grid
          z-0   Background gradients, glow accents

        Sticky offsets use --header-height (98px) defined as a CSS custom
        property in globals.css.
      */}
      {/* Section anchors preserved via scroll-mt-* on each <section> below */}
      <main className="min-h-screen scroll-pt-28 pt-[var(--header-height)] pb-12 px-4 sm:px-6">
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
            <div className="space-y-2 sm:space-y-3">
              {/* SailingSubNav - sticky sub-nav pill below header */}
              <SailingSubNav
                             sections={[
                             { id: "overview", label: "Overview" },
                             { id: "key-takeaways", label: "Key Takeaways" },
                             { id: "itinerary", label: "Itinerary" },
                             { id: "price-history", label: "Price History" },
                             { id: "deal-analysis", label: "Deal Analysis" },
                             { id: "cabins", label: "Cabins" },
                             { id: "forecast", label: "Forecast" },
                             { id: "ship-intel", label: "Ship Specs" },
                             { id: "port-playbook", label: "Port Playbook" },
                             ]}
                            />
              {/* Hero */}
              <section id="overview" className="scroll-mt-40">
                <SailingHero
                  ship={data.sailing.ship}
                  line={data.sailing.line}
                  region={data.sailing.region}
                  port={data.sailing.port}
                  days={data.sailing.days}
                  departureDate={data.sailing.departureDate}
                  price={data.sailing.price || 0}
                  originalPrice={data.sailing.originalPrice || 0}
                  dropPercent={data.sailing.dropPercent || 0}
                  cabinType={data?.cabinBreakdown?.[0]?.cabinType || ''}
                  cabinTier={(() => {
                    const cb = data?.cabinBreakdown?.[0];
                    if (!cb) return null;
                    return {
                      cabinType: cb.cabinType || '',
                      baseFare: cb.baseFarePerPerson ?? cb.base ?? 0,
                      portTax: cb.portTaxPerPerson ?? cb.portFees ?? cb.portTax ?? 0,
                      gratuityPerNight: cb.gratuityPerPersonPerNight ?? cb.gratuity ?? cb.mandatoryGratuities ?? 0,
                      nights: cb.nights || cb.raw?.nights || data.sailing.days || 7,
                    };
                  })()}
                  bookingUrl={data.sailing.bookingUrl || ''}
                />
                </section>

              {/* Key Takeaways — standalone section above Deal Analysis */}
              <section id="key-takeaways" className="scroll-mt-40">
                <SailingKeyTakeaways
                  price={data.sailing.price || 0}
                  originalPrice={data.sailing.originalPrice || 0}
                  dropPercent={data.sailing.dropPercent || 0}
                  perNight={
                    data.sailing.days > 0
                      ? Math.round((data.sailing.price || 0) / data.sailing.days)
                      : data.sailing.price || 0
                  }
                  days={data.sailing.days}
                  route={data.sailing.route || []}
                  region={data.sailing.region}
                  line={data.sailing.line}
                  ship={data.sailing.ship}
                  shipClass={data.sailing.shipClass ?? null}
                  shipLaunchedYear={data.sailing.shipLaunchedYear ?? null}
                  history={data.sailing.history || []}
                  cabinBreakdown={data.cabinBreakdown}
                  aiScore={data.sailing.aiScore ?? null}
                  aiDealScoreNarrative={data.sailing.aiDealScoreNarrative ?? null}
                  aiCabinStrategy={data.sailing.aiCabinStrategy ?? null}
                  aiExcursionStrategy={data.sailing.aiExcursionStrategy ?? null}
                  aiInsiderSummary={data.sailing.aiInsiderSummary ?? null}
                />
                </section>

                {/* ===== INSIDER CONTENT - Most Prominent Position ===== */}
                <section id="deal-analysis" className="scroll-mt-40">
                <EnhancedDealAnalysis
                  sailingId={data.sailing.sailing_id}
                  bookingUrl={data.sailing.bookingUrl}
                  bookingLabel={data.sailing.line}
                  context={{
                    line: data.sailing.line,
                    ship: data.sailing.ship,
                    days: data.sailing.days,
                    region: data.sailing.region,
                    port: data.sailing.port,
                    route: data.sailing.route,
                    price: data.sailing.price || 0,
                    originalPrice: data.sailing.originalPrice || 0,
                    dropPercent: data.sailing.dropPercent || 0
                  }}
                />
                </section>

                {/* Itinerary — full-width on desktop, no side panel */}
              <section id="itinerary" className="scroll-mt-40">
                  <ItineraryTimeline
                    ports={data.sailing.route}
                    days={data.sailing.days}
                    departurePort={data.sailing.port}
                  />
             </section>

              {/* Price History */}
              <section id="price-history" className="scroll-mt-40">
                <PriceHistoryPanel
                  priceHistory={data.priceHistory}
                  currentPrice={data.sailing.price || 0}
                  cabinBreakdown={data.cabinBreakdown}
                />
              </section>
              <section id="cabins" className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-xs sm:p-5 scroll-mt-40">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">Cabin Pricing</h2>
                  <span className="text-xs font-medium text-ink-soft">Per cabin, taxes & gratuities included</span>
                </div>
                <div data-testid="price-comparison-table">
                  <PriceComparisonTable sailingId={data.sailing.sailing_id} />
                </div>
                {/* Upgrade cost tracker — uses cabinBreakdown tiers to show price gap between categories */}
                <CabinUpgradeTracker
                  currentPricing={Object.fromEntries(
                    (data.cabinBreakdown || []).map((cb: any) => [
                      cb.cabinType,
                      cb.raw?.totalOutTheDoor ?? cb.totalOutTheDoor ?? 0,
                    ])
                  )}
                  signals={[]}
                />
              </section>

              {/* Price Forecast */}
              <section id="forecast" className="scroll-mt-40" data-testid="enhanced-deal-analysis">
                <EnhancedPriceForecast sailingId={data.sailing.sailing_id} />
             </section>

              {/* Ship Intel — uses ShipIntelSection with real ship data */}
              <section id="ship-intel" className="scroll-mt-40">
              <ShipIntelSection
                  ship={data.sailing.ship}
                  line={data.sailing.line}
                  shipClass={data.sailing.shipClass ?? null}
                  shipLaunchedYear={data.sailing.shipLaunchedYear ?? null}
                  aiInsiderSummary={data.sailing.aiInsiderSummary ?? null}
                  aiCabinStrategy={data.sailing.aiCabinStrategy ?? null}
                  cabinCategories={data?.cabinBreakdown?.map((c: any) => c.cabinType).filter(Boolean) || undefined}
                  totalCabins={data?.cabinBreakdown?.length || undefined}
                />
             </section>

              {/* Port Playbook — per-port tactical guidance */}
              <section id="port-playbook" className="scroll-mt-40">
                <PortPlaybookSection
                  ports={data.sailing.route || []}
                  departurePort={data.sailing.port}
                />
              </section>

              {/* Book CTA + Track Price Alert — moved into sticky mobile bar (PHASE 5) */}
              <div className="hidden md:flex flex-col sm:flex-row gap-4 justify-center pt-4">
                {data.sailing.bookingUrl && (
                  <a
                    href={data.sailing.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="booking-link-bottom"
                    className="rounded-full bg-indigo px-12 py-4 text-base font-bold text-white shadow-[0_12px_24px_-8px_rgba(42,68,231,0.55)] hover:bg-indigo-dark active:scale-[0.98]"
                  >
                    Book This Cruise
                 </a>
                )}
                <a
                  href={`/alerts?sailing=/sailing/${data.sailing.sailing_id}`}
                  data-testid="track-price-alert-link"
                  className="rounded-full border-2 border-indigo px-12 py-4 text-base font-bold text-indigo hover:bg-indigo/5 active:scale-[0.98] transition-colors"
                >
                  Track Price Alert
               </a>
             </div>
           </div>
          )}
       </div>
     </main>
      <Footer />
    </>
  );
}
