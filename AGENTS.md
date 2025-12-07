# AGENTS.md - AI Agent Guidelines for Express Middleware Chain

## Project Context

This is **express-middleware-chain**, a TypeScript npm package for fluent, composable Express.js middleware orchestration. When working on this codebase, follow these guidelines to maintain consistency and quality.

---

## Quick Reference

| Aspect | Standard |
|--------|----------|
| Language | TypeScript (strict mode) |
| Runtime | Node.js 16+ |
| Build | tsup (ESM + CJS dual output) |
| Test | Vitest |
| Package Manager | pnpm |
| Linting | ESLint + Prettier |
| Commit Style | Conventional Commits |

---

## Architecture Overview

```
src/
├── index.ts              # Public API exports
├── types.ts              # Shared type definitions
├── chain/                # Core chain builder
│   ├── ChainBuilder.ts   # Fluent API implementation
│   └── ChainExecutor.ts  # Middleware execution
├── middleware/           # Built-in middleware
│   ├── validation.ts     # Zod validation
│   ├── rateLimit.ts      # Rate limiting
│   ├── cache.ts          # Response caching
│   └── errorBoundary.ts  # Error handling
├── context/              # Request context (AsyncLocalStorage)
├── stores/               # Store implementations
└── utils/                # Helper utilities
```

---

## Implementation Tasks

### Task: Implement ChainBuilder

**File**: `src/chain/ChainBuilder.ts`

**Requirements**:
- Fluent method chaining with proper `this` returns
- Generic type parameters `<TBody, TQuery, TParams>` that update on `.validate()`
- Maintain middleware array internally
- `.build()` returns `RequestHandler[]` for Express

**Pattern**:
```typescript
export class ChainBuilder<TBody = unknown, TQuery = unknown, TParams = unknown> {
  private middlewares: RequestHandler[] = [];

  validate<B extends z.ZodSchema, Q extends z.ZodSchema, P extends z.ZodSchema>(
    schemas: { body?: B; query?: Q; params?: P }
  ): ChainBuilder<z.infer<B>, z.infer<Q>, z.infer<P>> {
    this.middlewares.push(createValidationMiddleware(schemas));
    return this as unknown as ChainBuilder<z.infer<B>, z.infer<Q>, z.infer<P>>;
  }

  use(middleware: RequestHandler): this {
    this.middlewares.push(middleware);
    return this;
  }

  build(): RequestHandler[] {
    return [...this.middlewares];
  }
}
```

---

### Task: Implement Validation Middleware

**File**: `src/middleware/validation.ts`

**Requirements**:
- Accept Zod schemas for body, query, params
- Return 400 with structured error on validation failure
- Use `safeParse()` for non-throwing validation
- Attach parsed/typed values to request

**Pattern**:
```typescript
export interface ValidationSchemas<B, Q, P> {
  body?: z.ZodSchema<B>;
  query?: z.ZodSchema<Q>;
  params?: z.ZodSchema<P>;
}

export function createValidationMiddleware<B, Q, P>(
  schemas: ValidationSchemas<B, Q, P>
): RequestHandler {
  return (req, res, next) => {
    const errors: ValidationError[] = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.push({ location: 'body', issues: result.error.issues });
      } else {
        req.body = result.data;
      }
    }
    // Similar for query, params...

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    next();
  };
}
```

---

### Task: Implement Rate Limiting

**File**: `src/middleware/rateLimit.ts`

**Requirements**:
- Per-endpoint rate limiting (not global)
- Configurable: `limit`, `window` (duration string), `keyGenerator`
- Use Store interface for pluggable backends
- Default to MemoryStore
- Return 429 with `Retry-After` header when exceeded

**Key Design**:
```typescript
export interface RateLimitConfig {
  limit: number;                           // Max requests
  window: string | number;                 // '15m' or ms
  keyGenerator?: (req: Request) => string; // Default: IP
  store?: Store;                           // Default: MemoryStore
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
}
```

