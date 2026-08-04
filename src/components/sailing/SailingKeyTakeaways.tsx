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
  /** Inside-cabin out-the-door total — used for per-night math so this
   *  matches the cabin table and hero price instead of the raw `price`. */
  listedPrice?: number;
  originalPrice: number;
  dropPercent: number;
  perNight?: number;
  days: number;
  route: string[];
  region?: string;
  line: string;
  ship: string;
  shipClass?: string | null;
  shipLaunchedYear?: number | null;
  history?: number[];
  cabinBreakdown?: Array<{ cabinType: string; totalOutTheDoor: number; baseFarePerPerson: number; estimated?: boolean }>;
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

function deriveVerdict(
  dropPercent: number,
  perNight: number | undefined,
  line: string,
  ship: string,
  days: number,
  route: string[],
  history: number[] | undefined,
  shipClass: string | null | undefined
): string {
  const pct = dropPercent || 0;
  const pn = perNight || 0;
  const shipLine = `${line} ${ship}`.trim();
  const ports = Array.isArray(route) ? route.filter(Boolean) : [];
  const portList = ports.length > 0 ? ports.join(', ') : '';
  const portClause = portList ? ` across ${ports.length} port${ports.length === 1 ? '' : 's'} (${portList})` : '';
  const shipClause = shipClass ? ` ${shipClass}-class` : '';

  // ── Verdict sentence 1: anchor on price
  let v1: string;
  if (pct >= 25) {
    v1 = `At $${pn}/night out-the-door, this ${days}-night sailing${portClause} sits ${pct}% below its recent peak — strong value for the ${shipLine}.`;
  } else if (pct >= 15) {
    v1 = `At $${pn}/night out-the-door, this ${days}-night sailing${portClause} sits ${pct}% below its recent peak — solid value for the ${shipLine}.`;
  } else if (pct >= 5) {
    v1 = `${shipLine} ${days}-night sailing at $${pn}/night out-the-door shows a modest ${pct}% off peak${portClause}.`;
  } else {
    v1 = `${shipLine} ${days}-night sailing at $${pn}/night out-the-door is roughly at peak pricing (${pct}% off)${portClause}.`;
  }

  // ── Verdict sentence 2: trajectory from history
  let v2 = '';
  if (history && history.length >= 2) {
    const earliest = history[0];
    const latest = history[history.length - 1];
    const delta = latest - earliest;
    if (delta <= -10) {
      const pctDrop = Math.round((delta / earliest) * 100);
      v2 = ` The fare has dropped $${Math.abs(delta).toLocaleString()} (${Math.abs(pctDrop)}%) across the last ${history.length} price checks — buyer-favorable momentum.`;
    } else if (delta >= 10) {
      const pctRise = Math.round((delta / earliest) * 100);
      v2 = ` The fare has climbed $${delta.toLocaleString()} (${pctRise}%) across the last ${history.length} price checks — consider locking in before the next move up.`;
    } else {
      v2 = ` Pricing has been stable (within $${Math.abs(delta)}) across the last ${history.length} price checks — the line appears to have found the bottom.`;
    }
  }

  // ── Verdict sentence 3: ship class / action
  let v3 = '';
  if (pct >= 25) {
    v3 = shipClause
      ? ` The ${shipClass}-class ${ship} is a known strong seller; ${pct}% drops of this magnitude typically fill within 7-10 days.`
      : ` Drops of this magnitude typically fill within 7-10 days.`;
  } else if (pct < 10 && history && history.length >= 2) {
    v3 = ` If you can hold off, prices usually dip 5-12% deeper 90-60 days before sailing.`;
  } else if (days <= 4) {
    v3 = ` Short cruises like this rarely drop further — the value is in the current fare.`;
  }

  return (v1 + v2 + v3).trim();
}

function deriveHistoryTrend(history: number[] | undefined): { label: string; tone: 'emerald' | 'amber' | 'coral'; icon: string } | null {
  if (!history || history.length < 2) return null;
  const earliest = history[0];
  const latest = history[history.length - 1];
  const delta = latest - earliest;
  const pct = Math.round((delta / earliest) * 100);
  if (delta <= -5) return { label: `Trend: falling ${pct}% over ${history.length} checks`, tone: 'emerald', icon: 'trending_down' };
  if (delta >= 5) return { label: `Trend: rising +${pct}% over ${history.length} checks`, tone: 'coral', icon: 'trending_up' };
  return { label: `Trend: stable across ${history.length} checks`, tone: 'amber', icon: 'trending_flat' };
}

