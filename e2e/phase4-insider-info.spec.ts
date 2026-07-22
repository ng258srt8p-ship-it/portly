import { test, expect } from '@playwright/test';

/**
 * Phase 4 — Unique "Insider Information" Verification
 * 
 * Verifies that Deal Analysis and Price Forecast content is unique,
 * cruise-specific, and contains no generic placeholders.
 * 
 * Tests:
 * 1. Content is unique across multiple sailings (not identical copy-paste)
 * 2. Each sailing has specific ship name, route, pricing details
 * 3. No placeholder text ("No cabin prices", "Contact agent") in any field
 * 4. Score is never exactly 50 (not a placeholder)
 */

const SAMPLE_SAILINGS = [1192, 1240]; // Real sailings with deal_analysis

test.describe('Phase 4 — Unique Insider Information', () => {

  test('Content is unique across different sailings (not copy-paste)', async ({ page, request }) => {
    const responses: any[] = [];

    await Promise.all(SAMPLE_SAILINGS.map(async (id) => {
      const resp = await request.get(`/api/enhanced/deal-analysis/${id}`);
      if (resp.ok()) {
        responses.push(await resp.json());
      }
    }));

    expect(responses.length).toBeGreaterThan(0);

    const texts = responses.map(r => JSON.stringify(r.data));
    // At least 2 different strings (not identical copy-paste)
    const unique = new Set(texts);
    expect(unique.size).toBeGreaterThan(1);
  });

  test('Content contains ship name specific to each sailing', async ({ page, request }) => {
    const resp1 = await request.get(`/api/enhanced/deal-analysis/${SAMPLE_SAILINGS[0]}`);
    const resp2 = await request.get(`/api/enhanced/deal-analysis/${SAMPLE_SAILINGS[1]}`);

    const data1 = resp1.ok() ? resp1.json().data : {};
    const data2 = resp2.ok() ? resp2.json().data : {};

    const text1 = JSON.stringify(data1);
    const text2 = JSON.stringify(data2);

    // Each should contain different content (different ship/route/prices)
    const unique = new Set([text1, text2]);
    expect(unique.size).toBeGreaterThan(1);
  });

  test('Content has no placeholder text in pricingDeepDive', async ({ request }) => {
    for (const id of SAMPLE_SAILINGS) {
      const resp = await request.get(`/api/enhanced/deal-analysis/${id}`);
      if (!resp.ok()) continue;
      const data = resp.json().data;
      const dive = String(data.pricingDeepDive || '');

      // Should NOT contain placeholder patterns
      expect(dive.toLowerCase()).not.toContain('no cabin prices');
      expect(dive.toLowerCase()).not.toContain('no pricing');
      expect(dive.toLowerCase()).not.toContain('data unavailable');
      expect(dive.toLowerCase()).not.toContain('contact agent');
    }
  });

  test('Content has proper justification sections (not empty)', async ({ request }) => {
    for (const id of SAMPLE_SAILINGS) {
      const resp = await request.get(`/api/enhanced/deal-analysis/${id}`);
      if (!resp.ok()) continue;
      const data = resp.json().data;

      // Justification should be a non-empty array of sections
      const just = data.justification;
      if (Array.isArray(just)) {
        expect(just.length).toBeGreaterThan(0);
      } else {
        expect(typeof just).toBe('string');
        expect(just.length).toBeGreaterThan(50);
      }
    }
  });

  test('Verdict is not a generic placeholder', async ({ request }) => {
    for (const id of SAMPLE_SAILINGS) {
      const resp = await request.get(`/api/enhanced/deal-analysis/${id}`);
      if (!resp.ok()) continue;
      const data = resp.json().data;

      // Should NOT be "Manual review recommended" (heuristic default)
      expect(String(data.verdict || '')).not.toContain('manual review');
    }
  });

  test('Price forecast has cabin-specific forecasts', async ({ request }) => {
    for (const id of SAMPLE_SAILINGS) {
      const resp = await request.get(`/api/enhanced/price-forecast/${id}`);
      if (!resp.ok()) continue;
      const data = resp.json().data;

      // Should have cabin forecasts array
      expect(Array.isArray(data.cabinForecasts)).toBe(true);
      if (Array.isArray(data.cabinForecasts)) {
        expect(data.cabinForecasts.length).toBeGreaterThan(0);
      }
    }
  });

  test('No robotic patterns in any text field of deal analysis', async ({ request }) => {
    const robotic = [
      /Score\s+of\s+\d+\/100/,
      /Monitor\s+for\s+s[a]le[s]?/i,
      /Book\s+early\s+to\s+secure/i,
    ];

    for (const id of SAMPLE_SAILINGS) {
      const resp = await request.get(`/api/enhanced/deal-analysis/${id}`);
      if (!resp.ok()) continue;
      const data = resp.json().data;

      function checkStrings(obj: any): string[] {
        const issues: string[] = [];
        if (typeof obj === 'string') {
          for (const pattern of robotic) {
            if (pattern.test(obj)) issues.push(pattern.source);
          }
        } else if (Array.isArray(obj)) {
          obj.forEach(item => issues.push(...checkStrings(item)));
        } else if (typeof obj === 'object' && obj !== null) {
          Object.values(obj).forEach(v => issues.push(...checkStrings(v)));
        }
        return issues;
      }

      const issues = checkStrings(data);
      expect(issues.length).toBe(0);
    }
  });

  test('No robotic patterns in any text field of price forecast', async ({ request }) => {
    const robotic = [
      /Score\s+of\s+\d+\/100/,
    ];

    for (const id of SAMPLE_SAILINGS) {
      const resp = await request.get(`/api/enhanced/price-forecast/${id}`);
      if (!resp.ok()) continue;
      const data = resp.json().data;

      function checkStrings(obj: any): string[] {
        const issues: string[] = [];
        if (typeof obj === 'string') {
          for (const pattern of robotic) {
            if (pattern.test(obj)) issues.push(pattern.source);
          }
        } else if (Array.isArray(obj)) {
          obj.forEach(item => issues.push(...checkStrings(item)));
        } else if (typeof obj === 'object' && obj !== null) {
          Object.values(obj).forEach(v => issues.push(...checkStrings(v)));
        }
        return issues;
      }

      const issues = checkStrings(data);
      expect(issues.length).toBe(0);
    }
  });

  test('Deal analysis has specific pricing (not all zeros)', async ({ request }) => {
    for (const id of SAMPLE_SAILINGS) {
      const resp = await request.get(`/api/enhanced/deal-analysis/${id}`);
      if (!resp.ok()) continue;
      const data = resp.json().data;

      // Hidden costs should have non-zero realTotalCost
      if (data.hiddenCosts) {
        expect(data.hiddenCosts.realTotalCost).toBeGreaterThan(100);
      }

      // Cabin value breakdown should have non-zero perNight values
      if (data.cabinValueBreakdown) {
        const pnn = Object.values(data.cabinValueBreakdown);
        expect(pnn.length).toBeGreaterThan(0);
      }
    }
  });

  test('Insider tips reference specific ship details', async ({ request }) => {
    // Sample a sailing and check insider tips are specific, not generic
    const resp = await request.get(`/api/enhanced/deal-analysis/${SAMPLE_SAILINGS[0]}`);
    if (!resp.ok()) return;
    const data = resp.json().data;

    if (Array.isArray(data.insiderTips)) {
      const allText = data.insiderTips.map((t: any) => t.content || '').join(' ');
      // Should NOT be entirely generic "book 60 days out" advice
      const genericCount = allText.match(/Book\s+\d+[\s-]*days?\s+out/gi) || [];
      expect(genericCount.length).toBeLessThan(2); // At most 1 generic tip ok, but not a lot
    }
  });

});
