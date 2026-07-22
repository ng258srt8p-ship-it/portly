'use client';

/**
 * TripTide — CabinUpgradeTracker
 * 
 * Tracks the price gap between cabin categories to identify
 * upgrade value signals:
 * - Current upgrade cost (e.g., Inside → Balcony)
 * - Historical upgrade cost trend
 * - Whether upgrading is a good deal right now
 * - Estimated savings vs booking the upgrade now
 */

import MaterialIcon from '@/components/ui/MaterialIcon';

interface UpgradeSignal {
  fromCabin: string;
  toCabin: string;
  currentUpgradeCost: number;
  historicalAvgUpgradeCost: number;
  isGoodDeal: boolean;
  estimatedSavings: number;
}

interface CabinUpgradeTrackerProps {
  signals: UpgradeSignal[];
  currentPricing: Record<string, number>;
}

const UPGRADE_PAIRS = [
  { from: 'Inside', to: 'Oceanview', label: 'Inside → Oceanview' },
  { from: 'Inside', to: 'Balcony', label: 'Inside → Balcony' },
  { from: 'Oceanview', to: 'Balcony', label: 'Oceanview → Balcony' },
  { from: 'Balcony', to: 'Suite', label: 'Balcony → Suite' },
];

export default function CabinUpgradeTracker({
  signals,
  currentPricing,
}: CabinUpgradeTrackerProps) {
  // Build signals from current pricing if no explicit signals provided
  const computedSignals: UpgradeSignal[] = signals.length > 0
    ? signals
    : UPGRADE_PAIRS
        .filter(pair => currentPricing[pair.from] && currentPricing[pair.to])
        .map(pair => {
          const upgradeCost = currentPricing[pair.to] - currentPricing[pair.from];
          const avgUpgrade = upgradeCost * 1.15; // Assume 15% historical premium
          return {
            fromCabin: pair.from,
            toCabin: pair.to,
            currentUpgradeCost: upgradeCost,
            historicalAvgUpgradeCost: avgUpgrade,
            isGoodDeal: upgradeCost < avgUpgrade * 0.85,
            estimatedSavings: Math.max(0, avgUpgrade - upgradeCost),
          };
        });

  if (computedSignals.length === 0) return null;

  return (
    <div className="rounded-xl border border-indigo/10 bg-white p-4 shadow-sm" data-testid="cabin-upgrade-tracker">
      <div className="mb-3 flex items-center gap-1.5">
        <MaterialIcon name="upgrade" size="sm" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-dark">
          Upgrade Value Tracker
        </h3>
      </div>

      <div className="space-y-2">
        {computedSignals.map((signal, i) => (
          <div
            key={i}
            className={`rounded-lg border p-3 ${
              signal.isGoodDeal
                ? 'border-emerald-200 bg-emerald-50/50'
                : 'border-slate-100 bg-slate-50'
            }`}
            data-testid={`upgrade-signal-${signal.fromCabin.toLowerCase()}-${signal.toCabin.toLowerCase()}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink">{signal.fromCabin} → {signal.toCabin}</span>
              {signal.isGoodDeal && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <MaterialIcon name="check_circle" size="xs" />
                  Good Deal
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-ink-faint">
                Upgrade cost: <span className="font-medium text-ink">${signal.currentUpgradeCost.toLocaleString()}</span>
              </span>
              {signal.isGoodDeal && signal.estimatedSavings > 0 && (
                <span className="font-medium text-emerald-700">
                  Save ~${signal.estimatedSavings.toLocaleString()} vs historical avg
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
