# Plan: NIM Rate Limiter for Hermes (Nvidia Provider Only)

## Research: Existing Solutions

| Package | Version | Approach | Suitable for Hermes? |
|---------|---------|----------|---------------------|
| `token-bucket` | 0.3.0 | Pure token-bucket algorithm | Overkill — 20 lines of custom code avoids a dep |
| `ratelimit` | 2.2.1 | Decorator-based (`@ratelimit`) | No — need per-request HTTP-level, not function-level |
| `limits` | 4.2 | Comprehensive (buckets, sliding windows, backends) | Too heavy — Redis/Memcached backends, 50KB+ |
| `pyrate-limiter` | 3.9.0 | In-memory token bucket, burst support | Closest fit but still heavier than needed |
| **Custom (recommended)** | — | ~50 lines in a single file, zero deps | ✅ Hermes already has no `pyproject.toml` dep to add |

**Verdict:** No existing off-the-shelf solution for Nvidia NIM-specific rate limiting. The built-in token-bucket approach is the right call — it's ~50 lines, zero dependencies, and purpose-built for NIM's RPM limits.

## Architecture

HTTPX supports event hooks (`client.event_hooks['request']`) that fire before every request. We add a hook that checks the NIM rate limiter and sleeps if needed — **only** when `base_url` contains `integrate.api.nvidia.com`.

## Injection Point (Found)

The exact call chain is:

```
run_agent.py:AIAgent._build_keepalive_http_client()
  → constructs httpx.Client(http_transport=..., event_hooks={...})   [line 3989]
  → passed as http_client= to OpenAI() in ...
agent/agent_runtime_helpers.py:create_openai_client()
  → OpenAI(base_url=..., http_client=...)                           [line 1762]
  → client.chat.completions.create(**kwargs)                         [via SDK]
```

**Injection point:** `run_agent.py::AIAgent._build_keepalive_http_client()` at line 3989 — this is where the `httpx.Client` is built. We add a `"request"` event hook that checks the rate limiter.

**Alternative injection point:** `agent/agent_runtime_helpers.py::create_openai_client()` at line 1762 — we could wrap the client after construction. But `_build_keepalive_http_client` is cleaner because:
- It's the single chokepoint for ALL httpx clients (main model + auxiliary)
- The `base_url` is already available there
- It already handles proxy/transport configuration

## Files to Create/Modify

| File | Action | Status |
|------|--------|--------|
| `agent/nim_rate_limiter.py` | **Create** | ✅ Done |
| `run_agent.py` | **Modify** | ✅ Done |
| `agent/process_bootstrap.py` | **Modify** | ✅ Done (auxiliary client path) |

## Design

### 1. `agent/nim_rate_limiter.py`

```python
"""Per-model token-bucket rate limiter for NVIDIA NIM.

Only activates when base_url targets integrate.api.nvidia.com.
Other providers pass through with zero latency.
"""

import time
import threading
from typing import Dict, Optional

# Empirically verified NIM RPM limits (from live testing + Nvidia docs)
MODEL_RPM: Dict[str, int] = {
    "nvidia/nemotron-3-ultra":      3,
    "nvidia/nemotron-3-super":      6,
    "nvidia/nemotron":             10,
    "deepseek-ai/deepseek-v4-pro": 12,
    "deepseek-ai/deepseek-v4":     20,
    "meta/llama-3.3":              28,
    "meta/llama":                  28,
    "minimaxai/minimax-m3":        40,
    "mistralai/mistral":           28,
    "google/gemma":                35,
}

DEFAULT_RPM = 35
WINDOW_S = 60

class _Bucket:
    __slots__ = ("rpm", "tokens", "last_refill")
    def __init__(self, rpm: int):
        self.rpm = rpm
        self.tokens = float(rpm)
        self.last_refill = time.monotonic()

    def _refill(self, now: float) -> None:
        elapsed = now - self.last_refill
        self.tokens = min(float(self.rpm), self.tokens + elapsed * (self.rpm / WINDOW_S))
        self.last_refill = now

    def try_consume(self, now: float) -> Optional[float]:
        self._refill(now)
        if self.tokens >= 1.0:
            self.tokens -= 1.0
            return None
        return (1.0 - self.tokens) / (self.rpm / WINDOW_S)


class NimRateLimiter:
    """Singleton rate limiter — Nvidia-only, per-RPM-tier token buckets."""

    _instance: Optional["NimRateLimiter"] = None
    _lock = threading.Lock()

    def __init__(self):
        self._buckets: Dict[str, _Bucket] = {}
        self._bucket_lock = threading.Lock()

    @classmethod
    def get(cls) -> "NimRateLimiter":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    @classmethod
    def reset(cls):
        with cls._lock:
            cls._instance = None

    def target_nvidia(self, base_url: str) -> bool:
        return "integrate.api.nvidia.com" in (base_url or "").lower()

    def _resolve_rpm(self, model: str) -> int:
        m = model.lower()
        best, best_len = "", 0
        for prefix, rpm in MODEL_RPM.items():
            if m.startswith(prefix) and len(prefix) > best_len:
                best, best_len = prefix, len(prefix)
        return MODEL_RPM.get(best, DEFAULT_RPM)

    def acquire(self, model: str) -> Optional[float]:
        rpm = self._resolve_rpm(model)
        key = str(rpm)
        now = time.monotonic()
        with self._bucket_lock:
            if key not in self._buckets:
                self._buckets[key] = _Bucket(rpm)
            return self._buckets[key].try_consume(now)
```

