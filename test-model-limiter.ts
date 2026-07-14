import { nimModelLimiter, MODEL_RPM_LIMITS } from './src/utils/nimModelLimiter';

console.log('MODEL_RPM_LIMITS:', JSON.stringify(MODEL_RPM_LIMITS, null, 2));

console.log('\nTesting model-aware rate limiter...');
console.log('Nemotron limit:', nimModelLimiter.getModelLimit('nvidia/nemotron-3-ultra-550b-a55b'));
console.log('DeepSeek limit:', nimModelLimiter.getModelLimit('deepseek-ai/deepseek-v4-pro'));
console.log('Llama limit:', nimModelLimiter.getModelLimit('meta/llama-3.1-8b-instruct'));
console.log('OpenCode limit:', nimModelLimiter.getModelLimit('mimo-v2.5-free'));
console.log('Unknown limit:', nimModelLimiter.getModelLimit('unknown-model'));

async function test() {
  console.log('\nTesting acquire/release...');
  await nimModelLimiter.acquire('nvidia/nemotron-3-ultra-550b-a55b', 'test-key-1');
  console.log('Acquired Nemotron once');
  console.log('Status after 1:', nimModelLimiter.getStatus('nvidia/nemotron-3-ultra-550b-a55b', 'test-key-1'));

  await nimModelLimiter.acquire('deepseek-ai/deepseek-v4-pro', 'test-key-1');
  console.log('Acquired DeepSeek once');
  console.log('Status:', nimModelLimiter.getStatus('deepseek-ai/deepseek-v4-pro', 'test-key-1'));

  console.log('\n✅ Model-aware rate limiter working!');
}

test().catch(console.error);