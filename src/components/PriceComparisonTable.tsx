'use client';

/* ============================================================
  TRIPTIDE — PriceComparisonTable Component

  Purpose: Side-by-side cabin type price comparison with
           out-the-door pricing. This is the core conversion UI.

  Typography:
  - Cabin tier labels:     font-brand (Clash Display) — premium feel
  - All price data:        font-mono (Geist Mono) — tabular nums for alignment
  - Column headers:        font-interface (Plus Jakarta Sans) — legible at small
  - Deal badges:           font-interface (Plus Jakarta Sans) — clarity
  ============================================================ */

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { useLiveData } from '@/hooks/useLiveData';

interface CabinPrice {
  tier: 'interior' | 'oceanview' | 'balcony' | 'suite' | 'specialty';
  label: string;
  icon: string;
  baseFare: number;
  taxesAndFees: number;
  gratuities: number;
  total: number;
  perPersonPerDay: number;
  available: boolean;
  isBestValue: boolean;
  dealRating: 'hot' | 'great' | 'good' | 'average' | 'poor';
}

interface PriceComparisonTableProps {
  cabinPrices?: CabinPrice[];
  currency?: string;
  showTaxes?: boolean;
  sailingId?: string | number;
}

const tierOrder = ['interior', 'oceanview', 'balcony', 'suite', 'specialty'] as const;

const tierMeta: Record<string, { icon: string; description: string }> = {
  interior:  { icon: 'bed', description: 'Cozy interior cabins without windows' },
  oceanview: { icon: 'window', description: 'Cabins with ocean-facing windows' },
  balcony:   { icon: 'deck', description: 'Private balcony for outdoor views' },
  suite:     { icon: 'crown', description: 'Premium suites with VIP amenities' },
  specialty: { icon: 'star', description: 'Guarantee, accessible & family cabins' },
};

