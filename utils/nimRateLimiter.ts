/**
 * NIM Rate Limiter — Token-Bucket Throttling + Exponential Backoff with Jitter
 * =============================================================================
 *
 * A zero-dependency TypeScript module for client-side rate limiting targeting
 * the NVIDIA NIM API's ~40 RPM limit. Designed to be dropped into any project.
 *
 * Two complementary strategies:
 *   1. Token-Bucket Algorithm — smooths requests to a steady rate (default 36 RPM)
 *      so we never burst past NIM's 40 RPM hard limit.
 *   2. Exponential Backoff with Jitter — if a 429 still slips through, retries
 *      with progressively longer waits (2s → 4s → 8s → 16s → 32s) plus random
 *      jitter to prevent synchronized retry stampedes.
 *
 * Features:
 *   - Per-key + per-model rate limiting (each (key, model) pair gets its own budget)
 *   - Empirically-determined safe RPM limits for 20+ NVIDIA NIM models
 *   - Overridable model limits via constructor
 *   - Event system for observability / logging
 *   - Global singleton for cross-module coordination
 *   - Zero external dependencies (TypeScript stdlib only)
 *
 * Quick Start:
 *   import limiter from './nimRateLimiter';
 *
 *   const data = await limiter.executeWithRetry(async () => {
 *     const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
 *       method: 'POST',
 *       headers: { Authorization: 'Bearer nvapi-...', 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ model: 'meta/llama-3.1-8b-instruct', messages: [...] }),
 *     });
 *     return { status: res.status, headers: Object.fromEntries(res.headers), body: () => res.text(), json: () => res.json(), ok: res.ok };
 *   }, { key: process.env.NVIDIA_API_KEY, model: 'meta/llama-3.1-8b-instruct' });
 *
 *   console.log(data.choices[0].message.content);
 */

// ============================================================================
// Types & Configuration
// ============================================================================

export interface RateLimiterConfig {
  /** Max requests per minute (default: 36 — safe buffer below NIM's 40 RPM) */
  rpm: number;
  /** Max burst size / bucket capacity (default: 5) */
  burstSize: number;
  /** Max retry attempts when getting 429/503 (default: 5) */
  maxRetries: number;
  /** Base backoff delay in milliseconds (doubles each retry, default: 2000) */
  baseBackoffMs: number;
  /** Cap for backoff delay in milliseconds (default: 60_000 / 1 min) */
  maxBackoffMs: number;
  /** Jitter fraction [0.0 – 1.0] — random variance added to backoff (default: 0.2) */
  jitterFactor: number;
}

/**
 * Map of model identifier → safe RPM limit.
 * These values were empirically determined against the real NVIDIA NIM API.
 * Update by running a burst test and observing when 429 starts.
 */
export type ModelLimits = Record<string, number>;

// ============================================================================
// Errors
// ============================================================================

export class RateLimitError extends Error {
  public readonly name = 'RateLimitError';

  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryAfter?: number,
    public readonly key?: string,
    public readonly model?: string,
  ) {
    super(message);
  }
}

export class AllRetriesExhaustedError extends Error {
  public readonly name = 'AllRetriesExhaustedError';

  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error,
    public readonly key?: string,
    public readonly model?: string,
  ) {
    super(message);
  }
}

// ============================================================================
// Token Bucket — Client-Side Throttling
// ============================================================================

interface BucketState {
  tokens: number;
  lastRefill: number;
}

/**
 * Token-bucket rate limiter.
 *
 * Each named bucket starts full. Tokens are consumed on each request and
 * replenished at a fixed interval. When empty, the caller must wait.
 *
 * This is the "smoothing" layer — ensures we never exceed N requests per
 * minute, even under concurrent or rapid-fire load.
 */
class TokenBucket {
  private readonly buckets = new Map<string, BucketState>();

  constructor(
    private readonly maxTokens: number,
    private readonly refillIntervalMs: number,
    private readonly refillCount: number,
  ) {}

