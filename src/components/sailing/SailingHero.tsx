'use client';

/* ============================================================
   TRIPTIDE — SailingHero Component (Refactored)
   Hero banner for the sailing detail page showing ship name,
   cruise line, price with strikethrough, departure info, badges.
   On lg+: two-column grid (left 2/3: ship/info, right 1/3: price card).
   ============================================================ */

interface CabinTier {
  /** Display name (e.g. "Inside", "Oceanview", "Balcony", "Suite") */
  cabinType: string;
  /** Base fare per person (pre-port-tax, pre-gratuity) */
  baseFare: number;
  /** Port taxes & fees per person */
  portTax: number;
  /** Mandatory gratuity per person per night */
  gratuityPerNight: number;
  /** Number of nights the cabin pricing was computed for */
  nights: number;
}

interface SailingHeroProps {
  ship: string;
  line: string;
  region: string;
  port: string;
  days: number;
  departureDate: string;
  price: number;
  originalPrice?: number;
  dropPercent?: number;
  /** Optional: cabin tier label (e.g. "Oceanview", "Interior") */
  cabinType?: string;
  /** Optional: full cabin tier with real OTD numbers (overrides fabricated % multipliers) */
  cabinTier?: CabinTier | null;
  /** Optional: URL the user is sent to when they click "View Deal / Book" */
  bookingUrl?: string;
}

export default function SailingHero({
  ship,
  line,
  region,
  port,
  days,
  departureDate,
  price,
  originalPrice,
  dropPercent,
  cabinType,
  cabinTier,
  bookingUrl,
}: SailingHeroProps) {
  const hasDrop = dropPercent && dropPercent > 0;
  const formattedDate = new Date(departureDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const roundedPrice = Math.round(price);
  const priceLabel = cabinType
    ? `Starting at $${roundedPrice.toLocaleString()} from ${cabinType}`
    : `Starting at $${roundedPrice.toLocaleString()}`;

  // ── OTD breakdown derivation ──
  // Prefer real cabin_prices rows when available. Falls back to legacy %
  // multipliers (price * 0.6 / 0.25 / 0.15) only when no cabin tier is
  // supplied so the breakdown is never empty/missing.
  const effectiveNights = cabinTier?.nights || days || 7;
  const hasRealTier = !!(cabinTier && (
    (cabinTier.baseFare ?? 0) > 0 ||
    (cabinTier.portTax ?? 0) > 0 ||
    (cabinTier.gratuityPerNight ?? 0) > 0
  ));
  const otdBaseFare = hasRealTier
    ? Math.round(cabinTier!.baseFare || 0)
    : Math.round(price * 0.6);
  const otdPortTax = hasRealTier
    ? Math.round(cabinTier!.portTax || 0)
    : Math.round(price * 0.25);
  const otdGratuityTotal = hasRealTier
    ? Math.round((cabinTier!.gratuityPerNight || 0) * effectiveNights)
    : Math.round(price * 0.15);
  const otdTotalPerPerson = otdBaseFare + otdPortTax + otdGratuityTotal;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-[#1a1b24] to-ink p-6 text-white shadow-float sm:p-7">
      {/* Glow accent */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo/10 blur-3xl" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        {/* ===== LEFT COLUMN (2/3 width) ===== */}
        <div className="lg:col-span-2 space-y-4">
          {/* Breadcrumb line */}
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-ink-faint/80">
            {line}
          </p>

          {/* Ship name */}
          <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
            {ship}
          </h1>

          {/* Quick facts row */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white/[0.4] px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              {days} Nights
            </span>
            <span className="rounded-full bg-white/[0.4] px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              Departs {formattedDate}
            </span>
            <span className="rounded-full bg-white/[0.4] px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              {region} · {port}
            </span>
          </div>

          {/* Compact cruise meta */}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/70">
            <span>{days} {days === 1 ? 'Night' : 'Nights'} · {cabinType || 'All Cabins'}</span>
            <span>Departs {port} · {region}</span>
            {formattedDate && <span>{formattedDate}</span>}
          </div>

          {/* Price label — identifies cabin type context when available */}
          <p className="mt-3 text-sm text-white/70">{priceLabel}</p>
        </div>

        {/* ===== RIGHT COLUMN (1/3 width) — Price Callout Card ===== */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-[calc(var(--header-height)+1rem)] z-20 flex flex-col items-center gap-4 p-4 bg-black/[0.2] rounded-2xl border border-black/[0.1]">
            {/* Large Monospace Fare */}
            <span className="font-mono-tab text-5xl font-black tracking-tight sm:text-6xl">
              ${roundedPrice.toLocaleString()}
            </span>

            {hasDrop && originalPrice && (
              <>
                <span className="font-mono-tab text-2xl text-white/60 line-through sm:text-3xl">
                  ${Math.round(originalPrice).toLocaleString()}
                </span>
                <span className="rounded-full bg-coral-ink px-3 py-1 text-sm font-bold text-white">
                  -{dropPercent}% Drop
                </span>
              </>
            )}

            {/* Out-the-door breakdown list — uses real cabin_prices when provided,
                legacy % multipliers as fallback so the row never disappears. */}
            <div className="mt-2 space-y-1 text-xs text-white/80 w-full">
              <div className="flex justify-between w-full">
                <span className="font-medium">Base Fare</span>
                <span className="text-right" data-testid="hero-otd-base-fare">${otdBaseFare.toLocaleString()}</span>
              </div>
              <div className="flex justify-between w-full">
                <span className="font-medium">Port Taxes & Fees</span>
                <span className="text-right" data-testid="hero-otd-port-tax">${otdPortTax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between w-full">
                <span className="font-medium">Mandatory Gratuities</span>
                <span className="text-right" data-testid="hero-otd-gratuity">${otdGratuityTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-baseline justify-between w-full pt-2 border-t border-black/[0.08]">
                <span className="font-bold text-xl">Total Per Person</span>
                <span className="font-mono-tab text-xl font-bold" data-testid="hero-otd-total">${otdTotalPerPerson.toLocaleString()}</span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3 w-full">
              {/* Track Price — uses absolute /sailing/<id> path; pathname already
                  starts with /, so prepend /sailing to /alerts?sailing=. */}
              <button
                onClick={() => {
                  const url = `/alerts?sailing=${window.location.pathname}`;
                  window.location.href = url;
                }}
                className="flex-1 rounded-full bg-indigo/20 px-4 py-2 text-sm font-semibold text-indigo/90 hover:bg-indigo/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 transition-colors"
                data-testid="hero-track-price"
              >
                Track Price
              </button>

              {/* View Deal / Book — links to real bookingUrl when the API
                  supplies one; otherwise the anchor becomes inert and the
                  Track Price button stays the primary CTA. */}
              {bookingUrl ? (
                <a
                  href={bookingUrl}
                  className="flex-1 rounded-full bg-indigo px-5 py-2 text-sm font-semibold text-white shadow-[0_4px_8px_-2px_rgba(42,68,231,0.4)] hover:bg-indigo-dark active:scale-[0.98] transition-colors text-center"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="hero-view-deal-link"
                >
                  View Deal / Book
                </a>
              ) : (
                <span
                  className="flex-1 cursor-not-allowed rounded-full bg-white/10 px-5 py-2 text-center text-sm font-semibold text-white/50"
                  data-testid="hero-view-deal-link"
                  aria-disabled="true"
                  title="Booking link not available — track this sailing to be notified when it goes on sale."
                >
                  View Deal / Book
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}