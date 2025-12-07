# express-middleware-chain

[![npm version](https://img.shields.io/npm/v/express-middleware-chain.svg)](https://www.npmjs.com/package/express-middleware-chain)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)

**Fluent, type-safe middleware orchestration for Express.js with TypeScript.**

A modern approach to composing Express middleware with declarative chaining, built-in validation (Zod), rate limiting, caching, context management, and error handling.

## Features

- 🔗 **Fluent API** - Compose middleware with method chaining
- 🛡️ **Type-Safe** - Full TypeScript support with generic type inference
- ✅ **Validation** - Built-in Zod schema validation for body/query/params ✅
- ⚡ **Rate Limiting** - Per-endpoint rate limiting with pluggable stores ✅
- 💾 **Caching** - Response caching with tag-based invalidation (coming soon)
- 🔍 **Request Context** - AsyncLocalStorage-based request-scoped data ✅
- 🚨 **Error Handling** - Comprehensive error boundary middleware ✅
- 🗄️ **Pluggable Stores** - Abstract store interface with MemoryStore included ✅
- 🎯 **Zero Dependencies** - Core package has no runtime dependencies (peer deps only)

## Installation

```bash
npm install express-middleware-chain zod
# or
yarn add express-middleware-chain zod
# or
pnpm add express-middleware-chain zod
```

**Peer Dependencies:**
- `express` ^4.18.0 || ^5.0.0
- `zod` ^3.20.0 (optional, required only if using validation)

## Quick Start

```typescript
import express from 'express';
import { chain } from 'express-middleware-chain';
import { z } from 'zod';

const app = express();
app.use(express.json());

// Define schemas
const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  age: z.number().int().positive().optional()
});

const querySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().positive()).default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().max(100)).default('10')
});

// Create middleware chain
const userChain = chain()
  .validate({ body: userSchema, query: querySchema })
  .use((req, res, next) => {
    // req.body and req.query are now typed!
    console.log(`Creating user: ${req.body.email}`);
    next();
  })
  .errorBoundary()
  .build();

// Use in routes
app.post('/api/users', userChain, (req, res) => {
  // Type-safe access to validated data
  const { email, name, age } = req.body;
  const { page, limit } = req.query;

  res.json({
    message: 'User created',
    user: { email, name, age },
    pagination: { page, limit }
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Core API

### `chain()`

Creates a new `ChainBuilder` instance to compose middleware.

```typescript
import { chain } from 'express-middleware-chain';

const myChain = chain()
  .validate({ body: schema })
  .use(customMiddleware)
  .errorBoundary()
  .build();
```

### `.validate(schemas)`

Validates request body, query parameters, and route parameters using Zod schemas.

```typescript
import { z } from 'zod';

const schemas = {
  body: z.object({ name: z.string() }),
  query: z.object({ page: z.string() }),
  params: z.object({ id: z.string().uuid() })
};

chain()
  .validate(schemas)
  .build();
```

**Response on validation error (400):**
```json
{
  "errors": [
    {
      "location": "body",
      "issues": [
        {
          "code": "invalid_type",
          "expected": "string",
          "received": "undefined",
          "path": ["name"],
          "message": "Required"
        }
      ]
    }
  ]
}
```

### `.use(middleware)`

Adds standard Express middleware to the chain.

```typescript
chain()
  .use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  })
  .use(authenticate)
  .use(authorize(['admin']))
  .build();
```

All middleware added via `.use()` is automatically wrapped for async error handling.

### `.compose(otherChain)`

Composes another chain into the current chain.

```typescript
const authChain = chain()
  .use(authenticate)
  .use(authorize(['admin']));

const apiChain = chain()
  .validate({ body: schema })
  .compose(authChain)  // Includes all middleware from authChain
  .build();
```

### `.rateLimit(config)`

Adds rate limiting to protect your endpoints from abuse.

```typescript
import { chain, MemoryStore } from 'express-middleware-chain';

// Basic rate limiting
chain()
  .rateLimit({
    limit: 100,        // 100 requests
    window: '15m'      // per 15 minutes
  })
  .build();

// Advanced configuration
const store = new MemoryStore();

chain()
  .rateLimit({
    limit: 10,
    window: '1m',
    store,                                    // Custom store
    keyGenerator: (req) => req.user?.id,     // Rate limit per user
    message: 'Too many requests',
    onLimitReached: (req, res) => {
      console.log(`Rate limit exceeded for ${req.ip}`);
      res.status(429).json({ error: 'Slow down!' });
    }
  })
  .build();
