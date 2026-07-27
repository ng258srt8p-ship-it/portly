'use client';

/* ============================================================
   TRIPTIDE — MobileBookingBar Component
   Sticky bottom bar on mobile showing current fare and quick CTA.
   Hidden on md: and up.
   ============================================================ */

interface MobileBookingBarProps {
  /** Starting price (e.g. $499) */
  price: number;
  /** Optional booking URL; if omitted, the button is disabled */
  bookingUrl?: string;
  /** Label for the CTA button (e.g. "Book Now", "View Deal") */
  bookingLabel?: string;
}

/**
 * Fixed-bottom bar that appears on mobile viewports.
 *   - Shows the current price (large, prominent)
 *   - Optional note about taxes/fees included
 *   - Primary CTA button (Book Deal) that links to the sailing's booking URL
 *   - Secondary action (e.g., Track Price) could be added but we keep it simple.
 *
 * The bar is absolutely positioned at the bottom, so we add bottom padding
 * to the page container to avoid content being hidden underneath.
 */
export default function MobileBookingBar({
  price,
  bookingUrl,
  bookingLabel = 'Book Deal',
}: MobileBookingBarProps) {
  const formattedPrice = Math.round(price).toLocaleString();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-md border-t border-black/[0.08] shadow-lg md:hidden"
    >
      {/* Left side: price + note */}
      <div className="flex-1 space-y-1 text-sm">
        <div className="font-mono-tab text-2xl font-black tracking-tight">
          ${formattedPrice}
        </div>
        <p className="text-xs text-ink-soft">
          per person, taxes & fees included
        </p>
      </div>

      {/* Right side: CTA button */}
      {bookingUrl ? (
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 rounded-full bg-indigo px-5 py-2 text-xs font-semibold text-white shadow-[0_2px_4px_-1px_rgba(42,68,231,0.3)] hover:bg-indigo-dark active:scale-[0.98] transition-colors"
        >
          {bookingLabel}
        </a>
      ) : (
        <button
          disabled
          className="flex-shrink-0 rounded-full bg-gray-300 px-5 py-2 text-xs font-semibold text-gray-600 cursor-not-allowed"
        >
          {bookingLabel}
        </button>
      )}
    </div>
  );
}