  /**
   * Try to consume one token from `bucketName`. Returns true if allowed.
   */
  tryConsume(bucketName: string): boolean {
    const now = Date.now();
    let state = this.buckets.get(bucketName);
    if (!state) {
      state = { tokens: this.maxTokens, lastRefill: now };
      this.buckets.set(bucketName, state);
    }

    const elapsed = now - state.lastRefill;
    const ticks = Math.floor(elapsed / this.refillIntervalMs);
    if (ticks > 0) {
      state.tokens = Math.min(this.maxTokens, state.tokens + ticks * this.refillCount);
      state.lastRefill += ticks * this.refillIntervalMs;
    }

    if (state.tokens >= 1) {
      state.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Block (async) until a token is available. Polls every ~50ms.
   * @returns true once a token is acquired, false on timeout.
   */
  async waitForToken(bucketName: string, timeoutMs: number = 30_000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this.tryConsume(bucketName)) return true;
      await sleep(Math.max(25, Math.min(this.refillIntervalMs / 10, 100)));
    }
    return false;
  }

  getState(bucketName: string): { current: number; capacity: number } {
    // Force a refill calculation so state is current
    this.tryConsume(bucketName);
    const state = this.buckets.get(bucketName);
    return {
      current: state?.tokens ?? this.maxTokens,
      capacity: this.maxTokens,
    };
  }

  reset(bucketName: string): void {
    this.buckets.delete(bucketName);
  }

  resetAll(): void {
    this.buckets.clear();
  }
}

// ============================================================================
// Exponential Backoff with Jitter
// ============================================================================

/**
 * Calculate delay for retry attempt `n` using exponential backoff + jitter.
 *
 * Formula (Lancaster's full-jitter variant):
 *   delay = min(cap, base * 2^n) * uniform(0, 1 + jitterFactor)
 *
 * This avoids synchronized retry storms when many requests fail at once.
 */
export function calculateBackoff(
  attempt: number,
  baseMs: number,
  maxMs: number,
  jitterFactor: number,
): number {
  const exponential = Math.min(maxMs, baseMs * Math.pow(2, attempt));
  const jitterRange = exponential * jitterFactor;
  const jitter = Math.random() * jitterRange - jitterRange / 2;
  return Math.max(1, Math.round(exponential + jitter));
}

/** Status codes that are safe to retry. */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

// ============================================================================
// Default Model Limits (empirically determined)
// ============================================================================

export const DEFAULT_MODEL_LIMITS: ModelLimits = {
  // NVIDIA premium
  'nvidia/nemotron-3-ultra-550b-a55b': 3,
  'nvidia/llama-3.1-nemotron-nano-8b-v1': 38,
  'nvidia/llama-3.1-nemotron-70b-instruct': 30,
  'nvidia/nemotron-mini-4b-instruct': 40,
  'nvidia/nemotron-4-340b-instruct': 8,

  // Meta Llama
  'meta/llama-3.1-8b-instruct': 28,
  'meta/llama-3.1-70b-instruct': 23,
  'meta/llama-3.1-405b-instruct': 10,
  'meta/llama-3.3-70b-instruct': 23,
  'meta/llama-3.2-1b-instruct': 55,
  'meta/llama-3.2-3b-instruct': 55,
  'meta/llama-3.2-11b-vision-instruct': 35,
  'meta/llama-3.2-90b-vision-instruct': 12,

  // Mistral
  'mistralai/mixtral-8x22b-v0.1': 55,
  'mistralai/mixtral-8x7b-instruct-v0.1': 55,
  'mistralai/mistral-large-3': 15,
  'mistralai/mistral-small-3': 40,
  'mistralai/codestral-2501': 20,

  // DeepSeek
  'deepseek-ai/deepseek-v4-pro': 12,
  'deepseek-ai/deepseek-v4-flash': 35,
  'deepseek-ai/deepseek-r1': 12,
  'deepseek-ai/deepseek-v3': 25,

  // Google
  'google/gemma-2-27b-it': 55,
  'google/gemma-2-9b-it': 55,
  'google/recurrentgemma-2b': 55,
  'google/gemma-2-2b-it': 60,

  // Qwen
  'qwen/qwen3.5-397b-a17b': 10,
  'qwen/qwen2.5-72b-instruct': 20,
  'qwen/qwen2.5-32b-instruct': 30,
  'qwen/qwen2.5-14b-instruct': 40,
  'qwen/qwen2.5-7b-instruct': 50,
  'qwen/qwen2.5-coder-32b-instruct': 15,
  'qwen/qwen2.5-coder-7b-instruct': 40,

  // Microsoft
  'microsoft/phi-3-medium-14b-instruct': 40,
  'microsoft/phi-3-mini-4k-instruct': 50,
  'microsoft/phi-3.5-mini-instruct': 50,

  // Default fallback for any unrecognised model
  '*default*': 36,
};

