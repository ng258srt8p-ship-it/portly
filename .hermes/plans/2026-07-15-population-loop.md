# Plan: Database Population Loop (20-min Interval)

**Status:** Jina Reader blocked (403) → Fallback to deterministic + manual URLs  
**Goal:** Populate database with ~500-1000 sailings over next 24-48 hours  
**Method:** Hybrid approach (deterministic generation + opportunistic Jina scraping)

---

## Current Blocker

**Jina Reader:** Getting HTTP 403 from Royal Caribbean
- Likely cause: IP rate-limiting or User-Agent blocking
- Workaround: Use deterministic generator as primary, Jina as secondary

---

## Loop Architecture

```
Every 20 minutes:
  1. Deterministic Generation (OpenCode fallback) → 20 sailings
  2. Attempt Jina scrape (3 URLs max) → 0-30 sailings (if not blocked)
  3. Run OpenCode analytics on NEW sailings only
  4. Log results to DB + console
```

**Expected Output per Cycle:**
- Deterministic: 20 sailings (guaranteed)
- Jina: 0-30 sailings (if unblocked)
- Total per cycle: 20-50 sailings
- Total per day: 72 cycles × 35 avg = **~2,520 sailings/day**

---

## Implementation Files

### 1. Loop Runner Script
**File:** `server/scripts/populationLoop.ts`

**Features:**
- Runs every 20 minutes via cron
- Executes deterministic generator
- Attempts Jina scrape (with retry logic)
- Triggers OpenCode analytics on new data only
- Logs to `population_loop.log`

### 2. Cron Job Configuration
**File:** `~/.hermes/cron/population-loop.yaml` (or via `cronjob` tool)

**Schedule:** `*/20 * * * *` (every 20 minutes)

### 3. Logging & Monitoring
**File:** `server/services/populationLogger.ts`

**Tracks:**
- Sailings added per cycle
- Source breakdown (deterministic vs Jina)
- Success/failure rates
- DB total count

---

## Execution Plan

### Phase 1: Create Loop Script (30 min)
- Write `populationLoop.ts`
- Import deterministic + Jina sync
- Add logging
- Test manual run

### Phase 2: Set Up Cron (10 min)
- Create cron job via `cronjob` tool
- Schedule: every 20 minutes
- Set `workdir` to project root
- Enable notifications on failure

### Phase 3: Baseline Population (1 hour)
- Run initial bulk load (500 sailings)
- Verify DB integrity
- Check frontend displays data

### Phase 4: Monitor & Adjust (ongoing)
- Watch logs for first 6 hours
- Adjust frequency if needed (10 min vs 30 min)
- Add more Jina URLs if unblocked

---

## Code: populationLoop.ts

```typescript
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
      const jinaCount = await runJinaSync(true); // true = limited mode
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
      // Trigger analytics for sailings scraped in last 20 min
      const { generateAnalyticsForNewSailings } = await import('../services/analyticsGenerators');
      const analyticsCount = await generateAnalyticsForNewSailings(20); // minutes
      result.analyticsCount = analyticsCount;
      console.log(`✅ Analytics: ${analyticsCount} sailings analyzed`);
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
```

---

## Cron Job Setup

```bash
# Via Hermes cronjob tool
cronjob action=create \
  name="Database Population Loop" \
  schedule="*/20 * * * *" \
  prompt="Run the database population loop: cd /Users/georgetozer/Development/Portly && npx ts-node server/scripts/populationLoop.ts" \
  workdir="/Users/georgetozer/Development/Portly"
```

---

## Monitoring Commands

```bash
# View last 20 log entries
tail -20 logs/population_loop.log

# Count sailings added in last hour
psql triptide -c "SELECT COUNT(*) FROM sailings WHERE scraped_at > NOW() - INTERVAL '1 hour';"

# Check source breakdown
psql triptide -c "SELECT cron_source, COUNT(*) FROM sailings GROUP BY cron_source;"

# View DB growth over time
psql triptide -c "SELECT DATE_TRUNC('hour', scraped_at) as hour, COUNT(*) FROM sailings GROUP BY 1 ORDER BY 1 DESC LIMIT 24;"
```

---

## Success Metrics

**After 1 hour (3 cycles):**
- ✅ 60-150 new sailings
- ✅ Analytics generated for ≥80% of new sailings
- ✅ Log file shows consistent execution

**After 6 hours (18 cycles):**
- ✅ 360-900 new sailings
- ✅ DB total: ≥500 sailings
- ✅ Frontend shows diverse inventory

**After 24 hours (72 cycles):**
- ✅ 1,440-3,600 new sailings
- ✅ DB total: ≥2,000 sailings
- ✅ Multiple cruise lines represented
- ✅ Price history tracking active

---

## Next Steps

1. **Create `populationLoop.ts`** (30 min)
2. **Create logs directory** (1 min)
3. **Test manual run** (5 min)
4. **Set up cron job** (5 min)
5. **Monitor first 3 cycles** (60 min)
6. **Adjust if needed** (ongoing)

**Ready to execute?**