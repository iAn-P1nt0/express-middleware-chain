# Publishing Guide for express-middleware-chain

This guide provides step-by-step instructions for publishing the package to npmjs.com.

## ✅ Pre-Publish Checklist (COMPLETED)

All critical and recommended preparation steps have been completed:

- [x] **TypeScript compilation errors fixed**
- [x] **LICENSE file created** (MIT)
- [x] **package.json metadata added** (author, repository, keywords, etc.)
- [x] **package.json exports fixed** (types before import/require)
- [x] **CHANGELOG.md created** with 0.0.1 release notes
- [x] **.npmignore created** to exclude dev files
- [x] **prepublishOnly script added** for safety
- [x] **All tests passing** (6/6)
- [x] **Build succeeds** without warnings
- [x] **Package verified** with `npm pack --dry-run`

## 📦 Package Information

- **Name**: `express-middleware-chain`
- **Version**: 0.0.1
- **Size**: 10.7 kB (compressed), 47.8 kB (unpacked)
- **Files**: 9 files (dist/, LICENSE, README.md, package.json)
- **License**: MIT
- **Author**: Ian Pinto
- **Repository**: https://github.com/iAn-P1nt0/express-middleware-chain

## 🚀 Publishing Steps

### Step 1: Login to npm

If you haven't already logged in to npm:

```bash
npm login
```

This will prompt you for:
- Username
- Password
- Email
- One-time password (2FA if enabled)

### Step 2: Verify Your npm Account

Check you're logged in with the correct account:

```bash
npm whoami
```

### Step 3: Final Verification (Optional but Recommended)

Run the prepublishOnly script manually to ensure everything works:

```bash
pnpm prepublishOnly
```

This will:
1. Run `pnpm typecheck` - Verify TypeScript compilation
2. Run `pnpm test` - Run all tests
3. Run `pnpm build` - Build the package

Expected output: All steps should pass without errors.

### Step 4: Create a Tarball for Testing (Optional)

Create a local tarball to test the package:

```bash
npm pack
```

This creates `express-middleware-chain-0.0.1.tgz`. You can:
- Inspect the contents: `tar -tzf express-middleware-chain-0.0.1.tgz`
- Test install in another project: `npm install /path/to/express-middleware-chain-0.0.1.tgz`

### Step 5: Publish to npm

**For the first publish (0.0.1):**

```bash
npm publish --access public
```

**Important Notes:**
- The `--access public` flag is required for scoped packages or first-time publishes
- The `prepublishOnly` script will run automatically before publishing
- If it fails, the publish will abort (safety feature)

### Step 6: Verify Publication

After publishing, verify your package on npm:

1. **Check package page**: https://www.npmjs.com/package/express-middleware-chain
2. **Check package metadata**:
   ```bash
   npm view express-middleware-chain
   ```
3. **Test installation in a new project**:
   ```bash
   mkdir test-install && cd test-install
   npm init -y
   npm install express-middleware-chain
   ```

## 📝 Post-Publish Steps

### 1. Create Git Tag

Tag the release in git:

```bash
git tag v0.0.1
git push origin v0.0.1
```

### 2. Create GitHub Release

1. Go to: https://github.com/iAn-P1nt0/express-middleware-chain/releases
2. Click "Create a new release"
3. Choose tag: `v0.0.1`
4. Release title: `v0.0.1 - Initial Release`
5. Description: Copy from CHANGELOG.md
6. Click "Publish release"

### 3. Share the Package

Share your package:
- Tweet about it
- Post on Reddit (r/node, r/typescript, r/expressjs)
- Share on LinkedIn
- Add to awesome lists (awesome-nodejs, awesome-express)

## 🔄 Future Releases

For subsequent releases:

### 1. Update Version

Choose the appropriate version bump:

```bash
# Patch release (0.0.2) - bug fixes
npm version patch

# Minor release (0.1.0) - new features, backwards compatible
npm version minor

# Major release (1.0.0) - breaking changes
npm version major
```

This will:
- Update package.json version
- Create a git commit
- Create a git tag

### 2. Update CHANGELOG.md

Add the new version to CHANGELOG.md:

```markdown
## [0.1.0] - YYYY-MM-DD

### Added
- New feature X
- New feature Y

### Fixed
- Bug fix Z
```

### 3. Commit and Push

```bash
git add CHANGELOG.md
git commit --amend --no-edit
git push origin main --follow-tags
```

### 4. Publish

```bash
npm publish
```

## 🛡️ Safety Features

Your package has these safety features enabled:

1. **prepublishOnly script** - Runs before every publish:
   - Type checking
   - Tests
   - Build

2. **.npmignore** - Excludes development files:
   - Source TypeScript files (`src/`)
   - Test files (`test/`)
   - Config files
   - Internal docs

3. **files field** in package.json - Only includes `dist/`

## ⚠️ Troubleshooting

### "You do not have permission to publish"

Solutions:
- Make sure you're logged in: `npm whoami`
- Check package name isn't taken: `npm view express-middleware-chain`
- Add `--access public` flag

### "Version already exists"

Solutions:
- Bump version: `npm version patch`
- Or change version in package.json manually

### "prepublishOnly script failed"

The publish will abort. Fix the errors:
- Check TypeScript errors: `pnpm typecheck`
- Check test failures: `pnpm test`
- Check build errors: `pnpm build`

### "Package size too large"

Current size is only 10.7 kB - well within limits.
If needed, check what's included: `npm pack --dry-run`

## 📊 Expected Package Contents

When published, your package will include:

```
express-middleware-chain@0.0.1
├── LICENSE (1.1 kB)
├── README.md (11.4 kB)
├── package.json (1.9 kB)
└── dist/
    ├── index.d.mts (2.1 kB) - ESM type definitions
    ├── index.d.ts (2.1 kB) - CJS type definitions
    ├── index.js (5.4 kB) - CJS bundle
    ├── index.js.map (10.1 kB) - CJS source map
    ├── index.mjs (4.0 kB) - ESM bundle
    └── index.mjs.map (9.7 kB) - ESM source map

Total: 9 files, 47.8 kB (unpacked)
```

## 🎯 Version Strategy

**Current (0.0.x)**: Pre-alpha, unstable API
**Next (0.1.x)**: Alpha, working but may have breaking changes
**Future (0.x.x)**: Beta, more stable
**Goal (1.0.0)**: Stable release with all planned features

Recommended next steps:
1. Publish 0.0.1 to test the publishing process
2. Gather feedback from early users
3. Implement remaining features (rate limiting, caching, stores)
4. Release 0.1.0 with more features
5. Stabilize API for 1.0.0

## ✅ You're Ready!

Your package is **100% ready** to publish. Execute Step 5 above when ready.

Good luck! 🚀