**Per-Endpoint Isolation**: Key includes route path:
```typescript
const key = `ratelimit:${req.route?.path || req.path}:${keyGenerator(req)}`;
```

---

### Task: Implement Response Caching

**File**: `src/middleware/cache.ts`

**Requirements**:
- Cache responses by request key
- Support duration strings ('5m', '1h', '1d')
- Configurable cache key generator
- Tag-based invalidation
- Only cache successful responses (2xx by default)
- Intercept `res.send()` to capture response

**Pattern**:
```typescript
export interface CacheOptions {
  key?: (req: Request) => string;
  tags?: string[];
  store?: Store;
  statusCodes?: number[];  // Default: [200, 201]
}

export function createCacheMiddleware(
  duration: string | number,
  options: CacheOptions = {}
): RequestHandler {
  const store = options.store || new MemoryStore();
  const ttl = parseDuration(duration);

  return async (req, res, next) => {
    const cacheKey = (options.key || defaultKeyGenerator)(req);
    const cached = await store.get(cacheKey);

    if (cached) {
      return res.status(cached.status).set(cached.headers).send(cached.body);
    }

    // Intercept response
    const originalSend = res.send.bind(res);
    res.send = (body) => {
      if (options.statusCodes?.includes(res.statusCode) ?? res.statusCode < 300) {
        store.set(cacheKey, { body, status: res.statusCode, headers: res.getHeaders() }, ttl);
      }
      return originalSend(body);
    };

    next();
  };
}
```

---

### Task: Implement Error Boundary

**File**: `src/middleware/errorBoundary.ts`

**Requirements**:
- Wrap middleware in try/catch
- Support custom error handlers
- Handle both sync and async errors
- Default handler returns 500 with error message

**Three Levels** (Option C):
1. Auto-wrap all middleware in chain for async safety
2. `.onError(handler)` for specific middleware errors
3. `.errorBoundary(handler?)` at chain end for catch-all

**Pattern**:
```typescript
export type ErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => void;

export function wrapWithErrorBoundary(
  middleware: RequestHandler,
  handler?: ErrorHandler
): RequestHandler {
  return async (req, res, next) => {
    try {
      await Promise.resolve(middleware(req, res, next));
    } catch (error) {
      if (handler) {
        handler(error as Error, req, res, next);
      } else {
        next(error);
      }
    }
  };
}
```

---

### Task: Implement RequestContext

**File**: `src/context/RequestContext.ts`

**Requirements**:
- Use AsyncLocalStorage for request-scoped data
- Auto-generate request ID (UUID v4)
- Provide typed get/set methods
- Support trace context for distributed tracing

**Pattern**:
```typescript
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

interface ContextStore {
  requestId: string;
  traceContext?: TraceContext;
  data: Map<string, unknown>;
}

const asyncLocalStorage = new AsyncLocalStorage<ContextStore>();

export const RequestContext = {
  init(): RequestHandler {
    return (req, res, next) => {
      const store: ContextStore = {
        requestId: randomUUID(),
        data: new Map(),
      };
      asyncLocalStorage.run(store, () => next());
    };
  },

  get<T>(key: string): T | undefined {
    return asyncLocalStorage.getStore()?.data.get(key) as T | undefined;
  },

  set<T>(key: string, value: T): void {
    asyncLocalStorage.getStore()?.data.set(key, value);
  },

  getRequestId(): string {
    return asyncLocalStorage.getStore()?.requestId ?? 'unknown';
  },
};
```

---

### Task: Implement Store Interface

**Files**: `src/stores/Store.ts`, `src/stores/MemoryStore.ts`

**Store Interface**:
```typescript
export interface StoreValue {
  data: unknown;
  expires?: number;
  tags?: string[];
}

export interface Store {
  get(key: string): Promise<StoreValue | undefined>;
  set(key: string, value: StoreValue, ttl?: number): Promise<void>;
  increment(key: string, ttl?: number): Promise<{ count: number; resetAt: number }>;
  delete(key: string): Promise<void>;
  invalidateByTag(tag: string): Promise<void>;
  clear(): Promise<void>;
}
```

