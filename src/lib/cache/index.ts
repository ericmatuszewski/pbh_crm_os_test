/**
 * Cache Utility Library
 *
 * Provides flexible caching with in-memory fallback and Redis support.
 * Features:
 * - TTL-based expiration
 * - Pattern-based invalidation
 * - Cache-aside pattern helpers
 * - Memoization utilities
 * - Automatic fallback to in-memory when Redis unavailable
 */

import { prisma } from "@/lib/prisma";
import Redis from "ioredis";

// Cache entry structure (for in-memory)
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags?: string[];
}

// In-memory cache store (fallback when Redis not available)
const memoryCache = new Map<string, CacheEntry<unknown>>();

// Cache configuration
const DEFAULT_TTL = 300; // 5 minutes in seconds
const MAX_MEMORY_ENTRIES = 10000;
const CACHE_PREFIX = "pbh:";

// ==================== CACHE PROVIDERS ====================

interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<number>;
  clear(): Promise<void>;
  isConnected(): boolean;
}

// In-Memory Cache Provider
class MemoryCacheProvider implements CacheProvider {
  async get<T>(key: string): Promise<T | null> {
    const entry = memoryCache.get(key) as CacheEntry<T> | undefined;

    if (!entry) return null;

    // Check expiration
    if (entry.expiresAt < Date.now()) {
      memoryCache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
    // Evict oldest entries if cache is full
    if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) memoryCache.delete(oldestKey);
    }

    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    memoryCache.delete(key);
  }

  async deletePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    let deleted = 0;

    for (const key of memoryCache.keys()) {
      if (regex.test(key)) {
        memoryCache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  async clear(): Promise<void> {
    memoryCache.clear();
  }

  isConnected(): boolean {
    return true; // Memory is always available
  }
}

// Redis Cache Provider
class RedisCacheProvider implements CacheProvider {
  private client: Redis | null = null;
  private connected: boolean = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      try {
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy(times) {
            if (times > 3) {
              console.warn("Redis connection failed, falling back to memory cache");
              return null; // Stop retrying
            }
            return Math.min(times * 200, 2000);
          },
          lazyConnect: true,
        });

        this.client.on("connect", () => {
          this.connected = true;
        });

        this.client.on("error", (err) => {
          console.warn("Redis error:", err.message);
          this.connected = false;
        });

        this.client.on("close", () => {
          this.connected = false;
        });

        // Connect immediately
        this.client.connect().catch(() => {
          console.warn("Redis initial connection failed, using memory cache");
        });
      } catch (error) {
        console.warn("Redis initialization failed:", error);
        this.client = null;
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.connected) return null;

    try {
      const value = await this.client.get(CACHE_PREFIX + key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn("Redis get error:", error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
    if (!this.client || !this.connected) return;

    try {
      await this.client.setex(
        CACHE_PREFIX + key,
        ttlSeconds,
        JSON.stringify(value)
      );
    } catch (error) {
      console.warn("Redis set error:", error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client || !this.connected) return;

    try {
      await this.client.del(CACHE_PREFIX + key);
    } catch (error) {
      console.warn("Redis delete error:", error);
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    if (!this.client || !this.connected) return 0;

    try {
      const keys = await this.client.keys(CACHE_PREFIX + pattern);
      if (keys.length === 0) return 0;

      const pipeline = this.client.pipeline();
      keys.forEach((key) => pipeline.del(key));
      await pipeline.exec();

      return keys.length;
    } catch (error) {
      console.warn("Redis deletePattern error:", error);
      return 0;
    }
  }

  async clear(): Promise<void> {
    if (!this.client || !this.connected) return;

    try {
      const keys = await this.client.keys(CACHE_PREFIX + "*");
      if (keys.length === 0) return;

      const pipeline = this.client.pipeline();
      keys.forEach((key) => pipeline.del(key));
      await pipeline.exec();
    } catch (error) {
      console.warn("Redis clear error:", error);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch {
      return false;
    }
  }
}

// ==================== HYBRID CACHE (Redis + Memory fallback) ====================

class HybridCacheProvider implements CacheProvider {
  private redis: RedisCacheProvider;
  private memory: MemoryCacheProvider;

  constructor() {
    this.redis = new RedisCacheProvider();
    this.memory = new MemoryCacheProvider();
  }

  private get provider(): CacheProvider {
    return this.redis.isConnected() ? this.redis : this.memory;
  }

  async get<T>(key: string): Promise<T | null> {
    // Try Redis first, fall back to memory
    if (this.redis.isConnected()) {
      const result = await this.redis.get<T>(key);
      if (result !== null) return result;
    }
    return this.memory.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
    // Write to both for redundancy
    await Promise.all([
      this.redis.set(key, value, ttlSeconds),
      this.memory.set(key, value, ttlSeconds),
    ]);
  }

  async delete(key: string): Promise<void> {
    await Promise.all([
      this.redis.delete(key),
      this.memory.delete(key),
    ]);
  }

  async deletePattern(pattern: string): Promise<number> {
    const [redisCount, memoryCount] = await Promise.all([
      this.redis.deletePattern(pattern),
      this.memory.deletePattern(pattern),
    ]);
    return Math.max(redisCount, memoryCount);
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.redis.clear(),
      this.memory.clear(),
    ]);
  }

  isConnected(): boolean {
    return true; // Hybrid always works (memory fallback)
  }

  isRedisConnected(): boolean {
    return this.redis.isConnected();
  }
}

// ==================== CACHE INSTANCE ====================

const cacheProvider = new HybridCacheProvider();

// ==================== CACHE API ====================

export const cache = {
  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    return cacheProvider.get<T>(key);
  },

  /**
   * Set a value in cache with optional TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
    return cacheProvider.set(key, value, ttlSeconds);
  },

  /**
   * Delete a specific cache key
   */
  async delete(key: string): Promise<void> {
    await cacheProvider.delete(key);
    await logInvalidation(key, undefined, "manual");
  },

  /**
   * Delete all keys matching a pattern (uses * as wildcard)
   */
  async deletePattern(pattern: string): Promise<number> {
    const deleted = await cacheProvider.deletePattern(pattern);
    if (deleted > 0) {
      await logInvalidation(undefined, pattern, "manual");
    }
    return deleted;
  },

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    return cacheProvider.clear();
  },

  /**
   * Cache-aside pattern: get from cache or fetch and cache
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = DEFAULT_TTL
  ): Promise<T> {
    const cached = await cacheProvider.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await cacheProvider.set(key, value, ttlSeconds);
    return value;
  },

  /**
   * Memoize a function with cache
   */
  memoize<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    keyFn: (...args: T) => string,
    ttlSeconds: number = DEFAULT_TTL
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const key = keyFn(...args);
      return cache.getOrSet(key, () => fn(...args), ttlSeconds);
    };
  },

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return cacheProvider.isRedisConnected();
  },
};

