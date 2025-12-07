# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-12-08

### Added

- **Store Interface** - Pluggable storage backend system
  - Abstract `Store` interface for rate limiting and caching
  - Support for `get`, `set`, `delete`, `increment`, and `invalidateByTag` operations
  - Built-in `MemoryStore` implementation with TTL support
  - Automatic cleanup of expired entries
  - Tag-based cache invalidation
  - Pattern matching for selective clearing (glob-like wildcards)
  - Max size limits with LRU-like eviction
  - 19 comprehensive tests for MemoryStore

- **Rate Limiting Middleware** - Per-endpoint rate limiting
  - `.rateLimit()` method added to ChainBuilder
  - Configurable request limits and time windows
  - Support for duration strings ('15m', '1h', '5s', etc.)
  - Custom key generators (default: IP-based)
  - Per-endpoint isolation (route path included in key)
  - Standard rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
  - Retry-After header when limit exceeded
  - Custom error messages and handlers
  - Options to skip counting failed or successful requests
  - 10 comprehensive tests for rate limiting

- **Utility Functions**
  - `parseDuration()` - Convert duration strings to milliseconds
  - `defaultRateLimitKey()` - Default IP-based key generator
  - `defaultCacheKey()` - Default URL-based key generator

### Changed

- **Package Size** - Increased from 10.7 kB to ~29 kB (compressed) due to new features
- **Test Coverage** - Increased from 6 tests to 35 tests (483% increase)
- **Exports** - Added new exports for stores, rate limiting, and utilities

### Technical Details

- All features maintain strict TypeScript type safety
- Zero new runtime dependencies (stores and rate limiting use built-in Node.js features)
- Compatible with both single-process and distributed setups (via custom Store implementations)
- Fully backward compatible with v0.0.1

## [0.0.1] - 2025-12-08

### Added

- **Core ChainBuilder** - Fluent API for composing Express middleware
  - `.validate()` - Zod schema validation for body/query/params
  - `.use()` - Add standard Express middleware with automatic async error handling
  - `.compose()` - Compose multiple chains together
  - `.errorBoundary()` - Add error boundary with custom or default handler
  - `.build()` - Compile chain to Express middleware array

- **Validation Middleware** - Built-in request validation using Zod
  - Type-safe schema validation for request body, query parameters, and route params
  - Structured error responses (400) with detailed Zod validation issues
  - Automatic type inference through the chain

- **Error Boundary Middleware** - Comprehensive error handling
  - Automatic async/sync error catching
  - Custom error handlers support
  - Default error boundary with 500 responses

- **RequestContext** - AsyncLocalStorage-based request-scoped context
  - Automatic request ID generation (UUID v4)
  - Type-safe get/set operations
  - Trace context support for distributed tracing
  - Works across async boundaries

- **TypeScript Support** - Full type safety and inference
  - Generic type parameters that flow through validation
  - Strict TypeScript configuration
  - Declaration files (`.d.ts`) generated

- **Dual Module Support** - ESM and CommonJS
  - ESM: `.mjs` files
  - CommonJS: `.js` files
  - Proper package.json exports configuration

### Documentation

- Comprehensive README.md with examples and API reference
- AGENTS.md for contributor guidelines
- TypeScript examples and usage patterns

### Technical Details

- Node.js 16+ required (AsyncLocalStorage support)
- Express 4.18+ or 5.0+ compatible
- Peer dependencies: `express`, `zod` (optional)
- Zero runtime dependencies
- Tree-shakeable with `sideEffects: false`

[0.1.0]: https://github.com/iAn-P1nt0/express-middleware-chain/releases/tag/v0.1.0
[0.0.1]: https://github.com/iAn-P1nt0/express-middleware-chain/releases/tag/v0.0.1
