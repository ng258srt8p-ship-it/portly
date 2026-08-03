/**
 * LEGACY — NOT USED IN PRODUCTION
 *
 * This file is from the pre-Worker era when enrichment ran in a Node.js
 * server process. The active enrichment path is now Cloudflare Workers AI
 * (see workers/src/enrich-sailing.ts). This file is kept for reference only
 * and is NOT deployed to Cloudflare.
 *
 * Migration history: OpenRouter (1000 req/day cap) → OpenCode Zen (keyless)
 * → Cloudflare Workers AI (free, 10k neurons/day, no API key needed).
 */

/**
 * TripTide — OpenCode Zen key-less client with auto-rotating model discovery
 *                and per-model daily-quota tracking
 *
 * Replaces the old OpenRouter client whose 1000-req/day free-tier cap was
 * unsustainable.  OpenCode Zen at https://opencode.ai/zen/v1 is key-less
 * and has **no documented daily quota**, but some models may temporarily
 * return 429 or FreeUsageLimitError.  This client blacklists those models
 * until the next UTC midnight so healthy models aren't starved.
 *
 *
 * ## Model selection — auto-rotating, prefers `big-pickle`
 *
 * Free OpenCode Zen models rotate without notice.  To survive this:
 *
 *   1. The ordered `PREFERRED_MODELS` array below lists the models we
 *      want to try, in priority order.  `big-pickle` is the stealth
 *      free model the user prefers (consistently available).
 *
 *   2. At client-init time `refreshModelList()` queries
 *      `GET /v1/models` to discover every model whose id contains
 *      `-free` and also the known `big-pickle` (which lacks the
 *      `-free` suffix).  These are probed with a 1-token request.
 *      Models that 200 become the live `LIVE_MODELS` set.
 *
 *   3. If a chosen model hits a retryable error (429 / 503 / 504 /
 *      FreeUsageLimitError in the body) the client retries the next
 *      live model and **cooldowns the failed model until 00:00 UTC**.
 *
 *   4. To add or reorder candidates, edit `PREFERRED_MODELS` or the
 *      `STEALTH_FREE` set — no other code change needed.
 *
 *
 * ## Daily-quota handling
 *
 * OpenCode Zen does not publish rate-limit headers.  Instead the client
 * infers a quota hit when it sees:
 *   - HTTP 429
 *   - Body text containing `FreeUsageLimitError`
 *
 * When this happens the failing model is **cooldowned until 00:00 UTC**
 * so it isn't retried again for the rest of the day.  The next healthy
 * model in the live chain is used instead.
 *
 *
 * ## Reasoning-aware extraction
 *
 * Some models (`big-pickle`, `ling-3.0-flash-free`) emit full responses
 * in `reasoning_content` and leave `content` empty for short prompts.
 * The client skips these only when the caller's budget is reasonable
 * (maxTokens >= 256); for short prompts the model that slurps its budget
 * on reasoning gets rotated to the next — but the `big-pickle` fallback
 * is always available as a last resort if no other model produces content.
 *
 * ## Rate limiting
 *
 * Goes through the global `NimRateLimiter` (same one the old OpenRouter
 * client used) so per-model RPM and global spacing are preserved.
 */

import { getGlobalLimiter } from './nimRateLimiter';

const globalLimiter = getGlobalLimiter();

// ==========================================================================
// Configuration
// ==========================================================================

const OPENCODE_API_BASE =
  process.env.OPENCODE_API_BASE || 'https://opencode.ai/zen/v1';

/**
 * Preferred models (explicit, ordered by priority).
 * `big-pickle` is first — stealth free model, consistently available,
 * large context window.
 *
 * Models whose id contains `-free` are *also* auto-discovered from
 * the `/v1/models` endpoint at client init, so adding a new free model
 * here just bumps its priority.  Removing a model from this list does
 * NOT prevent it from being auto-discovered — it just drops in priority
 * behind explicitly-listed candidates.
 */
