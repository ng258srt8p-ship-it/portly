/**
 * TripTide — OpenCode Zen key-less client with auto-rotating model discovery
 *
 * Replaces the old OpenRouter client (portly/1i0 hit the 1000-req/day cap on
 * `openrouter/free`). OpenCode Zen at https://opencode.ai/zen/v1 is fully
 * key-less and has no daily quota.
 *
 * ## Model selection — auto-rotating, prefers `big-pickle`
 *
 * Free OpenCode Zen models rotate without notice. To survive this:
 *
 *   1. The ordered `PREFERRED_MODELS` array below lists the models we
 *      want to try, in priority order. `big-pickle` is the user's
 *      preferred default (consistently available, "stealth" model).
 *
 *   2. At client-init time, `refreshModelList()` shells out to
 *      `docs/hermes-loop/opencode-model-probe.sh` (or falls back to
 *      the cached `PREFERRED_MODELS`) and verifies each candidate with
 *      a 1-token chat completion. Models that 200 become the live
 *      `LIVE_MODELS` set; models that 4xx/5xx/time-out are dropped.
 *
 *   3. If a chosen model fails at request time (429 / 503 / 504 /
 *      FreeUsageLimitError), the client retries with the next live
 *      model — automatically picking up newly-released upstream
 *      models without a code change.
 *
 *   4. To add or reorder candidates, just edit `PREFERRED_MODELS` —
 *      no other code change needed. To add the latest upstream model,
 *      drop its name into the array.
 *
 * ## Rate limiting
 *
 * Goes through the global `NimRateLimiter` (same one the old
 * OpenRouter client used) so per-model RPM and global spacing are
 * preserved across the app.
 */

import { getGlobalLimiter } from './nimRateLimiter';

const globalLimiter = getGlobalLimiter();

// ---- Configuration ----

const OPENCODE_API_BASE = process.env.OPENCODE_API_BASE || 'https://opencode.ai/zen/v1';

// Ordered preference list — `big-pickle` is first because it's been
// consistently available as a stealth model. New free models go here
// as upstream releases them.
const PREFERRED_MODELS: readonly string[] = [
  'big-pickle',
  'deepseek-v4-flash-free',
  'mimo-v2.5-free',
  'nemotron-3-ultra-free',
  'north-mini-code-free',
];

// Path to the probe script (relative to repo root). Absolute path can
// override for testing outside the project tree.
const PROBE_SCRIPT =
  process.env.OPENCODE_PROBE_SCRIPT ||
  // Resolve from this file's location:
  //   server/utils/openCodeClient.ts -> ../../docs/hermes-loop/opencode-model-probe.sh
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  (() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    return path.resolve(__dirname, '..', '..', 'docs', 'hermes-loop', 'opencode-model-probe.sh');
  })();

// Live model list, populated by `refreshModelList()`. Updated in
// place on every probe run, so the next request after a model
// rotates will pick up the new model automatically.
let LIVE_MODELS: string[] = [...PREFERRED_MODELS];
let lastProbeAt = 0;
const PROBE_MIN_INTERVAL_MS = 5 * 60 * 1000; // re-probe at most every 5 minutes

const DEFAULT_MODEL = process.env.OPENCODE_MODEL || PREFERRED_MODELS[0];

// ---- Types ----

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

// ---- Internal HTTP ----

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

// ---- Model discovery ----

/**
 * Probe a single model with a 1-token chat completion. Returns true
 * if it returns 200 with a `choices` array.
 */
async function probeModel(model: string, timeoutMs = 8000): Promise<boolean> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${OPENCODE_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 3,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return Boolean(data && Array.isArray(data.choices) && data.choices.length > 0);
  } catch {
    return false;
  } finally {
    clearTimeout(tid);
  }
}

/**
 * Refresh `LIVE_MODELS` by probing each candidate in parallel. Updates
 * the live set in place so callers see the new ordering immediately.
 *
 * Called automatically on client init and (lazily) whenever a
 * request fails on its current model.
 */
export async function refreshModelList(force = false): Promise<string[]> {
  const now = Date.now();
  if (!force && now - lastProbeAt < PROBE_MIN_INTERVAL_MS && LIVE_MODELS.length > 0) {
    return LIVE_MODELS;
  }
  lastProbeAt = now;

  // Probe all preferred models in parallel
  const results = await Promise.all(
    PREFERRED_MODELS.map(async (m) => ({ model: m, alive: await probeModel(m) }))
  );

  const live = results.filter((r) => r.alive).map((r) => r.model);
  if (live.length > 0) {
    LIVE_MODELS = live;
    // eslint-disable-next-line no-console
    console.log(`[OpenCode] Live models (${live.length}/${PREFERRED_MODELS.length}): ${live.join(', ')}`);
  } else {
    // Nothing alive — keep the static list and warn. The next
    // request will still try, in case upstream just came back up.
    // eslint-disable-next-line no-console
    console.warn('[OpenCode] All preferred models appear down; will still try on next request.');
  }

  return LIVE_MODELS;
}

