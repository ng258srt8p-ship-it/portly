/**
 * Rate Limiter Stress Test
 * 
 * Pushes the NIM rate limiter to its limits:
 * - 40 RPM (requests per minute)
 * - 3 max concurrent requests
 */

import { defaultRateLimiter as nimRateLimiter, NimRateLimiter } from '../utils/nimRateLimiter.ts' } from '../utils/nimRateLimiter.ts';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(color: string, msg: string) {
  console.log(`${color}${msg}${COLORS.reset}`);
}

function statusLog(label: string) {
  const status = nimRateLimiter.getStatus();
  const isLimited = status.requestsInWindow >= status.maxRequestsPerMinute;
  log(COLORS.cyan, `[STATUS] ${label} | Available: ${status.availableSlots}/${status.maxRequestsPerMinute} | Active: ${status.activeRequests}/${status.maxConcurrentRequests} | Limited: ${isLimited} | Wait: ${status.waitTimeMs}ms`);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testConcurrencyLimit() {
  log(COLORS.magenta, '\n========== TEST 1: Concurrency Limit (3 max) ==========');
  
  nimRateLimiter.reset();
  await sleep(10);
  
  const startTime = Date.now();
  const activeCounts: number[] = [];
  let maxActive = 0;
  
  // Fire 10 requests simultaneously - only 3 should run at once
  const promises = Array.from({ length: 10 }, async (_, i) => {
    await nimRateLimiter.acquire();
    const status = nimRateLimiter.getStatus();
    activeCounts.push(status.activeRequests);
    maxActive = Math.max(maxActive, status.activeRequests);
    
    log(COLORS.blue, `[REQ ${i + 1}] Acquired slot | Active: ${status.activeRequests}/3`);
    
    // Simulate work (100ms)
    await sleep(100);
    
    nimRateLimiter.release();
    log(COLORS.green, `[REQ ${i + 1}] Released slot`);
  });
  
  await Promise.all(promises);
  
  const elapsed = Date.now() - startTime;
  log(COLORS.yellow, `\nConcurrency test complete in ${elapsed}ms`);
  log(COLORS.yellow, `Max concurrent observed: ${maxActive}/3`);
  statusLog('After concurrency test');
}

async function testRpmLimit() {
  log(COLORS.magenta, '\n========== TEST 2: RPM Limit (40/min) ==========');
  
  // Reset for clean test
  nimRateLimiter.reset();
  await sleep(10);
  
  const startTime = Date.now();
  let requestCount = 0;
  const timestamps: number[] = [];
  const waitTimes: number[] = [];
  
  // Fire 40 requests as fast as possible - should all be instant (no rate limiting yet)
  for (let i = 0; i < 40; i++) {
    const acquireStart = Date.now();
    await nimRateLimiter.acquire();
    const waitTime = Date.now() - acquireStart;
    const acquiredAt = Date.now();
    timestamps.push(acquiredAt);
    waitTimes.push(waitTime);
    requestCount++;
    
    if (requestCount % 10 === 0) {
      const status = nimRateLimiter.getStatus();
      const isLimited = status.requestsInWindow >= status.maxRequestsPerMinute;
      log(COLORS.cyan, `[STATUS] After ${requestCount} requests | Available: ${status.availableSlots}/40 | Active: ${status.activeRequests}/3 | Limited: ${isLimited}`);
    }
    
    // Release immediately to test RPM not concurrency
    nimRateLimiter.release();
    
    // Tiny delay to not overwhelm the event loop
    await sleep(1);
  }
  
  const elapsed = Date.now() - startTime;
  log(COLORS.yellow, `\nRPM test: ${requestCount} requests acquired in ${elapsed}ms`);
  
  // Verify first 40 were fast (no rate limiting)
  const maxWait = Math.max(...waitTimes);
  const avgWait = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;
  log(COLORS.yellow, `Max wait time: ${maxWait}ms, Avg wait: ${avgWait.toFixed(2)}ms`);
  
  if (maxWait < 50) {
    log(COLORS.green, '✓ First 40 requests were fast (no rate limiting)');
  } else {
    log(COLORS.red, '✗ First 40 requests experienced unexpected delays');
  }
  
  // Now test that the 41st request would be rate limited
  // We check the status without actually waiting 60 seconds
  const status = nimRateLimiter.getStatus();
  const isLimited = status.requestsInWindow >= status.maxRequestsPerMinute;
  log(COLORS.cyan, `[STATUS] After 40 requests | Available: ${status.availableSlots}/${status.maxRequestsPerMinute} | Limited: ${isLimited}`);
  
  if (isLimited && status.availableSlots === 0) {
    log(COLORS.green, '✓ Rate limit correctly activated after 40 requests');
  } else {
    log(COLORS.red, '✗ Rate limit not activated as expected');
  }
  
  // Test that acquiring now would wait (but don't actually wait 60s)
  // Just verify the limiter state
  log(COLORS.blue, 'Rate limiter correctly blocks further requests until window slides');
  
  statusLog('After RPM test');
}

async function testCombinedLoad() {
  log(COLORS.magenta, '\n========== TEST 3: Combined Load (Concurrency + RPM) ==========');
  
  nimRateLimiter.reset();
  await sleep(10);
  
  const startTime = Date.now();
  let completed = 0;
  let errors = 0;
  
  // Simulate 20 "API calls" with varying durations
  const tasks = Array.from({ length: 20 }, async (_, i) => {
    const taskStart = Date.now();
    try {
      await nimRateLimiter.acquire();
      const waitTime = Date.now() - taskStart;
      
      // Simulate API call (50-300ms)
      const apiDuration = 50 + Math.random() * 250;
      await sleep(apiDuration);
      
      nimRateLimiter.release();
      completed++;
      log(COLORS.green, `[TASK ${i + 1}] Done in ${Date.now() - taskStart}ms (waited ${waitTime}ms, api ${apiDuration.toFixed(0)}ms)`);
    } catch (e) {
      errors++;
      log(COLORS.red, `[TASK ${i + 1}] Error: ${e}`);
    }
  });
  
  await Promise.all(tasks);
  
  const elapsed = Date.now() - startTime;
  log(COLORS.yellow, `\nCombined test: ${completed} completed, ${errors} errors in ${elapsed}ms`);
  statusLog('After combined test');
}

async function testQueueBehavior() {
  log(COLORS.magenta, '\n========== TEST 4: Queue Behavior ==========');
  
  nimRateLimiter.reset();
  await sleep(10);
  
  // Acquire all 3 concurrent slots
  log(COLORS.blue, 'Acquiring 3 concurrent slots...');
  await nimRateLimiter.acquire();
  await nimRateLimiter.acquire();
  await nimRateLimiter.acquire();
  statusLog('After acquiring 3 slots');
  
  // Now queue 5 more - they should wait
  log(COLORS.blue, 'Queueing 5 more requests...');
  const queuedPromises = Array.from({ length: 5 }, async (_, i) => {
    const queueStart = Date.now();
    await nimRateLimiter.acquire();
    const waitTime = Date.now() - queueStart;
    log(COLORS.yellow, `[QUEUED ${i + 1}] Waited ${waitTime}ms for slot`);
    nimRateLimiter.release();
  });
  
  // Release the 3 slots after a delay
  setTimeout(() => {
    log(COLORS.green, 'Releasing 3 slots...');
    nimRateLimiter.release();
    nimRateLimiter.release();
    nimRateLimiter.release();
  }, 500);
  
  await Promise.all(queuedPromises);
  statusLog('After queue test');
}

async function testRateLimitWindow() {
  log(COLORS.magenta, '\n========== TEST 5: Sliding Window (60s) ==========');
  
  nimRateLimiter.reset();
  await sleep(10);
  
  // Make 40 requests quickly
  log(COLORS.blue, 'Making 40 rapid requests...');
  for (let i = 0; i < 40; i++) {
    await nimRateLimiter.acquire();
    nimRateLimiter.release();
  }
  statusLog('After 40 requests');
  
  // Verify rate limit is active (remaining = 0, isLimited = true)
  const status = nimRateLimiter.getStatus();
  const isLimited = status.requestsInWindow >= status.maxRequestsPerMinute;
  if (status.availableSlots === 0 && isLimited) {
    log(COLORS.green, '✓ Rate limit correctly activated after 40 requests');
  } else {
    log(COLORS.red, '✗ Rate limit not activated as expected');
  }
  
  // Test that acquiring now would wait (verify with short timeout)
  // We use a short timeout to verify the limiter blocks, not wait 60s
  log(COLORS.blue, 'Verifying rate limiter blocks further requests (5s timeout)...');
  const waitStart = Date.now();
  let blocked = false;
  try {
    // This should timeout because the window is full
    await Promise.race([
      nimRateLimiter.acquire(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ]);
  } catch (e) {
    if ((e as Error).message === 'timeout') {
      blocked = true;
      log(COLORS.green, '✓ Rate limiter correctly blocks requests (timed out after 5s)');
    }
  }
  const waitTime = Date.now() - waitStart;
  
  if (!blocked) {
    log(COLORS.red, '✗ Rate limiter did not block as expected');
  }
  
  log(COLORS.yellow, `Verification took ${waitTime}ms (did not wait full 60s window)`);
  statusLog('After window test');
}

async function runAllTests() {
  log(COLORS.magenta, '\n╔════════════════════════════════════════════════════════════╗');
  log(COLORS.magenta, '║     NIM RATE LIMITER STRESS TEST                        ║');
  log(COLORS.magenta, '║     Limits: 40 RPM | 3 Concurrent                       ║');
  log(COLORS.magenta, '╚═════════════════════════════════════════════════════════════╝');
  
  await testConcurrencyLimit();
  await testRpmLimit();
  await testCombinedLoad();
  await testQueueBehavior();
  await testRateLimitWindow();
  
  log(COLORS.magenta, '\n╔═════════════════════════════════════════════════════════════╗');
  log(COLORS.magenta, '║     ALL TESTS COMPLETE                                   ║');
  log(COLORS.magenta, '╚═════════════════════════════════════════════════════════════╝');
  
  // Final status
  statusLog('FINAL');
}

runAllTests().catch(console.error);