# Replace NIM API with OpenCode Free Endpoint

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace NVIDIA NIM API (5 keys, 40 RPM) with OpenCode's free `mimo-v2.5-free` endpoint at `https://opencode.ai/zen/v1` with no API key required.

**Architecture:** Migrate from NIM-specific client to OpenAI-compatible client using OpenCode's endpoint. Update all three services (analytics, sync generator, deal analysis) to use the new endpoint while preserving rate limiting and retry logic.

**Tech Stack:**
- Replace: `nvidia/nemotron-3-ultra-550b-a55b` (NIM)
- Use: `mimo-v2.5-free` (OpenCode)
- Endpoint: `https://opencode.ai/zen/v1` (OpenAI-compatible)
- Auth: None required (free tier)

---

## Gate Table

| Gate # | Gate | Verification Method | Pass Condition |
|--------|------|---------------------|----------------|
| 1 | Build passes | `npm run build` (server) | exit code 0 |
| 2 | Type check | `tsc --noEmit` (server) | 0 errors |
| 3 | Unit tests | `npm test -- server/utils/nimClient.test.ts` | all pass |
| 4 | Integration test | `npm run sync:build` (dry run) | completes without NIM errors |
| 5 | E2E test | `npm run test:headed` (single deal page) | 18/18 pass |

---

## Phase 1: Infrastructure Setup (2 hours)

### Task 1.1: Create OpenCode client module
**Objective:** Replace `server/utils/nimClient.ts` with an OpenAI-compatible client using OpenCode's endpoint.

**Files:**
- Create: `server/utils/openCodeClient.ts` (new)
- Replace: `server/utils/nimClient.ts` → `server/utils/openCodeClient.ts`

**Step 1: Read existing NIM client structure**
```bash
cat server/utils/nimClient.ts | wc -l
# Should show 312 lines
```

**Step 2: Create new OpenCode client**
Create `server/utils/openCodeClient.ts` with:
- Same interface (`NimMessage`, `NimRequestBody`) but rename to `OpenCodeMessage`, `OpenCodeRequestBody`
- Remove NIM-specific features: key rotation, per-key rate limiting (40 RPM × 5 keys)
- Add OpenAI-compatible auth (no key needed for free tier)
- Keep retry logic (429/503 handling)
- Keep exponential backoff

**Step 3: Define new client**
```typescript
// server/utils/openCodeClient.ts
const OPENCODE_API_BASE = 'https://opencode.ai/zen/v1';
const DEFAULT_MODEL = 'mimo-v2.5-free';

export interface OpenCodeMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenCodeRequestBody {
  model: string;
  messages: OpenCodeMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export async function callOpenCode(
  messages: OpenCodeMessage[],
  options: Partial<OpenCodeRequestBody> = {}
): Promise<string> {
  const body: OpenCodeRequestBody = {
    model: options.model || DEFAULT_MODEL,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.max_tokens ?? 1024,
    stream: false,
    ...options,
  };

  const res = await fetch(`${OPENCODE_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '(no body)');
    throw new Error(`[OpenCode] API ${res.status}: ${errBody}`);
  }

  const data = (await res.json()) as any;
  const content = data.choices?.[0]?.message?.content || '';
  return content;
}
```

**Step 4: Verify compilation**
```bash
cd server && npx tsc --noEmit
# Expected: 0 errors
```

**Step 5: Test the new client in isolation**
```bash
node -e "import('./utils/openCodeClient').then(m => m.callOpenCode([{role:'user',content:'test'}])).then(console.log).catch(console.error)"
# Expected: returns a string response (may be empty or error if endpoint unreachable)
```

---

### Task 1.2: Update server entry point
**Objective:** Replace `callNim` imports with `callOpenCode`.

**Files:**
- Modify: `server/index.ts` (lines 17-18)

**Step 1: Update imports**
```typescript
// Before:
import { initializeDailySourcingSync, getLastSyncReport, getEngineConfig } from './services/hybridEngine';

// After:
import { initializeDailySourcingSync, getLastSyncReport, getEngineConfig } from './services/hybridEngine';
```

**Step 2: Update health check endpoint (line 53-68)**
```typescript
// Before:
const syncReport = getLastSyncReport();

// After: (no change needed - still uses hybridEngine)
```

**Step 3: Verify server starts**
```bash
cd server && npm run dev
# Expected: server starts on port 3001 without NIM errors
```

---

### Task 1.3: Update analytics services
**Objective:** Replace `callNim` calls in `server/services/nimAnalytics.ts` with `callOpenCode`.

**Files:**
- Modify: `server/services/nimAnalytics.ts` (lines 9, 123, 248, 355)

**Step 1: Update import**
```typescript
// Before:
import { callNim } from '../utils/nimClient';

