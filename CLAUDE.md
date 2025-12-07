# CLAUDE.md - Express Middleware Chain

## Project Overview

**express-middleware-chain** is a TypeScript-first npm package providing fluent, composable middleware orchestration for Express.js applications. It unifies validation (Zod), rate limiting, caching, context passing, and error handling into a single declarative chain API.

### Problem Statement

- Express lacks declarative middleware composition for request pipelines
- Middleware order complexity increases with app size
- No built-in request validation + transformation pipeline
- Error handling is scattered across multiple middleware
- No composable middleware orchestration library exists in the ecosystem

### Target API

```typescript
import { chain } from 'express-middleware-chain';
import { z } from 'zod';

const userSchema = z.object({ email: z.string().email(), name: z.string() });

const apiChain = chain()
  .validate({ body: userSchema, query: querySchema })
  .authenticate()
  .authorize(['admin', 'moderator'])
  .transform(normalizeInput)
  .rateLimit({ limit: 100, window: '15m' })
  .cache('5m')
  .errorBoundary()
  .build();

app.post('/api/users', apiChain, handler);
```

---

## Architecture

### Directory Structure

```
express-middleware-chain/
├── src/
│   ├── index.ts                  # Main exports
│   ├── types.ts                  # Core interfaces & type definitions
│   ├── chain/
│   │   ├── ChainBuilder.ts       # Fluent builder API with generics
│   │   ├── ChainExecutor.ts      # Middleware execution logic
│   │   └── index.ts
│   ├── middleware/
│   │   ├── validation.ts         # Zod schema validation
│   │   ├── rateLimit.ts          # Per-endpoint rate limiting
│   │   ├── cache.ts              # Response caching with invalidation
│   │   ├── errorBoundary.ts      # Error handling wrapper
│   │   ├── context.ts            # Request context injection
│   │   └── index.ts
│   ├── context/
│   │   ├── RequestContext.ts     # AsyncLocalStorage wrapper
│   │   ├── ContextProvider.ts    # Context initialization middleware
│   │   └── index.ts
│   ├── stores/
│   │   ├── Store.ts              # Store interface (abstract)
│   │   ├── MemoryStore.ts        # Built-in in-memory store
│   │   └── index.ts
│   └── utils/
│       ├── duration.ts           # Parse duration strings ('5m', '1h')
│       ├── keyGenerator.ts       # Cache/rate limit key utilities
│       └── index.ts
├── test/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── examples/
│   ├── basic-usage/
│   ├── with-authentication/
│   └── full-api/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── README.md
```

### Core Components

#### 1. ChainBuilder (Fluent API)

The heart of the package - provides type-safe method chaining:

```typescript
class ChainBuilder<TBody = unknown, TQuery = unknown, TParams = unknown> {
  validate<B, Q, P>(schemas: ValidationSchemas<B, Q, P>): ChainBuilder<B, Q, P>;
  use(middleware: Middleware): this;
  rateLimit(config: RateLimitConfig): this;
  cache(duration: string | number, options?: CacheOptions): this;
  errorBoundary(handler?: ErrorHandler): this;
  compose(chain: ChainBuilder): this;
  build(): RequestHandler[];
}
```

**Type Flow**: When `.validate()` is called with Zod schemas, the generic types update to reflect the validated shape, providing downstream type inference.

#### 2. RequestContext (AsyncLocalStorage)

Provides typed request-scoped context accessible anywhere in the async chain:

```typescript
class RequestContext {
  static get<T>(key: string): T | undefined;
  static set<T>(key: string, value: T): void;
  static getRequestId(): string;
  static getTraceContext(): TraceContext;
}
```

Uses Node.js `AsyncLocalStorage` - requires Node 16+.

#### 3. Store Interface

Abstract interface for rate limiting and caching backends:

```typescript
interface Store {
  get(key: string): Promise<StoreValue | undefined>;
  set(key: string, value: StoreValue, ttl?: number): Promise<void>;
  increment(key: string, ttl?: number): Promise<{ count: number; resetAt: number }>;
  delete(key: string): Promise<void>;
  clear(pattern?: string): Promise<void>;
}
```

**Built-in**: `MemoryStore` only. Redis/external stores via peer dependencies.

---

## Design Decisions

### Express 4 vs 5 Compatibility

- **Primary target**: Express 4 (wider adoption)
- **Strategy**: Abstract router detection via feature checks
- **Implementation**: Check for `app.router` presence and router signature differences
- **Testing**: CI matrix tests both Express 4.x and 5.x

