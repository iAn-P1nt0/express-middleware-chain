import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ZodIssue, ZodSchema } from 'zod';

export type ValidationLocation = 'body' | 'query' | 'params';

export interface ValidationError {
  readonly location: ValidationLocation;
  readonly issues: readonly ZodIssue[];
}

export interface ValidationSchemas<TBody = unknown, TQuery = unknown, TParams = unknown> {
  readonly body?: ZodSchema<TBody>;
  readonly query?: ZodSchema<TQuery>;
  readonly params?: ZodSchema<TParams>;
}

export type Middleware = RequestHandler | ErrorRequestHandler;

export type ErrorHandler = (
  error: unknown,
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
  next: Parameters<RequestHandler>[2]
) => void;
