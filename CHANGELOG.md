# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.0.1]: https://github.com/iAn-P1nt0/express-middleware-chain/releases/tag/v0.0.1