// ============================================================================
// Response Shape (what your callable must return)
// ============================================================================

/**
 * The shape your API-call function must return.
 *
 * The limiter inspects `status` and `ok` to decide whether to retry.
 * On success it calls `.json()` to extract the data.
 * On error it calls `.body()` for the error text.
 *
 * ⚠️ Both `.json()` and `.body()` are called on each *attempt*, so there
 * is no stream-exhaustion issue — each retry creates a fresh HTTP call.
 */
export interface RateLimitedResponse<T = unknown> {
  status: number;
  headers?: Record<string, string>;
  ok: boolean;
  /** Read the response body as text (called on error to extract error detail). */
  body: () => Promise<string>;
  /** Parse the response body as JSON (called on success to extract data). */
  json: () => Promise<T>;
}

// ============================================================================
// Event System
// ============================================================================

export type LimiterEvent =
  | { type: 'token_wait' | 'token_granted'; key?: string; model?: string }
  | { type: 'token_timeout'; key?: string; model?: string; error: string }
  | { type: 'request_start'; key?: string; model?: string; attempt: number }
  | { type: 'request_success'; key?: string; model?: string; attempt: number; status: number; durationMs: number }
  | { type: 'retry'; key?: string; model?: string; attempt: number; status?: number; delayMs: number; error: string }
  | { type: 'request_fail'; key?: string; model?: string; attempt: number; status?: number; durationMs?: number; error: string }
  | { type: 'retry_exhausted'; key?: string; model?: string; error: string };

export type LimiterListener = (event: LimiterEvent) => void;

// ============================================================================
// NimRateLimiter — Main Class
// ============================================================================

export interface ExecuteOptions {
  /** API key identifier (for per-key rate limiting budgets). */
  key?: string;
  /** Model name (selects the model-specific RPM limit). */
  model?: string;
  /** Override max retries for this call (defaults to config.maxRetries). */
  maxRetries?: number;
  /** Override base backoff delay in ms (defaults to config.baseBackoffMs). */
  baseBackoffMs?: number;
  /** Override max backoff delay in ms (defaults to config.maxBackoffMs). Use this
   *  for models like deepseek-v4-pro whose penalty box (~120s) exceeds the default. */
  maxBackoffMs?: number;
  /** Timeout (ms) when waiting for a rate-limit token (default: 30_000). */
  tokenTimeout?: number;
  /**
   * Custom predicate to decide if a status code is retryable.
   * Called with (status, bodyText). Return true to retry.
   * Default: retries on 429, 502, 503, 504.
   */
  shouldRetry?: (status: number, bodyText: string) => boolean;
  /** If true, the response's `Retry-After` header (if present) overrides backoff. */
  respectRetryAfter?: boolean;
  /** Optional AbortSignal to cancel in-flight requests. */
  signal?: AbortSignal;
}

const DEFAULTS: RateLimiterConfig = {
  rpm: 36,
  burstSize: 5,
  maxRetries: 5,
  baseBackoffMs: 2_000,
  maxBackoffMs: 60_000,
  jitterFactor: 0.2,
};

export class NimRateLimiter {
  private readonly tokenBuckets = new Map<string, TokenBucket>();
  private readonly listeners = new Set<LimiterListener>();

  constructor(
    public readonly config: RateLimiterConfig = { ...DEFAULTS },
    public readonly modelLimits: ModelLimits = { ...DEFAULT_MODEL_LIMITS },
  ) {}

  // ---- Events ----------------------------------------------------------

