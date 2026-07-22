# Fix Plan: Credential Pool Key Rotation During Retries

## Problem Statement

**Issue:** Key rotation is NOT triggering because requests are failing via retries **before** rotation can happen.

**Root Cause:** The `executeWithRetry` function in `nimRateLimiter.ts`:
1. Uses the **same API key** for all retry attempts (`options.key` never changes)
2. Only triggers rotation in the **response hook** (proactive at `x-ratelimit-remaining-requests <= 2` OR immediate on `429`)
3. Retry logic catches failures (429/502/503/504) and retries with exponential backoff
4. If retries exhaust **before** hitting the rotation trigger conditions, the key is never rotated
5. **Result:** Client gets stuck retrying with an exhausted/dead key instead of rotating to a fresh one

## Proposed Solution

### Option A: Proactive Rotation on Every Retry (Recommended)

**Change:** In the retry loop, check if the current key should be rotated **before** each retry attempt.

**Implementation:**

```typescript
// In executeWithRetry, after detecting a retryable error:
if (shouldRetry(response.status, bodyText) && attempt < maxRetries) {
  // NEW: Check if we should rotate keys before retrying
  if (response.status === 429 || response.status === 503) {
    // Mark current key as exhausted and rotate to next available
    const pool = this.credentialPools.get(this.extractPoolKey(options.model));
    if (pool) {
      pool.mark_exhausted_and_rotate(response.status, `retry_rotation_attempt_${attempt}`);
      options.key = pool.current()?.access_token; // Get fresh key
    }
  }
  
  // ... existing backoff and retry logic ...
}
```

**Benefits:**
- ✅ Rotates immediately on rate-limit/server errors
- ✅ Doesn't wait for Retry-After header or proactive threshold
- ✅ Uses fresh key for each retry attempt
- ✅ Minimal code changes

**Drawbacks:**
- ⚠️ May rotate more aggressively than necessary (e.g., transient 503)
- ⚠️ Requires credential pool to be configured

### Option B: Rotating Retry Strategy

**Change:** When retrying, **iteratively select from the credential pool** instead of using the same key.

**Implementation:**

```typescript
// Before the retry loop, setup rotation tracking
const originalKey = options.key;
const pool = this.credentialPools.get(this.extractPoolKey(options.model));
let currentKey = originalKey;

for (let attempt = 0; attempt <= maxRetries; attempt++) {
  // Use current key for this attempt
  options.key = currentKey;
  
  // ... execute request ...
  
  if (shouldRetry(response.status, bodyText) && attempt < maxRetries) {
    // Rotate to next key for next attempt
    if (pool && pool.select()) {
      currentKey = pool.current()?.access_token;
    }
    
    // ... backoff and continue ...
  }
}
```

**Benefits:**
- ✅ Natural round-robin across retries
- ✅ Doesn't require marking keys as exhausted
- ✅ Spreads load across all available keys

**Drawbacks:**
- ⚠️ May use keys that are also rate-limited
- ⚠️ Doesn't track which keys are actually exhausted

### Option C: Immediate Rotation on First 429

**Change:** Trigger rotation **immediately** on the first 429 response, before any retry.

**Implementation:**

```typescript
if (response.status === 429 && attempt < maxRetries) {
  // Immediate rotation on first rate-limit hit
  const pool = this.credentialPools.get(this.extractPoolKey(options.model));
  if (pool) {
    pool.mark_exhausted_and_rotate(429, 'immediate_on_first_429');
    options.key = pool.current()?.access_token;
  }
  // Continue with retry using fresh key
}
```

**Benefits:**
- ✅ Simple, targeted fix for rate-limit scenarios
- ✅ Doesn't change behavior for 502/503/504
- ✅ Aligns with "proactive rotation" design intent

**Drawbacks:**
- ⚠️ Only helps with 429s, not other retryable errors
- ⚠️ May not help if ALL keys are rate-limited

## Recommended Approach: **Option A + C Hybrid**

Combine proactive rotation on retryable errors with immediate rotation on 429:

### Implementation Plan

**File:** `server/utils/nimRateLimiter.ts`

**Step 1: Add credential pool reference to ExecuteOptions**
```typescript
interface ExecuteOptions {
  key?: string;
  model: string;
  // ... existing fields ...
  rotateOnRetry?: boolean; // NEW: enable rotation during retry loop
}
```

**Step 2: Modify retry logic to rotate keys**
```typescript
// Around line 524-560 in executeWithRetry
if (shouldRetry(response.status, bodyText) && attempt < maxRetries) {
  // NEW: Proactive key rotation on retryable errors
  if (options.rotateOnRetry !== false && options.key) {
    const poolKey = this.extractPoolKey(options.model);
    const pool = this.credentialPools.get(poolKey);
    
    if (pool) {
      // Mark current key as exhausted on 429, or just rotate on other errors
      const reason = response.status === 429 
        ? 'immediate_429_rotation' 
        : `retry_rotation_attempt_${attempt}`;
      
      pool.mark_exhausted_and_rotate(response.status, reason);
      
      const newKey = pool.current()?.access_token;
      if (newKey && newKey !== options.key) {
        this.emit({
          type: 'key_rotated',
          key: maskKey(options.key),
          newKey: maskKey(newKey),
          model: options.model,
          reason,
          attempt,
        });
        options.key = newKey;
      }
    }
  }
  
  // ... existing backoff logic ...
}
```

