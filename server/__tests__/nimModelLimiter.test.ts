import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NimModelLimiter, MODEL_RPM_LIMITS } from '../utils/nimModelLimiter';

describe('NimModelLimiter', () => {
  let limiter: NimModelLimiter;

  beforeEach(() => {
    limiter = new NimModelLimiter();
    limiter.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should have correct RPM limits for known models', () => {
    expect(limiter.getModelLimit('nvidia/nemotron-3-ultra-550b-a55b')).toBe(1);
    expect(limiter.getModelLimit('deepseek-ai/deepseek-v4-pro')).toBe(20);
    expect(limiter.getModelLimit('meta/llama-3.1-8b-instruct')).toBe(28);
    expect(limiter.getModelLimit('mimo-v2.5-free')).toBe(40);
    expect(limiter.getModelLimit('unknown-model')).toBe(35); // DEFAULT_RPM
  });

  it('should allow requests up to the model limit', async () => {
    const model = 'nvidia/nemotron-3-ultra-550b-a55b';
    const limit = limiter.getModelLimit(model); // 1 RPM

    for (let i = 0; i < limit; i++) {
      await expect(limiter.acquire(model, 'test-key')).resolves.toBeUndefined();
    }

    const status = limiter.getStatus(model, 'test-key');
    expect(status.requestsInWindow).toBe(limit);
    expect(status.remaining).toBe(0);
  });

  it('should wait when rate limit is reached', async () => {
    const model = 'nvidia/nemotron-3-ultra-550b-a55b';
    const limit = limiter.getModelLimit(model); // 1 RPM

    // First request should succeed immediately
    await limiter.acquire(model, 'test-key-2');

    // Second request should wait
    const acquirePromise = limiter.acquire(model, 'test-key-2', 5000);
    
    // Advance time by just under 60 seconds - should still be waiting
    vi.advanceTimersByTime(50_000);
    
    // It should still be waiting (not resolved yet)
    await expect(acquirePromise).rejects.toThrow('Rate limit timeout');

    limiter.reset();
  });

  it('should release rate limit after window expires', async () => {
    const model = 'nvidia/nemotron-3-ultra-550b-a55b';
    const limit = limiter.getModelLimit(model); // 1 RPM

    await limiter.acquire(model, 'test-key-3');
    expect(limiter.getStatus(model, 'test-key-3').requestsInWindow).toBe(1);

    // Advance time by 61 seconds (past the 60s window)
    vi.advanceTimersByTime(61_000);

    // Should be able to acquire again
    await expect(limiter.acquire(model, 'test-key-3')).resolves.toBeUndefined();
    expect(limiter.getStatus(model, 'test-key-3').requestsInWindow).toBe(1);
  });

  it('should track limits per-model independently', async () => {
    await limiter.acquire('nvidia/nemotron-3-ultra-550b-a55b', 'test-key-4');
    await limiter.acquire('deepseek-ai/deepseek-v4-pro', 'test-key-4');

    expect(limiter.getStatus('nvidia/nemotron-3-ultra-550b-a55b', 'test-key-4').requestsInWindow).toBe(1);
    expect(limiter.getStatus('deepseek-ai/deepseek-v4-pro', 'test-key-4').requestsInWindow).toBe(1);
  });

  it('should track limits per-key independently', async () => {
    const model = 'meta/llama-3.1-8b-instruct'; // 28 RPM

    for (let i = 0; i < 5; i++) {
      await limiter.acquire(model, `key-${i}`);
    }

    // Each key should have its own count
    for (let i = 0; i < 5; i++) {
      expect(limiter.getStatus(model, `key-${i}`).requestsInWindow).toBe(1);
    }
  });

  it('should return correct waitTimeMs when at limit', async () => {
    const model = 'nvidia/nemotron-3-ultra-550b-a55b';
    await limiter.acquire(model, 'test-key-5');

    const status = limiter.getStatus(model, 'test-key-5');
    expect(status.requestsInWindow).toBe(1);
    expect(status.remaining).toBe(0);
    expect(status.waitTimeMs).toBeGreaterThan(55_000); // ~60s window
    expect(status.waitTimeMs).toBeLessThanOrEqual(60_000);
  });

  it('should handle unknown models with default RPM', async () => {
    const model = 'unknown/model';
    const limit = limiter.getModelLimit(model); // 35 RPM default

    for (let i = 0; i < limit; i++) {
      await expect(limiter.acquire(model, 'test-key-6')).resolves.toBeUndefined();
    }

    const status = limiter.getStatus(model, 'test-key-6');
    expect(status.requestsInWindow).toBe(limit);
    expect(status.remaining).toBe(0);
  });

  it('MODEL_RPM_LIMITS should contain expected models', () => {
    expect(MODEL_RPM_LIMITS['nvidia/nemotron-3-ultra-550b-a55b']).toBe(1);
    expect(MODEL_RPM_LIMITS['deepseek-ai/deepseek-v4-pro']).toBe(20);
    expect(MODEL_RPM_LIMITS['deepseek-ai/deepseek-v4-flash']).toBe(35);
    expect(MODEL_RPM_LIMITS['meta/llama-3.1-8b-instruct']).toBe(28);
    expect(MODEL_RPM_LIMITS['meta/llama-3.1-70b-instruct']).toBe(23);
    expect(MODEL_RPM_LIMITS['mimo-v2.5-free']).toBe(40);
  });
});