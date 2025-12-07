import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import type { ErrorHandler } from '../types';

// Wrap a standard middleware to catch sync/async errors and delegate to custom handler or next()
export function wrapWithErrorBoundary(
  middleware: RequestHandler,
  handler?: ErrorHandler
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = middleware(req, res, next);
      if (isPromiseLike(result)) {
        await result;
      }
    } catch (error) {
      if (handler) {
        handler(error, req, res, next);
        return;
      }
      next(error);
    }
  };
}

// Chain-level boundary middleware (4-arity) for catch-all handling
export function createErrorBoundaryMiddleware(
  handler?: ErrorRequestHandler
): ErrorRequestHandler {
  if (handler) return handler;

  const defaultHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const status = (err as { status?: number }).status ?? 500;
    res.status(status).json({ error: 'Internal Server Error' });
  };

  return defaultHandler;
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return Boolean(value) && typeof (value as Promise<unknown>).then === 'function';
}