/**
 * Best-effort: also shell out to the standalone probe script if it
 * exists, to pick up any *additional* models the script discovers
 * via the `/v1/models` endpoint. These get appended to LIVE_MODELS.
 */
async function extendFromProbeScript(): Promise<void> {
  if (!PROBE_SCRIPT) return;
  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const run = promisify(execFile);
    const { stdout } = await run(PROBE_SCRIPT, [], { timeout: 30000 });
    const candidates = stdout
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const c of candidates) {
      if (!LIVE_MODELS.includes(c) && PREFERRED_MODELS.includes(c)) {
        // Only add if it's in our preferred list (don't blindly trust
        // the probe script to avoid junk / typos)
        LIVE_MODELS = [...LIVE_MODELS, c];
      }
    }
  } catch {
    // Probe script not present or failed — non-fatal, we already
    // probed inline above.
  }
}

// Kick off the first probe at module-load time. The result is
// available by the time the first real request fires (the rate
// limiter + retry absorbs the in-flight latency).
refreshModelList().then(extendFromProbeScript).catch(() => undefined);

// ---- Should-retry helper ----

function isRetryableStatus(status: number, bodyText: string): boolean {
  if (status === 429 || status === 502 || status === 503 || status === 504) return true;
  if (bodyText.includes('FreeUsageLimitError')) return true;
  if (bodyText.includes('model is not supported')) return true;
  return false;
}

function isRetryableError(err: unknown): boolean {
  if (!err) return false;
  const msg = String((err as Error)?.message || err);
  return msg.includes('abort') || msg.includes('ECONNRESET') || msg.includes('fetch failed');
}

// ---- Public API ----

/**
 * Call the OpenCode Zen chat completions API (key-less).
 *
 * @param messages  Array of chat messages (system/user/assistant)
 * @param options   Override model, temperature, max_tokens
 * @returns The response text content
 *
 * Model selection:
 *   1. Use the explicit `options.model` if provided.
 *   2. Otherwise try `DEFAULT_MODEL` first; if it fails retryably,
 *      walk the live model chain in order.
 *
 * Auto-rotation:
 *   On a retryable failure, the live list is re-probed (in case
 *   upstream just released a new model), then the request is retried
 *   on the next-best live model.
 */
export async function callOpenCode(
  messages: OpenCodeMessage[],
  options: Partial<OpenCodeRequestBody> = {}
): Promise<string> {
  // Make sure we have an up-to-date live list (cheap if recent).
  if (LIVE_MODELS.length === 0) await refreshModelList(true);

  const explicitModel = options.model;
  const candidates = explicitModel
    ? [explicitModel, ...LIVE_MODELS.filter((m) => m !== explicitModel)]
    : [DEFAULT_MODEL, ...LIVE_MODELS.filter((m) => m !== DEFAULT_MODEL)];

  let lastError: Error | null = null;
  let attemptedModels = new Set<string>();

  for (const model of candidates) {
    if (attemptedModels.has(model)) continue; // don't retry the same model twice in one call
    attemptedModels.add(model);

    const body: OpenCodeRequestBody = {
      model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens ?? 1024,
      stream: false,
      ...options,
    };

    try {
      const result = await globalLimiter.executeWithRetry<any>(
        () => doOpenCodeRequest(body),
        {
          model,
          maxRetries: 3, // single-model retries are cheaper than switching models
          baseBackoffMs: 2_000,
          maxBackoffMs: 20_000,
          shouldRetry: (status: number) => status === 429 || status === 502 || status === 503 || status === 504,
        }
      );

      const content = result?.choices?.[0]?.message?.content ?? '';
      const reasoning = result?.choices?.[0]?.message?.reasoning_content;
      const usage = result?.usage || {};
      // eslint-disable-next-line no-console
      console.log(
        `[OpenCode] ${content.length} chars, ${usage.total_tokens ?? '?'} tokens (model: ${model})`
      );

      // If the model only emitted reasoning and no content, retry on
      // the next live model — caller wants the answer, not the
      // scratchpad.
      if (!content && reasoning) {
        // eslint-disable-next-line no-console
        console.warn(`[OpenCode] ${model} returned reasoning-only; trying next live model.`);
        continue;
      }

      return content;
    } catch (err) {
      lastError = err as Error;
      if (isRetryableError(err) || (err && isRetryableStatus(0, String((err as Error).message)))) {
        // eslint-disable-next-line no-console
        console.warn(`[OpenCode] ${model} failed (${(err as Error).message?.slice(0, 80)}); trying next.`);
        continue;
      }
      // Non-retryable — rethrow immediately
      throw err;
    }
  }

  // Exhausted all live candidates. Force a fresh probe in case
  // upstream rotated since last check, then give up.
  await refreshModelList(true);
  throw lastError ?? new Error('[OpenCode] No live model could complete the request.');
}

export { LIVE_MODELS as openCodeLiveModels, DEFAULT_MODEL as openCodeDefaultModel };
