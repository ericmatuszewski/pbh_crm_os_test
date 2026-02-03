/**
 * Rate Limiting Utility
 *
 * Provides rate limiting using sliding window algorithm.
 * Uses in-memory storage for edge runtime compatibility.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = `rate:${identifier}`;

  let entry = rateLimitStore.get(key);

  // Create new entry if doesn't exist or window expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  const remaining = Math.max(0, config.limit - entry.count);
  const success = entry.count <= config.limit;

  return {
    success,
    limit: config.limit,
    remaining,
    reset: entry.resetAt,
  };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };
}

// Default rate limit configurations
export const RATE_LIMITS = {
  // General API requests: 100 requests per minute
  api: { limit: 100, windowSeconds: 60 },

  // Auth endpoints: 10 requests per minute (stricter to prevent brute force)
  auth: { limit: 10, windowSeconds: 60 },

  // Search endpoints: 30 requests per minute
  search: { limit: 30, windowSeconds: 60 },

  // Bulk operations: 5 requests per minute
  bulk: { limit: 5, windowSeconds: 60 },

  // Export operations: 10 requests per minute
  export: { limit: 10, windowSeconds: 60 },
} as const;

/**
 * Get appropriate rate limit config for a path
 */
export function getRateLimitForPath(pathname: string): RateLimitConfig {
  if (pathname.includes("/api/auth/")) {
    return RATE_LIMITS.auth;
  }
  if (pathname.includes("/api/search") || pathname.includes("/api/global-search")) {
    return RATE_LIMITS.search;
  }
  if (pathname.includes("/api/bulk")) {
    return RATE_LIMITS.bulk;
  }
  if (pathname.includes("/export")) {
    return RATE_LIMITS.export;
  }
  return RATE_LIMITS.api;
}
