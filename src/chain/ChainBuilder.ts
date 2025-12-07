import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Middleware, ValidationSchemas } from '../types';
import { createValidationMiddleware } from '../middleware/validation';
import { createErrorBoundaryMiddleware } from '../middleware/errorBoundary';

export class ChainBuilder<TBody = unknown, TQuery = unknown, TParams = unknown> {
  private readonly middlewares: Middleware[] = [];

  validate<B, Q, P>(schemas: ValidationSchemas<B, Q, P>): ChainBuilder<B, Q, P> {
    const middleware = createValidationMiddleware(schemas as ValidationSchemas);
    this.middlewares.push(middleware);
    return this as unknown as ChainBuilder<B, Q, P>;
  }

  use(middleware: RequestHandler): this {
    this.middlewares.push(this.wrapAsync(middleware));
    return this;
  }

  compose(builder: ChainBuilder): this {
    this.middlewares.push(...builder.build());
    return this;
  }

  errorBoundary(handler?: ErrorRequestHandler): this {
    this.middlewares.push(createErrorBoundaryMiddleware(handler));
    return this;
  }

  build(): readonly (RequestHandler | ErrorRequestHandler)[] {
    return [...this.middlewares];
  }

  private wrapAsync(handler: RequestHandler): RequestHandler {
    return (req, res, next) => {
      try {
        const result = handler(req, res, next);
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          (result as Promise<unknown>).catch((error) => next(error));
        }
      } catch (error) {
        next(error);
      }
    };
  }
}

export function chain<TBody = unknown, TQuery = unknown, TParams = unknown>(): ChainBuilder<TBody, TQuery, TParams> {
  return new ChainBuilder<TBody, TQuery, TParams>();
}
