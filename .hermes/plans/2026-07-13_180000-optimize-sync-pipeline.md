# Plan: Optimize Sync Pipeline & NIM Usage

## Current State Analysis

| Phase | What Happens | Calls | Time | Bottleneck |
|---|---|---|---|---|
| **1. Schedules** | NIM generates 600 sailings | ~1-5 | ~2 min | Single large prompt |
| **2. Pricing** | NIM generates pricing per sailing | ~358 | ~8 min | Sequential, 429/503 errors |
| **3. Analysis** | NIM generates deal analysis (batched 10) | ~212 | ~3 min | NIM 32-concurrent limit |

**Total: ~13 min per 4h cycle** | **~575 NIM calls/cycle** | **6 keys × 40 RPM = 240 RPM theoretical**

---

## Optimization Targets

| Metric | Current | Target |
|---|---|---|
| Sync duration | 13 min | < 4 min |
| NIM calls/cycle | 575 | < 200 |
| Phase 2 errors (429/503) | Frequent | Zero |
| Incremental capability | None | Full |
| Stale data handling | Manual | Automatic |

---

## Phase 1: Prompt & Call Consolidation (Week 1)

### 1.1 Merge Schedule + Pricing into Single Call
**Current:** Phase 1 generates schedules → Phase 2 prices each individually
**Optimized:** Single prompt generates schedules WITH pricing for all sailings

```typescript
// nimSyncGenerator.ts - NEW unified prompt
const UNIFIED_SYNC_PROMPT = `
Generate 600 cruise sailings with FULL pricing for next 12 months.
Output JSON array with this exact structure:
[
  {
    "cruiseLine": "Royal Caribbean",
    "shipName": "Symphony of the Seas",
    "sailDate": "2026-08-15",
    "duration": 7,
    "departurePort": "Miami, FL",
    "region": "Caribbean",
    "itinerary": ["Nassau", "St. Thomas", "St. Maarten"],
    "pricing": {
      "IS": {"base": 599, "fees": 189, "taxes": 67, "gratuities": 105, "total": 960},
      "OB": {"base": 749, "fees": 189, "taxes": 67, "gratuities": 105, "total": 1110},
      "BA": {"base": 999, "fees": 189, "taxes": 67, "gratuities": 105, "total": 1360},
      "SU": {"base": 1899, "fees": 189, "taxes": 67, "gratuities": 105, "total": 2260}
    }
  }
]
`;
```

**Impact:** Eliminates Phase 2 entirely. **~350 fewer NIM calls**, **~8 min saved**.

### 1.2 Reduce Analysis Prompt Size
**Current:** 2048 tokens, verbose prompt
**Optimized:** 1024 tokens, strict JSON output only

```typescript
const ANALYSIS_PROMPT = `
Analyze this sailing for deal value. Output ONLY this JSON:
{
  "dealScore": 0-100,
  "pricingDeepDive": "string",
  "priceTrend": "rising|falling|stable",
  "shipExperience": "string",
  "insiderTips": ["tip1", "tip2"],
  "verdict: "string"
}
No markdown, no commentary. Sailing: {json}
`;
```

**Impact:** Faster completion, fewer tokens, cheaper.

---

## Phase 2: Parallel Execution Architecture (Week 1-2)

### 2.1 Async Pipeline with Worker Pool
```typescript
// hybridEngine.ts - New pipeline structure
class SyncPipeline {
  private scheduleWorker: ScheduleWorker;
  private analysisWorkers: AnalysisWorker[];  // Pool of 6 (one per key)
  private rateLimiter: SlidingWindowLimiter;  // 40 RPM per key
  
  async runFullSync() {
    // Phase 1: Single call for schedules + pricing
    const sailings = await this.scheduleWorker.generateAll();
    
    // Phase 2: Parallel analysis with key affinity
    const chunks = chunk(sailings, 10);
    await Promise.all(
      chunks.map((chunk, i) => 
        this.analysisWorkers[i % 6].process(chunk)
      )
    );
  }
}
```

### 2.2 Key-Affinity Workers (Eliminate 429/503)
- Each of 6 workers owns ONE API key
- Worker processes queue sequentially → guarantees ≤40 RPM
- No round-robin contention, no sliding window overhead
- **Result:** Zero rate-limit errors, predictable throughput

### 2.3 Streaming DB Writes
- Workers write results immediately via `INSERT ... ON CONFLICT`
- No batch accumulation → lower memory, visible progress
- Use `COPY` for bulk inserts where possible

**Impact:** Phases run in parallel, **~4 min total**, **zero 429s**.

---

## Phase 3: Incremental Sync & Deduplication (Week 2)

### 3.1 Change Detection
```sql
-- Add to sailings table
ALTER TABLE sailings ADD COLUMN content_hash VARCHAR(64);
ALTER TABLE sailings ADD COLUMN last_verified TIMESTAMPTZ;

-- Index for fast lookups
CREATE INDEX idx_sailings_hash ON sailings(content_hash);
```

### 3.2 Incremental Logic
```typescript
async function incrementalSync() {
  // 1. Fetch current NIM schedules (lightweight call)
  const current = await nim.generateScheduleSummary(); // Just IDs + dates
  
  // 2. Compare with DB
  const dbSailings = await db.query('SELECT id, sail_date, ship_name, content_hash FROM sailings');
  
  // 3. Classify
  const toInsert = current.filter(c => !dbMap.has(key(c)));
  const toUpdate = current.filter(c => dbMap.get(key(c))?.hash !== hash(c));
  const toDelete = dbSailings.filter(d => !currentMap.has(key(d)));
  
  // 4. Process only changes
  await Promise.all([
    insertSailings(toInsert),
    updateSailings(toUpdate),      // Re-price + re-analyze
    softDeleteSailings(toDelete)   // Mark inactive, keep history
  ]);
}
```