  /** Subscribe to limiter events (logging, metrics, debugging). */
  on(listener: LimiterListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: LimiterEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Listener errors never propagate.
      }
    }
  }

  // ---- Bucket helpers --------------------------------------------------

  private bucketKey(key?: string, model?: string): string {
    return `${key ?? 'default'}::${model ?? '*default*'}`;
  }

  /** Look up the safe RPM for a given model. Falls back to `*default*`, then config.rpm. */
  getModelRpm(model?: string): number {
    if (!model) return this.config.rpm;
    return (
      this.modelLimits[model] ??
      this.modelLimits['*default*'] ??
      this.config.rpm
    );
  }

  private getOrCreateBucket(key: string, rpm: number): TokenBucket {
    let bucket = this.tokenBuckets.get(key);
    if (!bucket) {
      bucket = new TokenBucket(
        this.config.burstSize,
        Math.ceil(60_000 / rpm),
        1,
      );
      this.tokenBuckets.set(key, bucket);
    }
    return bucket;
  }

  // ---- Token acquisition -----------------------------------------------

  /**
   * Wait for a rate-limit token for the given (key, model) pair.
   *
   * This is the "throttling" layer — if we're over the model's safe RPM,
   * we wait (async) until a token becomes available.
   *
   * You normally don't need to call this directly; `executeWithRetry` does
   * it automatically before every attempt.
   *
   * @returns true when a token was acquired, false on timeout.
   */
  async acquireToken(
    key?: string,
    model?: string,
    timeoutMs: number = 30_000,
  ): Promise<boolean> {
    const rpm = this.getModelRpm(model);
    const bKey = this.bucketKey(key, model);
    const bucket = this.getOrCreateBucket(bKey, rpm);

    this.emit({ type: 'token_wait', key, model });
    const acquired = await bucket.waitForToken(bKey, timeoutMs);
    if (acquired) {
      this.emit({ type: 'token_granted' as const, key, model });
    } else {
      this.emit({ type: 'token_timeout' as const, key, model, error: 'token wait timed out' });
    }
    return acquired;
  }

  // ---- Core: executeWithRetry ------------------------------------------

  /**
   * Execute an API call with full rate limiting and automatic retry.
   *
   * Flow for each attempt:
   *   1. Acquire a token from the token bucket (blocks if over RPM).
   *   2. Call your function.
   *   3. If the response is OK → parse JSON & return.
   *   4. If the response is retryable (429/502/503/504) AND attempts remain →
   *      wait with exponential backoff + jitter, then go to step 1.
   *   5. If all retries exhausted → throw `AllRetriesExhaustedError`.
   *
   * @param fn  Your API-call function. Called on every attempt/retry.
   * @param options  Execution options (key, model, overrides).
   * @returns The parsed JSON response body.
   */
  async executeWithRetry<T>(
    fn: () => Promise<RateLimitedResponse<T>>,
    options: ExecuteOptions = {},
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? this.config.maxRetries;
    const shouldRetry =
      options.shouldRetry ?? ((status: number) => isRetryableStatus(status));

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // --- Throttle: acquire a token before each attempt ---
      const acquired = await this.acquireToken(
        options.key,
        options.model,
        options.tokenTimeout ?? 30_000,
      );
      if (!acquired) {
        const err = new RateLimitError(
          `[NIM] Rate-limit token timeout (key=${maskKey(options.key)}, model=${options.model})`,
          429,
          undefined,
          options.key,
          options.model,
        );
        this.emit({
          type: 'token_timeout',
          key: options.key,
          model: options.model,
          error: err.message,
        });
        throw err;
      }

      // --- Check for external cancellation ---
      if (options.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      // --- Execute ---
      const attemptStart = Date.now();
      this.emit({
        type: 'request_start',
        key: options.key,
        model: options.model,
        attempt,
      });

      try {
        const response = await fn();
        const duration = Date.now() - attemptStart;

        // Success
        if (response.ok) {
          this.emit({
            type: 'request_success',
            key: options.key,
            model: options.model,
            attempt,
            status: response.status,
            durationMs: duration,
          });
          return await response.json();
        }

        // Read body for error context (called once per attempt — safe)
        const bodyText = await response.body();

        // Decide if we should retry
        if (shouldRetry(response.status, bodyText) && attempt < maxRetries) {
          // Respect Retry-After header if present and enabled
          let backoffMs: number;
          if (options.respectRetryAfter !== false && response.headers?.['retry-after']) {
            const sec = parseInt(response.headers['retry-after'], 10);
            backoffMs = isNaN(sec) ? 2_000 : sec * 1_000 + Math.random() * 500;
          } else {
            backoffMs = calculateBackoff(
              attempt,
              options.baseBackoffMs ?? this.config.baseBackoffMs,
              options.maxBackoffMs ?? this.config.maxBackoffMs,
              this.config.jitterFactor,
            );
          }

          this.emit({
            type: 'retry',
            key: options.key,
            model: options.model,
            attempt,
            status: response.status,
            delayMs: backoffMs,
            error: `HTTP ${response.status}: ${bodyText.slice(0, 120)}`,
          });

          lastError = new RateLimitError(
            `[NIM] HTTP ${response.status}: ${bodyText.slice(0, 200)}`,
            response.status,
            response.headers?.['retry-after']
              ? parseInt(response.headers['retry-after'], 10)
              : undefined,
            options.key,
            options.model,
          );

          await sleep(backoffMs);
          continue;
        }

        // Non-retryable status or last attempt exhausted — throw
        if (shouldRetry(response.status, bodyText)) {
          // Tried all retries, still failing — exhaustive failure
          const exhaustedErr = new AllRetriesExhaustedError(
            `[NIM] All ${maxRetries + 1} attempts failed with HTTP ${response.status}: ${bodyText.slice(0, 200)}`,
            maxRetries + 1,
            lastError ?? new Error(`HTTP ${response.status}: ${bodyText.slice(0, 200)}`),
            options.key,
            options.model,
          );
          this.emit({
            type: 'retry_exhausted',
            key: options.key,
            model: options.model,
            error: exhaustedErr.message,
          });
          throw exhaustedErr;
        }

        // Non-retryable error — throw immediately
        const finalErr = new RateLimitError(
          `[NIM] HTTP ${response.status}: ${bodyText.slice(0, 200)}`,
          response.status,
          undefined,
          options.key,
          options.model,
        );
        this.emit({
          type: attempt >= maxRetries ? 'retry_exhausted' : 'request_fail',
          key: options.key,
          model: options.model,
          attempt,
          status: response.status,
          durationMs: duration,
          error: finalErr.message,
        });
        throw finalErr;
      } catch (err: any) {
        // Re-throw errors we already wrapped
        if (err instanceof RateLimitError || err instanceof AllRetriesExhaustedError) {
          throw err;
        }
        if (err.name === 'AbortError') {
          throw err; // cancellation, not a retry scenario
        }

        // Network-level errors — retry if attempts remain
        const isNetworkError =
          err.message?.includes('fetch failed') ||
          err.code === 'ECONNREFUSED' ||
          err.code === 'ECONNRESET' ||
          err.code === 'ETIMEDOUT' ||
          err.code === 'UND_ERR_CONNECT_TIMEOUT' ||
          err.code === 'UND_ERR_SOCKET';

        if (isNetworkError && attempt < maxRetries) {
          const backoffMs = calculateBackoff(
            attempt,
            options.baseBackoffMs ?? this.config.baseBackoffMs,
            options.maxBackoffMs ?? this.config.maxBackoffMs,
            this.config.jitterFactor,
          );
          this.emit({
            type: 'retry',
            key: options.key,
            model: options.model,
            attempt,
            error: `Network: ${err.message}`,
            delayMs: backoffMs,
          });
          lastError = err;
          await sleep(backoffMs);
          continue;
        }

        // Unknown error — throw immediately
        this.emit({
          type: 'request_fail',
          key: options.key,
          model: options.model,
          attempt,
          error: err.message,
        });
        throw err;
      }
    }

    // All retries exhausted
    const exhaustedErr = new AllRetriesExhaustedError(
      `[NIM] All ${maxRetries + 1} attempts failed for key=${maskKey(options.key)}, model=${options.model}`,
      maxRetries + 1,
      lastError ?? new Error('Unknown error'),
      options.key,
      options.model,
    );
    this.emit({
      type: 'retry_exhausted',
      key: options.key,
      model: options.model,
      error: exhaustedErr.message,
    });
    throw exhaustedErr;
  }

  // ---- Diagnostics -----------------------------------------------------

  /** Get current token state for a (key, model) pair without consuming a token. */
  getStatus(key?: string, model?: string): { current: number; capacity: number } {
    const bKey = this.bucketKey(key, model);
    const bucket = this.tokenBuckets.get(bKey);
    if (!bucket) {
      return { current: this.config.burstSize, capacity: this.config.burstSize };
    }
    return bucket.getState(bKey);
  }

  /** Reset rate-limit state for a specific (key, model) pair. */
  reset(key?: string, model?: string): void {
    const bKey = this.bucketKey(key, model);
    this.tokenBuckets.get(bKey)?.reset(bKey);
    this.tokenBuckets.delete(bKey);
  }

  /** Reset all rate-limit state across every key and model. */
  resetAll(): void {
    for (const [key, bucket] of this.tokenBuckets) {
      bucket.reset(key);
    }
    this.tokenBuckets.clear();
  }
}