export function PriceComparisonTable({
  cabinPrices: propPrices,
  currency = 'USD',
  showTaxes = true,
  sailingId,
}: PriceComparisonTableProps) {
  const [expandedTier, setExpandedTier] = useState<string | null>(null);
  const [resolvedSailingId, setResolvedSailingId] = useState<string | number | undefined>(sailingId);
  const router = useRouter();

  // Self-fetch cabin pricing from the backend if no prop prices provided
  const fetcher = useMemo(
    () => async () => {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
      // Resolve the sailing ID dynamically: if not provided, fetch the first available sailing from deals
      let sid = sailingId;
      if (!sid) {
        try {
          const dealsRes = await fetch(`${API_BASE}/api/deals?limit=1`, { cache: 'no-store' });
          const deals = await dealsRes.json();
          if (deals?.[0]?.id) sid = deals[0].id;
        } catch { /* fall back to undefined */ }
      }
      if (!sid) throw new Error('No sailing available for pricing');
      setResolvedSailingId(sid);
      const res = await fetch(`${API_BASE}/api/sailing/${sid}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load cabin pricing');
      const data = await res.json();
      return data.cabinBreakdown as any[];
    },
    [sailingId]
  );

  const { data: apiPrices, loading, error, refresh } = useLiveData(fetcher);

  // Use prop prices if provided, otherwise transform API response
  const cabinPrices: CabinPrice[] = propPrices && propPrices.length > 0
    ? propPrices
    : apiPrices
        ? apiPrices.map((cb: any) => {
            const tier = (cb.cabinType?.toLowerCase() || cb.cabinClass?.toLowerCase() || 'interior') as CabinPrice['tier'];
            const numericBase = cb.baseFarePerPerson || cb.raw?.perPersonBase || 0;
            const numericFees = cb.portTaxPerPerson || cb.raw?.totalFees || 0;
            const nightlyGratuity = cb.gratuityPerPersonPerNight || 0;
            const numericTotal = cb.raw?.totalOutTheDoor || (numericBase + numericFees + (nightlyGratuity * (cb.nights || 7)));
            const numericPerDay = cb.raw?.perPersonPerDay || (numericTotal / (cb.nights || 7));

            return {
              tier,
              label: cb.cabinType || cb.cabinClass,
              icon: tier === 'suite' ? 'crown' : tier === 'balcony' ? 'deck' : tier === 'oceanview' ? 'window' : 'bed',
              baseFare: numericBase,
              taxesAndFees: numericFees,
              gratuities: nightlyGratuity,
              total: numericTotal,
              perPersonPerDay: numericPerDay,
              available: true,
              isBestValue: numericPerDay > 0 && numericPerDay < 250,
              dealRating: numericPerDay < 150 ? 'hot' : numericPerDay < 250 ? 'great' : numericPerDay < 350 ? 'good' : 'average',
            } as CabinPrice;
          })
        : [];

  // Sort by tier order
  const sorted = [...cabinPrices].sort(
    (a, b) => tierOrder.indexOf(a.tier as any) - tierOrder.indexOf(b.tier as any)
  );

  // Show error retry state if fetch failed (don't trap user in loading skeleton)
  if (error && !loading && (!propPrices || propPrices.length === 0)) {
    return (
      <div className="w-full rounded-xl border border-coral-ink/20 bg-coral-soft/30 p-6 text-center">
        <p className="text-sm font-semibold text-coral-ink">Pricing temporarily unavailable</p>
        <p className="mt-1 text-xs text-coral-ink/70">
          We couldn&apos;t load cabin pricing for this sailing.
        </p>
        <button
          type="button"
          onClick={refresh}
          className="mt-3 rounded-full border-2 border-coral-ink/40 px-4 py-2 text-xs font-bold text-coral-ink hover:bg-coral-ink/5"
          data-testid="price-comparison-retry"
        >
          Try again
        </button>
      </div>
    );
  }

  // Show loading state if no data yet
  if (loading || (!propPrices && !apiPrices)) {
    return (
      <div className="w-full">
        <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 mb-1 border-hard-bottom">
          <div className="col-span-3"><span className="text-brutal-label">Cabin Type</span></div>
          <div className="col-span-2 text-right"><span className="text-brutal-label">Base Fare</span></div>
          {showTaxes && (
            <>
              <div className="col-span-2 text-right"><span className="text-brutal-label">Taxes & Fees</span></div>
              <div className="col-span-2 text-right"><span className="text-brutal-label">Gratuities</span></div>
            </>
          )}
          <div className="col-span-2 text-right"><span className="font-interface text-sm font-bold text-primary uppercase tracking-widest">Total</span></div>
          <div className="col-span-1" />
        </div>
        <div className="space-y-1">
          {tierOrder.map((tier) => (
            <div
              key={tier}
              className="group grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-3 md:py-3 transition-all duration-200 cursor-pointer border-2 bg-surface border-subtle hover:border-default animate-pulse items-center"
            >
              <div className="md:col-span-3 flex items-center gap-3">
                <MaterialIcon name={tierMeta[tier]?.icon || 'bed'} size="md" />
                <div>
                  <div className="font-brand text-base font-semibold text-primary tracking-tight">{tierMeta[tier]?.icon}</div>
                  <div className="font-interface text-xs text-tertiary">{tierMeta[tier]?.description}</div>
                </div>
              </div>
              <div className="hidden md:flex col-span-2 items-center justify-end">
                <span className="font-mono tabular-nums text-sm text-tertiary">Loading...</span>
              </div>
              {showTaxes && (
                <>
                  <div className="hidden md:flex col-span-2 items-center justify-end">
                    <span className="font-mono tabular-nums text-sm text-tertiary">Loading...</span>
                  </div>
                  <div className="hidden md:flex col-span-2 items-center justify-end">
                    <span className="font-mono tabular-nums text-sm text-tertiary">Loading...</span>
                  </div>
                </>
              )}
              <div className="hidden md:flex col-span-2 items-center justify-end">
                <div className="text-right">
                  <div className="font-mono tabular-nums text-lg font-bold text-primary leading-none">Loading...</div>
                  <div className="font-mono tabular-nums text-xs text-neon-teal-800">Loading...</div>
                </div>
              </div>
              <div className="hidden md:flex col-span-1 items-center justify-end">
                <button className="btn-sm font-interface text-xs font-semibold btn-secondary opacity-50 cursor-not-allowed" disabled>Loading...</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const formatPrice = (amount: number) =>
    `${currency === 'USD' ? '$' : ''}${Math.round(amount).toLocaleString()}`;

  return (
    <div className="w-full">
      {/* Table Header — brutalist label bar */}
      <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 mb-1 border-hard-bottom">
        <div className="col-span-3">
          <span className="text-brutal-label">
            Cabin Type
          </span>
        </div>
        <div className="col-span-2 text-right">
          <span className="text-brutal-label">
            Base Fare
          </span>
        </div>
        {showTaxes && (
          <>
            <div className="col-span-2 text-right">
              <span className="text-brutal-label">
                Taxes & Fees
              </span>
            </div>
            <div className="col-span-2 text-right">
              <span className="text-brutal-label">
                Gratuities
              </span>
            </div>
          </>
        )}
        <div className="col-span-2 text-right">
          <span className="font-interface text-sm font-bold text-primary uppercase tracking-widest">
            Total
          </span>
        </div>
        <div className="col-span-1" />
      </div>

      {/* Price Row — per cabin tier */}
      <div className="space-y-1">
        {sorted.map((cabin) => (
          <div
            key={cabin.tier}
            data-testid="cabin-row"
            className={`group grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-3 transition-all duration-200 cursor-pointer border-2 items-center ${cabin.isBestValue ? 'bg-neon-teal-500/10 border-neon-teal-500 shadow-hard-teal' : 'bg-surface border-subtle hover:border-default'} ${!cabin.available ? 'opacity-50' : ''}`}
            onClick={() => setExpandedTier(expandedTier === cabin.tier ? null : cabin.tier)}
          >
            {/* Mobile: Expandable row */}
            {/* Cabin Type — font-brand for premium feel */}
            <div className="md:col-span-3 flex items-center gap-3">
              <MaterialIcon name={cabin.icon} size="md" />
              <div>
                <div className="font-brand text-base font-semibold text-primary tracking-tight">
                  {cabin.label}
                </div>
                <div className="font-interface text-xs text-tertiary">
                  {tierMeta[cabin.tier]?.description}
                </div>
              </div>
              {cabin.isBestValue && (
                <span className="badge-good ml-auto md:ml-2 text-2xs">
                  Best Value
                </span>
              )}
            </div>

            {/* Desktop: Price columns — font-mono for tabular alignment */}
            {/* Base Fare */}
            <div className="hidden md:flex col-span-2 items-center justify-end">
              <span className={`font-mono tabular-nums text-sm ${cabin.available ? 'text-secondary' : 'text-tertiary'}`}>
                {formatPrice(cabin.baseFare)}
              </span>
            </div>

            {/* Taxes & Fees */}
            {showTaxes && (
              <div className="hidden md:flex col-span-2 items-center justify-end">
                <span className="font-mono tabular-nums text-sm text-tertiary">
                  +{formatPrice(cabin.taxesAndFees)}
                </span>
              </div>
            )}

            {/* Gratuities */}
            {showTaxes && (
              <div className="hidden md:flex col-span-2 items-center justify-end">
                <span className="font-mono tabular-nums text-sm text-tertiary">
                  +{formatPrice(cabin.gratuities)}
                </span>
              </div>
            )}

            {/* Total — font-mono bold for emphasis */}
            <div className="hidden md:flex col-span-2 items-center justify-end">
              <div className="text-right">
                <div className="font-mono tabular-nums text-lg font-bold text-primary leading-none">
                  {formatPrice(cabin.total)}
                </div>
                <div className="font-mono tabular-nums text-xs text-neon-teal-800">
                  {formatPrice(cabin.perPersonPerDay)}/pp/night
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="hidden md:flex col-span-1 items-center justify-end">
              <button
                onClick={() => router.push(`/sailing/${resolvedSailingId}?cabin=${cabin.tier}`)}
                className={`btn-sm flex-shrink-0 font-interface text-xs font-semibold
                  ${cabin.available ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'}
                `}
                disabled={!cabin.available}
              >
                {cabin.available ? 'Select' : 'Sold Out'}
              </button>
            </div>

            {/* Mobile: Expandable price details */}
            {expandedTier === cabin.tier && (
              <div className="md:hidden col-span-1 mt-3 pt-3 border-hard-top">
                <div className="space-y-2">
                  {/* Price breakdown — font-mono for perfect alignment */}
                  <div className="flex justify-between items-center">
                    <span className="font-interface text-sm text-secondary">Base Fare</span>
                    <span className="font-mono tabular-nums text-sm text-primary">
                      {formatPrice(cabin.baseFare)}
                    </span>
                  </div>
                  {showTaxes && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="font-interface text-sm text-secondary">Taxes & Fees</span>
                        <span className="font-mono tabular-nums text-sm text-tertiary">
                          +{formatPrice(cabin.taxesAndFees)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-interface text-sm text-secondary">Gratuities</span>
                        <span className="font-mono tabular-nums text-sm text-tertiary">
                          +{formatPrice(cabin.gratuities)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="divider-brutal" />
                  <div className="flex justify-between items-center">
                    <span className="font-interface text-sm font-semibold text-primary">
                      Total Out-The-Door
                    </span>
                    <span className="font-mono tabular-nums text-lg font-bold text-primary">
                      {formatPrice(cabin.total)}
                    </span>
                  </div>
                  <p className="text-xs text-ink-faint">Includes base fare + taxes/fees + gratuities</p>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-interface text-xs text-tertiary">Per person / night</span>
                    <span className="font-mono tabular-nums text-sm text-neon-teal-800 font-semibold">
                      {formatPrice(cabin.perPersonPerDay)}
                    </span>
                  </div>

                  <button
                    onClick={() => router.push(`/sailing/${resolvedSailingId}?cabin=${cabin.tier}`)}
                    className={`btn w-full mt-2 font-interface ${cabin.available ? 'btn-primary' : 'btn-secondary opacity-50'}`}
                    disabled={!cabin.available}
                  >
                    {cabin.available ? 'Select This Cabin →' : 'Sold Out'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-3 px-4">
        <p className="font-interface text-xs text-tertiary flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-neon-teal-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          All prices shown are total out-the-door including base fare, port taxes/fees, and mandatory gratuities.
        </p>
      </div>
    </div>
  );
}

export default PriceComparisonTable;