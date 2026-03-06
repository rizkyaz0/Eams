/**
 * lib/rate-limit.ts
 * Simple in-memory rate limiter — no Redis required.
 * Stores per-IP attempt counts in a Map. Resets after the window expires.
 */

interface RateLimitEntry {
  count: number;
  firstAttemptAt: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number;
  /** Rolling window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check if a key (e.g., user IP) has exceeded the rate limit.
 * Call this at the top of your API handler before any other logic.
 *
 * @example
 * const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
 * const { success } = checkRateLimit(`login:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
 * if (!success) return errorResponse("Too many attempts. Try again later.", 429);
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const { limit, windowMs } = options;

  const existing = store.get(key);

  // Purge expired entry
  if (existing && now - existing.firstAttemptAt > windowMs) {
    store.delete(key);
  }

  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, firstAttemptAt: now });
    return {
      success: true,
      remaining: limit - 1,
      resetAt: new Date(now + windowMs),
    };
  }

  if (entry.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: new Date(entry.firstAttemptAt + windowMs),
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: limit - entry.count,
    resetAt: new Date(entry.firstAttemptAt + windowMs),
  };
}

/**
 * Manually reset the counter for a key (e.g., on successful login)
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}
