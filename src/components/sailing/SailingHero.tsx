'use client';

/* ============================================================
   TRIPTIDE — SailingHero Component (Refactored)
   Hero banner for the sailing detail page showing ship name,
   cruise line, price with strikethrough, departure info, badges.
   On lg+: two-column grid (left 2/3: ship/info, right 1/3: price card).
   ============================================================ */

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
  /** Optional: cabin tier (e.g. \"Oceanview\", \"Interior\") — renders price context when available */
  cabinType?: string;
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
          <div className="lg:sticky lg:top-28 flex flex-col items-center gap-4 p-4 bg-black/[0.2] rounded-2xl border border-black/[0.1]">
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

            {/* Out-the-door breakdown list */}
            <div className="mt-2 space-y-1 text-xs text-white/80">
              <div className="flex justify-between w-full">
                <span className="font-medium">Base Fare</span>
                <span className="text-right">${Math.round(price * 0.6).toLocaleString()}</span>
              </div>
              <div className="flex justify-between w-full">
                <span className="font-medium">Port Taxes & Fees</span>
                <span className="text-right">${Math.round(price * 0.25).toLocaleString()}</span>
              </div>
              <div className="flex justify-between w-full">
                <span className="font-medium">Mandatory Gratuities</span>
                <span className="text-right">${Math.round(price * 0.15).toLocaleString()}</span>
              </div>
              <div className="flex items-baseline justify-between w-full pt-2 border-t border-black/[0.08]">
                <span className="font-bold text-xl">Total Per Person</span>
                <span className="font-mono-tab text-xl font-bold">${roundedPrice.toLocaleString()}</span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3 w-full">
              {/* Track Price */}
              <button
                onClick={() => {
                  // Navigate to alerts page with pre-filled sailing
                  const url = `/alerts?sailing=/sailing/${window.location.pathname}`;
                  window.location.href = url;
                }}
                className="flex-1 rounded-full bg-indigo/20 px-4 py-2 text-sm font-semibold text-indigo/90 hover:bg-indigo/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 transition-colors"
              >
                Track Price
              </button>

              {/* View Deal / Book */}
              <a
                href="#"
                className="flex-1 rounded-full bg-indigo px-5 py-2 text-sm font-semibold text-white shadow-[0_4px_8px_-2px_rgba(42,68,231,0.4)] hover:bg-indigo-dark active:scale-[0.98] transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Deal / Book
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}