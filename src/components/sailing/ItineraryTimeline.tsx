'use client';

/* ============================================================
   TRIPTIDE — ItineraryTimeline Component
   Visual port-to-port timeline with day numbers, arrows, and
   embarkation/debarkation highlights.
   ============================================================ */

interface ItineraryTimelineProps {
  ports: string[];
  days: number;
  departurePort: string;
}

export default function ItineraryTimeline({
  ports,
  days,
  departurePort,
}: ItineraryTimelineProps) {
  if (!ports || ports.length === 0) {
    return (
      <div className="rounded-3xl border border-black/[0.05] bg-white p-5 sm:p-6 shadow-xs">
        <h2 className="mb-4 font-display text-2xl font-bold text-ink">
          Itinerary
        </h2>
        <p className="text-ink-soft">No itinerary details available for this sailing.</p>
      </div>
    );
  }
  const isFirst = (i: number) => i === 0;
  const isLast = (i: number) => i === ports.length - 1;

  // Assign approximate days to each port
  const segments = ports.length - 1;
  const daysPerSegment = segments > 0 ? Math.max(1, Math.floor(days / segments)) : days;

  return (
    <div className="rounded-3xl border border-black/[0.05] bg-white p-4 shadow-float">
      <h2 className="mb-4 font-display text-2xl font-bold text-ink">Itinerary</h2>

      <div className="relative">
        {/* Vertical connecting line */}
        <div className="absolute left-6 top-0 h-full w-0.5 bg-black/[0.06]" />

        <div className="space-y-4">
          {ports.map((port, i) => (
            <div key={i} className="relative flex items-start gap-4">
              {/* Day marker dot */}
              <div
                className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isFirst(i)
                    ? 'bg-indigo text-white shadow-[0_4px_12px_-4px_rgba(42,68,231,0.4)]'
                    : isLast(i)
                      ? 'bg-mint-ink text-white'
                      : 'bg-canvas text-ink-soft'
                }`}
              >
                {isFirst(i) ? 'EMB' : isLast(i) ? 'DEB' : `D${i + 1}`}
              </div>

              {/* Port card */}
                            <div className="min-w-0 flex-1 pt-2">
                              <p className="font-display text-lg font-bold text-ink">{port}</p>
                              <p className="text-xs text-ink-soft">
                                {isFirst(i)
                                  ? `Embarkation · ${departurePort}`
                                  : isLast(i)
                                    ? 'Debarkation'
                                    : `${daysPerSegment} night${daysPerSegment > 1 ? 's' : ''} at sea`}
                              </p>
                            </div>

              {/* Arrow connector (desktop) */}
              {!isLast(i) && (
                <div className="hidden items-center text-ink-faint/40 sm:flex">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
