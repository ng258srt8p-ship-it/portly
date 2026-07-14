/* ============================================================
   PORTLY — PriceComparisonTable Component
   
   Purpose: Side-by-side cabin type price comparison with
            out-the-door pricing. This is the core conversion UI.
   
   Typography:
   - Cabin tier labels:     font-brand (Clash Display) — premium feel
   - All price data:        font-mono (Geist Mono) — tabular nums for alignment
   - Column headers:        font-interface (Plus Jakarta Sans) — legible at small
   - Deal badges:           font-interface (Plus Jakarta Sans) — clarity
   ============================================================ */

import React, { useState } from 'react';

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
  cabinPrices: CabinPrice[];
  currency?: string;
  showTaxes?: boolean;
}

const tierOrder = ['interior', 'oceanview', 'balcony', 'suite', 'specialty'] as const;

const tierMeta: Record<string, { icon: string; description: string }> = {
  interior:  { icon: '🛏️', description: 'Cozy interior cabins without windows' },
  oceanview: { icon: '🪟', description: 'Cabins with ocean-facing windows' },
  balcony:   { icon: '🌴', description: 'Private balcony for outdoor views' },
  suite:     { icon: '👑', description: 'Premium suites with VIP amenities' },
  specialty: { icon: '⭐', description: 'Guarantee, accessible & family cabins' },
};

export function PriceComparisonTable({
  cabinPrices,
  currency = 'USD',
  showTaxes = true,
}: PriceComparisonTableProps) {
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  // Sort by tier order
  const sorted = [...cabinPrices].sort(
    (a, b) => tierOrder.indexOf(a.tier as any) - tierOrder.indexOf(b.tier as any)
  );

  const formatPrice = (amount: number) =>
    `${currency === 'USD' ? '$' : ''}${amount.toLocaleString()}`;

  return (
    <div className="w-full">
      {/* Table Header — font-interface for clean labels */}
      <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 mb-1">
        <div className="col-span-3">
          <span className="font-interface text-2xs font-semibold uppercase tracking-widest text-tertiary">
            Cabin Type
          </span>
        </div>
        <div className="col-span-2 text-right">
          <span className="font-interface text-2xs font-semibold uppercase tracking-widest text-tertiary">
            Base Fare
          </span>
        </div>
        {showTaxes && (
          <>
            <div className="col-span-2 text-right">
              <span className="font-interface text-2xs font-semibold uppercase tracking-widest text-tertiary">
                Taxes & Fees
              </span>
            </div>
            <div className="col-span-2 text-right">
              <span className="font-interface text-2xs font-semibold uppercase tracking-widest text-tertiary">
                Gratuities
              </span>
            </div>
          </>
        )}
        <div className="col-span-2 text-right">
          <span className="font-interface text-sm font-semibold text-primary">
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
            className={`
              group grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3
              px-4 py-4 md:py-3 rounded-xl
              transition-all duration-200 cursor-pointer
              ${cabin.isBestValue
                ? 'bg-neon-teal-500/10 border border-neon-teal-500/20'
                : 'bg-surface border border-subtle hover:border-default'
              }
              ${!cabin.available ? 'opacity-50' : ''}
            `}
            onClick={() => setExpandedTier(expandedTier === cabin.tier ? null : cabin.tier)}
          >
            {/* Mobile: Expandable row */}
            {/* Cabin Type — font-brand for premium feel */}
            <div className="md:col-span-3 flex items-center gap-3">
              <span className="text-xl">{cabin.icon}</span>
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
              <span className={`font-mono tabular-nums text-sm ${
                cabin.available ? 'text-secondary' : 'text-tertiary'
              }`}>
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
                <div className="font-mono tabular-nums text-xs text-neon-teal-400">
                  {formatPrice(cabin.perPersonPerDay)}/pp/night
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="hidden md:flex col-span-1 items-center justify-end">
              <button
                className={`btn-sm font-interface text-xs font-semibold
                  ${cabin.available
                    ? 'btn-primary'
                    : 'btn-secondary opacity-50 cursor-not-allowed'
                  }`}
                disabled={!cabin.available}
              >
                {cabin.available ? 'Select' : 'Sold Out'}
              </button>
            </div>

            {/* Mobile: Expandable price details */}
            {expandedTier === cabin.tier && (
              <div className="md:hidden col-span-1 mt-3 pt-3 border-t border-subtle">
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
                  <div className="divider" />
                  <div className="flex justify-between items-center">
                    <span className="font-interface text-sm font-semibold text-primary">
                      Total Out-The-Door
                    </span>
                    <span className="font-mono tabular-nums text-lg font-bold text-primary">
                      {formatPrice(cabin.total)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-interface text-xs text-tertiary">Per person / night</span>
                    <span className="font-mono tabular-nums text-sm text-neon-teal-400 font-semibold">
                      {formatPrice(cabin.perPersonPerDay)}
                    </span>
                  </div>

                  <button
                    className={`btn w-full mt-2 font-interface ${
                      cabin.available ? 'btn-primary' : 'btn-secondary opacity-50'
                    }`}
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
          <svg className="w-3.5 h-3.5 text-neon-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          All prices shown are total out-the-door including base fare, port taxes/fees, and mandatory gratuities.
        </p>
      </div>
    </div>
  );
}

export default PriceComparisonTable;
