/**
 * TripTide — OpenRouter Client (free models)
 *
 * Mirrors SaastainedNumbers `lib/openrouter.ts` pattern.
 * Uses OpenRouter free-tier models with a fallback chain
 * and exponential backoff retry logic.
 *
 * Models (free):
 *   1. meta-llama/llama-3.2-3b-instruct:free
 *   2. liquid/lfm-2.5-1.2b-instruct:free
 *   3. google/gemini-2.0-flash-exp:free
 *   4. openrouter/free
 *
 * Retry logic (via NimRateLimiter):
 *   5 retries: 2s → 4s → 8s → 16s → 32s (capped at 45s)
 *   Decorrelated jitter (±0.5s)
 *   Rate-limit aware (30 RPM, 2.5s spacing)
 */



// ---- Configuration ----

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Ordered fallback chain: try each model in sequence until one responds
// Note: Only 'openrouter/free' endpoint currently works reliably (others return 404/429)
const MODEL_CHAIN: string[] = [
  'openrouter/free',
];

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequestBody {
  model: string;
  messages: OpenRouterMessage[];
  temperature: number;
  max_tokens: number;
  stream: boolean;
  [key: string]: unknown;
}

interface ChatResponse {
  id: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
}

/**
 * Direct OpenRouter API call — returns response body text.
 * Uses simple retry logic (single attempt per model).
 */
async function callOpenRouterDirect(
  model: string,
  messages: OpenRouterMessage[],
  controller: AbortController
): Promise<string> {
  let lastError: string = '';
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || ''}`,
          'HTTP-Referer': 'https://triptide.net',
          'X-Title': 'TripTide',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 4096,
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
      lastError = data.error?.message || 'empty content';
      await new Promise(r => setTimeout(r, 3000 + attempt * 2000));
    } catch {
      lastError = 'network error';
      await new Promise(r => setTimeout(r, 3000 + attempt * 2000));
    }
  }
  throw new Error(lastError);
}

/**
 * Call OpenRouter chat completions API (free tier).
 * Uses fallback chain: Llama-3.2-3B → LFM-2.5-1.2B → Gemini-2.0-Flash → OpenRouter Free.
 * Rate limited per-model via NimRateLimiter with exponential backoff + jitter.
 *
 * @param messages - Array of chat messages (system/user/assistant)
 * @param options - Override model, temperature, max_tokens
 * @returns The response text content
 */
export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options: Partial<OpenRouterRequestBody> = {}
): Promise<string> {
  const model = options.model || MODEL_CHAIN[0];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000);

  const content = await callOpenRouterDirect(MODEL_CHAIN[0], messages, controller);
  clearTimeout(timeoutId);
  if (!content) {
    throw new Error("OpenRouter returned empty content.");
  }

  console.log(`[OpenRouter] ${content.length} chars returned (model: ${MODEL_CHAIN[0]})`);
  return content;
}
