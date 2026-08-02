'use client';

/* ============================================================
   TRIPTIDE - ShipIntelSection Component
   Displays ship-specific intelligence: class, launch year,
   cabin strategy, and AI-generated insider summary.
   Replaces the bare metadata table with real ship content.
   ============================================================ */

interface ShipIntelSectionProps {
  ship: string;
  line: string;
  shipClass?: string | null;
  shipLaunchedYear?: number | null;
  aiInsiderSummary?: string | null;
  aiCabinStrategy?: string | null;
  cabinCategories?: string[];
  totalCabins?: number;
}

export default function ShipIntelSection({
  ship,
  line,
  shipClass,
  shipLaunchedYear,
  aiInsiderSummary,
  aiCabinStrategy,
  cabinCategories,
  totalCabins,
}: ShipIntelSectionProps) {
  const hasIntel = !!(aiInsiderSummary || aiCabinStrategy || shipClass || shipLaunchedYear);

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-xs sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">Ship Specs</h2>
        <span className="text-xs font-medium text-ink-soft">{line}</span>
      </div>

      {/* Quick-spec grid */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SpecCard label="Ship" value={ship} />
        <SpecCard label="Class" value={shipClass || '—'} />
        <SpecCard label="Launched" value={shipLaunchedYear ? String(shipLaunchedYear) : '—'} />
        <SpecCard label="Cabins" value={totalCabins ? String(totalCabins) : '—'} />
      </div>

      {cabinCategories && cabinCategories.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {cabinCategories.map((cat) => (
            <span
              key={cat}
              className="rounded-full bg-indigo/10 px-3 py-1 text-xs font-semibold text-indigo"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {aiInsiderSummary && (
        <div className="mb-4 rounded-xl bg-ink/[0.02] p-4">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-soft">Insider Summary</h3>
          <p className="text-sm leading-relaxed text-ink">{aiInsiderSummary}</p>
        </div>
      )}

      {aiCabinStrategy && (
        <div className="rounded-xl bg-ink/[0.02] p-4">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-soft">Cabin Strategy</h3>
          <p className="text-sm leading-relaxed text-ink">{aiCabinStrategy}</p>
        </div>
      )}

      {!hasIntel && (
        <p className="text-sm text-ink-soft">
          Ship intelligence for {ship} is generated during enrichment cycles. Check back after the next sync.
        </p>
      )}
    </div>
  );
}

function SpecCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/[0.05] bg-ink/[0.01] p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1 text-sm font-bold text-ink truncate">{value}</p>
    </div>
  );
}
