'use client';

/**
 * TripTide — HiddenCostDisplay
 * 
 * Renders the hidden costs breakdown for a sailing:
 * - Mandatory gratuities (by cruise line rate)
 * - Wi-Fi cost
 * - Resort/destination fees
 * - Real total cost (listed + hidden)
 * - Cost delta visualization
 */

import MaterialIcon from '@/components/ui/MaterialIcon';
import type { HiddenCosts } from '@/types/enhancedAnalytics';

interface HiddenCostDisplayProps {
  costs: HiddenCosts;
  listedPrice?: number;
  durationDays?: number;
  cruiseLine?: string;
}

function getGratuityRate(cruiseLine: string): number {
  const line = cruiseLine.toLowerCase();
  if (line.includes('royal')) return 16;
  if (line.includes('carnival')) return 16;
  if (line.includes('norwegian')) return 18;
  if (line.includes('celebrity')) return 14;
  return 15;
}

export default function HiddenCostDisplay({
  costs,
  listedPrice,
  durationDays = 7,
  cruiseLine = '',
}: HiddenCostDisplayProps) {
  const gratuityRate = getGratuityRate(cruiseLine);
  const gratuitiesPerDay = costs.mandatoryGratuities
    ? Math.round(costs.mandatoryGratuities / durationDays / 2)
    : gratuityRate;

  const totalListed = listedPrice || 0;
  const realTotal = costs.realTotalCost || totalListed + (costs.mandatoryGratuities || 0) + (costs.wifiCost || 0);
  const hiddenTotal = realTotal - totalListed;
  const hiddenPct = totalListed > 0 ? ((hiddenTotal / totalListed) * 100).toFixed(0) : '0';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="hidden-cost-display">
      <div className="mb-3 flex items-center gap-1.5">
        <MaterialIcon name="payments" size="sm" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
          What the Listed Price Doesn&apos;t Show
        </h3>
      </div>

      <div className="space-y-2.5">
        {costs.mandatoryGratuities !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-ink-soft">
              Gratuities ({gratuitiesPerDay}/day/person × 2)
            </span>
            <span className="font-medium text-rose-700 tabular-nums">
              ${costs.mandatoryGratuities.toLocaleString()}
            </span>
          </div>
        )}

        {costs.wifiCost !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-ink-soft">
              Wi-Fi (~$12/day × 2 passengers)
            </span>
            <span className="font-medium text-rose-700 tabular-nums">
              ${costs.wifiCost.toLocaleString()}
            </span>
          </div>
        )}

        {costs.resortFees !== undefined && costs.resortFees > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-ink-soft">Resort/Destination Fees</span>
            <span className="font-medium text-rose-700 tabular-nums">
              ${costs.resortFees.toLocaleString()}
            </span>
          </div>
        )}

        {hiddenTotal > 0 && (
          <div className="border-t border-slate-200 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-ink-faint">Hidden costs total</span>
              <span className="font-medium text-rose-600 tabular-nums">
                +${hiddenTotal.toLocaleString()} ({hiddenPct}%)
              </span>
            </div>
          </div>
        )}

        {costs.realTotalCost !== undefined && (
          <div className="flex justify-between border-t-2 border-ink/10 pt-3 font-bold">
            <span className="text-ink">Real Total Cost</span>
            <span className="text-rose-700 tabular-nums">
              ${costs.realTotalCost.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
