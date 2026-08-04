'use client';

/**
 * TripTide — HiddenCostDisplay
 *
 * Renders the hidden costs breakdown for a sailing:
 * - Mandatory gratuities (by cruise line rate)
 * - Wi‑Fi cost
 * - Real total cost (listed + hidden)
 * - Cost delta visualization
 */

import MaterialIcon from '@/components/ui/MaterialIcon';
import type { HiddenCosts } from '@/types/enhancedAnalytics';

interface HiddenCostDisplayProps {
  costs: HiddenCosts;
  /** Canonical listed price (OTD total) – used to compute delta and to
   *  synthesize missing gratuities/Wi‑Fi if the API omitted them. */
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
  // Synthesize missing values when the API does not provide them.
  const baseForGratuities = listedPrice ?? costs.totalOutTheDoor ?? costs.realTotalCost ?? 0;
  const computedGratuities = Math.round(gratuityRate * durationDays);
  const mandatoryGratuities = costs.mandatoryGratuities ?? computedGratuities;
  const wifiCost = costs.wifiCost ?? 12 * durationDays;
  // Real total cost = listed price (already includes gratuities) + Wi‑Fi.
  const realTotalCost = costs.realTotalCost ?? (baseForGratuities + wifiCost);
  const costDelta = listedPrice ? Math.round(realTotalCost - listedPrice) : 0;

  return (
    <section className="hidden-costs border border-surface-400/5 p-3 rounded">
      <h3 className="text-sm font-semibold mb-2">Hidden Cost Detector</h3>
      <ul className="grid gap-2">
        <li className="flex items-center gap-2">
          <MaterialIcon name="info" className="text-surface-600/60" />
          <div>
            <div className="text-xs opacity-70">Mandatory Gratuities</div>
            <div className="font-medium">${mandatoryGratuities.toLocaleString()}/night</div>
          </div>
        </li>
        <li className="flex items-center gap-2">
          <MaterialIcon name="wifi" className="text-surface-600/60" />
          <div>
            <div className="text-xs opacity-70">Wi‑Fi (Starlink)</div>
            <div className="font-medium">${wifiCost.toLocaleString()}</div>
          </div>
        </li>
        <li className="flex items-center gap-2">
          <MaterialIcon name="account_balance" className="text-surface-600/60" />
          <div>
            <div className="text-xs opacity-70">Real Total Cost (est.)</div>
            <div className="font-medium">${realTotalCost.toLocaleString()}</div>
          </div>
        </li>
        {costDelta !== 0 && (
          <li className="flex items-center gap-2 text-surface-600/80">
            <MaterialIcon name="compare_arrows" className="text-surface-600/60" />
            <div>
              <div className="text-xs opacity-70">Δ (real‑vs‑listed)</div>
              <div className="font-medium text-sm">{costDelta > 0 ? `+${costDelta}` : costDelta}</div>
            </div>
          </li>
        )}
      </ul>
    </section>
  );
}
