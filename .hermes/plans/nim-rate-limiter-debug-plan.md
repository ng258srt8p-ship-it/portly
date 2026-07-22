# NIM Rate Limiter Debug Plan

## Problem
Getting consistent HTTP 429 errors despite the rate limiter implementation. Need to add comprehensive logging to understand:
1. Is the limiter actually being called?
2. What's the token bucket state before/after requests?
3. Is the semaphore being acquired/released correctly?
4. Are NIM headers being read for proactive rotation?
5. Is the credential pool rotating keys properly?

## Root Causes to Investigate
1. **Auth.json has only 1 exhausted key** - The 6 fresh keys added aren't being loaded by the credential pool
2. **Credential pool singleton caching** - Pool may be cached and not re-reading auth.json
3. **Limiter not active in actual chat sessions** - Hooks may not be attached in the running agent
4. **Cross-process state not syncing** - Different processes may have different bucket states

## Phase 1: Add Comprehensive Logging

### 1.1 Token Bucket Logging
**File:** `agent/nim_rate_limiter.py`

Add logging to:
- `acquire()` - log tokens before/after, wait time calculated
- `release()` - log token refill
- Bucket creation - log RPM tier, initial tokens
- Shared state read/write - log file path, state contents

### 1.2 Semaphore Logging
**File:** `agent/nim_rate_limiter.py`

Add logging to:
- Semaphore acquire - log current value, blocking status
- Semaphore release - log new value

### 1.3 HTTP Hook Logging
**File:** `run_agent.py` and `agent/process_bootstrap.py`

Add logging to:
- `_nim_request_hook()` - log model, bucket key, wait time, semaphore state
- `_nim_response_hook()` - log status code, NIM headers, rotation triggered

### 1.4 Credential Pool Logging
**File:** `agent/nim_rate_limiter.py` and `agent/credential_pool.py`

Add logging to:
- `_rotate_nvidia_credential()` - log current key, new key, rotation reason
- `load_pool()` - log entries loaded, available count, current key status
- `mark_exhausted_and_rotate()` - log exhausted key, new key selected

### 1.5 Shared State File Logging
**File:** `agent/nim_rate_limiter.py`

Add logging to:
- `_load_shared_state()` - log file path, state contents
- `_persist_shared_state()` - log file path, state being written

## Phase 2: Log Output Format

Use structured logging format:
```
[NIM-LIMITER] <component>: <message>
  - Token bucket: tokens=X, RPM=Y, wait=Zs
  - Semaphore: value=X, model=Y
  - Credential pool: current=X, available=Y, rotation_reason=Z
  - HTTP hook: model=X, status=Y, headers={...}
  - Shared state: path=X, state={...}
```

## Phase 3: Test Scenarios

### 3.1 Single Request Flow
- Make 1 request, verify all log points fire
- Confirm tokens decrement, semaphore releases

### 3.2 Exhaustion Flow  
- Make 4 rapid requests (exceed 3 RPM)
- Verify 4th request waits ~20s
- Verify tokens regenerate correctly

### 3.3 Cross-Process Flow
- Start 2 separate Python processes
- Make requests from both
- Verify shared state file syncs correctly

### 3.4 Credential Rotation Flow
- Simulate 429 with headers
- Verify proactive rotation triggers
- Verify new key is selected from pool

## Phase 4: Analysis & Fix

After collecting logs:
1. Identify which component is failing
2. Determine if it's a logic bug, race condition, or config issue
3. Implement targeted fix
4. Retest with logging enabled

## Files to Modify

| File | Changes |
|------|---------|
| `agent/nim_rate_limiter.py` | Add logging to all methods |
| `run_agent.py` | Add logging to HTTP hooks |
| `agent/process_bootstrap.py` | Add logging to auxiliary client hooks |
| `agent/credential_pool.py` | Add logging to pool operations (if needed) |

## Success Criteria

- Logs show limiter is active for all NIM requests
- Token bucket state is consistent across processes
- Credential pool has 7 fresh keys available
- Proactive rotation triggers at ≤2 remaining requests
- No 429 errors in normal usage (3 RPM respected)

## Rollback Plan

If logging causes issues:
- Logs use print() to stderr, no dependencies
- Can be removed by reverting the single file change
- No config changes required