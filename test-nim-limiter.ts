#!/usr/bin/env node

/**
 * Standalone test for NimModelLimiter
 * Run with: npx ts-node test-nim-limiter.ts
 */

import { nimModelLimiter, MODEL_RPM_LIMITS } from './utils/nimModelLimiter.js';

const limiter = nimModelLimiter;

// Test helper
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`✓ ${message}`);
}

async function runTests() {
  console.log('=== Testing NimModelLimiter ===\n');
  
  // Test 1: Known model RPM limits
  console.log('Test 1: Known model RPM limits');
  assert(limiter.getModelLimit('nvidia/nemotron-3-ultra-550b-a55b') === 1, 'Nemotron Ultra = 1 RPM');
  assert(limiter.getModelLimit('deepseek-ai/deepseek-v4-pro') === 20, 'DeepSeek v4 Pro = 20 RPM');
  assert(limiter.getModelLimit('meta/llama-3.1-8b-instruct') === 28, 'Llama 3.1 8B = 28 RPM');
  assert(limiter.getModelLimit('mimo-v2.5-free') === 40, 'MIMO = 40 RPM');
  assert(limiter.getModelLimit('unknown-model') === 35, 'Unknown model = 35 RPM (default)');
  
  // Test 2: MODEL_RPM_LIMITS contains expected models
  console.log('\nTest 2: MODEL_RPM_LIMITS contains expected models');
  assert(MODEL_RPM_LIMITS['nvidia/nemotron-3-ultra-550b-a55b'] === 1, 'Nemotron in MODEL_RPM_LIMITS');
  assert(MODEL_RPM_LIMITS['deepseek-ai/deepseek-v4-pro'] === 20, 'DeepSeek v4 Pro in MODEL_RPM_LIMITS');
  assert(MODEL_RPM_LIMITS['mimo-v2.5-free'] === 40, 'MIMO in MODEL_RPM_LIMITS');
  
  // Test 3: Allow requests up to model limit
  console.log('\nTest 3: Allow requests up to model limit');
  const nemotronModel = 'nvidia/nemotron-3-ultra-550b-a55b';
  const nemotronLimit = limiter.getModelLimit(nemotronModel);
  
  for (let i = 0; i < nemotronLimit; i++) {
    await limiter.acquire(nemotronModel, 'test-key-1');
  }
  
  const status = limiter.getStatus(nemotronModel, 'test-key-1');
  assert(status.requestsInWindow === nemotronLimit, `Should have ${nemotronLimit} requests in window`);
  assert(status.remaining === 0, 'Should have 0 remaining');
  
  limiter.reset();
  
  // Test 4: Per-model independent tracking
  console.log('\nTest 4: Per-model independent tracking');
  await limiter.acquire('nvidia/nemotron-3-ultra-550b-a55b', 'test-key-2');
  await limiter.acquire('deepseek-ai/deepseek-v4-pro', 'test-key-2');
  
  assert(limiter.getStatus('nvidia/nemotron-3-ultra-550b-a55b', 'test-key-2').requestsInWindow === 1, 'Nemotron tracked independently');
  assert(limiter.getStatus('deepseek-ai/deepseek-v4-pro', 'test-key-2').requestsInWindow === 1, 'DeepSeek tracked independently');
  
  limiter.reset();
  
  // Test 5: Per-key independent tracking
  console.log('\nTest 5: Per-key independent tracking');
  const llamaModel = 'meta/llama-3.1-8b-instruct';
  for (let i = 0; i < 3; i++) {
    await limiter.acquire(llamaModel, `key-${i}`);
  }
  
  for (let i = 0; i < 3; i++) {
    assert(limiter.getStatus(llamaModel, `key-${i}`).requestsInWindow === 1, `Key key-${i} tracked independently`);
  }
  
  limiter.reset();
  
  // Test 6: Wait time when at limit
  console.log('\nTest 6: Wait time when at limit');
  await limiter.acquire(nemotronModel, 'test-key-3');
  const statusAtLimit = limiter.getStatus(nemotronModel, 'test-key-3');
  assert(statusAtLimit.waitTimeMs > 55000, 'Wait time should be ~60s when at limit');
  assert(statusAtLimit.waitTimeMs <= 60000, 'Wait time should not exceed 60s');
  
  limiter.reset();
  
  // Test 7: Unknown model uses default RPM
  console.log('\nTest 7: Unknown model uses default RPM');
  const unknownModel = 'completely/unknown-model';
  const unknownLimit = limiter.getModelLimit(unknownModel);
  assert(unknownLimit === 35, `Unknown model should have default RPM (35), got ${unknownLimit}`);
  
  for (let i = 0; i < unknownLimit; i++) {
    await limiter.acquire(unknownModel, 'test-key-4');
  }
  
  const unknownStatus = limiter.getStatus(unknownModel, 'test-key-4');
  assert(unknownStatus.requestsInWindow === unknownLimit, `Should allow ${unknownLimit} requests for unknown model`);
  
  limiter.reset();
  
  console.log('\n=== All tests passed! ===');
}

runTests().catch(err => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});