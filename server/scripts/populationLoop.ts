/**
 * TripTide — Database Population Loop
 * 
 * Runs every 20 minutes to:
 * 1. Generate deterministic sailings (fallback)
 * 2. Attempt Jina scraping (primary, if available)
 * 3. Run OpenCode analytics on new data
 * 4. Log results
 */

import { runOpencodeSync } from '../services/opencodeGenerator';
import { runJinaSync } from '../services/jinaSync';
import { getPool } from '../db/pool';
import * as fs from 'fs';
import * as path from 'path';

const LOG_FILE = path.join(process.cwd(), 'logs', 'population_loop.log');

interface LoopResult {
  timestamp: string;
  deterministicCount: number;
  jinaCount: number;
  analyticsCount: number;
  totalSailingsInDB: number;
  errors: string[];
}

async function logResult(result: LoopResult) {
  const logLine = `[${result.timestamp}] Det: ${result.deterministicCount}, Jina: ${result.jinaCount}, Analytics: ${result.analyticsCount}, Total DB: ${result.totalSailingsInDB}\n`;
  
  // Append to log file
  fs.appendFileSync(LOG_FILE, logLine);
  
  // Also log to console
  console.log(logLine.trim());
  
  if (result.errors.length > 0) {
    console.error('Errors:', result.errors);
  }
}

async function getTotalSailings(): Promise<number> {
  const pool = getPool();
  const result = await pool.query('SELECT COUNT(*) FROM sailings');
  return parseInt(result.rows[0].count, 10);
}

export async function runPopulationLoop(): Promise<LoopResult> {
  const timestamp = new Date().toISOString();
  console.log(`\n🔄 Starting Population Loop Cycle (${timestamp})\n`);
  
  const result: LoopResult = {
    timestamp,
    deterministicCount: 0,
    jinaCount: 0,
    analyticsCount: 0,
    totalSailingsInDB: 0,
    errors: [],
  };
  
  try {
    // Step 1: Deterministic generation (always works)
    console.log('[1/3] Running deterministic generation...');
    try {
      const detCount = await runOpencodeSync();
      result.deterministicCount = detCount;
      console.log(`✅ Deterministic: ${detCount} sailings`);
    } catch (err: any) {
      console.error('❌ Deterministic failed:', err.message);
      result.errors.push(`Deterministic: ${err.message}`);
    }
    
    // Step 2: Jina scraping (attempt, may fail)
    console.log('\n[2/3] Attempting Jina scraping...');
    try {
      // Limit to 3 URLs to avoid rate limiting
      const jinaCount = await runJinaSync();
      result.jinaCount = jinaCount;
      console.log(`✅ Jina: ${jinaCount} sailings`);
    } catch (err: any) {
      console.warn('⚠️  Jina failed (expected):', err.message);
      result.errors.push(`Jina: ${err.message}`);
      // Don't fail the whole loop if Jina is blocked
    }
    
    // Step 3: Run analytics on new sailings only
    console.log('\n[3/3] Running OpenCode analytics...');
    try {
      // For now, skip analytics to avoid timeouts
      // Can re-enable once OpenCode reliability improves
      console.log('⏭️  Analytics skipped (OpenCode unreliable)');
      result.analyticsCount = 0;
    } catch (err: any) {
      console.error('❌ Analytics failed:', err.message);
      result.errors.push(`Analytics: ${err.message}`);
    }
    
    // Step 4: Log total DB count
    result.totalSailingsInDB = await getTotalSailings();
    
    // Log results
    await logResult(result);
    
    console.log(`\n✅ Population Loop Cycle Complete\n`);
    console.log(`   Total sailings in DB: ${result.totalSailingsInDB}`);
    console.log(`   Next cycle in: 20 minutes\n`);
    
    return result;
    
  } catch (err: any) {
    console.error('💥 Loop cycle failed catastrophically:', err.message);
    result.errors.push(`Catastrophic: ${err.message}`);
    await logResult(result);
    throw err;
  }
}

// Run if called directly
if (require.main === module) {
  runPopulationLoop()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}