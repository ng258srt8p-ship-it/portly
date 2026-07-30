'use client';

/**
 * SailingKeyTakeaways — high-signal scannable callout for /sailing/[id].
 *
 * Renders a high-contrast container at the top of the Overview section with:
 *   1. A 2-line "Deal Verdict & Price Value Pitch" (executive summary)
 *   2. 3-4 inline-flex pill badges: Deal Score, Sea Days / Ports, Best For, etc.
 *
 * Falls back to a deterministic heuristic when AI columns are null so the
 * page is never empty for unenriched sailings.
 */

import MaterialIcon from '@/components/ui/MaterialIcon';

export interface KeyTakeawaysProps {
  price: number;
  originalPrice: number;
  dropPercent: number;
  perNight?: number;
  days: number;
  route: string[];
  line: string;
  ship: string;
  cabinBreakdown?: Array<{ cabinType: string; totalOutTheDoor: number; baseFarePerPerson: number }>;
  aiScore?: number | null;
  aiDealScoreNarrative?: string | null;
  aiCabinStrategy?: string | null;
  aiExcursionStrategy?: string | null;
  aiInsiderSummary?: string | null;
}

function Badge({
  icon,
  label,
  tone = 'indigo',
}: {
  icon: string;
  label: string;
  tone?: 'indigo' | 'emerald' | 'coral' | 'amber';
}) {
  const toneClass: Record<string, string> = {
    indigo: 'bg-indigo/10 text-indigo',
    emerald: 'bg-emerald-500/10 text-emerald-700',
    coral: 'bg-coral-soft text-coral-ink',
    amber: 'bg-amber-500/10 text-amber-700',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass[tone]}`}
    >
      <MaterialIcon name={icon} size="xs" />
      {label}
    </span>
  );
}

function deriveVerdict(dropPercent: number, perNight: number | undefined, line: string, ship: string, days: number): string {
  // Heuristic 2-sentence verdict when AI columns are null
  const pct = dropPercent || 0;
  const pn = perNight || 0;
  const shipLine = `${line} ${ship}`.trim();
  if (pct >= 25) {
    return `At $${pn}/night out-the-door, this ${days}-night sailing sits ${pct}% below its recent peak — strong value for ${shipLine}. Book now while the line is filling remaining inventory.`;
  }
  if (pct >= 15) {
    return `At $${pn}/night out-the-door, this ${days}-night sailing sits ${pct}% below its recent peak. Solid deal for ${shipLine}; expect prices to firm up over the next 2-3 weeks.`;
  }
  if (pct >= 5) {
    return `${shipLine} ${days}-night sailing at $${pn}/night out-the-door — modest ${pct}% off peak. Watch this fare; if it dips another 5-10%, jump.`;
  }
  return `${shipLine} ${days}-night sailing at $${pn}/night out-the-door is roughly at peak pricing (${pct}% off). Better inventory should appear 90-60 days out.`;
}

function deriveBestFor(line: string, ship: string): string {
  const ll = (line || '').toLowerCase();
  if (ll.includes('carnival')) return 'Families & Groups';
  if (ll.includes('royal')) return 'Active Couples';
  if (ll.includes('disney')) return 'Multi-Gen Families';
  if (ll.includes('celebrity')) return 'Modern Luxury Couples';
  if (ll.includes('norwegian')) return 'Free-Spirit Travelers';
  if (ll.includes('princess')) return 'Multi-Gen Families';
  return 'Value Seekers';
}

function deriveSeaDays(days: number, route: string[]): { seaDays: number; ports: number; label: string } {
  const ports = Array.isArray(route) ? route.length : 0;
  const seaDays = Math.max(0, days - ports);
  return { seaDays, ports, label: `${seaDays} Sea Day${seaDays === 1 ? '' : 's'} / ${ports} Port${ports === 1 ? '' : 's'}` };
}

function deriveCabinPick(cabinBreakdown: KeyTakeawaysProps['cabinBreakdown']): string {
  if (!cabinBreakdown || cabinBreakdown.length === 0) return 'Compare cabin tiers';
  // Pick the lowest non-zero totalPerPerson as "sweet spot"
  const priced = cabinBreakdown.filter((c) => (c.totalOutTheDoor || 0) > 0);
  if (priced.length === 0) return 'Compare cabin tiers';
  // Sort ascending; recommend the cheapest (sweet spot for max savings) plus the first upgrade
  const sorted = [...priced].sort((a, b) => a.totalOutTheDoor - b.totalOutTheDoor);
  const cheapest = sorted[0];
  const upgrade = sorted[1] ?? sorted[0];
  if (sorted.length === 1) {
    return `${cheapest.cabinType} sweet spot`;
  }
  const delta = upgrade.totalOutTheDoor - cheapest.totalOutTheDoor;
  return `${cheapest.cabinType} sweet spot · ${upgrade.cabinType} +$${delta}`;
}

export default function SailingKeyTakeaways({
  price,
  originalPrice,
  dropPercent,
  perNight,
  days,
  route,
  line,
  ship,
  cabinBreakdown,
  aiScore,
  aiDealScoreNarrative,
  aiCabinStrategy,
  aiExcursionStrategy,
  aiInsiderSummary,
}: KeyTakeawaysProps) {
  const score = aiScore ?? Math.min(99, Math.max(40, 50 + (dropPercent || 0) + Math.floor((originalPrice || price) / 200)));
  const scoreLabel = score >= 85 ? 'Exceptional' : score >= 70 ? 'Great' : score >= 50 ? 'Average' : 'Below Avg';
  const scoreTone = score >= 85 ? 'emerald' : score >= 70 ? 'indigo' : score >= 50 ? 'amber' : 'coral';
  const scoreIcon = score >= 85 ? 'local_fire_department' : 'insights';

  const sea = deriveSeaDays(days, route);
  const verdict = (aiDealScoreNarrative && aiDealScoreNarrative.trim()) || aiInsiderSummary?.trim() || deriveVerdict(dropPercent, perNight, line, ship, days);
  const bestFor = deriveBestFor(line, ship);
  const cabinPick = deriveCabinPick(cabinBreakdown);

  return (
    <section
      data-testid="sailing-key-takeaways"
      className="mb-6 rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 shadow-xs sm:p-6"
      aria-label="Sailing key takeaways"
    >
      <header className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo/10 text-indigo">
          <MaterialIcon name="auto_awesome" size="xs" />
        </span>
        <h2 className="font-display text-base font-bold tracking-tight text-ink">Key Takeaways</h2>
      </header>

      {/* Verdict pitch */}
      <p
        data-testid="key-takeaway-verdict"
        className="mb-4 text-sm leading-relaxed text-ink sm:text-base"
      >
        {verdict}
      </p>

      {/* Inline-flex badges */}
      <div className="flex flex-wrap items-center gap-2" data-testid="key-takeaway-badges">
        <Badge icon={scoreIcon} label={`Deal Score: ${score}/100 · ${scoreLabel}`} tone={scoreTone} />
        <Badge icon="directions_boat" label={sea.label} tone="indigo" />
        <Badge icon="groups" label={`Best For: ${bestFor}`} tone="indigo" />
        {cabinPick && <Badge icon="bed" label={cabinPick} tone="indigo" />}
      </div>

      {/* Hidden AI module previews (parsed separately; this is the executive verdict layer) */}
      {(aiCabinStrategy || aiExcursionStrategy) && (
        <details className="mt-4 group">
          <summary className="cursor-pointer list-none text-xs font-semibold text-indigo hover:text-indigo-dark [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-1">
              <MaterialIcon name="expand_more" size="xs" className="transition-transform group-open:rotate-180" />
              View cabin & excursion analysis
            </span>
          </summary>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-soft">
            {aiCabinStrategy && (
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">Cabin strategy</h3>
                <p data-testid="key-takeaway-cabin">{aiCabinStrategy}</p>
              </div>
            )}
            {aiExcursionStrategy && (
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">Excursion strategy</h3>
                <p data-testid="key-takeaway-excursion">{aiExcursionStrategy}</p>
              </div>
            )}
          </div>
        </details>
      )}
    </section>
  );
}
