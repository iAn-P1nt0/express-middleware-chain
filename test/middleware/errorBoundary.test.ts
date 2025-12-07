import type { Request, Response } from 'express';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { chain } from '../../src';
import { wrapWithErrorBoundary } from '../../src/middleware';

const asyncBoom = () => Promise.reject(new Error('boom'));

describe('error boundary middleware', () => {
  it('wrapWithErrorBoundary catches async errors and delegates to handler', async () => {
    const app = express();
    const handler = vi.fn((err: unknown, _req: Request, res: Response) => {
      res.status(500).json({ message: (err as Error).message });
    });

    app.get('/test', wrapWithErrorBoundary(async (_req, _res) => asyncBoom(), handler));

    const res = await request(app).get('/test');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('boom');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('chain.errorBoundary adds catch-all handler when none provided', async () => {
    const app = express();

    app.get(
      '/test',
      ...chain()
        .use((_req, _res) => {
          throw new Error('fail');
        })
        .errorBoundary()
        .build()
    );

    const res = await request(app).get('/test');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal Server Error');
  });
});