const PREFERRED_MODELS: readonly string[] = [
  'big-pickle',               // stealth free, large context, user's preference
  'deepseek-v4-flash-free',   // code-specialised, large context
  'laguna-s-2.1-free',        // fast, clean JSON
  'ling-3.0-flash-free',      // fast, JSON-capable
  'mimo-v2.5-free',           // well-known fallback
  'nemotron-3-ultra-free',    // NVIDIA model fallback
  'north-mini-code-free',     // tiny code model, last resort
];

/**
 * "Stealth" free models — models that are free to use but whose id
 * does NOT contain the substring `-free` (or just `free`).  The
 * `/v1/models` endpoint won't auto-classify these, so they must be
 * listed explicitly.
 */
const STEALTH_FREE: readonly string[] = ['big-pickle'];

// Live model list — populated by `refreshModelList()`.
let LIVE_MODELS: string[] = [...PREFERRED_MODELS];
let lastProbeAt = 0;
const PROBE_MIN_INTERVAL_MS = 5 * 60 * 1000; // re-probe at most every 5 min

const DEFAULT_MODEL = process.env.OPENCODE_MODEL || PREFERRED_MODELS[0];

// Per-model daily cooldown — a model is skipped until the next UTC
// midnight after it hits a quota error.
const MODEL_COOLDOWN_MAP = new Map<string, number>();

// ==========================================================================
// Types
// ==========================================================================

export interface OpenCodeMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenCodeRequestBody {
  model: string;
  messages: OpenCodeMessage[];
  temperature: number;
  max_tokens: number;
  stream: boolean;
  [key: string]: unknown;
}

export interface OpenCodeResponse {
  status: number;
  ok: boolean;
  body: () => Promise<string>;
  json: () => Promise<any>;
}

// ==========================================================================
// Internal HTTP
// ==========================================================================

