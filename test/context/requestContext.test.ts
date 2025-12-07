import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { RequestContext } from '../../src/context/RequestContext';

// Basic sanity: context is per-request and survives async hops

describe('RequestContext', () => {
  it('sets and retrieves per-request values with unique requestId', async () => {
    const app = express();

    app.use(RequestContext.init());

    app.get('/ctx', async (_req, res) => {
      RequestContext.set('user', 'alice');
      await new Promise((resolve) => setTimeout(resolve, 5));
      const user = RequestContext.get<string>('user');
      const requestId = RequestContext.getRequestId();
      res.json({ user, requestId });
    });

    const res = await request(app).get('/ctx');
    expect(res.status).toBe(200);
    expect(res.body.user).toBe('alice');
    expect(typeof res.body.requestId).toBe('string');
  });
});
