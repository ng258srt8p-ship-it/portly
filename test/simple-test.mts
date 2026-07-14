import { defaultRateLimiter as nimRateLimiter } from '../utils/nimRateLimiter.ts';

async function simpleTest() {
  console.log('Testing rate limiter...');
  
  // Reset to clean state
  nimRateLimiter.reset();
  
  // Test 1: Acquire 3 concurrently (should work immediately)
  console.log('\\n=== Test 1: Acquire 3 concurrent ===');
  const promises = [];
  for (let i = 0; i < 3; i++) {
    promises.push((async () => {
      await nimRateLimiter.acquire();
      console.log(`Acquired ${i}`);
      await new Promise(resolve => setTimeout(resolve, 50)); // Hold for 50ms
      nimRateLimiter.release();
      console.log(`Released ${i}`);
    })());
  }
  
  await Promise.all(promises);
  console.log('All 3 acquired and released');
  
  // Test 2: Try to acquire a 4th - should queue
  console.log('\\n=== Test 2: 4th acquisition (should queue) ===');
  let acquired4 = false;
  const p4 = (async () => {
    console.log('Attempting to acquire 4th...');
    await nimRateLimiter.acquire();
    acquired4 = true;
    console.log('Acquired 4th!');
    nimRateLimiter.release();
  })();
  
  // Give it a moment to see if it acquires immediately (it shouldn't)
  await new Promise(resolve => setTimeout(resolve, 100));
  if (!acquired4) {
    console.log('4th is correctly queued (not acquired yet)');
  }
  
  // Now release one of the first three to allow the 4th to proceed
  // Actually, let's just wait for it to complete
  await p4;
  console.log('4th completed');
  
  console.log('\\n=== Test complete ===');
}

simpleTest().catch(console.error);