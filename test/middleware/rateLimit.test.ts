import type { Request, Response } from 'express';
import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chain, MemoryStore } from '../../src';
import { createRateLimitMiddleware } from '../../src/middleware/rateLimit';

describe('createRateLimitMiddleware', () => {
  let app: express.Application;
  let store: MemoryStore;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    store = new MemoryStore();
  });

  afterEach(() => {
    store.destroy();
  });

  it('should allow requests within limit', async () => {
    app.get(
      '/test',
      createRateLimitMiddleware({ limit: 5, window: '1m', store }),
      (_req: Request, res: Response) => {
        res.json({ ok: true });
      }
    );

    // Make 3 requests (all should succeed)
    for (let i = 0; i < 3; i++) {
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    }
  });

  it('should block requests exceeding limit', async () => {
    app.get(
      '/test',
      createRateLimitMiddleware({ limit: 3, window: '1m', store }),
      (_req: Request, res: Response) => {
        res.json({ ok: true });
      }
    );

    // Make requests up to limit
    for (let i = 0; i < 3; i++) {
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    }

    // Next request should be rate limited
    const response = await request(app).get('/test');
    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Too Many Requests');
    expect(response.headers['retry-after']).toBeDefined();
  });

  it('should set rate limit headers', async () => {
    app.get(
      '/test',
      createRateLimitMiddleware({ limit: 10, window: '1m', store }),
      (_req: Request, res: Response) => {
        res.json({ ok: true });
      }
    );

    const response = await request(app).get('/test');

    expect(response.headers['x-ratelimit-limit']).toBe('10');
    expect(response.headers['x-ratelimit-remaining']).toBe('9');
    expect(response.headers['x-ratelimit-reset']).toBeDefined();
  });

  it('should use custom key generator', async () => {
    const keyGen = vi.fn((req: Request) => req.headers['x-api-key'] as string || 'default');

    app.get(
      '/test',
      createRateLimitMiddleware({ limit: 2, window: '1m', store, keyGenerator: keyGen }),
      (_req: Request, res: Response) => {
        res.json({ ok: true });
      }
    );

    // Two requests with different API keys should not interfere
    await request(app).get('/test').set('X-API-Key', 'key1');
    await request(app).get('/test').set('X-API-Key', 'key1');

    const response1 = await request(app).get('/test').set('X-API-Key', 'key1');
    expect(response1.status).toBe(429); // Third request with key1 blocked

    const response2 = await request(app).get('/test').set('X-API-Key', 'key2');
    expect(response2.status).toBe(200); // First request with key2 allowed

    expect(keyGen).toHaveBeenCalled();
  });

  it('should use custom message', async () => {
    const customMessage = 'Slow down there, partner!';

    app.get(
      '/test',
      createRateLimitMiddleware({ limit: 1, window: '1m', store, message: customMessage }),
      (_req: Request, res: Response) => {
        res.json({ ok: true });
      }
    );

    await request(app).get('/test');

    const response = await request(app).get('/test');
    expect(response.status).toBe(429);
    expect(response.body.message).toBe(customMessage);
  });

  it('should call onLimitReached handler', async () => {
    const handler = vi.fn((_req: Request, res: Response) => {
      res.status(429).json({ custom: 'response' });
    });

    app.get(
      '/test',
      createRateLimitMiddleware({ limit: 1, window: '1m', store, onLimitReached: handler }),
      (_req: Request, res: Response) => {
        res.json({ ok: true });
      }
    );

    await request(app).get('/test');
    await request(app).get('/test');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should handle per-endpoint rate limiting', async () => {
    app.get(
      '/endpoint1',
      createRateLimitMiddleware({ limit: 2, window: '1m', store }),
      (_req: Request, res: Response) => {
        res.json({ endpoint: 1 });
      }
    );

    app.get(
      '/endpoint2',
      createRateLimitMiddleware({ limit: 2, window: '1m', store }),
      (_req: Request, res: Response) => {
        res.json({ endpoint: 2 });
      }
    );

    // Make 2 requests to endpoint1
    await request(app).get('/endpoint1');
    await request(app).get('/endpoint1');

    // Third request to endpoint1 should be blocked
    const response1 = await request(app).get('/endpoint1');
    expect(response1.status).toBe(429);

    // But endpoint2 should still allow requests
    const response2 = await request(app).get('/endpoint2');
    expect(response2.status).toBe(200);
  });

  it('should work with chain builder', async () => {
    app.get(
      '/test',
      ...chain()
        .rateLimit({ limit: 3, window: '1m', store })
        .use((_req: Request, res: Response) => {
          res.json({ ok: true });
        })
        .build()
    );

    // Make requests up to limit
    for (let i = 0; i < 3; i++) {
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    }

    // Next request should be rate limited
    const response = await request(app).get('/test');
    expect(response.status).toBe(429);
  });

  it('should parse duration strings', async () => {
    app.get(
      '/test-seconds',
      createRateLimitMiddleware({ limit: 2, window: '5s', store }),
      (_req: Request, res: Response) => {
        res.json({ ok: true });
      }
    );

    await request(app).get('/test-seconds');
    await request(app).get('/test-seconds');

    const response = await request(app).get('/test-seconds');
    expect(response.status).toBe(429);
  });

  it('should reset counter after window expires', async () => {
    app.get(
      '/test',
      createRateLimitMiddleware({ limit: 2, window: 100, store }), // 100ms window
      (_req: Request, res: Response) => {
        res.json({ ok: true });
      }
    );

    // Use up the limit
    await request(app).get('/test');
    await request(app).get('/test');

    const blocked = await request(app).get('/test');
    expect(blocked.status).toBe(429);

    // Wait for window to reset
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should be allowed again
    const allowed = await request(app).get('/test');
    expect(allowed.status).toBe(200);
  });
});
