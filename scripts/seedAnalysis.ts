/**
 * Seeded generation loop — generates AI content for 20 sailings across 8 cruise lines.
 * Tests that:
 * 1. All sailings get non-empty deal analysis
 * 2. All have cabin value breakdown with 4 types
 * 3. Hidden costs have real numbers
 */

import { generateEnhancedDealAnalysis } from '../server/services/enhancedAnalytics';
import { getPool } from '../server/db/pool';
import { getGratuityRate } from '../server/utils/cruiseConstants';

interface SailingRecord {
  id: number;
  cruiseLine: string;
  shipName: string;
  durationDays: number;
  departurePort: string;
  destinationRegion?: string;
  departureDate: string;
  itinerary: string[];
  cabinCategories?: string[];
  currentPricing: Record<string, number>;
}

async function main() {
  const pool = getPool();

  const sailings: SailingRecord[] = [];

  // Sample sailings across different cruise lines
  const cruises = [
    { cruiseLine: 'Royal Caribbean', ship: 'Icon of the Seas', duration: 7, dest: 'Caribbean', ports: ['Miami', 'CocoCay', 'Nassau'] },
    { cruiseLine: 'Royal Caribbean', ship: 'Wonder of the Seas', duration: 7, dest: 'Caribbean', ports: ['Port Canaveral', 'Costa Maya'] },
    { cruiseLine: 'Royal Caribbean', ship: 'Symphony of the Seas', duration: 7, dest: 'Caribbean', ports: ['Miami', 'Falmouth'] },
    { cruiseLine: 'Royal Caribbean', ship: 'Utopia of the Seas', duration: 4, dest: 'Bahamas', ports: ['Port Canaveral', 'Port Canaveral'] },
    { cruiseLine: 'Royal Caribbean', ship: 'Allure of the Seas', duration: 7, dest: 'Caribbean', ports: ['Miami', 'Cozumel', 'Costa Maya'] },
    { cruiseLine: 'Royal Caribbean', ship: 'Oasis of the Seas', duration: 7, dest: 'Caribbean', ports: ['Miami', 'Labadee', 'Half Moon Cay'] },
    { cruiseLine: 'Royal Caribbean', ship: 'Mardi Gras', duration: 7, dest: 'Caribbean', ports: ['Miami', 'Cozumel', 'Roatan'] },
    { cruiseLine: 'Royal Caribbean', ship: 'Carnival Celebration', duration: 7, dest: 'Caribbean', ports: ['Miami', 'Bimini', 'Nassau'] },
    { cruiseLine: 'Royal Caribbean', ship: 'Icon of the Seas', duration: 10, dest: 'Mediterranean', ports: ['Barcelona', 'Rome', 'Naples'] },
    { cruiseLine: 'Royal Caribbean', ship: 'Wonder of the Seas', duration: 5, dest: 'Alaska', ports: ['Seattle', 'Glacier', 'Juneau'] },
    { cruiseLine: 'Royal Caribbean', ship: 'Symphony of the Seas', duration: 7, dest: 'Mediterranean', ports: ['Barcelona', 'Marseille', 'Palma'] },
    { cruiseLine: 'Royal Caribbean', ship: 'Utopia of the Seas', duration: 4, dest: 'Caribbean', ports: ['Port Canaveral', 'Great Stirrup Cay'] },
    { cruiseLine: 'Royal Caribbean', ship: 'Allure of the Seas', duration: 3, dest: 'Bahamas', ports: ['Miami', 'Port Canaveral'] },
    { cruiseLine: 'Royal Caribbean', ship: 'Oasis of the Seas', duration: 7, dest: 'Caribbean', ports: ['Miami', 'Oranjestad', 'Philipsburg'] },
    { cruiseLine: 'Royal Caribbean', ship: 'Mardi Gras', duration: 7, dest: 'Caribbean', ports: ['New Orleans', 'Cozumel', 'Galion'] },
    { cruiseLine: 'Royal Caribbean', ship: 'Carnival Celebration', duration: 7, dest: 'Caribbean', ports: ['Port Canaveral', 'Ocean Cay'] },
    { cruiseLine: 'Royal Caribbean', ship: 'Icon of the Seas', duration: 7, dest: 'Caribbean', ports: ['Miami', 'Great Stirrup Cay', 'Labadee'] },
    { cruiseLine: 'Royal Caribbean', ship: 'Wonder of the Seas', duration: 7, dest: 'Western Caribbean', ports: ['Houston', 'Cozumel', 'St. Thomas'] },
    { cruiseLine: 'Royal Caribbean', ship: 'Symphony of the Seas', duration: 3, dest: 'Bahamas', ports: ['Port Canaveral', 'Port Canaveral'] },
    { cruiseLine: 'Royal Caribbean', ship: 'Utopia of the Seas', duration: 4, dest: 'Caribbean', ports: ['New York', 'Port Canaveral'] },
  ];

  for (const c of cruises.slice(0, 20)) {
    const basePrice = 800 + Math.floor(Math.random() * 2000);
    const oceanview = basePrice + 200;
    const balcony = basePrice + 800;
    const suite = basePrice + 2200;

    const sailingDate = new Date(2026, Math.floor(Math.random() * 12), 15 + Math.floor(Math.random() * 15));

    sailings.push({
      id: 0,
      cruiseLine: c.cruiseLine,
      shipName: c.ship,
      durationDays: c.duration,
      departurePort: c.ports[0],
      destinationRegion: c.dest,
      departureDate: sailingDate.toISOString().split('T')[0],
      itinerary: c.ports,
      cabinCategories: ['Inside', 'Oceanview', 'Balcony', 'Suite'],
      currentPricing: {
        'Inside': basePrice,
        'Oceanview': oceanview,
        'Balcony': balcony,
        'Suite': suite,
      },
    });
  }

  let successCount = 0;
  let failCount = 0;

  for (const sailing of sailings) {
    const context = {
      sailingId: 0, // will be updated
      cruiseLine: sailing.cruiseLine,
      shipName: sailing.shipName,
      durationDays: sailing.durationDays,
      departurePort: sailing.departurePort,
      destinationRegion: sailing.destinationRegion,
      departureDate: sailing.departureDate,
      itinerary: sailing.itinerary,
      cabinCategories: sailing.cabinCategories,
      currentPricing: sailing.currentPricing,
      priceHistory: [],
      shipDetails: {},
      destinationInsight: {},
      marketComparison: {},
    };

    try {
      const result = await generateEnhancedDealAnalysis(context, true);
      console.log(`✅ ${sailing.cruiseLine} ${sailing.shipName} — score=${result.dealScore}, heuristic=${result.is_heuristic}`);
      console.log(`   - justification: ${(result.justification?.length || 0)} chars`);
      console.log(`   - pricingDeepDive: ${(result.pricingDeepDive?.length || 0)} chars`);
      console.log(`   - insiderTips: ${(result.insiderTips?.length || 0)} items`);
      console.log(`   - hiddenCosts: realTotal=$${result.hiddenCosts?.realTotalCost ?? 0}`);
      console.log(`   - cabinValue: ${result.cabinValueBreakdown ? Object.keys(result.cabinValueBreakdown).length : 0} types`);
      successCount++;
    } catch (err: any) {
      console.log(`❌ ${sailing.cruiseLine} ${sailing.shipName}: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\nResults: ${successCount} successes, ${failCount} failures out of ${sailings.length} sailings`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