function derivePortIntel(ports: string[]): { port: string; tag: string }[] {
  // Generic but useful port intel — keyed off port name fragments.
  // Real production would join against a ports table.
  const intel: Record<string, string> = {
    'miami': 'Tender-free, walk-off pier',
    'port canaveral': 'Easy drive from Orlando; park-and-cruise lots',
    'cozumel': 'Snorkel-friendly water; downtown 5-min walk',
    'nassau': 'Walkable port + cheap taxi to Atlantis',
    'st. thomas': 'Best shopping port in Caribbean',
    'san juan': 'Old San Juan walking tour; no tender',
    'costa maya': 'Pristine Mahahual beach nearby',
    'roatan': 'West Bay Beach accessible by taxi',
    'grand cayman': 'Tender port; Stingray City shore-ex',
    'ocho rios': '8-hour stop; Dunn\u2019s River Falls shore-ex',
    'jamaica': 'Dunn\u2019s River Falls + Blue Hole combos',
    'belize': 'Tender port; cave-tubing shore-ex',
    'honolulu': 'Waikiki walk-off; Diamond Head nearby',
    'barcelona': 'Las Ramblas walking tour; tapas',
    'civitavecchia': 'Rome 1-hr train; Colosseum day-trip',
    'venice': 'St Mark\u2019s Square walk-off; Murano day-trip',
    'kotor': 'Old Town walking; 1,500-ft fortress climb',
    'santorini': 'Tender port; Oia sunset by local bus',
    'mykonos': 'Tender port; Little Venice walking',
    'seville': 'Taxi to city center; Alcazar + cathedral',
    'lisbon': 'Walk-off pier; Belem district tram',
    'reykjavik': 'Golden Circle tours bookable dockside',
    'akureyri': 'Whale watching + Godafoss waterfall',
  };
  return ports.filter(Boolean).slice(0, 4).map((port) => {
    const lower = port.toLowerCase();
    const matchKey = Object.keys(intel).find((k) => lower.includes(k));
    return {
      port,
      tag: matchKey ? intel[matchKey] : 'Pier-side walk-off; check ship-ex for tours',
    };
  });
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
  listedPrice,
  originalPrice,
  dropPercent,
  perNight,
  days,
  route,
  region,
  line,
  ship,
  shipClass,
  shipLaunchedYear,
  history,
  cabinBreakdown,
  aiScore,
  aiDealScoreNarrative,
  aiCabinStrategy,
  aiExcursionStrategy,
  aiInsiderSummary,
}: KeyTakeawaysProps) {
  const canonical = listedPrice ?? price;
  const perNightCalc = perNight ?? Math.round(canonical / days);
  const score = aiScore ?? Math.min(99, Math.max(40, 50 + (dropPercent || 0) + Math.floor((originalPrice || price) / 200)));
  const scoreLabel = score >= 85 ? 'Exceptional' : score >= 70 ? 'Great' : score >= 50 ? 'Average' : 'Below Avg';
  const scoreTone = score >= 85 ? 'emerald' : score >= 70 ? 'indigo' : score >= 50 ? 'amber' : 'coral';
  const scoreIcon = score >= 85 ? 'local_fire_department' : 'insights';

  const sea = deriveSeaDays(days, route);
  const trend = deriveHistoryTrend(history);
  const portIntel = derivePortIntel(route || []);
  const verdict = (aiDealScoreNarrative && aiDealScoreNarrative.trim())
    || aiInsiderSummary?.trim()
    || deriveVerdict(dropPercent, perNightCalc, line, ship, days, route || [], history, shipClass);
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
        {trend && <Badge icon={trend.icon} label={trend.label} tone={trend.tone} />}
      </div>

      {/* Port intel strip — only when ports exist */}
      {portIntel.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="key-takeaway-port-intel">
          {portIntel.map(({ port, tag }) => (
            <div
              key={port}
              className="flex items-start gap-2 rounded-xl border border-black/[0.06] bg-white/60 px-3 py-2 text-xs"
            >
              <MaterialIcon name="place" size="xs" className="mt-0.5 shrink-0 text-indigo" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{port}</p>
                <p className="text-ink-soft">{tag}</p>
              </div>
            </div>
          ))}
        </div>
      )}

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