**Step 3: Enable rotation by default in callOpenCode**
```typescript
// server/utils/openCodeClient.ts, line 94-107
return globalLimiter.executeWithRetry(
  () => doOpenCodeRequest(body),
  {
    model,
    maxRetries: 5,
    baseBackoffMs: 2_000,
    maxBackoffMs: 45_000,
    rotateOnRetry: true, // NEW: enable key rotation during retries
    shouldRetry: (status: number, bodyText: string) => {
      // ... existing logic ...
    },
  }
);
```

### Testing Plan

**Test 1: Verify rotation on 429**
```bash
# In server directory
npx ts-node -e "
import { getGlobalLimiter } from './utils/nimRateLimiter';
const limiter = getGlobalLimiter();

// Simulate 429 response
let callCount = 0;
limiter.executeWithRetry(async () => {
  callCount++;
  if (callCount === 1) {
    return { ok: false, status: 429, headers: {}, body: async () => 'rate limited', json: async () => ({}) };
  }
  return { ok: true, status: 200, headers: {}, body: async () => 'success', json: async () => ({ success: true }) };
}, { model: 'mimo-v2.5-free', rotateOnRetry: true });
"
```

**Test 2: Verify key changes between retries**
```typescript
// Track which key is used for each attempt
const keysUsed: string[] = [];
limiter.executeWithRetry(async () => {
  // Log current key
  keysUsed.push(options.key);
  // Return 429 to trigger rotation
  return { ok: false, status: 429, ... };
}, { model: '...', rotateOnRetry: true, maxRetries: 3 });

// Assert: keysUsed should have different values (rotated)
```

**Test 3: Integration test with actual OpenCode calls**
```bash
# Monitor logs during a rate-limit scenario
cd server && npx ts-node index.ts 2>&1 | grep -E "key_rotated|retry|429"
```

### Migration Path

1. **Deploy change** to `nimRateLimiter.ts` with `rotateOnRetry` flag (default: `false` for backward compatibility)
2. **Enable in `openCodeClient.ts`** with `rotateOnRetry: true`
3. **Monitor logs** for `key_rotated` events during retries
4. **Adjust threshold** if rotation is too aggressive (e.g., only rotate on 429, not 503)
5. **Consider making default `true`** after validation

### Logging Enhancements

Add detailed logging to track rotation:

```typescript
this.emit({
  type: 'key_rotated',
  key: maskKey(options.key),
  newKey: maskKey(newKey),
  model: options.model,
  reason,
  attempt,
  status: response.status,
});
```

Monitor in logs:
```bash
cd server && tail -f logs/app.log | grep -E "key_rotated|retry|429|exhausted"
```

### Expected Outcome

**Before:**
```
[NIM] HTTP 429: Rate limit exceeded
[NIM] Retrying in 2000ms with same key...
[NIM] HTTP 429: Rate limit exceeded
[NIM] Retrying in 4000ms with same key...
[NIM] All 5 attempts failed with HTTP 429
→ AllRetriesExhaustedError thrown
→ Key never rotated, still marked as active
```

**After:**
```
[NIM] HTTP 429: Rate limit exceeded
[NIM] Rotating key (429, immediate_429_rotation)
[NIM] Key rotated: nvapi-...712 → nvapi-...Lzzh
[NIM] Retrying in 2000ms with new key...
[NIM] HTTP 200: Success
→ Request succeeds on 2nd attempt with fresh key
→ Exhausted key marked with 1-hour cooldown
```

### Files to Modify

| File | Change |
|------|--------|
| `server/utils/nimRateLimiter.ts` | Add `rotateOnRetry` option, implement rotation in retry loop |
| `server/utils/openCodeClient.ts` | Enable `rotateOnRetry: true` in `callOpenCode` |
| `server/utils/nimRateLimiter.ts` | Add `key_rotated` event type and logging |

### Rollback Plan

If rotation is too aggressive or causes issues:
1. Set `rotateOnRetry: false` in `openCodeClient.ts`
2. Revert to original behavior (no rotation during retries)
3. Investigate why rotation failed (pool config? key exhaustion?)

### Success Metrics

- ✅ Key rotation events logged during retry scenarios
- ✅ Successful requests after rotation (not exhausting all retries)
- ✅ Multiple keys used during high-volume periods (load distribution)
- ✅ No increase in `AllRetriesExhaustedError` rates
- ✅ Faster recovery from 429s (no waiting for full backoff cycle)

---

**Owner:** Growth Engineering  
**Priority:** High (blocks reliable AI API usage)  
**Estimated Effort:** 2-3 hours (implementation + testing)  
**Risk:** Low (backward compatible, opt-in via flag)