async function doOpenCodeRequest(body: OpenCodeRequestBody): Promise<OpenCodeResponse> {
  const res = await fetch(`${OPENCODE_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return {
    status: res.status,
    ok: res.ok,
    body: () => res.text(),
    json: () => res.json().catch(() => ({})),
  };
}

// ==========================================================================
// Model discovery
// ==========================================================================

/**
 * Query the upstream `/v1/models` endpoint to discover all models whose
 * id contains `-free`, plus any stealth models listed in `STEALTH_FREE`.
 * Returns deduplicated array.
 */
async function discoverFromModelsEndpoint(): Promise<string[]> {
  try {
    const res = await fetch(`${OPENCODE_API_BASE}/models`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: Array<{ id: string }> };
    const all = data?.data ?? [];
    const discovered = new Set<string>();

    // Add known stealth-free models
    for (const s of STEALTH_FREE) discovered.add(s);

    // Add all models whose id contains "-free" (case-insensitive)
    for (const m of all) {
      if (
        (m.id && m.id.toLowerCase().includes('-free')) ||
        m.id.toLowerCase().includes('free')
      ) {
        discovered.add(m.id);
      }
    }
    return Array.from(discovered);
  } catch {
    return [];
  }
}

/**
 * Probe a single model with a 1-token chat completion.  Returns true
 * if it returns 200 with a `choices` array.
 */
async function probeModel(model: string, timeoutMs = 8000): Promise<boolean> {
  try {
    const res = await fetch(`${OPENCODE_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 3,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { choices?: unknown[] };
    return Boolean(data && Array.isArray(data.choices) && data.choices.length > 0);
  } catch {
    return false;
  }
}

// ---- Daily-cooldown helpers ----

/** Return the epoch-millis of the next UTC midnight. */
function nextUtcMidnight(): number {
  const now = new Date();
  const mid = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
  return mid;
}

/** Check if a model is currently cooldowned. */
function isCooldowned(model: string): boolean {
  const until = MODEL_COOLDOWN_MAP.get(model);
  if (until === undefined) return false;
  if (Date.now() >= until) {
    MODEL_COOLDOWN_MAP.delete(model);
    return false;
  }
  return true;
}

/** Cooldown a model until the next UTC midnight. */
function cooldownModel(model: string): void {
  const until = nextUtcMidnight();
  MODEL_COOLDOWN_MAP.set(model, until);
  // eslint-disable-next-line no-console
  console.warn(`[OpenCode] ${model} cooldowned until ${new Date(until).toISOString().slice(0, 19)}Z`);
}

// ==========================================================================

/**
 * Refresh `LIVE_MODELS` by:
 *   1. Querying `/v1/models` for all `-free` + stealth models
 *   2. Probing each candidate in parallel
 *   3. Pruning cooldowned models
 *   4. Ordering by PREFERRED_MODELS priority, then newly-discovered models
 *
 * Called automatically at client init and (lazily) whenever a
 * request fails on its current model.
 */
export async function refreshModelList(force = false): Promise<string[]> {
  const now = Date.now();
  if (!force && now - lastProbeAt < PROBE_MIN_INTERVAL_MS && LIVE_MODELS.length > 0) {
    return LIVE_MODELS;
  }
  lastProbeAt = now;

  // --- Build candidate list: preferred first, then discovered ---
  const preferredSet = new Set(PREFERRED_MODELS);
  const discovered = await discoverFromModelsEndpoint();
  const candidateSet = new Set<string>();

  // Preferred models first, in order
  for (const m of PREFERRED_MODELS) candidateSet.add(m);
  // Then any discovered model not already covered
  for (const m of discovered) {
    if (!candidateSet.has(m)) candidateSet.add(m);
  }

  // --- Probe all candidates in parallel ---
  const candidates = Array.from(candidateSet);
  const prober = candidates.map((m) => probeModel(m).then((alive) => ({ model: m, alive })));
  const results = await Promise.all(prober);

  // Cooldowned models are excluded even if alive
  const live = results
    .filter((r) => r.alive && !isCooldowned(r.model))
    .map((r) => r.model);

  // --- Order: preferred order first, then discovered, preserving relative order ---
  const ordered: string[] = [];
  const added = new Set<string>();
  for (const m of PREFERRED_MODELS) {
    if (live.includes(m) && !added.has(m)) {
      ordered.push(m);
      added.add(m);
    }
  }
  for (const m of live) {
    if (!added.has(m)) {
      ordered.push(m);
      added.add(m);
    }
  }

  if (ordered.length > 0) {
    LIVE_MODELS = ordered;
    // eslint-disable-next-line no-console
    console.log(
      `[OpenCode] Live models (${ordered.length}/${candidates.length}): ${ordered.join(', ')}`
    );
  } else {
    // eslint-disable-next-line no-console
    console.warn('[OpenCode] All candidates appear down or cooldowned; will retry on next request.');
  }

  return LIVE_MODELS;
}

// Kick off the first probe at module-load time.
refreshModelList().catch(() => undefined);

// ==========================================================================
// Should-retry helpers
// ==========================================================================

/** Check if the response body indicates a quota hit — if so, cooldown. */
function checkQuotaBody(model: string, bodyText: string): boolean {
  if (bodyText.includes('FreeUsageLimitError') || bodyText.includes('insufficient_quota')) {
    cooldownModel(model);
    return true;
  }
  return false;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function isRetryableError(err: unknown): boolean {
  if (!err) return false;
  const msg = String((err as Error)?.message || err);
  return msg.includes('abort') || msg.includes('ECONNRESET') || msg.includes('fetch failed');
}

// ==========================================================================
// Public API
// ==========================================================================

/**
 * Call the OpenCode Zen chat completions API (key-less).
 *
 * Walks the live model chain:
 *   1. `options.model` (explicit override) or `DEFAULT_MODEL`
 *   2. Remaining live models not yet tried
 *   3. On quota hits, cooldowns the failing model until UTC midnight
 *   4. When all live models are exhausted, forces a fresh probe
 *
 * @param messages  Array of chat messages (system/user/assistant)
 * @param options   Override model, temperature, max_tokens
 * @returns The response text content
 */
export async function callOpenCode(
  messages: OpenCodeMessage[],
  options: Partial<OpenCodeRequestBody> = {}
): Promise<string> {
  if (LIVE_MODELS.length === 0) await refreshModelList(true);

  const explicitModel = options.model;

  // Build candidate chain: explicit → default → remaining
  const candidates: string[] = [];
  const added = new Set<string>();

  if (explicitModel) {
    candidates.push(explicitModel);
    added.add(explicitModel);
  }
  // Add default if different
  if (!added.has(DEFAULT_MODEL)) {
    candidates.push(DEFAULT_MODEL);
    added.add(DEFAULT_MODEL);
  }
  // Add remaining live models
  for (const m of LIVE_MODELS) {
    if (!added.has(m)) {
      candidates.push(m);
      added.add(m);
    }
  }

  let lastError: Error | null = null;
  let reasoningCount = 0;

  for (const model of candidates) {
    if (isCooldowned(model)) continue;

    const maxTokens = options.max_tokens ?? 1024;

    const body: OpenCodeRequestBody = {
      model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: maxTokens,
      stream: false,
      ...options,
    };

    try {
      const result = await globalLimiter.executeWithRetry<any>(
        () => doOpenCodeRequest(body),
        {
          model,
          maxRetries: 3,
          baseBackoffMs: 2_000,
          maxBackoffMs: 20_000,
          shouldRetry: (status: number) => isRetryableStatus(status),
        }
      );

      const content = (result?.choices?.[0]?.message?.content ?? '').trim();
      const reasoning = result?.choices?.[0]?.message?.reasoning_content;
      const usage = result?.usage || {};

      // --- Quota detection in response body ---
      if (result?.error?.message) {
        const errMsg: string = result.error.message;
        if (checkQuotaBody(model, errMsg)) continue;
      }

      // --- Normal logging ---
      // eslint-disable-next-line no-console
      console.log(
        `[OpenCode] ${content.length} chars, ${usage.total_tokens ?? '?'} tokens (model: ${model})`
      );

      // --- Reasoning-only guard: skip only when the model burned its
      //     budget on reasoning for short prompts; but for long
      //     prompts (maxTokens >= 256) reasoning + content is
      //     expected and we can still use the model.
      if (!content && reasoning && maxTokens < 256) {
        reasoningCount++;
        if (reasoningCount <= 2) {
          // eslint-disable-next-line no-console
          console.warn(
            `[OpenCode] ${model} returned reasoning-only (maxTokens=${maxTokens}); trying next live model.`
          );
          continue;
        }
      }

      if (!content) {
        // Empty response — maybe a quota edge case
        // eslint-disable-next-line no-console
        console.warn(`[OpenCode] ${model} returned empty content; trying next.`);
        continue;
      }

      return content;
    } catch (err) {
      lastError = err as Error;

      // --- Cooldown on quota hits ---
      if (err && typeof (err as any).status === 'number' && (err as any).status === 429) {
        cooldownModel(model);
        continue;
      }

      // --- Check error message for quota/free-limit ---
      if (err && (err as Error).message) {
        if (checkQuotaBody(model, (err as Error).message)) continue;
      }

      if (isRetryableError(err)) {
        // eslint-disable-next-line no-console
        console.warn(
          `[OpenCode] ${model} network error (${(err as Error).message?.slice(0, 80)}); trying next.`
        );
        continue;
      }

      // Non-retryable — rethrow immediately
      throw err;
    }
  }

  // Exhausted all candidates. Force a fresh probe and give up.
  await refreshModelList(true);
  throw lastError ?? new Error('[OpenCode] No live model could complete the request.');
}

export { LIVE_MODELS as openCodeLiveModels, DEFAULT_MODEL as openCodeDefaultModel };