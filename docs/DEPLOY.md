# Deploying to Render.com (Free Tier)

## Quick Start

1. Push code to GitHub
2. Go to [render.com](https://render.com), connect your GitHub repo
3. Render auto-detects `render.yaml` and creates the service
4. Set environment variable: `GOOGLE_API_KEY` = your Gemini API key
5. Deploy. Visit `https://your-service.onrender.com`

## Environment Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `GOOGLE_API_KEY` | Yes | Google Gemini API key |
| `NODE_ENV` | No | Set to `production` in render.yaml |
| `PORT` | No | Render injects automatically |

All other vars (`GOOGLE_MODEL`, `JWT_SECRET`, `AUTH_REQUIRED`, etc.) have sensible defaults and don't need to be set.

## Architecture

In production, Express serves both the API and the React SPA:

```
Express (single service)
├── /api/*        → API routes + SSE endpoints
└── /*            → apps/web/dist (static files + SPA fallback)
```

No separate frontend deployment needed.

## Build Pipeline

```
npm install && npm run build
  → packages/shared:  tsc (type declarations)
  → apps/server:      esbuild (bundles shared inline)
  → apps/web:         vite build (alias resolves shared from source)
```

## Pitfalls We Hit (and How We Fixed Them)

### 1. Workspace symlinks don't work on Render

**Problem**: npm workspace creates `node_modules/@openclaw/shared` → `packages/shared` symlinks. On Render, these symlinks either don't exist or don't resolve correctly, causing `tsc`, `vite`, `esbuild`, and Node runtime to all fail with "Cannot find module '@openclaw/shared'".

This manifested in 4 different ways across 4 deploy attempts:
1. `tsc` (server build): "Cannot find module '@openclaw/shared' or its corresponding type declarations"
2. `vite build` (web build): "Failed to resolve entry for package @openclaw/shared"
3. `esbuild` (server build, after removing `--packages=external`): "Could not resolve @openclaw/shared — The module ./dist/index.js was not found on the file system"
4. Node runtime: "Cannot find module '/opt/render/project/src/node_modules/@openclaw/shared/dist/index.js'"

**Fix**:
- **Server**: Use esbuild with `--alias:@openclaw/shared=../../packages/shared/src/index.ts` to resolve directly from source, plus explicit `--external:` flags for each real npm package. This bypasses the symlink entirely and bundles shared code inline.
- **Web**: Add a Vite `resolve.alias` in `vite.config.ts` pointing `@openclaw/shared` directly to `../../packages/shared/src`.
- **Web build**: Skip `tsc` type-checking (just `vite build`), since Vite handles TypeScript natively.

**Key lesson**: On Render, never rely on workspace symlinks. Always use explicit aliases/paths to resolve workspace packages.

### 2. esbuild binary platform mismatch

**Problem**: Running `node ../../node_modules/esbuild/bin/esbuild` on Render tried to execute the Windows binary (ELF error).

**Fix**: Use `npx esbuild` instead of a direct path. npx resolves the correct platform binary.

### 3. `import.meta.dirname` breaks in bundled output

**Problem**: Multiple files used `import.meta.dirname` with relative paths like `resolve(import.meta.dirname, "../../../..")` to find the project root. After esbuild bundles everything into a single file at `apps/server/dist/index.js`, these relative paths point to wrong locations.

**Fix**: Replace all `import.meta.dirname` path resolution with `process.cwd()`. Both locally (`npm run dev` runs from project root) and on Render (working directory is project root), `process.cwd()` correctly points to the repo root.

Files changed:
- `apps/server/src/index.ts` — dotenv path + static file path
- `apps/server/src/loaders/personality-loader.ts` — PROJECT_ROOT
- `apps/server/src/db/database.ts` — data directory
- `apps/server/src/engine/startup-store.ts` — data directory
- `apps/server/src/engine/werewolf-store.ts` — data directory

## Free Tier Limitations

- **750 hours/month** — enough for 24/7 operation
- **Sleeps after 15min inactivity** — ~25-30s cold start on next visit
- **Ephemeral disk** — SQLite DB resets on each deploy (OK since auth is optional and game state is in-memory)
- Active SSE connections keep the service awake during gameplay

## Files Related to Deployment

- `render.yaml` — Render blueprint (service config)
- `package.json` — root `start` script
- `apps/server/src/index.ts` — static file serving + SPA fallback
- `apps/web/vite.config.ts` — resolve alias for shared package
