import type { Request, Response } from 'express';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { chain } from '../../src';

describe('createValidationMiddleware', () => {
  it('validates body and forwards parsed data', async () => {
    const app = express();
    app.use(express.json());

    const schema = z.object({ email: z.string().email(), age: z.number().int() });

    app.post('/users', ...chain().validate({ body: schema }).build(), (req: Request, res: Response) => {
      res.json({ email: (req.body as { email: string }).email, age: (req.body as { age: number }).age });
    });

    const response = await request(app)
      .post('/users')
      .send({ email: 'user@example.com', age: 30 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ email: 'user@example.com', age: 30 });
  });

  it('returns 400 when validation fails', async () => {
    const app = express();
    app.use(express.json());

    const schema = z.object({ email: z.string().email() });

    app.post('/users', ...chain().validate({ body: schema }).build(), (_req: Request, res: Response) => {
      res.json({ ok: true });
    });

    const response = await request(app).post('/users').send({ email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors[0].location).toBe('body');
  });

  it('validates query and params together', async () => {
    const app = express();

    const querySchema = z.object({ page: z.coerce.number().min(1) });
    const paramsSchema = z.object({ userId: z.string().uuid() });

    app.get(
      '/users/:userId',
      ...chain().validate({ query: querySchema, params: paramsSchema }).build(),
      (req: Request, res: Response) => {
        res.json({
          userId: (req.params as { userId: string }).userId,
          page: (req.query as unknown as { page: number }).page
        });
      }
    );

    const response = await request(app).get('/users/550e8400-e29b-41d4-a716-446655440000?page=2');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      page: 2
    });
  });
});