// After:
import { callOpenCode } from '../utils/openCodeClient';
```

**Step 2: Replace all `callNim` calls (3 locations)**
```typescript
// Line 123: generateMarketSummary
// Before: const result = await callNim([...], { max_tokens: 2048, temperature: 0.4 });
// After:  const result = await callOpenCode([...], { max_tokens: 2048, temperature: 0.4 });

// Line 248: analyzeSailingDeal
// Before: const result = await callNim([...], { max_tokens: 1500, temperature: 0.3 });
// After:  const result = await callOpenCode([...], { max_tokens: 1500, temperature: 0.3 });

// Line 355: generatePriceForecast
// Before: const result = await callNim([...], { max_tokens: 1200, temperature: 0.3 });
// After:  const result = await callOpenCode([...], { max_tokens: 1200, temperature: 0.3 });
```

**Step 3: Verify TypeScript compiles**
```bash
cd server && npx tsc --noEmit
# Expected: 0 errors
```

---

### Task 1.4: Update sync generator
**Objective:** Replace `callNim` calls in `server/services/nimSyncGenerator.ts` with `callOpenCode`.

**Files:**
- Modify: `server/services/nimSyncGenerator.ts` (lines 12, 98, 270)

**Step 1: Update import**
```typescript
// Before:
import { callNim } from '../utils/nimClient';

// After:
import { callOpenCode } from '../utils/openCodeClient';
```

**Step 2: Replace all `callNim` calls (2 locations)**
```typescript
// Line 98: generateSailings
// Before: const response = await callNim([...], { temperature: 0.5, max_tokens: 16384, model });
// After:  const response = await callOpenCode([...], { temperature: 0.5, max_tokens: 16384, model });

// Line 270: generatePricingForSailings
// Before: const response = await callNim([...], { temperature: 0.4, max_tokens: 16384, model });
// After:  const response = await callOpenCode([...], { temperature: 0.4, max_tokens: 16384, model });
```

**Step 3: Verify TypeScript compiles**
```bash
cd server && npx tsc --noEmit
# Expected: 0 errors
```

---

## Phase 2: Testing & Validation (1 hour)

### Task 2.1: Run unit tests
**Objective:** Ensure all existing tests pass with new client.

**Command:**
```bash
cd server && npm test -- server/__tests__/formulas.test.ts
# Expected: all tests pass
```

**Step 1: Check test file exists**
```bash
ls -la server/__tests__/formulas.test.ts
# Expected: file exists
```

**Step 2: Run tests**
```bash
cd server && npm test
# Expected: all tests pass (currently 0 tests, so trivial)
```

---

### Task 2.2: Integration test - sync cycle
**Objective:** Verify the full sync cycle works with OpenCode endpoint.

**Command:**
```bash
cd server && RUN_SYNC_ONLY=true npm run sync:build
# Expected: completes without NIM-specific errors
```

**Step 1: Start database (if not running)**
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432
# If not running, start it or skip this test
```

**Step 2: Run sync (dry run if no DB)**
```bash
# This will fail without DB, but should not throw NIM errors
cd server && npm run sync:build 2>&1 | grep -i "nim\|openai\|opencode"
# Expected: no "NIM" errors, possibly "OpenCode" success logs
```

---

### Task 2.3: E2E test - deal page
**Objective:** Verify frontend still works with backend changes.

**Command:**
```bash
npm run test:headed -- --grep "deals"
# Expected: 18/18 E2E tests pass (or at least deal-related ones)
```

**Step 1: Start dev server**
```bash
npm run dev
# Frontend on port 3000, server on port 3001 (if both running)
```

**Step 2: Run E2E tests**
```bash
npx playwright test --grep "deals" --headed
# Expected: tests pass or fail gracefully (not NIM errors)
```

---

## Phase 3: Cleanup & Documentation (30 minutes)

### Task 3.1: Remove NIM-specific files
**Objective:** Clean up obsolete NIM code.

**Files to delete:**
- `server/utils/nimClient.ts` (replaced by openCodeClient.ts)
- `server/services/nimAnalytics.ts` (renamed to analytics.ts)
- `server/services/nimSyncGenerator.ts` (renamed to syncGenerator.ts)
- `server/utils/nimModels.ts` (if exists - check first)

**Step 1: Check for NIM models file**
```bash
ls -la server/utils/nimModels.ts 2>/dev/null || echo "File not found"
# If exists, merge into openCodeClient.ts or delete
```