// ==================== ENTITY-SPECIFIC CACHING ====================

// Cache key generators
export const cacheKeys = {
  contact: (id: string) => `contact:${id}`,
  contacts: (userId: string, page?: number) => `contacts:${userId}:${page || "all"}`,
  company: (id: string) => `company:${id}`,
  companies: (userId: string, page?: number) => `companies:${userId}:${page || "all"}`,
  deal: (id: string) => `deal:${id}`,
  deals: (userId: string, page?: number) => `deals:${userId}:${page || "all"}`,
  dealsByStage: (stageId: string) => `deals:stage:${stageId}`,
  pipeline: (id: string) => `pipeline:${id}`,
  pipelines: () => "pipelines:all",
  quote: (id: string) => `quote:${id}`,
  quotes: (userId: string) => `quotes:${userId}`,
  product: (id: string) => `product:${id}`,
  products: () => "products:all",
  user: (id: string) => `user:${id}`,
  userPermissions: (userId: string) => `user:${userId}:permissions`,
  dashboard: (userId: string) => `dashboard:${userId}`,
  reports: (reportId: string) => `report:${reportId}`,
};

// Invalidate cache when entities change
export async function invalidateEntity(
  entityType: string,
  entityId: string,
  reason: "update" | "delete" = "update"
): Promise<void> {
  // Delete specific entity cache
  await cacheProvider.delete(`${entityType}:${entityId}`);

  // Delete related list caches
  await cacheProvider.deletePattern(`${entityType}s:*`);

  // Log invalidation
  await logInvalidation(`${entityType}:${entityId}`, undefined, reason, entityType, entityId);
}

// Invalidate all caches for a user (e.g., on permission change)
export async function invalidateUserCaches(userId: string): Promise<void> {
  await cacheProvider.deletePattern(`*:${userId}:*`);
  await cacheProvider.delete(cacheKeys.user(userId));
  await cacheProvider.delete(cacheKeys.userPermissions(userId));
  await cacheProvider.delete(cacheKeys.dashboard(userId));
}

// ==================== HELPERS ====================

async function logInvalidation(
  cacheKey?: string,
  pattern?: string,
  reason?: string,
  entityType?: string,
  entityId?: string
): Promise<void> {
  try {
    await prisma.cacheInvalidation.create({
      data: {
        cacheKey: cacheKey || "",
        pattern,
        reason: reason || "manual",
        entityType,
        entityId,
      },
    });
  } catch {
    // Ignore logging errors
  }
}

// ==================== CACHE WARMING ====================

// Warm frequently accessed data on startup
export async function warmCache(): Promise<void> {
  try {
    // Cache all pipelines
    const pipelines = await prisma.pipeline.findMany({
      include: { stages: { orderBy: { position: "asc" } } },
    });
    await cache.set(cacheKeys.pipelines(), pipelines, 3600); // 1 hour

    // Cache all products
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
    await cache.set(cacheKeys.products(), products, 3600);
  } catch (error) {
    console.error("Cache warming failed:", error);
  }
}

// ==================== CACHE STATS ====================

export async function getCacheStats(): Promise<{
  provider: "redis" | "memory";
  memoryEntries: number;
  redisConnected: boolean;
}> {
  return {
    provider: cacheProvider.isRedisConnected() ? "redis" : "memory",
    memoryEntries: memoryCache.size,
    redisConnected: cacheProvider.isRedisConnected(),
  };
}

export default cache;
