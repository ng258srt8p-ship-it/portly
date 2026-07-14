/**
 * Migration compatibility shim — wraps callOpenCode as NimClient with model-aware rate limiting.
 *
 * Provides the same NimClient class interface but delegates all
 * AI calls to OpenCode's free endpoint, with per-model rate limiting.
 *
 * Timeline: Remove once agents/ are migrated to callOpenCode directly.
 */

import { callOpenCode } from '../server/utils/openCodeClient';
import { nimModelLimiter, MODEL_RPM_LIMITS } from './nimModelLimiter';

// ---- Types ----

export interface NimChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface NimChatCompletionOptions {
  messages: NimChatMessage[];
  model?: string;
  max_tokens?: number;
  temperature?: number;
  [key: string]: unknown;
}

// ---- NimClient shim with model-aware rate limiting ----

export class NimClient {
  private useNim: boolean;
  private apiKey?: string;

  constructor(options?: { apiKey?: string; [key: string]: unknown }) {
    this.useNim = true;
    this.apiKey = options?.apiKey;
  }

  async chatCompletion(options: NimChatCompletionOptions): Promise<{
    choices: { message: { content: string } }[];
  }> {
    const model = options.model || 'mimo-v2.5-free';
    const messages = options.messages || [];

    // Acquire rate limit slot for this specific model
    await nimModelLimiter.acquire(model, this.apiKey);

    try {
      const result = await callOpenCode(messages, {
        model,
        max_tokens: options.max_tokens,
        temperature: options.temperature,
      });
      return {
        choices: [{ message: { content: result } }],
      };
    } finally {
      // Sliding window auto-releases; no explicit release needed
    }
  }

  getRateLimitStatus(model?: string): { remaining: number; resetAt: number; limit: number } {
    const m = model || 'mimo-v2.5-free';
    const status = nimModelLimiter.getStatus(m, this.apiKey);
    return {
      remaining: status.remaining,
      resetAt: Date.now() + status.waitTimeMs,
      limit: status.limit,
    };
  }

  /** Get the safe RPM limit for a model */
  static getModelLimit(model: string): number {
    return MODEL_RPM_LIMITS[model] ?? 35;
  }
}

export function createNimClientFromEnv(options?: { apiKey?: string; [key: string]: unknown }): NimClient {
  return new NimClient(options);
}

// Re-export the model-aware limiter for direct use
export { nimModelLimiter, MODEL_RPM_LIMITS } from './nimModelLimiter';