```typescript
// src/utils/expressCompat.ts
export function detectExpressVersion(app: Application): 4 | 5 {
  // Express 5 has different router mounting behavior
  return typeof app.router === 'function' ? 5 : 4;
}
```

### Store Architecture (Plugin-Based)

- **Built-in**: `MemoryStore` only (zero external dependencies)
- **External stores**: Peer dependencies with optional imports
- **Interface**: `Store` abstract class for custom implementations

```typescript
// Usage with external store
import { chain, RedisStore } from 'express-middleware-chain';
import Redis from 'ioredis';

const redis = new Redis();
const store = new RedisStore(redis);

chain()
  .rateLimit({ limit: 100, window: '15m', store })
  .cache('5m', { store });
```

### Error Handling (Option C - Maximum Flexibility)

Three levels of error handling:

1. **Per-middleware wrapping** (automatic async error catching)
2. **Inline error handlers** via `.onError(handler)`
3. **Chain-level boundary** via `.errorBoundary(handler?)`

```typescript
chain()
  .validate(schemas)
  .onError((err, req, res) => {
    // Handle validation errors specifically
    res.status(400).json({ validation: err.issues });
  })
  .use(businessLogic)
  .errorBoundary((err, req, res) => {
    // Catch-all for unhandled errors
    res.status(500).json({ error: 'Internal error' });
  })
  .build();
```

---

## Implementation Guidelines

### TypeScript Patterns

1. **Generic Type Flow**
   - Use conditional types for schema inference
   - Leverage `z.infer<T>` for Zod integration
   - Maintain type safety through the entire chain

2. **Strict Configuration**
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noUncheckedIndexedAccess": true,
       "exactOptionalPropertyTypes": true
     }
   }
   ```

3. **No `any` Types** - Use `unknown` with type guards

### Middleware Implementation Pattern

```typescript
// Every middleware follows this pattern
export function createMiddleware<TConfig>(config: TConfig) {
  return async function middleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Middleware logic
      next();
    } catch (error) {
      next(error);
    }
  };
}
```

### Testing Requirements

- **Unit tests**: Each middleware function in isolation
- **Integration tests**: Full chain execution with Express
- **Type tests**: Verify generic type inference with `tsd`
- **Coverage target**: 85% minimum

---

## Key Technical Challenges

### 1. Type Inference Through Chain

**Challenge**: Maintaining type information as schemas flow through `.validate()`.

**Solution**: Use mapped types and conditional generics:

```typescript
type InferSchemas<T> = {
  body: T extends { body: infer B } ? z.infer<B> : unknown;
  query: T extends { query: infer Q } ? z.infer<Q> : unknown;
  params: T extends { params: infer P } ? z.infer<P> : unknown;
};
```

### 2. AsyncLocalStorage Context Loss

**Challenge**: Context can be lost in non-promisified callbacks.

**Solution**: 
- Document promisification requirements
- Provide `RequestContext.wrap()` helper for legacy callbacks
- Warn in development mode when context is accessed outside request

### 3. Per-Endpoint Rate Limiting State

**Challenge**: Isolating rate limit state per endpoint without memory leaks.

**Solution**: Use route path as key prefix with TTL-based cleanup:

```typescript
// Key format: `ratelimit:${routePath}:${clientIdentifier}`
const key = `ratelimit:/api/users:${req.ip}`;
```

### 4. Cache Invalidation

**Challenge**: Invalidating cached responses when data changes.

**Solution**: Tag-based invalidation with cache groups:

```typescript
chain()
  .cache('5m', { tags: ['users', 'api'] })
  .build();

// Later: invalidate all 'users' caches
CacheManager.invalidate('users');
```

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Test
pnpm test

# Test with coverage
pnpm test:coverage

# Lint
pnpm lint

# Type check
pnpm typecheck

# Build docs
pnpm docs
```

---

## Code Style

- Use **functional patterns** over classes where possible
- Prefer **composition over inheritance**
- Keep middleware functions **pure** (no side effects except res/next)
- Use **descriptive names** for generics (`TBody` not `T`)
- Document public APIs with **JSDoc comments**
- Follow **conventional commits** for git messages

---

## Dependencies

### Production
- `zod` (peer) - Schema validation
- Express types only - no runtime Express dependency

### Development
- `typescript` - Compilation
- `tsup` - Bundling (ESM + CJS)
- `vitest` - Testing
- `express` - Integration testing
- `supertest` - HTTP testing

---

## Release Process

1. Update `CHANGELOG.md`
2. Bump version in `package.json`
3. Run full test suite
4. Build and verify package
5. Publish to npm
6. Tag release in git
