#!/usr/bin/env npx tsx
/**
 * Quick sanity check for the NIM Rate Limiter module.
 *
 * This is NOT a unit-test suite — it validates that the module loads,
 * its main methods work, and the token-bucket logic produces sane values.
 *
 * The full unit test suite lives at:
 *   nim-integration-extension/test-nimRateLimiter.ts  (44 tests)
 *
 * Usage:
 *   npx tsx test/nimRateLimiter-check.ts
 */

import limiter, {
  NimRateLimiter,
  calculateBackoff,
  isRetryableStatus,
  getGlobalLimiter,
} from '../utils/nimRateLimiter';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ${COLORS.green}✓${COLORS.reset} ${label}`);
    passed++;
  } else {
    console.log(`  ${COLORS.red}✗${COLORS.reset} ${label}`);
    failed++;
  }
}

async function main() {
  console.log(`\n${COLORS.cyan}═══ NIM Rate Limiter — Module Check ═══${COLORS.reset}\n`);

  // 1. Module loads
  assert(typeof limiter === 'object', 'default export is an object');
  assert(limiter instanceof NimRateLimiter, 'default export is NimRateLimiter instance');

  // 2. Singleton identity
  const instanceA = getGlobalLimiter();
  const instanceB = getGlobalLimiter();
  assert(instanceA === instanceB, 'getGlobalLimiter returns same singleton');

  // 3. Model RPM lookup
  const nemotronRpm = limiter.getModelRpm('nvidia/nemotron-3-ultra-550b-a55b');
  assert(nemotronRpm === 3, `nemotron RPM = ${nemotronRpm}`);

  const deepseekRpm = limiter.getModelRpm('deepseek-ai/deepseek-v4-pro');
  assert(deepseekRpm === 12, `deepseek-v4-pro RPM = ${deepseekRpm}`);

  const defaultRpm = limiter.getModelRpm();
  assert(defaultRpm === 36, `default (no model) RPM = ${defaultRpm}`);

  // 4. isRetryableStatus
  assert(isRetryableStatus(429) === true, '429 is retryable');
  assert(isRetryableStatus(503) === true, '503 is retryable');
  assert(isRetryableStatus(200) === false, '200 not retryable');
  assert(isRetryableStatus(400) === false, '400 not retryable');

  // 5. calculateBackoff
  const b0 = calculateBackoff(0, 2000, 60000, 0.2);
  const b1 = calculateBackoff(1, 2000, 60000, 0.2);
  const b2 = calculateBackoff(2, 2000, 60000, 0.2);
  assert(b0 >= 1600 && b0 <= 2400, `backoff(0) = ${b0}ms (expected 2000±400)`);
  assert(b1 >= 3200 && b1 <= 4800, `backoff(1) = ${b1}ms (expected 4000±800)`);
  assert(b2 >= 6400 && b2 <= 9600, `backoff(2) = ${b2}ms (expected 8000±1600)`);

  // 6. Token bucket — acquire + status
  const tokenOk = await limiter.acquireToken('test-key', 'meta/llama-3.1-8b-instruct', 5000);
  assert(tokenOk === true, 'acquireToken succeeds with 5s timeout');

  const status = limiter.getStatus('test-key', 'meta/llama-3.1-8b-instruct');
  assert(status.current < status.capacity, 'token consumed (current < capacity)');
  assert(status.capacity === 5, `burst capacity = ${status.capacity}`);

  // 7. Reset
  limiter.reset('test-key', 'meta/llama-3.1-8b-instruct');
  const afterReset = limiter.getStatus('test-key', 'meta/llama-3.1-8b-instruct');
  assert(afterReset.current === 5, 'bucket restored to full after reset');

  // 8. ExecuteWithRetry — with a mock that fails once then succeeds
  let mockAttempts = 0;
  const mockResult = await limiter.executeWithRetry(
    async () => {
      mockAttempts++;
      if (mockAttempts < 2) {
        // Simulate a 429
        return {
          status: 429,
          ok: false,
          body: async () => 'rate limited',
          json: async () => { throw new Error('no json on error'); },
        };
      }
      return {
        status: 200,
        ok: true,
        body: async () => '{"hello":"world"}',
        json: async () => ({ hello: 'world' }),
      };
    },
    { key: 'test-key', model: 'meta/llama-3.1-8b-instruct', maxRetries: 3 },
  );
  assert(mockResult.hello === 'world', `executeWithRetry auto-retried 429 → ${JSON.stringify(mockResult)}`);
  assert(mockAttempts === 2, `mock called ${mockAttempts}x (expected 2)`);

  // 9. AllRetriesExhaustedError on persistent 429
  let threw = false;
  try {
    await limiter.executeWithRetry(
      async () => ({
        status: 429,
        ok: false,
        body: async () => 'always rate limited',
        json: async () => { throw new Error('no json'); },
      }),
      { key: 'test-key', model: 'meta/llama-3.1-8b-instruct', maxRetries: 1 },
    );
  } catch (e: any) {
    threw = true;
    assert(e.name === 'AllRetriesExhaustedError', `threw ${e.name}`);
  }
  assert(threw, 'persistent 429 exhausted retries');

  // 10. Events fire
  const events: string[] = [];
  const unsubscribe = limiter.on((evt) => events.push(evt.type));
  await limiter.acquireToken('event-test-key', 'meta/llama-3.1-8b-instruct', 1000);
  assert(events.includes('token_wait'), 'token_wait event fired');
  assert(events.includes('token_granted'), 'token_granted event fired');
  unsubscribe();

  // --- Summary ---
  const total = passed + failed;
  console.log(`\n${COLORS.cyan}═══ Result: ${passed}/${total} passed${failed > 0 ? `, ${failed} failed` : ''} ═══${COLORS.reset}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(`${COLORS.red}FATAL:${COLORS.reset}`, e);
  process.exit(1);
});
