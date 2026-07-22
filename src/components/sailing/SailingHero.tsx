'use client';

/* ============================================================
   TRIPTIDE — SailingHero Component
   Hero banner for the sailing detail page showing ship name,
   cruise line, price with strikethrough, departure info, badges.
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
  /** Optional: cabin tier (e.g. "Oceanview", "Interior") — renders price context when available */
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

  const priceLabel = cabinType ? `Starting at $${price.toLocaleString()} from ${cabinType}` : `Starting at $${price.toLocaleString()}`;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-[#1a1b24] to-ink p-8 text-white shadow-float sm:p-12">
      {/* Glow accent */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo/10 blur-3xl" />

      <div className="relative z-10">
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

        {/* Price section */}
        <div className="mt-8 flex flex-wrap items-baseline gap-4">
          <span className="font-mono-tab text-5xl font-black tracking-tight sm:text-6xl">
            ${price.toLocaleString()}
          </span>
          {hasDrop && (
            <>
              <span className="font-mono-tab text-2xl text-white/60 line-through sm:text-3xl">
                ${originalPrice!.toLocaleString()}
              </span>
              <span className="rounded-full bg-coral-ink px-4 py-1.5 text-sm font-bold text-white">
                -{dropPercent}% Drop
              </span>
            </>
          )}
        </div>

        {/* Price label — identifies cabin type context when available */}
        <p className="mt-4 text-sm text-white/70">{priceLabel}</p>
      </div>
    </div>
  );
}
