/**
 * In-memory sliding window rate limiter.
 *
 * Pools:
 *  - "key-mutation": 5 requests per 15 minutes (shared across validate + update)
 *  - "key-delete": 10 requests per 1 hour
 *
 * Rate limit is per-user (by Clerk userId), not per IP.
 * In production with multiple instances, swap to Redis. For single-instance MVP this is fine.
 */

type PoolConfig = {
  maxRequests: number;
  windowMs: number;
};

const POOLS: Record<string, PoolConfig> = {
  "key-mutation": { maxRequests: 5, windowMs: 10 * 1000 }, // 5 per 10 sec (dev — change to 15 min for prod)
  "key-delete": { maxRequests: 10, windowMs: 10 * 1000 }, // 10 per 10 sec (dev — change to 1 hr for prod)
};

// Storage: Map<"userId:pool", timestamp[]>
const store = new Map<string, number[]>();

export type RateLimitResult =
  | {
      allowed: true;
      remaining: number;
      limit: number;
      resetAt: number;
    }
  | {
      allowed: false;
      remaining: 0;
      limit: number;
      retryAfterSeconds: number;
      resetAt: number;
    };

export function checkRateLimit(
  userId: string,
  pool: string
): RateLimitResult {
  const config = POOLS[pool];
  if (!config) {
    throw new Error(`Unknown rate limit pool: ${pool}`);
  }

  const key = `${userId}:${pool}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get existing timestamps and filter to current window
  const timestamps = (store.get(key) || []).filter((t) => t > windowStart);

  if (timestamps.length >= config.maxRequests) {
    // Find when the oldest request in the window expires
    const oldestInWindow = Math.min(...timestamps);
    const resetAt = oldestInWindow + config.windowMs;
    const retryAfterSeconds = Math.ceil((resetAt - now) / 1000);

    store.set(key, timestamps);

    return {
      allowed: false,
      remaining: 0,
      limit: config.maxRequests,
      retryAfterSeconds,
      resetAt,
    };
  }

  // Allowed — record this request
  timestamps.push(now);
  store.set(key, timestamps);

  return {
    allowed: true,
    remaining: config.maxRequests - timestamps.length,
    limit: config.maxRequests,
    resetAt: now + config.windowMs,
  };
}

/**
 * Get rate limit headers for a response.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetAt),
  };

  if (!result.allowed) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }

  return headers;
}

export type SimpleRateLimitResult = 
  | { allowed: true }
  | { allowed: false; remainingMs: number };

export function rateLimit(
  key: string,
  config: PoolConfig
): SimpleRateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const timestamps = (store.get(key) || []).filter((t) => t > windowStart);

  if (timestamps.length >= config.maxRequests) {
    const oldestInWindow = Math.min(...timestamps);
    const resetAt = oldestInWindow + config.windowMs;
    return { allowed: false, remainingMs: resetAt - now };
  }

  timestamps.push(now);
  store.set(key, timestamps);

  return { allowed: true };
}
