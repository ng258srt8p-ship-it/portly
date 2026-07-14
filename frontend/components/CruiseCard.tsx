/* ============================================================
   PORTLY — CruiseCard Component
   
   Typography applied:
   - Ship/Cruise name:   font-brand (Clash Display) — luxury display
   - Price data:         font-mono (Geist Mono) — tabular numbers aligned
   - Deal rating:        font-interface (Plus Jakarta Sans) — UI clarity
   - Meta/labels:        font-interface (Plus Jakarta Sans) — small legibility
   ============================================================ */

import React from 'react';

interface CruiseCardProps {
  cruise: {
    id: string;
    name: string;
    cruiseLine: string;
    ship: string;
    destination: string;
    duration: number;
    departureDate: string;
    itinerary: string[];
    baseFare: number;
    taxesAndFees: number;
    gratuities: number;
    totalOutTheDoor: number;
    perPersonPerDay: number;
    dealRating: 'hot' | 'great' | 'good' | 'average' | 'poor';
    priceDropPercent: number;
    soloSupplement: number;
    rating: number;
    reviewCount: number;
    imageUrl: string;
  };
}

const dealRatingConfig = {
  hot: { label: '🔥 Hot Deal', className: 'badge-hot' },
  great: { label: '💰 Great Value', className: 'badge-great' },
  good: { label: '👍 Good Deal', className: 'badge-good' },
  average: { label: 'Average', className: 'badge-average' },
  poor: { label: 'Below Avg', className: 'badge-average' },
};

export function CruiseCard({ cruise }: CruiseCardProps) {
  const rating = dealRatingConfig[cruise.dealRating];

  return (
    <article className="card-interactive group">
      {/* Image Section */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
        <img
          src={cruise.imageUrl}
          alt={cruise.name}
          className="w-full h-full object-cover transition-transform duration-500
                     group-hover:scale-105"
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian-900/80 via-transparent to-transparent" />

        {/* Deal Badge — font-interface for clarity */}
        <div className="absolute top-3 left-3">
          <span className={rating.className}>
            {rating.label}
          </span>
        </div>

        {/* Price Drop Badge — shown conditionally */}
        {cruise.priceDropPercent >= 15 && (
          <div className="absolute top-3 right-3">
            <span className="badge-price-drop">
              🔻 -{cruise.priceDropPercent}%
            </span>
          </div>
        )}

        {/* Solo Supplement Badge — shown when applicable */}
        {cruise.soloSupplement <= 25 && (
          <div className="absolute top-3 right-3">
            <span className="badge-solo">
              🧑 Solo Friendly
            </span>
          </div>
        )}

        {/* Cruise Line & Duration — bottom overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span className="font-interface text-xs font-medium text-obsidian-200
                           tracking-wide uppercase">
            {cruise.cruiseLine}
          </span>
          <span className="font-interface text-xs text-obsidian-300">
            {cruise.duration} nights
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Header: Name + Rating */}
        <div className="flex items-start justify-between gap-2">
          {/* Cruise Name — font-brand for luxury feel */}
          <h3 className="font-brand text-xl font-semibold text-primary leading-snug
                         tracking-tight line-clamp-2">
            {cruise.name}
          </h3>
          
          {/* Star Rating — font-interface for clarity at small size */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-neon-amber-400 text-sm">★</span>
            <span className="font-interface text-sm font-semibold text-primary">
              {cruise.rating.toFixed(1)}
            </span>
            <span className="font-interface text-xs text-tertiary">
              ({cruise.reviewCount})
            </span>
          </div>
        </div>

        {/* Itinerary — font-interface, small caps style */}
        <div className="flex items-center gap-1.5 text-tertiary">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-interface text-sm truncate">
            {cruise.itinerary.join(' → ')}
          </span>
        </div>

        {/* Date — font-interface */}
        <div className="flex items-center gap-1.5 text-tertiary">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="font-interface text-sm">
            {cruise.departureDate}
          </span>
        </div>

        {/* Divider */}
        <div className="divider" />

        {/* Pricing Section — All font-mono for aligned tabular numbers */}
        <div className="space-y-2">
          {/* Main Price CTA */}
          <div className="flex items-end justify-between">
            <div className="space-y-0.5">
              {/* Out-the-door total — Geist Mono, bold, tabular */}
              <div className="flex items-baseline gap-1.5">
                <span className="font-interface text-xs text-tertiary tracking-wide uppercase">
                  Total
                </span>
                <span className="font-mono tabular-nums text-2xl font-bold text-primary
                                 leading-none">
                  ${cruise.totalOutTheDoor.toLocaleString()}
                </span>
              </div>
              
              {/* Per-person-per-day breakdown */}
              <div className="flex items-center gap-2">
                <span className="font-mono tabular-nums text-sm text-neon-teal-400 font-semibold">
                  ${cruise.perPersonPerDay.toFixed(0)}
                </span>
                <span className="font-interface text-xs text-tertiary">
                  / person / night
                </span>
              </div>
            </div>

            {/* CTA Button — font-interface for button text */}
            <button className="btn-primary btn-md font-interface">
              Check Price
              <svg className="w-4 h-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>

          {/* Price breakdown — font-mono for perfect alignment */}
          <div className="flex items-center gap-3 text-xs">
            <span className="font-mono tabular-nums text-tertiary">
              Base: ${cruise.baseFare.toLocaleString()}
            </span>
            <span className="text-tertiary">·</span>
            <span className="font-mono tabular-nums text-tertiary">
              Taxes: ${cruise.taxesAndFees.toLocaleString()}
            </span>
            <span className="text-tertiary">·</span>
            <span className="font-mono tabular-nums text-tertiary">
              Gratuities: ${cruise.gratuities.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default CruiseCard;
