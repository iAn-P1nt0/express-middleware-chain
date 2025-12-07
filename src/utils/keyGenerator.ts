import type { Request } from 'express';

/**
 * Default key generator for rate limiting
 * Uses client IP address
 */
export function defaultRateLimitKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Default key generator for caching
 * Uses HTTP method and URL
 */
export function defaultCacheKey(req: Request): string {
  return `${req.method}:${req.originalUrl || req.url}`;
}
