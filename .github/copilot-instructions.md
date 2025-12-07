# GitHub Copilot Instructions - Express Middleware Chain

## Project Summary

**express-middleware-chain** is a TypeScript npm package providing a fluent API for composable Express.js middleware orchestration. It unifies validation (Zod), rate limiting, caching, request context, and error handling into a single declarative chain.

## Key APIs

```typescript
// Main factory function
chain(): ChainBuilder<unknown, unknown, unknown>

// ChainBuilder methods
.validate({ body?, query?, params? })  // Zod schema validation
.use(middleware)                        // Add custom middleware
.rateLimit({ limit, window, ... })      // Per-endpoint rate limiting
.cache(duration, options?)              // Response caching
.errorBoundary(handler?)                // Error handling
.onError(handler)                       // Per-step error handler
.compose(otherChain)                    // Combine chains
.build()                                // Returns RequestHandler[]
```

## Code Style

### TypeScript Conventions
- **Strict mode enabled** - no `any`, use `unknown` with type guards
- **Explicit return types** on all public functions
- **Generic naming**: Use descriptive names like `TBody`, `TQuery`, `TParams`
- **Readonly arrays**: `readonly RequestHandler[]`

### Middleware Pattern
```typescript
export function createMiddleware(config: Config): RequestHandler {
  return async (req, res, next) => {
    try {
      // logic here
      next();
    } catch (error) {
      next(error);
    }
  };
}
```

### Imports
```typescript
// Prefer type imports for types-only
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { z } from 'zod';

// Runtime imports
import { AsyncLocalStorage } from 'node:async_hooks';
```

## Architecture Patterns

### Express 4/5 Compatibility
Primary target is Express 4 with Express 5 support via feature detection:
```typescript
// Use feature detection, not version checking
const isExpress5 = typeof app.lazyrouter === 'undefined';
```

### Store Interface (Plugin-Based)
Only `MemoryStore` is built-in. External stores (Redis) are peer dependencies:
```typescript
interface Store {
  get(key: string): Promise<StoreValue | undefined>;
  set(key: string, value: StoreValue, ttl?: number): Promise<void>;
  increment(key: string, ttl?: number): Promise<{ count: number; resetAt: number }>;
  delete(key: string): Promise<void>;
  invalidateByTag(tag: string): Promise<void>;
}
```

### Error Handling (Three Levels)
1. **Auto-wrap**: All middleware wrapped for async error catching
2. **Per-step**: `.onError(handler)` after specific middleware
3. **Chain-level**: `.errorBoundary(handler?)` as catch-all

### Request Context
Uses `AsyncLocalStorage` for request-scoped data:
```typescript
import { RequestContext } from 'express-middleware-chain';

// In any async code within request
const userId = RequestContext.get<string>('userId');
const requestId = RequestContext.getRequestId();
```

## Directory Structure

```
src/
├── index.ts              # Public exports
├── types.ts              # Shared types
├── chain/
│   ├── ChainBuilder.ts   # Fluent API
│   └── ChainExecutor.ts  # Execution logic
├── middleware/
│   ├── validation.ts     # Zod validation
│   ├── rateLimit.ts      # Rate limiting
│   ├── cache.ts          # Response caching
│   └── errorBoundary.ts  # Error handling
├── context/
│   └── RequestContext.ts # AsyncLocalStorage wrapper
├── stores/
│   ├── Store.ts          # Interface
│   └── MemoryStore.ts    # Default implementation
└── utils/
    ├── duration.ts       # Parse '5m', '1h' strings
    └── keyGenerator.ts   # Cache/rate limit keys
```

## Testing

- **Framework**: Vitest
- **HTTP testing**: supertest
- **Coverage target**: 85%
- **Type tests**: tsd or expect-type

```typescript
// Test pattern
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

describe('middleware', () => {
  it('should work', async () => {
    const app = express();
    // setup and test
  });
});
```

## Common Utilities

### Duration Parsing
```typescript
parseDuration('5m')  // → 300000 (ms)
parseDuration('1h')  // → 3600000
parseDuration(5000)  // → 5000 (passthrough)
```

### Key Generation
```typescript
// Cache key: METHOD:URL
defaultCacheKey(req) // → 'GET:/api/users'

// Rate limit key: IP address
defaultRateLimitKey(req) // → '192.168.1.1'
```

## Avoid

- ❌ Using `any` type
- ❌ Global state (use stores or context)
- ❌ Blocking operations (always async)
- ❌ Swallowing errors (propagate via `next(error)`)
- ❌ Mutating `req` directly (use typed extensions)

## Dependencies

### Peer Dependencies
- `express` ^4.18.0 || ^5.0.0
- `zod` ^3.20.0 (optional)

### Dev Dependencies
- `typescript`, `tsup`, `vitest`, `supertest`, `eslint`, `prettier`

## Build

```bash
pnpm install    # Install deps
pnpm build      # Build with tsup (ESM + CJS)
pnpm test       # Run tests
pnpm typecheck  # TypeScript check
```
