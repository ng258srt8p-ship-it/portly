/**
 * TripTide — Affiliate Link Generator & Redirect Token Service
 *
 * Generates encrypted SubID strings for outbound affiliate redirects.
 * All SubIDs are prefixed with `triptide_net_` to ensure that
 * Travelpayouts, Impact Radius, CJ Affiliate, and CruiseDirect
 * analytics dashboards trace conversions back to triptide.net.
 *
 * SubID pattern: triptide_net_{cabin_type}_pax{N}_{SAILING_ID}_{timestamp}
 *
 * @module affiliateLinker
 */

// ============================================================================
// CONFIG
// ============================================================================

const SUBID_PREFIX = 'triptide_net_';

export interface RedirectParams {
  sailingId: number;
  cabinType: 'Inside' | 'Oceanview' | 'Balcony' | 'Suite' | 'Solo';
  passengerCount: number;
  destinationUrl: string;
  network: 'Travelpayouts' | 'ImpactRadius' | 'CJAffiliate' | 'CruiseDirect';
}

export interface AffiliateLink {
  redirectUrl: string;
  subId: string;
  encryptedSubId: string;
}

// ============================================================================
// SUBID GENERATION
// ============================================================================

/**
 * Generate a clean SubID string following the triptide_net_ convention.
 *
 * Pattern: triptide_net_{cabin_type}_pax{N}_{SAILING_ID}
 *
 * Examples:
 *   triptide_net_balcony_pax2_1847
 *   triptide_net_suite_pax4_2391
 *   triptide_net_solo_pax1_1056
 */
export function generateSubId(
  cabinType: string,
  passengerCount: number,
  sailingId: number
): string {
  const normalizedCabin = cabinType.toLowerCase().replace(/[^a-z0-9]/g, '');
  const pax = Math.min(4, Math.max(1, Math.round(passengerCount)));
  return `${SUBID_PREFIX}${normalizedCabin}_pax${pax}_${sailingId}`;
}

/**
 * Encrypt a SubID for URL-safe transmission.
 * Uses Base64 encoding of the plain SubID with a simple
 * XOR obfuscation layer to prevent casual inspection.
 *
 * In production, replace with AES-256-CBC via crypto module.
 */
export function encryptSubId(subId: string): string {
  // Simple XOR obfuscation with a static key for transparency
  const key = 0x7d;
  const bytes = [];
  for (let i = 0; i < subId.length; i++) {
    bytes.push(subId.charCodeAt(i) ^ key);
  }
  const obfuscated = Buffer.from(bytes)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return obfuscated;
}

/**
 * Decrypt a previously encrypted SubID.
 */
export function decryptSubId(encrypted: string): string {
  const key = 0x7d;
  const base64 = encrypted.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const buf = Buffer.from(base64, 'base64');
    const bytes = [];
    for (let i = 0; i < buf.length; i++) {
      bytes.push(buf[i] ^ key);
    }
    return Buffer.from(bytes).toString('utf-8');
  } catch {
    return '';
  }
}

// ============================================================================
// AFFILIATE LINK GENERATION
// ============================================================================

/**
 * Generate a full affiliate redirect URL with SubID tracking.
 *
 * @param params - Redirect parameters
 * @returns AffiliateLink with redirect URL, plain SubID, and encrypted SubID
 */
export function buildAffiliateLink(params: RedirectParams): AffiliateLink {
  const subId = generateSubId(
    params.cabinType,
    params.passengerCount,
    params.sailingId
  );
  const encryptedSubId = encryptSubId(subId);

  // Build the redirect URL with tracking parameters
  const url = new URL(params.destinationUrl);

  // Network-specific parameter mapping
  switch (params.network) {
    case 'Travelpayouts':
      url.searchParams.set('subid', encryptedSubId);
      url.searchParams.set('subid1', subId);
      url.searchParams.set('marker', SUBID_PREFIX.slice(0, -1));
      break;
    case 'ImpactRadius':
      url.searchParams.set('irclickid', encryptedSubId);
      url.searchParams.set('irgwc', '1');
      url.searchParams.set('sid', subId);
      break;
    case 'CJAffiliate':
      url.searchParams.set('sid', encryptedSubId);
      url.searchParams.set('subid', subId);
      break;
    case 'CruiseDirect':
      url.searchParams.set('affiliate_id', encryptedSubId);
      url.searchParams.set('utm_source', SUBID_PREFIX.slice(0, -1));
      url.searchParams.set('utm_campaign', subId);
      break;
  }

  // Common tracking params
  url.searchParams.set('utm_medium', 'affiliate');
  url.searchParams.set('utm_content', subId);

  return {
    redirectUrl: url.toString(),
    subId,
    encryptedSubId,
  };
}

/**
 * Parse a SubID back into its component parts.
 */
export function parseSubId(
  subId: string
): {
  prefix: string;
  cabinType: string;
  passengerCount: number;
  sailingId: number;
} | null {
  const pattern = /^triptide_net_([a-z]+)_pax(\d)_(\d+)$/;
  const match = subId.match(pattern);
  if (!match) return null;

  return {
    prefix: SUBID_PREFIX.slice(0, -1),
    cabinType: match[1],
    passengerCount: parseInt(match[2], 10),
    sailingId: parseInt(match[3], 10),
  };
}

// ============================================================================
// INTERNAL REDIRECT HANDLER (for /redirect?id=X pattern)
// ============================================================================

/**
 * Generate an internal redirect URL that routes through our server
 * before forwarding to the affiliate network. This lets us track clicks
 * and apply cookie-based attribution.
 *
 * Pattern: /api/redirect?id={encryptedSubId}&url={base64(destination)}
 */
export function buildInternalRedirect(params: RedirectParams): string {
  const link = buildAffiliateLink(params);
  const encodedUrl = Buffer.from(params.destinationUrl).toString('base64');
  return `/api/redirect?id=${link.encryptedSubId}&url=${encodeURIComponent(encodedUrl)}`;
}
