import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodIssue, ZodSchema } from 'zod';
import type { ValidationError, ValidationSchemas } from '../types';

interface SegmentResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly issues?: readonly ZodIssue[];
}

export function createValidationMiddleware<TBody, TQuery, TParams>(
  schemas: ValidationSchemas<TBody, TQuery, TParams>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: ValidationError[] = [];

    const bodyResult = runValidation(schemas.body, req.body);
    if (!bodyResult.success && bodyResult.issues) {
      errors.push({ location: 'body', issues: bodyResult.issues });
    } else if (bodyResult.data !== undefined) {
      req.body = bodyResult.data as unknown;
    }

    const queryResult = runValidation(schemas.query, req.query);
    if (!queryResult.success && queryResult.issues) {
      errors.push({ location: 'query', issues: queryResult.issues });
    } else if (queryResult.data !== undefined) {
      (req.query as unknown) = queryResult.data;
    }

    const paramsResult = runValidation(schemas.params, req.params);
    if (!paramsResult.success && paramsResult.issues) {
      errors.push({ location: 'params', issues: paramsResult.issues });
    } else if (paramsResult.data !== undefined) {
      (req.params as unknown) = paramsResult.data;
    }

    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    next();
  };
}

function runValidation<T>(
  schema: ZodSchema<T> | undefined,
  value: unknown
): SegmentResult<T> {
  if (!schema) {
    return { success: true };
  }

  const result = schema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data as T };
  }

  return { success: false, issues: result.error.issues };
}