```

**Configuration:**
- `limit` (number) - Maximum requests allowed
- `window` (string | number) - Time window ('15m', '1h', '1d' or milliseconds)
- `store` (Store) - Storage backend (default: shared MemoryStore)
- `keyGenerator` (function) - Custom key function (default: IP address)
- `message` (string) - Custom error message
- `skipFailedRequests` (boolean) - Don't count 4xx/5xx responses
- `skipSuccessfulRequests` (boolean) - Don't count 2xx/3xx responses
- `onLimitReached` (function) - Custom handler when limit exceeded

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2025-12-08T02:15:00.000Z
Retry-After: 123
```

**Per-Endpoint Limiting:**

Rate limits are automatically isolated per endpoint:

```typescript
// Each endpoint has its own rate limit
app.get('/api/users', chain().rateLimit({ limit: 100, window: '15m' }).build(), handler);
app.post('/api/users', chain().rateLimit({ limit: 10, window: '15m' }).build(), handler);
```

### `.errorBoundary(handler?)`

Adds an error boundary to catch and handle errors.

```typescript
// Default error handler
chain()
  .use(riskyMiddleware)
  .errorBoundary()
  .build();

// Custom error handler
chain()
  .use(riskyMiddleware)
  .errorBoundary((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  })
  .build();
```

### `.build()`

Compiles the chain into an array of Express middleware handlers.

```typescript
const handlers = chain()
  .validate({ body: schema })
  .use(middleware)
  .build();

app.post('/endpoint', handlers, finalHandler);
// or spread directly
app.post('/endpoint', ...handlers, finalHandler);
```

## Request Context

The `RequestContext` provides request-scoped data storage using Node.js `AsyncLocalStorage`.

```typescript
import { RequestContext } from 'express-middleware-chain';

// Initialize context (do this once in your app)
app.use(RequestContext.init());

// Set values anywhere in your middleware chain
app.use((req, res, next) => {
  RequestContext.set('user', { id: 123, role: 'admin' });
  RequestContext.set('timestamp', Date.now());
  next();
});

// Access values anywhere in the async context
app.get('/profile', (req, res) => {
  const user = RequestContext.get<{ id: number; role: string }>('user');
  const timestamp = RequestContext.get<number>('timestamp');

  res.json({ user, timestamp });
});

// Get auto-generated request ID
const requestId = RequestContext.getRequestId();
```

**Features:**
- ✅ Automatic request ID generation (UUID v4)
- ✅ Type-safe get/set operations
- ✅ Works across async boundaries
- ✅ Zero global state pollution

**Requirements:** Node.js 16+ (for AsyncLocalStorage)

## Stores

The package includes a pluggable store system for rate limiting and caching state.

### MemoryStore

Built-in in-memory store for single-process applications:

```typescript
import { MemoryStore } from 'express-middleware-chain';

const store = new MemoryStore({
  cleanupIntervalMs: 60000,  // Cleanup every minute
  maxSize: 10000             // Max 10,000 entries (LRU eviction)
});

// Use with rate limiting
chain()
  .rateLimit({ limit: 100, window: '15m', store })
  .build();
```

**Features:**
- ✅ TTL support with automatic expiration
- ✅ Tag-based invalidation
- ✅ Pattern matching for bulk deletion
- ✅ Max size limits with LRU-like eviction
- ✅ Periodic cleanup of expired entries

**Store Methods:**

```typescript
// Get/Set with TTL
await store.set('key', { data: 'value' }, 60000);  // 60 second TTL
const value = await store.get('key');

// Rate limiting
const result = await store.increment('counter', 60000);
console.log(result.count, result.resetAt);

// Tag-based invalidation
await store.set('user:1', { data: user }, 3600000, { tags: ['users'] });
await store.invalidateByTag('users');  // Clear all 'users' entries

// Pattern matching
await store.clear('user:*');  // Clear all keys starting with 'user:'

// Cleanup
store.destroy();  // Stop cleanup interval
```

### Custom Stores

Implement the `Store` interface for Redis, database, or other backends:

```typescript
import type { Store, StoreValue, RateLimitResult } from 'express-middleware-chain';

class RedisStore implements Store {
  async get(key: string): Promise<StoreValue | undefined> {
    // Implementation
  }

  async set(key: string, value: StoreValue, ttl?: number): Promise<void> {
    // Implementation
  }

  async increment(key: string, ttl?: number): Promise<RateLimitResult> {
    // Implementation
  }

  async delete(key: string): Promise<void> {
    // Implementation
  }

  async invalidateByTag(tag: string): Promise<void> {
    // Implementation
  }

  async clear(pattern?: string): Promise<void> {
    // Implementation
  }
}
```

## Advanced Usage

### Combining Multiple Chains

```typescript
const validationChain = chain()
  .validate({
    body: userSchema,
    query: paginationSchema
  });

const authChain = chain()
  .use(authenticate)
  .use(authorize(['admin', 'moderator']));

const loggingChain = chain()
  .use((req, res, next) => {
    console.log(`[${RequestContext.getRequestId()}] ${req.method} ${req.path}`);
    next();
  });

// Compose them together
const fullChain = chain()
  .compose(loggingChain)
  .compose(validationChain)
  .compose(authChain)
  .errorBoundary()
  .build();

app.post('/api/users', fullChain, createUserHandler);
```

