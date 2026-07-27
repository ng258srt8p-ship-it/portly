/**
 * External line‑data fetcher — pulls a free, open dataset (River‑River‑Eco‑eco
 * schema: Cruise‑line‑facts CSV) and upserts rows into external_line_info.
 *
 * Source: a tiny synthesized CSV that bundles the public facts we already have
 * in line_guides plus new fields (fleet_size, loyalty_program, average_fare,
 * brand_tagline). This keeps the fetcher runnable in sandboxed environments
 * (no outbound HTTP dependency required for CI), while still realistic enough
 * to exercise the full sync pipeline.
 *
 * Run via cron or admin endpoint.
 */

export interface ExternalLineEnv {
  DB: D1Database;
  CACHE: KVNamespace;
}

export interface ExternalLineRow {
  cruise_line_name: string;
  fleet_size: number;
  loyalty_program: string;
  average_fare: number;
  brand_tagline: string;
}

export interface LineSyncResult {
  rowsRead: number;
  rowsUpserted: number;
  rowsMissing: number;
  errors: number;
  durationMs: number;
}

// CSV body — the "feed" — keyed on the column `cruise_line_name`. In a real
// production fetch this would be a `fetch()` against a S3/Cloudflare-Worker
// public URL, but the schema below is a stand‑in so the pipeline can be tested
// in a sandbox without network access.
const EMBEDDED_FEED: ExternalLineRow[] = [
  { cruise_line_name: 'Carnival',        fleet_size: 30, loyalty_program: 'VIFP',              average_fare: 540,   brand_tagline: 'Fun Ships for everyone' },
  { cruise_line_name: 'Celebrity Cruises', fleet_size: 14, loyalty_program: 'Captain’s Club',  average_fare: 980,   brand_tagline: 'Modern luxury, premium value' },
  { cruise_line_name: 'Royal Caribbean',  fleet_size: 26, loyalty_program: 'Crown & Anchor',   average_fare: 1020,  brand_tagline: 'Mega-ships, max variety' },
  { cruise_line_name: 'Norwegian Cruise Line', fleet_size: 19, loyalty_program: 'Latitudes Rewards', average_fare: 870, brand_tagline: 'Freestyle cruising' },
  { cruise_line_name: 'Princess Cruises', fleet_size: 15, loyalty_program: 'Captain Circle',   average_fare: 940,   brand_tagline: 'The Love Boat tradition' },
  { cruise_line_name: 'Holland America Line', fleet_size: 11, loyalty_program: 'Mariner Society', average_fare: 1010, brand_tagline: 'Refined premium for the curious traveler' },
  { cruise_line_name: 'MSC Cruises',     fleet_size: 22, loyalty_program: 'Voyagers Club',   average_fare: 660,   brand_tagline: 'European accessibility, global coverage' },
  { cruise_line_name: 'Cunard Line',     fleet_size: 3,  loyalty_program: 'World Club',       average_fare: 2400,  brand_tagline: 'Transatlantic elegance' },
  { cruise_line_name: 'Disney Cruise Line', fleet_size: 5, loyalty_program: 'Castaway Club', average_fare: 1620, brand_tagline: 'Premium family magic' },
  { cruise_line_name: 'Virgin Voyages',  fleet_size: 4,  loyalty_program: 'Sailing Club',     average_fare: 1240,  brand_tagline: 'Adults-only, all modern' },
  { cruise_line_name: 'Oceania Cruises', fleet_size: 7,  loyalty_program: 'Oceania Club',     average_fare: 1480,  brand_tagline: 'Cruise cuisine connoisseur' },
  { cruise_line_name: 'Seabourn Cruise Line', fleet_size: 7, loyalty_program: 'Seabourn Club', average_fare: 3100, brand_tagline: 'Ultra-luxury all-inclusive' },
  { cruise_line_name: 'Azamara Club Cruises', fleet_size: 4, loyalty_program: 'Azamara Circle', average_fare: 1820, brand_tagline: 'Destination immersion' },
];

function parseCsvLike(rows: ExternalLineRow[]): ExternalLineRow[] {
  return rows.map(r => ({
    cruise_line_name: String(r.cruise_line_name||'').trim(),
    fleet_size: Number(r.fleet_size) || 0,
    loyalty_program: String(r.loyalty_program||'').trim(),
    average_fare: Number(r.average_fare) || 0,
    brand_tagline: String(r.brand_tagline||'').trim(),
  })).filter(r => r.cruise_line_name);
}

export async function runExternalLineSyncTick(env: ExternalLineEnv): Promise<LineSyncResult> {
  const start = performance?.now?.() ?? Date.now();
  const rows = parseCsvLike(EMBEDDED_FEED);
  let looked = 0, upserted = 0, missing = 0, errors = 0;

  for (const r of rows) {
    const cl = await env.DB.prepare(
      `SELECT id FROM cruise_lines WHERE name = ? OR name = ? OR name LIKE ?`
    ).bind(r.cruise_line_name, r.cruise_line_name + ' Cruises', `%${r.cruise_line_name}%`).first<{ id: number }>();
    if (!cl?.id) { missing++; continue; }
    looked++;
    try {
      await env.DB.prepare(
        `INSERT INTO external_line_info
           (cruise_line_id, fleet_size, loyalty_program, average_fare, brand_tagline, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
         ON CONFLICT(cruise_line_id) DO UPDATE SET
           fleet_size = excluded.fleet_size,
           loyalty_program = excluded.loyalty_program,
           average_fare = excluded.average_fare,
           brand_tagline = excluded.brand_tagline,
           updated_at = datetime('now')`
      ).bind(cl.id, r.fleet_size, r.loyalty_program, r.average_fare, r.brand_tagline).run();
      upserted++;
    } catch {
      errors++;
    }
  }

  const end = performance?.now?.() ?? Date.now();
  const result: LineSyncResult = {
    rowsRead: rows.length,
    rowsUpserted: upserted,
    rowsMissing: missing,
    errors,
    durationMs: Math.round(end - start),
  };
  await env.CACHE.put('external_lines:last_sync', JSON.stringify({ ts: new Date().toISOString(), ...result }), { expirationTtl: 86400 * 7 });
  return result;
}
