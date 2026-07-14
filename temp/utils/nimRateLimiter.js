"use strict";
/**
 * NIM Rate Limiter - Sliding Window with Concurrency Control
 *
 * Implements rate limiting for NVIDIA NIM API (free tier: 40 req/min, 3 concurrent)
 * Uses a sliding window for request rate and a semaphore for concurrency control.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultRateLimiter = exports.NimRateLimiter = void 0;
exports.nimRateLimited = nimRateLimited;
class NimRateLimiter {
    constructor(config = {}) {
        var _a, _b;
        this.requestTimestamps = [];
        this.activeRequests = 0;
        this.queue = [];
        this.processing = false;
        this.config = {
            maxRequestsPerMinute: (_a = config.maxRequestsPerMinute) !== null && _a !== void 0 ? _a : 40,
            maxConcurrentRequests: (_b = config.maxConcurrentRequests) !== null && _b !== void 0 ? _b : 3,
        };
    }
    /**
     * Acquire a slot for making a request
     * Returns a promise that resolves when a slot is available
     */
    async acquire() {
        return new Promise((resolve) => {
            const tryAcquire = () => {
                this.cleanOldTimestamps();
                const canProceed = this.requestTimestamps.length < this.config.maxRequestsPerMinute &&
                    this.activeRequests < this.config.maxConcurrentRequests;
                if (canProceed) {
                    this.activeRequests++;
                    this.requestTimestamps.push(Date.now());
                    resolve();
                }
                else {
                    // Queue the request
                    this.queue.push(resolve);
                    if (!this.processing) {
                        this.processQueue();
                    }
                }
            };
            tryAcquire();
        });
    }
    /**
     * Release a slot after request completes
     */
    release() {
        this.activeRequests = Math.max(0, this.activeRequests - 1);
        this.processQueue();
    }
    /**
     * Process queued requests
     */
    processQueue() {
        if (this.processing || this.queue.length === 0) {
            return;
        }
        this.processing = true;
        const processNext = () => {
            this.cleanOldTimestamps();
            const canProceed = this.requestTimestamps.length < this.config.maxRequestsPerMinute &&
                this.activeRequests < this.config.maxConcurrentRequests;
            if (canProceed && this.queue.length > 0) {
                const resolve = this.queue.shift();
                this.activeRequests++;
                this.requestTimestamps.push(Date.now());
                resolve();
                // Process next in queue synchronously if possible
                processNext();
            }
            else if (this.queue.length > 0) {
                // Schedule next check when oldest request expires
                const oldestTimestamp = this.requestTimestamps[0];
                if (oldestTimestamp) {
                    const waitTime = Math.max(0, oldestTimestamp + 60000 - Date.now());
                    setTimeout(() => {
                        this.processing = false;
                        this.processQueue();
                    }, waitTime);
                }
                else {
                    this.processing = false;
                }
            }
            else {
                this.processing = false;
            }
        };
        processNext();
    }
    /**
     * Remove timestamps older than 1 minute
     */
    cleanOldTimestamps() {
        const cutoff = Date.now() - 60000;
        this.requestTimestamps = this.requestTimestamps.filter(ts => ts > cutoff);
    }
    /**
     * Get current rate limit status
     */
    getStatus() {
        this.cleanOldTimestamps();
        const requestsInWindow = this.requestTimestamps.length;
        const availableSlots = Math.max(0, this.config.maxRequestsPerMinute - requestsInWindow);
        const availableConcurrent = Math.max(0, this.config.maxConcurrentRequests - this.activeRequests);
        let waitTimeMs = 0;
        if (requestsInWindow >= this.config.maxRequestsPerMinute && this.requestTimestamps.length > 0) {
            waitTimeMs = Math.max(0, this.requestTimestamps[0] + 60000 - Date.now());
        }
        return {
            requestsInWindow,
            maxRequestsPerMinute: this.config.maxRequestsPerMinute,
            activeRequests: this.activeRequests,
            maxConcurrentRequests: this.config.maxConcurrentRequests,
            availableSlots: Math.min(availableSlots, availableConcurrent),
            waitTimeMs,
        };
    }
    /**
     * Reset the rate limiter (useful for testing)
     */
    reset() {
        this.requestTimestamps = [];
        this.activeRequests = 0;
        this.queue = [];
        this.processing = false;
    }
}
exports.NimRateLimiter = NimRateLimiter;
/**
 * Default rate limiter instance (NIM free tier limits)
 */
exports.defaultRateLimiter = new NimRateLimiter({
    maxRequestsPerMinute: 40,
    maxConcurrentRequests: 3,
});
/**
 * Decorator to automatically rate-limit NIM API methods
 */
function nimRateLimited(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args) {
        await exports.defaultRateLimiter.acquire();
        try {
            return await originalMethod.apply(this, args);
        }
        finally {
            exports.defaultRateLimiter.release();
        }
    };
    return descriptor;
}