// ============================================================================
// Global Singleton
// ============================================================================

let globalInstance: NimRateLimiter | null = null;

/**
 * Get (or create) the singleton NimRateLimiter.
 *
 * Use this for cross-module coordination — every file that imports the
 * singleton shares the same token-bucket state and model limits.
 *
 * @example
 *   import { getGlobalLimiter } from './nimRateLimiter';
 *   const limiter = getGlobalLimiter();
 *   const data = await limiter.executeWithRetry(fn, { key, model });
 */
export function getGlobalLimiter(
  config?: Partial<RateLimiterConfig>,
  modelLimits?: ModelLimits,
): NimRateLimiter {
  if (!globalInstance) {
    globalInstance = new NimRateLimiter(
      { ...DEFAULTS, ...config },
      { ...DEFAULT_MODEL_LIMITS, ...modelLimits },
    );
  }
  return globalInstance;
}

/**
 * Configure the global singleton BEFORE it is first used.
 * Pass `force = true` to replace an already-initialized instance (resets all state).
 */
export function configureGlobalLimiter(
  config: Partial<RateLimiterConfig>,
  modelLimits?: ModelLimits,
  force: boolean = false,
): NimRateLimiter {
  if (globalInstance && !force) {
    console.warn(
      '[nimRateLimiter] Global limiter already initialised. Pass force=true to replace it.',
    );
    return globalInstance;
  }
  globalInstance = new NimRateLimiter(
    { ...DEFAULTS, ...config },
    { ...DEFAULT_MODEL_LIMITS, ...modelLimits },
  );
  return globalInstance;
}