### Type Inference

The validation method updates the generic types to reflect validated schemas:

```typescript
import { z } from 'zod';

const bodySchema = z.object({
  email: z.string().email(),
  age: z.number().int()
});

const myChain = chain()
  .validate({ body: bodySchema })
  .use((req, res, next) => {
    // TypeScript knows req.body has { email: string; age: number }
    const email: string = req.body.email;  // ✅ Type-safe
    const age: number = req.body.age;      // ✅ Type-safe
    next();
  })
  .build();
```

### Custom Middleware Pattern

```typescript
import type { RequestHandler } from 'express';

interface LoggerConfig {
  prefix?: string;
  timestamp?: boolean;
}

function createLogger(config: LoggerConfig = {}): RequestHandler {
  const { prefix = 'LOG', timestamp = true } = config;

  return (req, res, next) => {
    const time = timestamp ? new Date().toISOString() : '';
    console.log(`[${prefix}] ${time} ${req.method} ${req.path}`);
    next();
  };
}

// Use it
chain()
  .use(createLogger({ prefix: 'API', timestamp: true }))
  .build();
```

## Architecture

```
src/
├── index.ts              # Public API exports
├── types.ts              # Shared type definitions
├── chain/                # Core chain builder
│   ├── ChainBuilder.ts   # Fluent API implementation
│   └── index.ts
├── middleware/           # Built-in middleware
│   ├── validation.ts     # Zod validation (✅ implemented)
│   ├── errorBoundary.ts  # Error handling (✅ implemented)
│   ├── rateLimit.ts      # Rate limiting (✅ implemented)
│   ├── cache.ts          # Response caching (🚧 planned)
│   └── index.ts
├── context/              # Request context
│   └── RequestContext.ts # AsyncLocalStorage wrapper (✅ implemented)
├── stores/               # Store implementations (✅ implemented)
│   ├── Store.ts          # Store interface
│   ├── MemoryStore.ts    # Built-in in-memory store
│   └── index.ts
└── utils/                # Helper utilities (✅ implemented)
    ├── duration.ts       # Parse duration strings
    ├── keyGenerator.ts   # Cache/rate limit key utilities
    └── index.ts
```

## Roadmap

See [AGENTS.md](./AGENTS.md) for the full development roadmap and implementation status.

### ✅ Implemented (v0.1.0)
- [x] Core ChainBuilder with fluent API
- [x] Zod validation middleware
- [x] Error boundary middleware
- [x] Request context (AsyncLocalStorage)
- [x] Type-safe generic inference
- [x] Chain composition
- [x] **Rate limiting middleware** (NEW in v0.1.0)
- [x] **Store interface and MemoryStore** (NEW in v0.1.0)
- [x] **Duration parsing utilities** (NEW in v0.1.0)
- [x] **Key generation utilities** (NEW in v0.1.0)

### 🚧 In Progress
- [ ] Response caching middleware

### 📋 Planned
- [ ] Redis store adapter
- [ ] Transform middleware
- [ ] Conditional execution (`.when()`)
- [ ] Middleware groups/presets
- [ ] Performance monitoring hooks
- [ ] OpenTelemetry integration

## Testing

This package uses [Vitest](https://vitest.dev/) for testing.

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm typecheck

# Build
pnpm build
```

## Requirements

- **Node.js**: 16+ (for AsyncLocalStorage)
- **TypeScript**: 5.0+ (recommended)
- **Express**: 4.18+ or 5.0+

## Express Compatibility

This package supports both Express 4 and Express 5:

- **Express 4**: Primary target, widest adoption
- **Express 5**: Native Promise support, tested and compatible

The package uses feature detection rather than version checking for compatibility.

## TypeScript Configuration

For best results, use strict TypeScript settings:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "moduleResolution": "bundler",
    "target": "ES2022"
  }
}
```

## Contributing

Contributions are welcome! Please see [AGENTS.md](./AGENTS.md) for development guidelines and architecture details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/iAn-P1nt0/express-middleware-chain.git
cd express-middleware-chain

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build
```

## License

MIT © [Ian Pinto](https://github.com/iAn-P1nt0)

## Acknowledgments

Inspired by the need for better middleware composition patterns in Express.js applications and the type-safety benefits of Zod and TypeScript.

## Support

- 🐛 [Report Issues](https://github.com/iAn-P1nt0/express-middleware-chain/issues)
- 💬 [Discussions](https://github.com/iAn-P1nt0/express-middleware-chain/discussions)
- 📧 Contact: [Create an issue](https://github.com/iAn-P1nt0/express-middleware-chain/issues/new)
