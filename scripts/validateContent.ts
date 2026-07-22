/**
 * Quick validation script — validates that generated content structure is correct.
 * Uses heuristic-only (no AI calls) to avoid timeouts.
 * Tests:
 * 1. All sailings get non-empty deal analysis (score, justification, pricingDeepDive)
 * 2. Cabin value breakdown has 4 cabin types
 * 3. Hidden costs have real numbers
 * 4. InsiderTips are non-empty
 */

import { generateHeuristicEnhancedDeal } from '../server/services/enhancedAnalytics';

interface SailingContext {
  sailingId: number;
  durationDays: number;
  destinationRegion: string;
  cruiseLine: string;
  shipName: string;
  departurePort: string;
  departureDate: string;
  itinerary: string[];
  currentPricing: Record<string, number>;
  priceHistory: any[];
}

function main() {
  const contexts: SailingContext[] = [
    { cruiseLine: 'Royal Caribbean', shipName: 'Icon of the Seas', durationDays: 7, destinationRegion: 'Caribbean', departurePort: 'Miami, FL', departureDate: '2026-06-15', itinerary: ['Miami', 'CocoCay', 'Nassau'], currentPricing: { Inside: 1100, Oceanview: 1350, Balcony: 1800, Suite: 3000 }, sailingId: 2, priceHistory: [] },
    { cruiseLine: 'Princess', shipName: 'Regal Princess', durationDays: 7, destinationRegion: 'Caribbean', departurePort: 'Fort Lauderdale, FL', departureDate: '2026-07-15', itinerary: ['Fort Lauderdale', 'Cozumel'], currentPricing: { Inside: 900, Oceanview: 1200, Balcony: 1600, Suite: 2800 }, sailingId: 3, priceHistory: [] },
    { cruiseLine: 'Norwegian', shipName: 'Norwegian Encore', durationDays: 7, destinationRegion: 'Caribbean', departurePort: 'Port Canaveral, FL', departureDate: '2026-08-15', itinerary: ['Port Canaveral', 'St. Thomas'], currentPricing: { Inside: 850, Oceanview: 1150, Balcony: 1550, Suite: 2600 }, sailingId: 4, priceHistory: [] },
    { cruiseLine: 'Celebrity', shipName: 'Celebrity Ascent', durationDays: 7, destinationRegion: 'Caribbean', departurePort: 'Fort Lauderdale, FL', departureDate: '2026-05-15', itinerary: ['Fort Lauderdale', 'Labadee'], currentPricing: { Inside: 950, Oceanview: 1250, Balcony: 1700, Suite: 2900 }, sailingId: 5, priceHistory: [] },
    { cruiseLine: 'Carnival', shipName: 'Carnival Celebration', durationDays: 7, destinationRegion: 'Caribbean', departurePort: 'Port Canaveral, FL', departureDate: '2026-09-15', itinerary: ['Port Canaveral', 'Ocean Cay'], currentPricing: { Inside: 800, Oceanview: 1050, Balcony: 1400, Suite: 2400 }, sailingId: 6, priceHistory: [] },
    { cruiseLine: 'Holland America', shipName: 'Pinnacle Grand', durationDays: 7, destinationRegion: 'Caribbean', departurePort: 'Miami, FL', departureDate: '2026-10-15', itinerary: ['Miami', 'Great Stirrup Cay'], currentPricing: { Inside: 880, Oceanview: 1180, Balcony: 1550, Suite: 2700 }, sailingId: 7, priceHistory: [] },
    { cruiseLine: 'MSC', shipName: 'MSC Seascape', durationDays: 7, destinationRegion: 'Caribbean', departurePort: 'Miami, FL', departureDate: '2026-04-15', itinerary: ['Miami', 'Oranjestad'], currentPricing: { Inside: 750, Oceanview: 1000, Balcony: 1350, Suite: 2200 }, sailingId: 8, priceHistory: [] },
    { cruiseLine: 'Disney', shipName: 'Disney Wish', durationDays: 7, destinationRegion: 'Caribbean', departurePort: 'Port Canaveral, FL', departureDate: '2026-11-15', itinerary: ['Port Canaveral', 'Perfectly Pirate'], currentPricing: { Inside: 1200, Oceanview: 1500, Balcony: 2000, Suite: 3500 }, sailingId: 8, priceHistory: [] },
  ];

  let total = 0;
  let pass = 0;

  for (const ctx of contexts) {
    const result = generateHeuristicEnhancedDeal({ ...ctx, sailingId: 0, shipDetails: {}, destinationInsight: {}, marketComparison: {} });
    total++;

    const checks = {
      dealScore: typeof result.dealScore === 'number' && result.dealScore >= 0 && result.dealScore <= 100,
      justification: result.justification && result.justification.length > 0,
      pricingDeepDive: result.pricingDeepDive && result.pricingDeepDive.length > 20,
      priceTrend: ['rising', 'falling', 'stable'].includes(result.priceTrend),
      insiderTips: result.insiderTips && result.insiderTips.length > 0,
      verdict: result.verdict && result.verdict.length > 5,
      cabinCount: result.cabinValueBreakdown ? Object.keys(result.cabinValueBreakdown).length === 4 : false,
      hiddenCosts: result.hiddenCosts && (result.hiddenCosts.mandatoryGratuities || 0) > 0 && (result.hiddenCosts.realTotalCost || 0) > 0,
    };

    const allPass = Object.values(checks).every(Boolean);

    console.log(`[${allPass ? 'PASS' : 'FAIL'}] ${ctx.cruiseLine} ${ctx.shipName} (score=${result.dealScore})`);
    for (const [k, v] of Object.entries(checks)) {
      console.log(`  - ${k}: ${v ? 'OK' : 'MISSING'}`);
    }

    if (allPass) pass++;
  }

  console.log(`\n${pass}/${total} sailings passed all checks`);
  process.exit(pass >= total ? 0 : 1);
}

main();