### 2. Modify `run_agent.py: A build_keepalive_http_client()` (line ~3989)

Add an httpx `request` event hook:

```python
@staticmethod
def _build_keepalive_http_client(base_url: str = "", *, verify: Any = True) -> Any:
    import httpx as _httpx
    ...
    
    # ── Event hooks ──────────────────────────────────────────────
    event_hooks: Dict[str, list] = {"request": [], "response": []}
    
    # NIM rate limiter: only activates for Nvidia endpoints
    _maybe_add_nim_rate_limit_hook(base_url, event_hooks)
    
    return _httpx.Client(
        ...
        event_hooks=event_hooks,
    )


def _maybe_add_nim_rate_limit_hook(base_url: str, hooks: dict) -> None:
    """Add NIM rate-limiting request hook if base_url targets Nvidia."""
    from agent.nim_rate_limiter import NimRateLimiter
    limiter = NimRateLimiter.get()
    if not limiter.target_nvidia(base_url):
        return
    
    def _nim_request_hook(request: Any) -> None:
        """Called by httpx before every request to Nvidia NIM."""
        # Extract model name from the request body (chat/completions POST).
        # Only throttle chat completion requests, not /models etc.
        if not request.url.path.endswith("/chat/completions"):
            return
        try:
            body = json.loads(request.content) if request.content else {}
            model = body.get("model", "")
            wait = limiter.acquire(model)
            if wait and wait > 0:
                time.sleep(wait)
        except Exception:
            pass  # Never let rate limiting crash a request
    
    hooks["request"].append(_nim_request_hook)
```

**Why parse the request body?** Because the model name isn't in the URL path — it's in the POST body. The OpenAI SDK sends `POST /v1/chat/completions` with a JSON body containing `{"model": "nvidia/nemotron-3-ultra-550b-a55b", ...}`. We read it at the httpx hook level before the request is sent.

## Why httpx event hooks over other approaches

| Approach | Pros | Cons |
|----------|------|------|
| **Event hooks** (chosen) | Non-invasive, catches all requests, zero perf cost for non-Nvidia | Need to parse request body for model name |
| Wrap OpenAI SDK `create()` | Cleaner model access | Misses auxiliary client calls, fragile to SDK changes |
| Custom httpx Transport | Catches stream chunks too | Over-engineered, breaks streaming |
| LiteLLM proxy | Already exists in config | Running another process, adds latency to every provider |

## Tasks

### Task 1: Create `agent/nim_rate_limiter.py`
- Token-bucket class with per-RPM-tier buckets
- `target_nvidia(base_url)` gate
- `acquire(model)` → sleep duration or None

### Task 2: Modify `run_agent.py`
- Add `_maybe_add_nim_rate_limit_hook()` helper function
- Call it from `_build_keepalive_http_client()` before returning the `httpx.Client`
- ~15 lines total

### Task 3: Test
- Select Nvidia provider in Hermes
- Fire rapid requests (5+ concurrent via subagents)
- Verify 0 429s returned
- Switch to OpenRouter/OpenCode — confirm no delay added

## Success Criteria
1. ✅ Nvidia NIM requests are throttled to safe RPM per model tier
2. ✅ 0 429 errors during sustained load on Nvidia provider
3. ✅ Zero latency added to OpenRouter, OpenCode, Gemini, Anthropic, etc.
4. ✅ No config changes needed — works automatically when Nvidia is selected
5. ✅ No new dependencies (no pip install needed)
