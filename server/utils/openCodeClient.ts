/**
 * TripTide — OpenCode API Client (free, no API key required)
 *
 * OpenAI-compatible HTTP client for the OpenCode free endpoint.
 * Uses the mimo-v2.5-free model at https://opencode.ai/zen/v1
 * with centralized rate limiting + retry via NimRateLimiter.
 *
 * Features:
 * - No API key required (free tier)
 * - Centralized rate limiting via NimRateLimiter (global singleton)
 * - Automatic retry on 429/503 with exponential backoff + decorrelated jitter
 * - 5 retries: 2s → 4s → 8s → 16s → 32s (capped at 45s)
 * - Model-aware rate limiting (mimo-v2.5-free = 30 RPM, 2.5s spacing)
 *
 * Usage:
 *   import { callOpenCode } from '../utils/openCodeClient';
 *   const result = await callOpenCode([{ role: 'user', content: '...' }]);
 */

import { getGlobalLimiter, NimRateLimiter } from './nimRateLimiter';

const globalLimiter = getGlobalLimiter();

// ---- Configuration ----

const OPENCODE_API_BASE = 'https://opencode.ai/zen/v1';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'mimo-v2.5-free';

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

// ---- Internal HTTP call (no retry logic - delegated to limiter) ----

async function doOpenCodeRequest(
  body: OpenCodeRequestBody
): Promise<{ status: number; headers: Record<string, string>; ok: boolean; body: () => Promise<string>; json: () => Promise<any> }> {
  const res = await fetch(`${OPENCODE_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    ok: res.ok,
    body: () => res.text(),
    json: () => res.json(),
  };
}

// ---- Public API ----

/**
 * Call the OpenCode chat completions API (free endpoint).
 * Uses the mimo-v2.5-free model by default.
 * Rate limited per-model via NimRateLimiter with exponential backoff + jitter.
 *
 * @param messages - Array of chat messages (system/user/assistant)
 * @param options - Override model, temperature, max_tokens, or pass extras
 * @returns The response text content
 * @throws AllRetriesExhaustedError after 5 failed attempts
 */
export async function callOpenCode(
  messages: OpenCodeMessage[],
  options: Partial<OpenCodeRequestBody> = {}
): Promise<string> {
  const model = options.model || DEFAULT_MODEL;

  const body: OpenCodeRequestBody = {
    model,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.max_tokens ?? 1024,
    stream: false,
    ...options,
  };

  // Delegate ALL retry/rate-limit logic to the global NimRateLimiter
  // This ensures consistent spacing (2.5s), jitter (0.5), and backoff (2s→45s cap) across the app
  return globalLimiter.executeWithRetry(
    () => doOpenCodeRequest(body),
    {
      model,
      maxRetries: 5,
      baseBackoffMs: 2_000,
      maxBackoffMs: 45_000,
      shouldRetry: (status: number, bodyText: string) => {
        // Retry on 429, 502, 503, 504, and also on FreeUsageLimitError in body
        if (status === 429 || status === 502 || status === 503 || status === 504) return true;
        if (bodyText.includes('FreeUsageLimitError')) return true;
        return false;
      },
    }
  ).then((data: any) => {
    const content = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || {};
    console.log(
      `[OpenCode] ${content.length} chars, ${usage.total_tokens || '?'} tokens (model: ${model})`
    );
    return content;
  });
}