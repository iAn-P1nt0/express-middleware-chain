import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore } from '../../src/stores/MemoryStore';

describe('MemoryStore', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore({ cleanupIntervalMs: 100 });
  });

  afterEach(() => {
    store.destroy();
  });

  describe('get/set', () => {
    it('should store and retrieve a value', async () => {
      await store.set('key1', { data: 'value1' });
      const result = await store.get('key1');
      expect(result).toEqual({ data: 'value1' });
    });

    it('should return undefined for non-existent key', async () => {
      const result = await store.get('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should expire values after TTL', async () => {
      await store.set('key1', { data: 'value1' }, 50); // 50ms TTL

      // Should exist immediately
      let result = await store.get('key1');
      expect(result).toEqual({ data: 'value1' });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should be expired
      result = await store.get('key1');
      expect(result).toBeUndefined();
    });

    it('should handle values without TTL', async () => {
      await store.set('key1', { data: 'permanent' });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await store.get('key1');
      expect(result).toEqual({ data: 'permanent' });
    });

    it('should update existing values', async () => {
      await store.set('key1', { data: 'value1' });
      await store.set('key1', { data: 'value2' });

      const result = await store.get('key1');
      expect(result).toEqual({ data: 'value2' });
    });
  });

  describe('delete', () => {
    it('should delete a value', async () => {
      await store.set('key1', { data: 'value1' });
      await store.delete('key1');

      const result = await store.get('key1');
      expect(result).toBeUndefined();
    });

    it('should handle deleting non-existent key', async () => {
      await expect(store.delete('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('increment (rate limiting)', () => {
    it('should increment counter starting from 1', async () => {
      const result = await store.increment('counter1', 1000);

      expect(result.count).toBe(1);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it('should increment existing counter', async () => {
      await store.increment('counter1', 1000);
      await store.increment('counter1', 1000);
      const result = await store.increment('counter1', 1000);

      expect(result.count).toBe(3);
    });

    it('should reset counter after TTL expires', async () => {
      await store.increment('counter1', 50);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await store.increment('counter1', 50);
      expect(result.count).toBe(1); // Reset to 1
    });

    it('should handle multiple independent counters', async () => {
      await store.increment('counter1', 1000);
      await store.increment('counter2', 1000);
      const result1 = await store.increment('counter1', 1000);
      const result2 = await store.increment('counter2', 1000);

      expect(result1.count).toBe(2);
      expect(result2.count).toBe(2);
    });
  });

  describe('tag-based invalidation', () => {
    it('should invalidate entries by tag', async () => {
      await store.set('key1', { data: 'value1', tags: ['users'] });
      await store.set('key2', { data: 'value2', tags: ['users'] });
      await store.set('key3', { data: 'value3', tags: ['posts'] });

      await store.invalidateByTag('users');

      expect(await store.get('key1')).toBeUndefined();
      expect(await store.get('key2')).toBeUndefined();
      expect(await store.get('key3')).toEqual({ data: 'value3', tags: ['posts'] });
    });

    it('should handle multiple tags on one entry', async () => {
      await store.set('key1', { data: 'value1', tags: ['users', 'admins'] });

      await store.invalidateByTag('users');

      expect(await store.get('key1')).toBeUndefined();
    });

    it('should handle invalidating non-existent tag', async () => {
      await expect(store.invalidateByTag('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all entries when no pattern provided', async () => {
      await store.set('key1', { data: 'value1' });
      await store.set('key2', { data: 'value2' });
      await store.increment('counter1', 1000);

      await store.clear();

      expect(await store.get('key1')).toBeUndefined();
      expect(await store.get('key2')).toBeUndefined();
      expect(store.size).toBe(0);
      expect(store.rateLimitCount).toBe(0);
    });

    it('should clear entries matching pattern', async () => {
      await store.set('user:1', { data: 'user1' });
      await store.set('user:2', { data: 'user2' });
      await store.set('post:1', { data: 'post1' });

      await store.clear('user:*');

      expect(await store.get('user:1')).toBeUndefined();
      expect(await store.get('user:2')).toBeUndefined();
      expect(await store.get('post:1')).toEqual({ data: 'post1' });
    });

    it('should clear exact match pattern', async () => {
      await store.set('key1', { data: 'value1' });
      await store.set('key2', { data: 'value2' });

      await store.clear('key1');

      expect(await store.get('key1')).toBeUndefined();
      expect(await store.get('key2')).toEqual({ data: 'value2' });
    });
  });

  describe('maxSize limit', () => {
    it('should enforce max size limit', async () => {
      const limitedStore = new MemoryStore({ maxSize: 2 });

      await limitedStore.set('key1', { data: 'value1' });
      await limitedStore.set('key2', { data: 'value2' });
      await limitedStore.set('key3', { data: 'value3' });

      // Should have removed oldest entry
      expect(limitedStore.size).toBe(2);
      expect(await limitedStore.get('key1')).toBeUndefined();
      expect(await limitedStore.get('key2')).toEqual({ data: 'value2' });
      expect(await limitedStore.get('key3')).toEqual({ data: 'value3' });

      limitedStore.destroy();
    });
  });

  describe('automatic cleanup', () => {
    it('should automatically clean up expired entries', async () => {
      const cleanupStore = new MemoryStore({ cleanupIntervalMs: 50 });

      await cleanupStore.set('key1', { data: 'value1' }, 25);
      await cleanupStore.set('key2', { data: 'value2' }, 25);

      expect(cleanupStore.size).toBe(2);

      // Wait for cleanup to run
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(cleanupStore.size).toBe(0);

      cleanupStore.destroy();
    });
  });
});
