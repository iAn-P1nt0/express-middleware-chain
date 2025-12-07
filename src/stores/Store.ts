/**
 * Store interface for rate limiting and caching backends
 */

export interface StoreValue {
  readonly data: unknown;
  readonly expires?: number;
  readonly tags?: readonly string[];
}

export interface RateLimitResult {
  readonly count: number;
  readonly resetAt: number;
  readonly remaining: number;
}

/**
 * Abstract storage interface for middleware state
 *
 * Implementations can be in-memory, Redis, or any other backend
 */
export interface Store {
  /**
   * Get a value from the store
   * @param key - The key to retrieve
   * @returns The stored value or undefined if not found or expired
   */
  get(key: string): Promise<StoreValue | undefined>;

  /**
   * Set a value in the store
   * @param key - The key to store
   * @param value - The value to store
   * @param ttl - Time to live in milliseconds (optional)
   */
  set(key: string, value: StoreValue, ttl?: number): Promise<void>;

  /**
   * Increment a counter (for rate limiting)
   * @param key - The key to increment
   * @param ttl - Time to live in milliseconds for the counter window
   * @returns Current count and reset time
   */
  increment(key: string, ttl?: number): Promise<RateLimitResult>;

  /**
   * Delete a value from the store
   * @param key - The key to delete
   */
  delete(key: string): Promise<void>;

  /**
   * Invalidate all entries with a specific tag
   * @param tag - The tag to invalidate
   */
  invalidateByTag(tag: string): Promise<void>;

  /**
   * Clear all entries (or entries matching a pattern)
   * @param pattern - Optional pattern to match keys (implementation-specific)
   */
  clear(pattern?: string): Promise<void>;
}
