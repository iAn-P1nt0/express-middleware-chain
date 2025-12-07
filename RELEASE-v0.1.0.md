# 🚀 Release v0.1.0 - Major Feature Update

**Published**: December 8, 2025
**npm**: https://www.npmjs.com/package/express-middleware-chain
**GitHub**: https://github.com/iAn-P1nt0/express-middleware-chain/releases/tag/v0.1.0

---

## 🎉 **What's New**

### Rate Limiting Middleware ⚡

Per-endpoint rate limiting with full configurability:

```typescript
import { chain, MemoryStore } from 'express-middleware-chain';

const store = new MemoryStore();

app.get('/api/users',
  ...chain()
    .rateLimit({
      limit: 100,
      window: '15m',
      store
    })
    .build(),
  handler
);
```

**Features:**
- ✅ Configurable limits and time windows
- ✅ Duration strings support ('15m', '1h', '1d')
- ✅ Custom key generators (IP, user ID, etc.)
- ✅ Per-endpoint isolation
- ✅ Standard rate limit headers
- ✅ Custom error messages and handlers

### Store System 🗄️

Pluggable storage backend with built-in MemoryStore:

```typescript
import { MemoryStore } from 'express-middleware-chain';

const store = new MemoryStore({
  cleanupIntervalMs: 60000,
  maxSize: 10000
});

// TTL support
await store.set('key', { data: 'value' }, 60000);

// Tag-based invalidation
await store.set('user:1', { data: user }, 3600000, { tags: ['users'] });
await store.invalidateByTag('users');

// Pattern matching
await store.clear('user:*');
```

**Features:**
- ✅ Abstract `Store` interface
- ✅ TTL support with automatic expiration
- ✅ Tag-based cache invalidation
- ✅ Pattern matching for bulk operations
- ✅ Max size limits with LRU eviction
- ✅ Periodic cleanup
- ✅ Ready for custom implementations (Redis, etc.)

### Utility Functions 🛠️

```typescript
import { parseDuration, defaultRateLimitKey, defaultCacheKey } from 'express-middleware-chain';

// Duration parsing
parseDuration('15m');  // 900000 (ms)
parseDuration('1h');   // 3600000
parseDuration('1d');   // 86400000

// Key generators
defaultRateLimitKey(req);  // IP-based
defaultCacheKey(req);      // URL-based
```

---

## 📊 **Stats**

### Package Metrics
| Metric | v0.0.1 | v0.1.0 | Change |
|--------|--------|--------|--------|
| **Compressed Size** | 10.7 kB | 21.7 kB | +103% |
| **Unpacked Size** | 47.8 kB | 115.2 kB | +141% |
| **Files** | 9 | 9 | 0 |
| **Tests** | 6 | 35 | +483% |
| **Core Features** | 4/7 (57%) | 6/7 (86%) | +29% |

### Test Coverage
- **Test Files**: 3 → 5
- **Total Tests**: 6 → 35 (483% increase!)
  - Context tests: 1
  - Error boundary tests: 2
  - Validation tests: 3
  - **Rate limit tests: 10** (NEW)
  - **Store tests: 19** (NEW)

### Implementation Progress
- ✅ ChainBuilder
- ✅ Validation Middleware
- ✅ Error Boundary
- ✅ RequestContext
- ✅ **Rate Limiting** (NEW)
- ✅ **Store Interface** (NEW)
- 🚧 Response Caching (next release)

**Progress**: 57% → 86% complete

---

## 🔄 **Migration from v0.0.1**

v0.1.0 is **100% backward compatible**. Existing code will continue to work without changes.

### Optional Enhancements

If you want to use the new features:

```typescript
// Before (v0.0.1)
chain()
  .validate({ body: schema })
  .use(middleware)
  .errorBoundary()
  .build();

// After (v0.1.0) - add rate limiting
chain()
  .validate({ body: schema })
  .rateLimit({ limit: 100, window: '15m' })  // NEW!
  .use(middleware)
  .errorBoundary()
  .build();
```

---

## 📚 **Documentation Updates**

- ✅ **README.md** - Added rate limiting and stores documentation
- ✅ **CHANGELOG.md** - Comprehensive v0.1.0 release notes
- ✅ **AGENTS.md** - Updated implementation status (86% complete)

---

## 🔍 **Under the Hood**

### Files Added
- `src/stores/Store.ts` - Abstract store interface
- `src/stores/MemoryStore.ts` - In-memory store implementation
- `src/stores/index.ts` - Store exports
- `src/middleware/rateLimit.ts` - Rate limiting middleware
- `src/utils/duration.ts` - Duration parsing
- `src/utils/keyGenerator.ts` - Key generation utilities
- `src/utils/index.ts` - Utility exports
- `test/stores/MemoryStore.test.ts` - 19 store tests
- `test/middleware/rateLimit.test.ts` - 10 rate limit tests

### TypeScript
- ✅ All code maintains strict TypeScript type safety
- ✅ Full generic type inference preserved
- ✅ Zero compilation errors
- ✅ Builds successfully with no warnings

### Dependencies
- ✅ **Zero new runtime dependencies**
- ✅ Still peer-dependent only on `express` and `zod`
- ✅ All new features use built-in Node.js capabilities

---

## 🎯 **What's Next?**

### v0.2.0 (Next Release)
- Response caching middleware
- Cache middleware with tag-based invalidation
- Complete the 7/7 core feature set (100%)

### Future Plans
- Redis store adapter
- Transform middleware
- Conditional execution (`.when()`)
- OpenTelemetry integration
- Performance monitoring hooks

---

## 📈 **Performance**

The package remains lightweight and performant:
- ✅ No blocking operations
- ✅ Efficient TTL cleanup (configurable intervals)
- ✅ O(1) lookups in MemoryStore
- ✅ Minimal overhead per request

---

## 🙏 **Thank You**

To everyone who used v0.0.1 - thank you for your trust in this young package!

v0.1.0 brings major new features while maintaining backward compatibility and zero new dependencies.

---

## 📦 **Installation**

```bash
npm install express-middleware-chain@0.1.0
# or
yarn add express-middleware-chain@0.1.0
# or
pnpm add express-middleware-chain@0.1.0
```

---

## 🔗 **Links**

- **npm**: https://www.npmjs.com/package/express-middleware-chain
- **GitHub**: https://github.com/iAn-P1nt0/express-middleware-chain
- **Issues**: https://github.com/iAn-P1nt0/express-middleware-chain/issues
- **v0.0.1**: https://github.com/iAn-P1nt0/express-middleware-chain/releases/tag/v0.0.1
- **v0.1.0**: https://github.com/iAn-P1nt0/express-middleware-chain/releases/tag/v0.1.0

---

**Happy coding! 🚀**