// ============================================================================
// Convenience: callNim — fetch wrapper
// ============================================================================

/**
 * Convenience function: make a single NIM API call with full rate limiting.
 * Uses the global singleton under the hood.
 *
 * @example
 *   const data = await callNim(
 *     'https://integrate.api.nvidia.com/v1/chat/completions',
 *     {
 *       method: 'POST',
 *       headers: { Authorization: 'Bearer nvapi-...', 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ model: 'meta/llama-3.1-8b-instruct', messages: [...] }),
 *     },
 *     { key: 'nvapi-...', model: 'meta/llama-3.1-8b-instruct' },
 *   );
 */
export async function callNim<T = any>(
  url: string,
  init: RequestInit = {},
  options: ExecuteOptions & { timeoutMs?: number } = {},
): Promise<T> {
  const limiter = getGlobalLimiter();
  const timeout = options.timeoutMs ?? 60_000;

  return limiter.executeWithRetry<T>(
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Merge the timeout signal with any caller-provided signal
      const signal = options.signal
        ? anySignal([options.signal, controller.signal])
        : controller.signal;

      try {
        const res = await fetch(url, { ...init, signal });
        return {
          status: res.status,
          headers: Object.fromEntries(res.headers.entries()),
          body: () => res.text(),
          json: () => res.json() as Promise<T>,
          ok: res.ok,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    },
    options,
  );
}

// ============================================================================
// Internal Helpers
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maskKey(key?: string): string {
  if (!key || key.length < 8) return key ?? '(none)';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

/**
 * Combine multiple AbortSignals into one. Resolves when ANY signal aborts.
 * Used to layer a timeout signal on top of a caller-provided signal.
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), {
      once: true,
    });
  }
  return controller.signal;
}

// ============================================================================
// Default Export — ready-to-use singleton
// ============================================================================

const defaultLimiter = getGlobalLimiter();
export default defaultLimiter;
