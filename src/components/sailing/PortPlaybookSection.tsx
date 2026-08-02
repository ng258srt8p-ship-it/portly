'use client';

/* ============================================================
   TRIPTIDE - PortPlaybookSection Component
   Displays per-port tactical guidance: dock type, insider
   tips, DIY transport, and crowd warnings for each port
   of call on the itinerary.
   ============================================================ */

interface PortInfo {
  name: string;
  dockType?: string;
  insiderTip?: string;
  diyTransport?: string;
  crowdWarning?: string;
}

interface PortPlaybookSectionProps {
  ports: string[];
  departurePort?: string;
  portInsights?: Record<string, PortInfo>;
}

// Deterministic fallback tips when no enrichment data is available.
// Generates a useful baseline per-port blurb from the port name.
function getDefaultTip(portName: string, index: number): string {
  const isDeparture = index === 0;
  if (isDeparture) {
    return `Departure port — arrive a day early to avoid missing the ship if flights are delayed. Pre-cruise hotels near the terminal typically offer shuttle service.`;
  }
  const isLast = index === -1; // we don't know the last index here
  return `Pier-side walk-off port. Check ship-organized excursions for convenience, or book independent tours via Viator for 30-50% savings with smaller groups.`;
}

export default function PortPlaybookSection({
  ports,
  departurePort,
  portInsights,
}: PortPlaybookSectionProps) {
  if (!ports || ports.length === 0) {
    return (
      <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-xs sm:p-6">
        <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">Port Playbook</h2>
        <p className="mt-3 text-sm text-ink-soft">No itinerary ports available for this sailing.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-xs sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">Port Playbook</h2>
        <span className="text-xs font-medium text-ink-soft">
          {ports.length} port{ports.length > 1 ? 's' : ''} of call
        </span>
      </div>

      <div className="space-y-3">
        {ports.map((portName, index) => {
          const insight = portInsights?.[portName];
          const isDeparture = departurePort && portName === departurePort;
          const dockType = insight?.dockType || (isDeparture ? 'Home Port' : 'Pier-side');
          const tip = insight?.insiderTip || getDefaultTip(portName, index);

          return (
            <div
              key={`${portName}-${index}`}
              className="rounded-xl border border-black/[0.04] bg-ink/[0.01] p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo/10 text-xs font-bold text-indigo">
                    {index + 1}
                  </span>
                  <h3 className="text-sm font-bold text-ink">{portName}</h3>
                </div>
                <span className="rounded-full bg-mint-soft px-2.5 py-0.5 text-xs font-semibold text-mint-ink">
                  {dockType}
                </span>
              </div>

              <p className="text-sm leading-relaxed text-ink-soft">{tip}</p>

              {insight?.diyTransport && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-ink-faint">
                  <span className="font-semibold">DIY Transport:</span>
                  <span>{insight.diyTransport}</span>
                </div>
              )}

              {insight?.crowdWarning && (
                <div className="mt-1.5 flex items-start gap-1.5 text-xs text-coral-ink">
                  <span className="font-semibold">Crowd Warning:</span>
                  <span>{insight.crowdWarning}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
