/**
 * Test script for real scrapers - validates against 3 working URLs
 */

import { REAL_SCRAPERS } from './real-scrapers';

async function testScrapers() {
  console.log('Testing real scrapers against working URLs...\n');

  // Test first 3 scrapers only (Carnival, Royal Caribbean, NCL)
  const testScrapers = REAL_SCRAPERS.slice(0, 3);

  for (const scraper of testScrapers) {
    console.log(`\n[${scraper.constructor.name}]`);
    try {
      const sailings = await scraper.fetchSailings();
      console.log(`  ✓ Found ${sailings.length} sailings`);
      
      if (sailings.length > 0) {
        console.log(`  Sample: ${sailings[0].ship} - $${sailings[0].price} (${sailings[0].sailDate})`);
      }
    } catch (err) {
      console.log(`  ✗ Error: ${(err as Error).message}`);
    }
  }

  console.log('\nTest complete.');
}

testScrapers().catch(console.error);
