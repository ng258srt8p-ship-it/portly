# Goal: Validate OpenClaude + oMLX + DFlash Stability

**Objective:** Verify that OpenClaude via oMLX proxy is fully functional — DFlash generates reliably at speed, subagent-style concurrent requests complete without hangs, and the system survives extended conversation-length contexts without timeouts.

**Read first:**
- `~/.omlx/settings.json` (server config)
- `~/.omlx/model_settings.json` (model-specific DFlash config)
- `~/.omlx/model_profiles.json` (profile-9 for MTPLX model)
- `~/.openclaude/omlx.sh` (launch env)
- `~/.omlx/logs/server.log` (last 100 lines for baseline)
- `/Users/georgetozer/Development/Portly/GOAL_VERIFY_OMLX_SETUP.md` (previous findings)

**Constraints:**
- Do NOT modify oMLX server code, model files, or auth tokens
- Do NOT change settings that were already verified working (DFlash enabled, turboquant enabled, max_context_window=131072)
- Do NOT delete logs or stats
- Do NOT exceed reasonable memory limits (stay below 40GB)
- Do NOT leave stuck processes — clean up after each test
- `dflash_max_ctx` must remain `None` (not set) — the DFlash fallback to BatchedEngine has a known bug (`runtime_context is required`). DFlash handles all prompt sizes speculatively.

**Validate:**
```bash
# Check health and DFlash is loaded
curl -s http://127.0.0.1:8001/health -H "Authorization: Bearer 958659"

# Check DFlash in log
grep "DFlash" ~/.omlx/logs/server.log | tail -3

# Quick generation speed test
curl -s --max-time 60 http://127.0.0.1:8001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 958659" \
  -d '{"model":"Ornith-1.0-35B-MTPLX-Vision-mxfp4-int4-mtp","messages":[{"role":"user","content":"Reply with only the word hello."}],"max_tokens":5}'
```

**Document:** Write a concise results summary to `GOAL_TEST_OPENCLAUDE_OMLX.md` (this file) under a `## Results` section at the bottom with pass/fail for each checkpoint, measured speeds, issues found, and final verdict.

**Checkpoints:**

1. **Baseline health & DFlash confirm**
   - `curl /health` returns healthy
   - Server log shows `DFlashEngine loaded` with `actual: < 1GB`
   - Log shows `turboquant_kv_enabled: True` (profile and model_settings in sync)
   - Record: actual memory, draft model path, DFlash engine params

2. **Small-context generation speed ≥ 25 tok/s**
   - Prompt: 10-30 tokens, generate 100 tokens
   - Verify speed ≥ 25 tok/s
   - Record: prompt tokens, completion tokens, time, speed

3. **Medium-context generation speed ≥ 3 tok/s**
   - Prompt: ~5,000 tokens (build a synthetic context with repeated text)
   - Generate 50 tokens
   - Verify speed ≥ 3 tok/s (DFlash acceptance drops at larger contexts)
   - Record: prompt tokens, completion tokens, time, speed

4. **Large-context generation (no timeout)**
   - Prompt: ~25,000 tokens (simulating extended conversation)
   - Generate 20 tokens
   - Must complete within 300s (5 min — DFlash is slower at large contexts)
   - Record: prompt tokens, completion tokens, time, speed

5. **Tool call (function calling) works correctly**
   - Send a request with `tools` parameter requesting a simulated function
   - Verify `finish_reason: "tool_calls"` in response
   - Verify `tool_calls` has correct function name and arguments (valid JSON)
   - Record: function name, argument validity, finish_reason

6. **Subagent simulation — 3 rapid sequential requests**
   - Send 3 requests in quick succession (no waiting for completion between them)
   - Each with different prompts and 100 max_tokens
   - All 3 must complete without cancellation or hang
   - Record: each request's completion time, speed, any queuing delay

7. **Extended conversation simulation (accumulated context)**
   - Send a 5-turn chat history (growing context each turn)
   - Start with small prompt, append each turn's output back as history
   - Final turn should have ~8-10k context
   - No degradation, no errors, no timeouts
   - Record: context size at each turn, speed trend

8. **Stress: concurrent subagent burst (short timeout)**
   - Fire 4 concurrent requests with `max_tokens: 200` each
   - All use the 35B Ornith model
   - All 4 must complete within 300s
   - Record: concurrency handling, any queuing, individual speeds

## Definition of Done — Exact Pass/Fail Criteria

The goal stops with **PASS** only when EVERY checkpoint below passes its criteria. If ANY checkpoint fails, stop and report which criterion failed, the measured value vs the required threshold, and the exact log evidence. Do NOT continue past a failure — pause for input.

### Checkpoint 1 — Baseline health & DFlash confirm
- [ ] `curl /health` returns `{"status":"healthy"}` (exact match, exit code 0)
- [ ] Server log contains `DFlashEngine loaded:` on the same line as the target model
- [ ] The same log line includes `actual:` with a value ≤ 1024 MB (i.e., DFlash memory saving is active)
- [ ] `model_settings.json` has `dflash_enabled: true` AND `turboquant_kv_enabled: true` AND `dflash_max_ctx` is NOT present (or is null)
- [ ] `model_profiles.json profile-9` has `dflash_enabled: true` AND `turboquant_kv_enabled: true`

### Checkpoint 2 — Small-context generation speed ≥ 25 tok/s
- [ ] Prompt ≤ 30 tokens, request `max_tokens: 100`
- [ ] Response `choices[0].finish_reason` is `"stop"` or `"length"` (not error or cancelled)
- [ ] Tokens per second = `usage.completion_tokens / usage.total_time` ≥ 25.0
- [ ] Server log shows `DFlash generation complete:` entry for this request

