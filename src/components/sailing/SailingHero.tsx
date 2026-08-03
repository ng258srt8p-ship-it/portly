'use client';

/* ============================================================
   TRIPTIDE — SailingHero Component (Refactored)
   Hero banner for the sailing detail page showing ship name,
   cruise line, price with strikethrough, departure info, badges.

   Pricing fix (2026-08-02):
   The hero's main price now derives from cabinTier (Inside OTD)
   instead of `data.sailing.price` (a raw/orphaned per-night rate)
   so the hero and the Cabin Pricing table always agree. Fallback
   to raw price only when cabinTier is not loaded yet.
   ============================================================ */

interface CabinTier {
  cabinType: string;
  baseFare: number;
  portTax: number;
  gratuityPerNight: number;
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
  cabinType?: string;
  cabinTier?: CabinTier | null;
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
  const formattedDate = (() => {
    const d = new Date(departureDate + 'T12:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/New_York',
    });
  })();

  // ── OTD breakdown derivation (real cabin_tiers preferred, fallback to raw) ──
  const effectiveNights = cabinTier?.nights || days || 7;
  const hasRealTier = !!(cabinTier && (
    (cabinTier.baseFare ?? 0) > 0 ||
    (cabinTier.portTax ?? 0) > 0 ||
    (cabinTier.gratuityPerNight ?? 0) > 0
  ));

  // Per-person breakdown as function of effectiveNights
  const otdBaseFare = hasRealTier ? Math.round(cabinTier!.baseFare || 0) : Math.round(price * 0.6);
  const otdPortTax = hasRealTier ? Math.round(cabinTier!.portTax || 0) : Math.round(price * 0.25);
  const otdGratuityTotal = hasRealTier
    ? Math.round((cabinTier!.gratuityPerNight || 0) * effectiveNights)
    : Math.round(price * 0.15);
  const otdTotalPerPerson = otdBaseFare + otdPortTax + otdGratuityTotal;

  // ── HERO DISPLAY PRICE (root-cause fix) ──
  // Use the cabinTier OTD total as the primary hero price so the hero,
  // OTD breakdown, and Cabin Pricing table all point to the same number.
  // The `price` prop is a raw per-night/promotional stub that does NOT
  // appear in the Cabin Pricing table — showing it caused the $321/$714
  // contradiction reported by users.
  const heroPrice = hasRealTier ? otdTotalPerPerson : Math.round(price);

  // originalPrice / dropPercent derived from the same heroPrice source
  const heroOriginalPrice = (cabinTier && (cabinTier as any).originalTotal)
    ? (cabinTier as any).originalTotal
    : (originalPrice && originalPrice > heroPrice ? originalPrice : 0);
  const heroDrop = heroOriginalPrice > heroPrice
    ? Math.round(((heroOriginalPrice - heroPrice) / heroOriginalPrice) * 100)
    : (dropPercent || 0);
  const roundedPrice = Math.round(heroPrice);
  const priceLabel = hasRealTier
    ? `${cabinType || 'Cabin'} · out-the-door price`
    : 'Starting price';

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-[#1a1b24] to-ink p-6 text-white shadow-float sm:p-7">
      {/* Glow accent */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo/10 blur-3xl" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        {/* ===== LEFT COLUMN (2/3 width) ===== */}
        <div className="lg:col-span-2 space-y-4">

          {/* Breadcrumb line */}
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-ink-faint/80">{line}</p>

          {/* Ship name */}
          <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">{ship}</h1>

          {/* Quick facts row */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white/[0.4] px-3 py-1 text-xs font-semibold backdrop-blur-sm">{days} Nights</span>
            <span className="rounded-full bg-white/[0.4] px-3 py-1 text-xs font-semibold backdrop-blur-sm">Departs {formattedDate}</span>
            <span className="rounded-full bg-white/[0.4] px-3 py-1 text-xs font-semibold backdrop-blur-sm">{region} · {port}</span>
          </div>

          {/* Compact cruise facts — single non-repeating line */}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/70">
            <span>{days} {days === 1 ? 'Night' : 'Nights'}{cabinType ? ` · ${cabinType}` : ''}</span>
            <span>{port} · {region}</span>
          </div>

          {/* Price label */}
          <p className="mt-3 text-sm text-white/70">{priceLabel}</p>
        </div>

        {/* ===== RIGHT COLUMN (1/3 width) — Price Callout Card ===== */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-[calc(var(--header-height)+1rem)] z-20 flex flex-col items-center gap-4 p-4 bg-black/[0.2] rounded-2xl border border-black/[0.1]">

            {/* Large Monospace Fare */}
            <span className="font-mono-tab text-5xl font-black tracking-tight sm:text-6xl">
              ${roundedPrice.toLocaleString()}
            </span>

            {hasDrop && heroOriginalPrice > 0 && (
              <>
                <span className="font-mono-tab text-2xl text-white/60 line-through sm:text-3xl">
                  ${heroOriginalPrice.toLocaleString()}
                </span>
                <span className="rounded-full bg-coral-ink px-3 py-1 text-sm font-bold text-white">
                  -{heroDrop}% Drop
                </span>
              </>
            )}

            {/* OTD breakdown (matches cabinTier, not the raw price) */}
            <div className="mt-2 w-full space-y-1 text-xs text-white/80">
              <div className="flex justify-between"><span className="font-medium">Base Fare</span><span className="text-right">${otdBaseFare.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="font-medium">Port Taxes & Fees</span><span className="text-right">${otdPortTax.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="font-medium">Mandatory Gratuities</span><span className="text-right">${otdGratuityTotal.toLocaleString()}</span></div>
              <div className="flex items-baseline justify-between border-t border-black/[0.08] pt-2">
                <span className="font-bold text-xl">Total Per Person</span>
                <span className="font-mono-tab text-xl font-bold">${otdTotalPerPerson.toLocaleString()}</span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="mt-4 flex w-full flex-col gap-3 sm:flex-row">
              <button
                onClick={() => { const url = `/alerts?sailing=${window.location.pathname}`; window.location.href = url; }}
                className="flex-1 rounded-full bg-indigo/20 px-4 py-2 text-sm font-semibold text-indigo/90 hover:bg-indigo/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 transition-colors"
                data-testid="hero-track-price"
              >
                Track Price
              </button>
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
