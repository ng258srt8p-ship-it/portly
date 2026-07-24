/**
 * Booking link utilities — construct and enhance cruise line booking URLs.
 *
 * getBookingUrl(line, ship, sailDate, port):
 *   Returns a deep link to the cruise line's booking page for a specific sailing.
 *   Falls back to the line's general booking page if no deep link is available.
 *
 * withAffiliateId(url, affiliateId?):
 *   Appends an affiliate/referral parameter to a booking URL.
 *   Uses ?affid= or &affid= depending on existing query string.
 */

const LINE_BOOKING_BASES: Record<string, string> = {
  'Carnival': 'https://www.carnival.com/bookedguest',
  'Princess': 'https://www.princess.com/find-cruise-search',
  'Holland America': 'https://www.hollandamerica.com/find-cruise-search',
  'Cunard': 'https://www.cunard.com/en-gb/find-a-cruise',
  'Royal Caribbean': 'https://www.royalcaribbean.com/cruises',
  'Norwegian': 'https://www.ncl.com/cruise-search',
  'MSC': 'https://www.msccruises.com/en-us/Search-Cruises',
  'Disney': 'https://disneycruise.disney.go.com/find-a-voyage',
  'Celebrity': 'https://www.celebritycruises.com/find-cruises',
};

/**
 * Get a booking URL for a specific sailing.
 * If the sailing already has a bookingUrl from the scraper, use it directly.
 * Otherwise, construct one from the line's booking base URL + query params.
 */
export function getBookingUrl(
  line: string,
  ship: string,
  sailDate?: string,
  port?: string,
): string {
  const base = LINE_BOOKING_BASES[line] || LINE_BOOKING_BASES['Carnival'];
  const params = new URLSearchParams();
  if (ship) params.set('ship', ship);
  if (sailDate) params.set('date', sailDate);
  if (port) params.set('port', port);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Append an affiliate ID to a booking URL.
 * If no affiliate ID is provided, returns the URL unchanged.
 */
export function withAffiliateId(url: string, affiliateId?: string): string {
  if (!affiliateId) return url;
  const urlObj = new URL(url);
  urlObj.searchParams.set('affid', affiliateId);
  return urlObj.toString();
}