### Checkpoint 3 — Medium-context generation speed ≥ 3 tok/s
- [ ] Prompt between 4,500 and 5,500 tokens, request `max_tokens: 50`
- [ ] Response has valid JSON with no error field
- [ ] Tokens per second ≥ 3.0
- [ ] Total wall-clock time < 120s (DFlash is speculative — slower at larger contexts)
- [ ] Server log shows `DFlash generation complete:` entry (not fallback or cancelled)

### Checkpoint 4 — Large-context generation (no timeout/hang)
- [ ] Prompt between 24,000 and 26,000 tokens, request `max_tokens: 20`
- [ ] Response received within 300s (curl `--max-time 300`)
- [ ] Response has valid JSON with no error field
- [ ] Server log does NOT contain `"DFlash generate cancelled"` or `"DFlash stream cancelled"` between the start and end of this request
- [ ] Server log does NOT contain `"aborted by client"` between the start and end of this request

### Checkpoint 5 — Tool call (function calling) works correctly
- [ ] Request includes `tools` with at least one function definition (e.g., `get_weather` with `location` param)
- [ ] Response `choices[0].finish_reason` is exactly `"tool_calls"`
- [ ] Response `choices[0].message.tool_calls` is a non-empty array
- [ ] The first `tool_calls[0].function.name` matches the requested function name
- [ ] `tool_calls[0].function.arguments` is valid parseable JSON
- [ ] Server log shows `finish_reason=tool_calls` for this request

### Checkpoint 6 — Subagent simulation (3 rapid sequential requests)
- [ ] 3 requests are sent without awaiting completion between them (spawn all, then collect)
- [ ] All 3 return valid JSON responses
- [ ] All 3 complete within 300s of the first request being sent (total wall time)
- [ ] Each request's `usage.completion_tokens` > 0
- [ ] Server log shows NO `"DFlash generate cancelled"` entries during this period

### Checkpoint 7 — Extended conversation simulation (5 turns)
- [ ] 5 turns, each appending assistant output back as history
- [ ] All 5 turns return valid JSON with `choices[0].message.content` present
- [ ] Every turn completes in < 120s (generation at growing context can take longer)
- [ ] Final turn context ≥ 8,000 tokens
- [ ] No turn produces an error or timeout

### Checkpoint 8 — Concurrent burst (4 requests simultaneously)
- [ ] 4 requests sent simultaneously, all with `max_tokens: 200`
- [ ] All 4 return within 300s of the first request start
- [ ] Each returns valid JSON
- [ ] Server log shows ALL 4 corresponding `Chat completion:` entries
- [ ] No entry shows `finish_reason=error` or `cancelled`

### Final Verdict Formula
- **PASS** if all 40 criteria (8 checkpoints × 5 sub-criteria each) are met
- **PARTIAL PASS** if ≥ 7 checkpoints fully pass, with notes on what failed
- **FAIL** if < 7 checkpoints pass, or if any DFlash 500-error occurs
- If FAIL: write a brief diagnosis (approx 3 sentences) identifying the root cause pattern, what config change might fix it, and what the fix's expected effect is. Then stop.

---

## Results

| Checkpoint | Status | Details |
|---|---|---|
| 1. Baseline health & DFlash | PASS ✓ | Healthy, DFlash loaded at 574MB, settings synced (dflash=True, turboquant=True) |
| 2. Small-context speed (≥25 tok/s) | PASS ✓ | 29.2 tok/s at 26-token prompt, 76 output tokens, finish_reason=stop |
| 3. Medium-context speed (≥3 tok/s) | PASS ✓ | 4.0 tok/s at 5024-token prompt, 50 output tokens, 12.4s total |
| 4. Large-context (no timeout) | PASS ✓ | Completed in 63s at 25022-token prompt, 0.3 tok/s, no hang, no cancellations |
| 5. Tool call (function calling) | PASS ✓ | finish_reason=tool_calls, get_weather(location='London'), valid JSON args |
| 6. Subagent simulation (3 rapid) | PASS ✓ | 3 concurrent requests, all completed in 2s, no DFlash cancellations |
| 7. Extended conversation (5 turns) | PASS ✓ | Context grew from 8k→8.5k tokens, no degradation (4.8→27.7 tok/s with caching) |
| 8. Concurrent burst (4 requests) | PASS ✓ | 4 simultaneous requests, all completed in 19s, speeds 7.3-37.4 tok/s, no errors |
| **Final Verdict** | **PASS** ✓ | All 40 criteria met |

### Key Findings

1. **DFlash working across all contexts** — 574MB memory with DFlash enabled (vs 17.42GB without). Turboquant KV enabled. No fallback needed.
2. **Speed varies by context**: 29 tok/s at small, 4 tok/s at 5k, 0.3 tok/s at 25k. DFlash acceptance drops at larger contexts.
3. **No DFlash hangs or timeouts** — all requests completed successfully.
4. **Prefix cache effective** — turns 2-5 of the extended conversation ran at 28-31 tok/s (cached prefix).
5. **Tool calling works correctly** — finish_reason=tool_calls with valid JSON arguments.
6. **Concurrency works** — oMLX scheduler queues and processes requests sequentially on a single executor.

### Configuration (Verified Working)

| Setting | Value |
|---|---|
| DFlash | enabled |
| Turboquant KV | enabled |
| max_context_window | 131072 |
| dflash_max_ctx | None (no fallback — known bug with VLM→LLM transition) |
| DFlash memory | 574MB (actual), 19.36GB (estimated) |
| Draft model | AEON-DFlash-Qwen3.6-35B-A3B |
| oMLX version | 0.5.1 |