**MemoryStore Implementation**:
- Use `Map<string, StoreValue>`
- TTL cleanup via `setTimeout` or periodic sweep
- Tag tracking via reverse index `Map<string, Set<string>>`

---

## Code Quality Standards

### TypeScript Rules

1. **No `any`** - Use `unknown` with type guards
2. **Explicit return types** on public functions
3. **Generic naming**: `TBody`, `TQuery`, `TParams` (not `T`, `U`, `V`)
4. **Readonly where possible**: `readonly middlewares: RequestHandler[]`

### Testing Standards

1. **Unit tests** for each middleware function
2. **Integration tests** with real Express app
3. **Type tests** using `tsd` or `expect-type`
4. **Coverage**: Minimum 85%

**Test file location**: Mirror source structure in `test/`
```
src/middleware/validation.ts → test/middleware/validation.test.ts
```

### Documentation

1. **JSDoc** on all public exports
2. **Examples** in JSDoc using `@example`
3. **README** with quick start and full API reference

---

## Express Compatibility

### Express 4 (Primary Target)
- Middleware signature: `(req, res, next)`
- Error handler: 4-param signature `(err, req, res, next)`
- Router via `express.Router()`

### Express 5 Differences
- Native Promise support in middleware
- `app.router` behavior changes
- Path matching differences

**Strategy**: Feature detection, not version sniffing:
```typescript
function isExpress5(app: Application): boolean {
  // Express 5 has different router mounting
  return typeof (app as any).lazyrouter === 'undefined';
}
```

---

## Common Patterns

### Duration Parsing

```typescript
// src/utils/duration.ts
const UNITS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export function parseDuration(input: string | number): number {
  if (typeof input === 'number') return input;
  const match = input.match(/^(\d+)(s|m|h|d)$/);
  if (!match) throw new Error(`Invalid duration: ${input}`);
  return parseInt(match[1], 10) * UNITS[match[2]];
}
```

### Cache Key Generation

```typescript
// src/utils/keyGenerator.ts
export function defaultCacheKey(req: Request): string {
  return `${req.method}:${req.originalUrl}`;
}

export function defaultRateLimitKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}
```

---

## Avoid These Patterns

❌ **Don't use `any`** - Use proper types or `unknown`
❌ **Don't mutate request directly** - Use context or typed extensions
❌ **Don't use global state** - All state must be scoped to request or store
❌ **Don't block the event loop** - All I/O must be async
❌ **Don't swallow errors** - Always propagate via `next(error)`

---

## File Templates

### New Middleware Template

```typescript
// src/middleware/myMiddleware.ts
import type { RequestHandler } from 'express';

export interface MyMiddlewareConfig {
  // Configuration options
}

export function createMyMiddleware(config: MyMiddlewareConfig): RequestHandler {
  // Pre-compute anything possible here

  return async (req, res, next) => {
    try {
      // Middleware logic
      next();
    } catch (error) {
      next(error);
    }
  };
}
```

### New Test Template

```typescript
// test/middleware/myMiddleware.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createMyMiddleware } from '../../src/middleware/myMiddleware';

describe('myMiddleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  it('should do expected behavior', async () => {
    app.use(createMyMiddleware({ /* config */ }));
    app.get('/test', (req, res) => res.json({ ok: true }));

    const response = await request(app).get('/test');
    expect(response.status).toBe(200);
  });
});
```

---

## Build & Release

### Build Commands
```bash
pnpm build        # Build with tsup
pnpm test         # Run tests
pnpm test:cov     # Tests with coverage
pnpm lint         # ESLint check
pnpm typecheck    # TypeScript check
```

### Package Exports

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./stores": {
      "import": "./dist/stores/index.mjs",
      "require": "./dist/stores/index.js"
    }
  }
}
```

### Peer Dependencies

```json
{
  "peerDependencies": {
    "express": "^4.18.0 || ^5.0.0",
    "zod": "^3.20.0"
  },
  "peerDependenciesMeta": {
    "zod": { "optional": true }
  }
}
```
