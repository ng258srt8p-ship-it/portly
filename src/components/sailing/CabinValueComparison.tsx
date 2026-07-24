'use client';

/**
 * TripTide — CabinValueComparison
 * 
 * Renders a per-cabin value breakdown table with:
 * - Per-night cost for each cabin type
 * - Value rating (Excellent/Great/Good/Fair/Overpriced)
 * - Visual comparison with highlights
 */

import MaterialIcon from '@/components/ui/MaterialIcon';

interface CabinValueEntry {
  perNight: number;
  valueRating: string;
}

interface CabinValueComparisonProps {
  breakdown: Record<string, CabinValueEntry>;
  durationDays?: number;
  passengerCount?: number;
}

const RATING_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  excellent: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', icon: 'workspace_premium' },
  great: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'auto_awesome' },
  good: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'thumb_up' },
  fair: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'balance' },
  overpriced: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: 'warning' },
};

export default function CabinValueComparison({
  breakdown,
  durationDays = 7,
  passengerCount = 2,
}: CabinValueComparisonProps) {
  const entries = Object.entries(breakdown);
  const sorted = [...entries].sort((a, b) => a[1].perNight - b[1].perNight);
  const cheapest = sorted[0];
  const mostExpensive = sorted[sorted.length - 1];

  return (
    <div className="rounded-xl border border-indigo/10 bg-white p-4 shadow-sm" data-testid="cabin-value-comparison">
      <div className="mb-3 flex items-center gap-1.5">
        <MaterialIcon name="compare_arrows" size="sm" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-dark">
          Cabin Value Comparison
        </h3>
      </div>

      <div className="space-y-2">
        {sorted.map(([cabin, value], index) => {
          const styles = RATING_STYLES[value.valueRating.toLowerCase()] || RATING_STYLES.fair;
          const isBest = cheapest && cabin === cheapest[0];
          const isWorst = mostExpensive && cabin === mostExpensive[0] && entries.length > 1;

          return (
            <div
              key={cabin}
              className={`flex items-center justify-between rounded-lg border p-3 transition ${
                isBest ? 'border-emerald-300 bg-emerald-50/50' :
                isWorst ? 'border-rose-200 bg-rose-50/30' :
                'border-slate-100 bg-slate-50'
              }`}
              data-testid={`cabin-value-${cabin.toLowerCase()}`}
            >
              <div className="flex items-center gap-2">
                {isBest && (
                  <MaterialIcon name="workspace_premium" size="xs" className="text-amber-500" />
                )}
                <span className="text-sm font-medium text-ink">{cabin}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold tabular-nums text-ink">
                  ${value.perNight}/night
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles.bg} ${styles.text} ${styles.border}`}>
                  <MaterialIcon name={styles.icon} size="xs" /> {value.valueRating}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {entries.length > 1 && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-100 p-2.5 text-xs text-ink-faint">
          <span>Price spread</span>
          <span className="font-medium tabular-nums">
            ${cheapest?.[1].perNight} – ${mostExpensive?.[1].perNight}/night
          </span>
        </div>
      )}
    </div>
  );
}