### 3.3 Pricing Re-verification (Low-Frequency)
- Full re-price: **Weekly** (not every 4h)
- Price drift check: Compare NIM price vs last snapshot > 5% → flag
- Analysis regeneration: Only when pricing changes or 30 days old

**Impact:** 4h sync becomes **30 sec** for 95% of cycles. Full re-gen weekly.

---

## Phase 4: Smart Caching & Fallback (Week 2-3)

### 4.1 Analysis Cache Strategy
```typescript
// Server-side cache with TTL
const analysisCache = new Map<string, { data: DealAnalysis; expires: number }>();

// In analytics endpoint
app.get('/api/analytics/deal-analysis/:id', async (req, res) => {
  const cached = analysisCache.get(req.params.id);
  if (cached && cached.expires > Date.now()) {
    return res.json({ ...cached.data, cached: true });
  }
  
  // Fallback to DB
  const db = await db.query('SELECT deal_analysis FROM sailings WHERE id = $1', [id]);
  if (db.rows[0]?.deal_analysis) {
    analysisCache.set(id, { data: db.rows[0].deal_analysis, expires: Date.now() + 3600000 });
    return res.json({ ...db.rows[0].deal_analysis, cached: true });
  }
  
  // Queue for async generation
  await queueAnalysisGeneration(req.params.id);
  return res.json({ data: null, queued: true, message: "Analysis coming soon" });
});
```

### 4.2 Pre-warm Cache on Sync
- After sync completes, pre-populate cache for top 50 sailings (by search volume)
- Background job refreshes cache for expiring entries

### 4.3 NIM Failure Graceful Degradation
```typescript
async function generateWithFallback(prompt: string, keyIndex: number) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await nimClient.call(prompt, keyIndex);
    } catch (e) {
      if (e.code === 'RATE_LIMIT') {
        await sleep(2 ** attempt * 1000); // Exponential backoff
        continue;
      }
      throw e;
    }
  }
  // All keys exhausted → return cached/template response
  return getTemplateResponse(prompt);
}
```

---

## Phase 5: Monitoring & Observability (Week 3)

### 5.1 Sync Metrics Dashboard
```typescript
// sync_log table additions
ALTER TABLE sync_log ADD COLUMN phase_durations JSONB;
ALTER TABLE sync_log ADD COLUMN nim_calls_per_phase JSONB;
ALTER TABLE sync_log ADD COLUMN errors JSONB;
ALTER TABLE sync_log ADD COLUMN sailings_changed INT;
```

### 5.2 Key Alerts
| Alert | Condition | Action |
|---|---|---|
| Sync duration > 5 min | `completed_at - started_at > 300s` | Page on-call |
| NIM error rate > 5% | `errors / total_calls > 0.05` | Auto-switch to template mode |
| Stale analyses > 100 | `COUNT(*) WHERE deal_analysis IS NULL > 100` | Trigger catch-up job |
| Price drift > 10% | Any sailing re-priced > 10% from last | Flag for review |

### 5.3 Structured Logging
```typescript
const logger = createLogger({ 
  syncId, 
  phase, 
  sailingId,
  keyIndex,
  durationMs,
  tokensUsed,
  success: boolean
});
```

---

## Implementation Priority

| Week | Task | Effort | Impact |
|---|---|---|---|
| **1** | Merge Phase 1+2 prompt | 4 hrs | **-8 min, -350 calls** |
| **1** | Key-affinity worker pool | 6 hrs | **Zero 429s, parallel** |
| **1** | Optimize analysis prompt | 2 hrs | **-30% tokens, faster** |
| **2** | Incremental sync logic | 8 hrs | **30 sec typical sync** |
| **2** | Content hashing & dedup | 4 hrs | **No redundant work** |
| **2** | Streaming DB writes | 2 hrs | **Lower memory** |
| **3** | Cache layer + pre-warm | 4 hrs | **Instant page loads** |
| **3** | Graceful degradation | 3 hrs | **Zero downtime** |
| **3** | Metrics + alerts | 4 hrs | **Operational visibility** |

**Total: ~37 hrs over 3 weeks**

---

## File Changes Required

| File | Changes |
|---|---|
| `server/services/hybridEngine.ts` | New pipeline orchestration |
| `server/services/nimSyncGenerator.ts` | Unified prompt, remove Phase 2 |
| `server/services/nimAnalytics.ts` | Optimized prompt, key-affinity workers |
| `server/utils/nimClient.ts` | Key-affinity, streaming, fallback |
| `server/routes/analytics.ts` | Cache layer, queue fallback |
| `server/db/schema.sql` | `content_hash`, `last_verified`, `sync_log` additions |
| `scripts/incrementalSync.ts` | New entry point for 4h cycle |
| `scripts/fullRegenSync.ts` | Weekly full regeneration |

---

## Success Criteria

| Metric | Must Achieve |
|---|---|
| ✅ Sync < 4 min (95th percentile) | |
| ✅ Zero NIM rate-limit errors | |
| ✅ Incremental sync < 30 sec typical | |
| ✅ Page-load analysis = 0 NIM calls | |
| ✅ Full re-gen weekly, not 4-hourly | |
| ✅ Alerting on anomalies | |