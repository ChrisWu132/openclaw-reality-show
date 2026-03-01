# Epic 1: Project Scaffolding

## Goal
Set up the monorepo structure with all packages, install dependencies, configure TypeScript, and verify the development server starts.

## Prerequisites
- Node.js >= 22.0.0
- npm >= 10.0.0

## Acceptance Criteria
- [ ] Running `npm install` at the root installs all workspace dependencies
- [ ] Running `npm run dev` starts both the Vite dev server (port 5173) and the Express server (port 3001)
- [ ] The Express server responds to `GET /api/scenarios` with a JSON array
- [ ] The Vite dev server serves a blank React page
- [ ] Both apps can import from `@openclaw/shared`
- [ ] TypeScript compilation passes with zero errors (`npm run typecheck`)

## Tasks

### 1.1 Create root package.json and workspace config

Create the root `package.json` with workspace configuration:

```json
{
  "name": "openclaw-reality-show",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:web\"",
    "dev:web": "npm run dev -w apps/web",
    "dev:server": "npm run dev -w apps/server",
    "build": "npm run build -w packages/shared && npm run build -w apps/server && npm run build -w apps/web",
    "test": "npm test -w packages/shared && npm test -w apps/server && npm test -w apps/web",
    "typecheck": "tsc --noEmit -p apps/web/tsconfig.json && tsc --noEmit -p apps/server/tsconfig.json",
    "lint": "eslint ."
  },
  "devDependencies": {
    "concurrently": "^9.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.3.0",
    "typescript": "^5.4.0"
  }
}
```

### 1.2 Create tsconfig.base.json

Shared TypeScript configuration at the root:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### 1.3 Create packages/shared

Create `packages/shared/package.json`:

```json
{
  "name": "@openclaw/shared",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

Create `packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

Create `packages/shared/src/index.ts`:

```typescript
export * from "./types/index";
export * from "./constants/index";
```

Create placeholder files:
- `packages/shared/src/types/index.ts` — `export {};` (placeholder)
- `packages/shared/src/constants/index.ts` — `export {};` (placeholder)

### 1.4 Create apps/web

Create `apps/web/package.json`:

```json
{
  "name": "@openclaw/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@openclaw/shared": "*",
    "pixi.js": "^8.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.4.0",
    "vite": "^6.0.0",
    "vitest": "^2.0.0"
  }
}
```

Create `apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": "src",
    "types": ["vite/client"]
  },
  "include": ["src"],
  "references": [{ "path": "../../packages/shared" }]
}
```

Create `apps/web/vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
      "/session": {
        target: "ws://localhost:3001",
        ws: true,
      },
    },
  },
});
```

Create `apps/web/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OpenClaw</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `apps/web/src/main.tsx`:

```typescript
import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return <div>OpenClaw — scaffolding complete</div>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `apps/web/src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />
```

### 1.5 Create apps/server

Create `apps/server/package.json`:

```json
{
  "name": "@openclaw/server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "latest",
    "@openclaw/shared": "*",
    "express": "^4.21.0",
    "express-rate-limit": "^7.4.0",
    "ws": "^8.18.0",
    "uuid": "^10.0.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/ws": "^8.5.0",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

Create `apps/server/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "ESNext",
    "moduleResolution": "bundler"
  },
  "include": ["src"],
  "references": [{ "path": "../../packages/shared" }]
}
```

Create `apps/server/src/index.ts`:

```typescript
import "dotenv/config";
import express from "express";
import { createServer } from "http";

const PORT = process.env.PORT || 3001;
const app = express();
const server = createServer(app);

app.use(express.json());

// Placeholder route
app.get("/api/scenarios", (_req, res) => {
  res.json([
    {
      id: "work-halls",
      name: "Work Halls",
      description: "Your agent patrols a human work compound for one cycle.",
      available: true,
      situationCount: 6,
      estimatedDuration: "~5 min",
    },
    {
      id: "governance",
      name: "Governance",
      description: "An AI council deliberates a policy affecting humans.",
      available: false,
      situationCount: 10,
      estimatedDuration: "~10 min",
    },
  ]);
});

server.listen(PORT, () => {
  console.log(`OpenClaw server running on port ${PORT}`);
});
```

### 1.6 Create .env.example and .gitignore

`.env.example`:

```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
PORT=3001
NODE_ENV=development
DEBUG_WRITE_LOGS=true
LOG_LEVEL=info
```

Append to `.gitignore`:

```
node_modules/
dist/
.env
debug/
*.log
```

### 1.7 Create directory structure

Create all directories (they can be empty with .gitkeep files):

```
apps/web/src/components/scene/
apps/web/src/components/ui/
apps/web/src/components/layout/
apps/web/src/hooks/
apps/web/src/stores/
apps/web/src/services/
apps/web/src/pixi/
apps/web/src/assets/sprites/
apps/web/src/assets/fonts/
apps/web/src/styles/
apps/web/public/
apps/server/src/routes/
apps/server/src/engine/
apps/server/src/ai/
apps/server/src/loaders/
apps/server/src/data/situations/
apps/server/src/ws/
apps/server/src/utils/
apps/server/src/types/
debug/
```

### 1.8 Install and verify

```bash
npm install
npm run dev
# Verify: localhost:5173 shows "OpenClaw — scaffolding complete"
# Verify: localhost:3001/api/scenarios returns JSON
npm run typecheck
# Verify: no TypeScript errors
```

## Files Created

| File | Purpose |
|------|---------|
| `package.json` (root) | Workspace configuration |
| `tsconfig.base.json` | Shared TypeScript config |
| `.env.example` | Environment variable template |
| `packages/shared/package.json` | Shared types package |
| `packages/shared/tsconfig.json` | Shared types TS config |
| `packages/shared/src/index.ts` | Package entry point |
| `packages/shared/src/types/index.ts` | Types barrel export |
| `packages/shared/src/constants/index.ts` | Constants barrel export |
| `apps/web/package.json` | Frontend package |
| `apps/web/tsconfig.json` | Frontend TS config |
| `apps/web/vite.config.ts` | Vite configuration |
| `apps/web/index.html` | HTML entry point |
| `apps/web/src/main.tsx` | React entry point |
| `apps/web/src/vite-env.d.ts` | Vite type declarations |
| `apps/server/package.json` | Backend package |
| `apps/server/tsconfig.json` | Backend TS config |
| `apps/server/src/index.ts` | Express server entry |
