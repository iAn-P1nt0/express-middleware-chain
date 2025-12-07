import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { MemoryStore } from '../stores/MemoryStore';
import type { Store } from '../stores/Store';
import { defaultRateLimitKey } from '../utils/keyGenerator';
import { parseDuration } from '../utils/duration';

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  readonly limit: number;

  /**
   * Time window for the rate limit
   * Can be a number (milliseconds) or a duration string ('15m', '1h', etc.)
   * @default '15m'
   */
  readonly window?: string | number;

  /**
   * Function to generate the rate limit key from the request
   * @default (req) => req.ip
   */
  readonly keyGenerator?: (req: Request) => string;

  /**
   * Store implementation for tracking rate limits
   * @default MemoryStore (single-process only)
   */
  readonly store?: Store;

  /**
   * Custom message to send when rate limit is exceeded
   */
  readonly message?: string;

  /**
   * Skip rate limiting for failed requests (4xx/5xx responses)
   * @default false
   */
  readonly skipFailedRequests?: boolean;

  /**
   * Skip rate limiting for successful requests (2xx/3xx responses)
   * @default false
   */
  readonly skipSuccessfulRequests?: boolean;

  /**
   * Handler called when rate limit is exceeded
   */
  readonly onLimitReached?: (req: Request, res: Response) => void;
}

const defaultStore = new MemoryStore();

/**
 * Create a rate limiting middleware
 *
 * Limits the number of requests from a client in a given time window.
 * Rate limits are per-endpoint by default (route path is included in the key).
 *
 * @example
 * ```typescript
 * app.use('/api', createRateLimitMiddleware({
 *   limit: 100,
 *   window: '15m'
 * }));
 * ```
 */
export function createRateLimitMiddleware(config: RateLimitConfig): RequestHandler {
  const {
    limit,
    window = '15m',
    keyGenerator = defaultRateLimitKey,
    store = defaultStore,
    message = 'Too many requests, please try again later.',
    skipFailedRequests = false,
    skipSuccessfulRequests = false,
    onLimitReached
  } = config;

  const windowMs = parseDuration(window);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Generate rate limit key (includes route path for per-endpoint limiting)
      const clientKey = keyGenerator(req);
      const routePath = req.route?.path || req.path || 'unknown';
      const key = `ratelimit:${routePath}:${clientKey}`;

      // Check if we should skip based on response status
      if (skipFailedRequests || skipSuccessfulRequests) {
        // Intercept response to check status code
        const originalSend = res.send.bind(res);
        res.send = function (body): Response {
          const statusCode = res.statusCode;

          if (skipFailedRequests && statusCode >= 400) {
            // Don't count failed requests
            return originalSend(body);
          }

          if (skipSuccessfulRequests && statusCode < 400) {
            // Don't count successful requests
            return originalSend(body);
          }

          // Count this request (async, don't wait)
          void store.increment(key, windowMs);

          return originalSend(body);
        };

        next();
        return;
      }

      // Increment request counter
      const result = await store.increment(key, windowMs);

      // Calculate remaining requests
      const remaining = Math.max(0, limit - result.count);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString());

      // Check if limit exceeded
      if (result.count > limit) {
        const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());

        if (onLimitReached) {
          onLimitReached(req, res);
          return;
        }

        res.status(429).json({
          error: 'Too Many Requests',
          message,
          retryAfter
        });
        return;
      }

      next();
    } catch (error) {
      // Don't block requests if rate limiting fails
      console.error('Rate limiting error:', error);
      next();
    }
  };
}
