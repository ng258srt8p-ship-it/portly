/**
 * Sailing detail API contract regression.
 *
 * Catches the exact class of bug fixed in Cycle #25:
 *   - GET /api/sailing/:id returned `sailing.id: 0` (numeric coercion of string PK)
 *   - `sailing.port` was raw `departure_port` text ("lisbon") instead of itinerary[0] ("Miami")
 *   - `sailing.route` was synthetic 3-element array ["lisbon", "Eastern Caribbean", "lisbon"]
 *     instead of the real 5+ port itinerary from the `itinerary` JSON column
 *
 * These fields are consumed by SailingDetailClient (SailingHero, ItineraryTimeline, SailingSubNav).
 * Run against live Cloudflare deployment by default.
 */
import { test, expect } from '@playwright/test';

const API = process.env.API_BASE || 'https://portly-api.vqh9mnrdbp.workers.dev/api';
const SAILING_IDS = [
  'carnival_horizon_2026-03-08_miami_6__big_31__v4m',   // was broken: id=0, port=lisbon, 3-element route
  'carnival_mardi-gras_2026-01-15_galveston_7',          // Galveston departure
  'princess_regal_2026-01-20_fort-lauderdale_7',         // Fort Lauderdale departure
];

test.describe('GET /api/sailing/:id — contract regression', () => {
  for (const id of SAILING_IDS) {
    test(`${id} returns correct id, port, and multi-port route`, async ({ request }) => {
      const resp = await request.get(`${API}/sailing/${id}`);
      expect(resp.status()).toBe(200);

      const data = await resp.json();
      const s = data.sailing;

      // 1. id MUST be the string PK, not 0 or Number()
      expect(typeof s.id).toBe('string');
      expect(s.id).toBe(id);
      expect(s.id).not.toBe(0);

      // 2. port MUST be a real port name (first itinerary port), not garbage
      expect(typeof s.port).toBe('string');
      expect(s.port.length).toBeGreaterThan(0);
      expect(s.port.toLowerCase()).not.toBe('lisbon'); // the specific garbage value we had

      // 3. route MUST be array length >= 3 (departure + at least one call + return)
      expect(Array.isArray(s.route)).toBe(true);
      expect(s.route.length).toBeGreaterThanOrEqual(3);

      // 4. route[0] should equal port (departure port)
      expect(s.route[0]).toBe(s.port);

      // 5. route should end with the departure port (round-trip)
      expect(s.route[s.route.length - 1]).toBe(s.port);
    });
  }

  test('route includes real intermediate ports (not just 3-element synthetic)', async ({ request }) => {
    // This sailing has a 5-port itinerary: Miami → Amber Cove → Grand Turk → Half Moon Cay → Miami
    const resp = await request.get(`${API}/sailing/carnival_horizon_2026-03-08_miami_6__big_31__v4m`);
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    const route = data.sailing.route;

    // Should contain the actual intermediate ports
    expect(route).toContain('Amber Cove');
    expect(route).toContain('Grand Turk');
    expect(route).toContain('Half Moon Cay');
    expect(route.length).toBe(5);
  });
});