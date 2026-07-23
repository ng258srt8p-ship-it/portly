export interface Fingerprint {
  cruiseLine: string;
  sailDate: string;
  ship: string;
  departurePort: string;
  nights: number;
}

export function makeFingerprint(s: Fingerprint): string {
  return `${s.cruiseLine.toLowerCase().replace(/\s+/g, '-')}|${s.sailDate}|${s.ship.toLowerCase().replace(/\s+/g, '-')}|${s.departurePort.toLowerCase().replace(/\s+/g, '-')}|${s.nights}`;
}

export function fingerprintFromId(id: string): Fingerprint | null {
  const parts = id.split('_');
  if (parts.length < 5) return null;
  return {
    cruiseLine: parts[0],
    sailDate: parts[1],
    ship: parts[2],
    departurePort: parts[3],
    nights: parseInt(parts[4], 10),
  };
}

export interface DedupResult {
  action: 'insert' | 'update' | 'skip';
  reason?: string;
}

/**
 * Deduplication decision engine.
 * - If fingerprint not in DB → insert
 * - If fingerprint exists with same price → skip (no change)
 * - If fingerprint exists with different price → update price + add to history
 */
export function decideDedup(
  existingSailing: { price?: number; fingerprint: string } | null,
  newPrice: number,
): DedupResult {
  if (!existingSailing) {
    return { action: 'insert' };
  }
  if (existingSailing.price === newPrice) {
    return { action: 'skip', reason: 'price unchanged' };
  }
  return { action: 'update', reason: `price changed: ${existingSailing.price} → ${newPrice}` };
}