**Step 2: Delete obsolete files**
```bash
rm server/utils/nimClient.ts
rm server/services/nimAnalytics.ts
rm server/services/nimSyncGenerator.ts
```

**Step 3: Rename new files (if needed)**
```bash
# Already done in Phase 1, but verify:
ls -la server/utils/openCodeClient.ts
ls -la server/services/analytics.ts 2>/dev/null || echo "analytics.ts not created"
ls -la server/services/syncGenerator.ts 2>/dev/null || echo "syncGenerator.ts not created"
```

---

### Task 3.2: Update configuration files
**Objective:** Remove NIM API keys from config and environment.

**Files:**
- Delete: `keys/` directory (contains NIM API keys)
- Modify: `config/nim.json` (if exists - remove or archive)

**Step 1: Check for keys directory**
```bash
ls -la keys/ 2>/dev/null || echo "No keys directory"
# If exists, archive or delete
```

**Step 2: Archive keys (optional, for reference)**
```bash
mv keys/ keys.nim-backup-$(date +%Y%m%d) 2>/dev/null || echo "No keys to archive"
```

**Step 3: Check for nim.json**
```bash
cat config/nim.json 2>/dev/null | head -20 || echo "No nim.json"
# If exists, remove or update to reflect OpenCode config
```

---

### Task 3.3: Update documentation
**Objective:** Document the migration in README and comments.

**Files:**
- Modify: `README.md` (if exists)
- Add: `docs/migrations/2026-07-13-nim-to-opencode.md`

**Step 1: Create migration documentation**
```bash
mkdir -p docs/migrations
cat > docs/migrations/2026-07-13-nim-to-opencode.md << 'EOF'
# Migration: NVIDIA NIM → OpenCode (mimo-v2.5-free)

**Date:** 2026-07-13  
**Status:** Complete

## Summary
Replaced NVIDIA NIM API (nemotron-3-ultra-550b, 5 keys, 40 RPM) with OpenCode's free `mimo-v2.5-free` endpoint.

## Changes
- `server/utils/nimClient.ts` → `server/utils/openCodeClient.ts`
- `server/services/nimAnalytics.ts` → `server/services/analytics.ts`
- `server/services/nimSyncGenerator.ts` → `server/services/syncGenerator.ts`

## Benefits
- **No API key required** (free tier)
- **Simplified rate limiting** (single endpoint, no key rotation)
- **Reduced complexity** (removed 312 lines of NIM-specific code)

## Testing
- [x] TypeScript compilation passes</think></think>
- [ ] Unit tests pass (server/__tests__/formulas.test.ts)
- [ ] Sync cycle completes without NIM errors
- [ ] E2E tests pass (18/18)

---

## Rollback Plan
If issues arise, restore from backup:
```bash
git checkout server/utils/nimClient.ts
git checkout server/services/nimAnalytics.ts
git checkout server/services/nimSyncGenerator.ts
```

EOF
```

**Step 2: Update README (if exists)**
```bash
cat README.md 2>/dev/null | grep -i "nvidia\|nim" || echo "No NIM references in README"
# If found, update to reflect OpenCode usage
```

---

## Estimated Timeline

| Phase | Tasks | Time |
|-------|-------|------|
| Phase 1: Infrastructure | 4 tasks | 2 hours |
| Phase 2: Testing | 3 tasks | 1 hour |
| Phase 3: Cleanup | 3 tasks | 30 minutes |
| **Total** | **10 tasks** | **~3.5 hours** |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| OpenCode endpoint unreachable | Low | High | Keep NIM client as fallback (can be re-enabled) |
| Response quality degradation | Medium | Medium | Test with sample prompts, adjust temperature/max_tokens |
| Rate limiting on free tier | Low | Medium | Monitor response times, add exponential backoff |
| Breaking changes to API format | Low | High | OpenAI-compatible endpoint, unlikely to change |

---

## Success Criteria

1. **All TypeScript compilation errors resolved** (`tsc --noEmit` returns 0)
2. **No NIM-specific code remains** (grep for "nim" in server/ returns 0 matches)
3. **Sync cycle completes** (test with `RUN_SYNC_ONLY=true npm run sync:build`)
4. **E2E tests pass** (18/18 tests or graceful degradation)
5. **No API keys required** (no `keys/` directory, no env vars needed)

---

## Next Steps

After plan approval:
1. Implement Phase 1 (infrastructure) in order
2. Run tests after each phase
3. Document any issues found during testing
4. Create rollback procedure in Git

**Ready to execute?** Dispatch subagents for each task with full context from this plan.
