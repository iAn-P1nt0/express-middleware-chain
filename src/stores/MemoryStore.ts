import type { RateLimitResult, Store, StoreValue } from './Store';

interface CacheEntry {
  value: StoreValue;
  expiresAt?: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory store implementation
 *
 * Suitable for single-process applications or development.
 * For distributed systems, use Redis or another shared store.
 *
 * Features:
 * - TTL support with automatic expiration
 * - Tag-based invalidation
 * - Rate limiting counters
 * - Periodic cleanup of expired entries
 */
export class MemoryStore implements Store {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly rateLimits = new Map<string, RateLimitEntry>();
  private readonly tagIndex = new Map<string, Set<string>>();
  private cleanupInterval?: NodeJS.Timeout | undefined;

  constructor(
    private readonly options: {
      cleanupIntervalMs?: number;
      maxSize?: number;
    } = {}
  ) {
    const { cleanupIntervalMs = 60000 } = options; // Default: 1 minute

    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, cleanupIntervalMs);

    // Prevent the interval from keeping the process alive
    this.cleanupInterval.unref();
  }

  async get(key: string): Promise<StoreValue | undefined> {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.removeFromTagIndex(key, entry.value.tags);
      return undefined;
    }

    return entry.value;
  }

  async set(key: string, value: StoreValue, ttl?: number): Promise<void> {
    // Check max size limit
    if (this.options.maxSize && this.cache.size >= this.options.maxSize) {
      // Remove oldest entry (simple LRU-like behavior)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        await this.delete(firstKey);
      }
    }

    // Remove old tag associations if updating
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.removeFromTagIndex(key, oldEntry.value.tags);
    }

    const entry: CacheEntry = ttl
      ? { value, expiresAt: Date.now() + ttl }
      : { value };

    this.cache.set(key, entry);

    // Update tag index
    if (value.tags) {
      for (const tag of value.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(key);
      }
    }
  }

  async increment(key: string, ttl: number = 60000): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.rateLimits.get(key);

    if (!entry || now > entry.resetAt) {
      // Create new counter window
      const resetAt = now + ttl;
      this.rateLimits.set(key, { count: 1, resetAt });
      return { count: 1, resetAt, remaining: 0 };
    }

    // Increment existing counter
    entry.count += 1;
    return {
      count: entry.count,
      resetAt: entry.resetAt,
      remaining: 0 // Will be calculated by rate limiter based on limit
    };
  }

  async delete(key: string): Promise<void> {
    const entry = this.cache.get(key);
    if (entry) {
      this.removeFromTagIndex(key, entry.value.tags);
    }
    this.cache.delete(key);
    this.rateLimits.delete(key);
  }

  async invalidateByTag(tag: string): Promise<void> {
    const keys = this.tagIndex.get(tag);
    if (!keys) {
      return;
    }

    // Delete all entries with this tag
    for (const key of keys) {
      this.cache.delete(key);
    }

    this.tagIndex.delete(tag);
  }

  async clear(pattern?: string): Promise<void> {
    if (!pattern) {
      // Clear everything
      this.cache.clear();
      this.rateLimits.clear();
      this.tagIndex.clear();
      return;
    }

    // Clear by pattern (simple prefix matching)
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (this.matchesPattern(key, pattern)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key);
    }

    // Also clear rate limits matching pattern
    for (const key of this.rateLimits.keys()) {
      if (this.matchesPattern(key, pattern)) {
        this.rateLimits.delete(key);
      }
    }
  }

  /**
   * Get current store size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get rate limit count
   */
  get rateLimitCount(): number {
    return this.rateLimits.size;
  }

  /**
   * Stop the cleanup interval (useful for testing or shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cleanupInterval = undefined;
  }

  /**
   * Manually trigger cleanup of expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    // Cleanup cache entries
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      const entry = this.cache.get(key);
      if (entry) {
        this.removeFromTagIndex(key, entry.value.tags);
      }
      this.cache.delete(key);
    }

    // Cleanup rate limit entries
    for (const [key, entry] of this.rateLimits.entries()) {
      if (now > entry.resetAt) {
        this.rateLimits.delete(key);
      }
    }
  }

  private removeFromTagIndex(key: string, tags?: readonly string[]): void {
    if (!tags) {
      return;
    }

    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Simple glob-like pattern matching
    // Supports: * (wildcard), exact match
    if (pattern.includes('*')) {
      const regexPattern = pattern
        .split('*')
        .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*');
      return new RegExp(`^${regexPattern}$`).test(key);
    }
    return key === pattern;
  }
}
