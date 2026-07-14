/**
 * NIM Model-Aware Rate Limiter (TypeScript)
 * 
 * Per-model + per-key rate limiting with empirically determined safe RPM limits.
 * Prevents 429s by enforcing each model's actual NIM limit (not a global 40 RPM).
 * 
 * Usage:
 *   import { nimModelLimiter } from './nimModelLimiter';
 *   await nimModelLimiter.acquire('nvidia/nemotron-3-ultra-550b-a55b'); // 1 RPM
 *   await nimModelLimiter.acquire('deepseek-ai/deepseek-v4-pro');        // 20 RPM
 *   await nimModelLimiter.acquire('meta/llama-3.1-8b-instruct');          // 28 RPM
 */

// Empirically determined safe RPM limits (80% of observed limit before 429)
export const MODEL_RPM_LIMITS: Record<string, number> = {
  // Portly models
  'meta/llama-3.1-8b-instruct': 28,
  'meta/llama-3.1-70b-instruct': 23,
  'mistralai/mixtral-8x22b-v0.1': 55,
  'mistralai/mixtral-8x7b-instruct-v0.1': 55,
  'nvidia/nemotron-3-ultra-550b-a55b': 1,
  'google/gemma-2-27b-it': 55,

  // Hermes / LiteLLM models  
  'deepseek-ai/deepseek-v4-pro': 20,
  'deepseek-ai/deepseek-v4-flash': 35,
  'qwen/qwen3.5-397b-a17b': 10,
  'mistralai/mistral-large-3': 15,

  // OpenCode model
  'mimo-v2.5-free': 40,
};

const DEFAULT_RPM = 35;
const WINDOW_MS = 60_000;
const STORAGE_KEY = 'nim_model_usage_v2';

// Storage abstraction for browser (localStorage) and Node.js (in-memory)
const memoryStorage = new Map<string, string>();

const storage = {
  getItem(key: string): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return memoryStorage.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(key, value);
        return;
      } catch {
        // fall through to memory
      }
    }
    memoryStorage.set(key, value);
  },
  removeItem(key: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(key);
        return;
      } catch {
        // fall through to memory
      }
    }
    memoryStorage.delete(key);
  },
};

interface ModelKeyUsage {
  timestamps: number[];
}

class NimModelLimiter {
  private usage: Record<string, ModelKeyUsage> = {};
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.load();
    }
  }

  private getKey(model: string, apiKey?: string): string {
    const keyHash = apiKey ? this.hashKey(apiKey) : 'default';
    return `${model}|${keyHash}`;
  }

  private hashKey(key: string): string {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36).slice(0, 8);
  }

  private load(): void {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      this.usage = raw ? JSON.parse(raw) : {};
    } catch {
      this.usage = {};
    }
  }

  private save(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(this.usage));
      } catch (e) {
        console.warn('[NimModelLimiter] Failed to save usage:', e);
      }
    }, 100);
  }

  private prune(key: string, now: number): void {
    const entry = this.usage[key];
    if (!entry) return;
    const cutoff = now - WINDOW_MS;
    entry.timestamps = entry.timestamps.filter(ts => ts > cutoff);
    if (entry.timestamps.length === 0) {
      delete this.usage[key];
    }
  }

  getModelLimit(model: string): number {
    return MODEL_RPM_LIMITS[model] ?? DEFAULT_RPM;
  }

  getStatus(model: string, apiKey?: string): {
    requestsInWindow: number;
    limit: number;
    remaining: number;
    waitTimeMs: number;
  } {
    const key = this.getKey(model, apiKey);
    const now = Date.now();
    this.prune(key, now);

    const entry = this.usage[key];
    const requestsInWindow = entry?.timestamps.length ?? 0;
    const limit = this.getModelLimit(model);
    const remaining = Math.max(0, limit - requestsInWindow);

    let waitTimeMs = 0;
    if (requestsInWindow >= limit && entry?.timestamps[0]) {
      waitTimeMs = Math.max(0, entry.timestamps[0] + WINDOW_MS - now);
    }

    return { requestsInWindow, limit, remaining, waitTimeMs };
  }

  async acquire(model: string, apiKey?: string, timeoutMs = 30_000): Promise<void> {
    const key = this.getKey(model, apiKey);
    const limit = this.getModelLimit(model);
    const start = Date.now();

    while (true) {
      const now = Date.now();
      this.prune(key, now);

      const entry = this.usage[key] ?? { timestamps: [] };
      if (entry.timestamps.length < limit) {
        entry.timestamps.push(now);
        this.usage[key] = entry;
        this.save();
        return;
      }

      const waitTime = entry.timestamps[0] + WINDOW_MS - now;
      const elapsed = now - start;
      if (elapsed >= timeoutMs) {
        throw new Error(`Rate limit timeout for model ${model} after ${timeoutMs}ms`);
      }

      const sleepMs = Math.min(Math.max(waitTime, 50), timeoutMs - elapsed);
      await new Promise(r => setTimeout(r, sleepMs));
    }
  }

  release(model: string, apiKey?: string): void {
    // Sliding window auto-expires; no explicit release needed
  }

  reset(): void {
    this.usage = {};
    storage.removeItem(STORAGE_KEY);
  }
}

export const nimModelLimiter = new NimModelLimiter();
export { NimModelLimiter };
export type { ModelKeyUsage };