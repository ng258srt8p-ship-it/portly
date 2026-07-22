# Plan: Optimize oMLX + Pi CLI for Ornith-1.0-35B-MLX-oQ8-mtp on M1 Max 64GB

## System
- **Hardware:** MacBook Pro M1 Max, 10 cores (8P+2E), 64GB unified memory
- **OS:** macOS 26.5.1
- **oMLX:** Running, model `Ornith-1.0-35B-MLX-oQ8-mtp` loaded, **42.4 GB** current usage
- **Pi CLI:** v0.80.10, working, symlink OK
- **Reference video:** [oMLX + Pi Agent + Qwen3.6 35B](https://www.youtube.com/watch?v=gBBytfQbIxs) by Execute Automation (general oMLX+Pi Agent config patterns)

## Root Cause Analysis of Error 400

| # | Issue | Current Value | Problem |
|---|-------|--------------|---------|
| 1 | **MTP enabled on M1 Max** | `mtp_enabled: true` | M1 Max is compute-bound; MTP is **net-negative (-73%)** per measured benchmarks. Wastes ~2GB for zero benefit. |
| 2 | **Memory guard tier mismatch** | `tier: "aggressive"` + `ceiling: 52GB` | Custom ceiling **ignored** unless tier=`"custom"`. Actual behavior uses aggressive defaults (~54GB ceiling). |
| 3 | **`prefill_memory_guard` disabled** | `false` | Large prompts can spike memory 8-12GB during prefill, hitting ceiling → OOM / 400. |
| 4 | **Hot cache too large** | `20GB` | Formula: `58GB cap - 42.4GB model - 8GB transient = ~7.6GB`. 20GB forces constant emergency shrinks. |
| 5 | **Burst decode too aggressive** | `"aggressive"` | Batches 64 steps × 200ms → higher peak memory. |
| 6 | **Model `max_context_window` = 32768** (inherited) | no per-model override | Large Pi prompts (>32K tokens after accumulation) get 400'd. |
| 7 | **Pi `global_cap` = 16384** | 16K | Fine as client-side cap, but if Pi's compaction fails large accumulated context could exceed oMLX limit. |

## Steps

### Step 1 — Disable MTP & set per-model context window
**File:** `~/.omlx/model_settings.json`
- Set `mtp_enabled: false` for `Ornith-1.0-35B-MLX-oQ8-mtp`
- Set `max_context_window: 65536` (safe 2× current, stays within memory budget)
- Keep `is_pinned: true`

### Step 2 — Fix global memory & cache settings
**File:** `~/.omlx/settings.json`
- Change `memory_guard_tier` → `"custom"` (activates the ceiling)
- Change `memory_guard_custom_ceiling_gb` → `48.0`
- Enable `prefill_memory_guard` → `true`
- Change `burst_decode_mode` → `"balanced"`
- Reduce `hot_cache_max_size` → `"8gb"` (fits `58 - 42.4 - 8 ≈ 7.6`)
- Reduce `soft_threshold` → `0.80`
- Reduce `hard_threshold` → `0.88`

### Step 3 — Sync Pi CLI settings
**File:** `~/.pi/agent/settings.json`
- Increase `global_cap` → `32768` (matches oMLX inheritance)
- Increase `reserve_tokens` → `1024` (more headroom)
- Keep `keep_recent_tokens: 1024`
- Verify constraint: `1024 < (32768 - 1024) = 31744` ✓
- Keep `validation_strict` → `true` (catches future mismatches)
- Ensure `defaultModel` → `"Ornith-1.0-35B-MLX-oQ8-mtp"`
- Ensure `defaultProvider` → `"omlx"`

### Step 4 — Apply changes & reload oMLX
1. Apply all config file changes
2. Reload the model with new settings via oMLX admin API
3. Verify model loads without errors

### Step 5 — Verify & test
1. Check oMLX health endpoint → memory and model state
2. Quick test: send a chat completion to ensure no 400
3. Test Pi CLI: `pi --version` and a simple prompt
4. Confirm no Error 400
