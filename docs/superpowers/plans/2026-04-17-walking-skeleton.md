# Flytrap Walking Skeleton Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a single-binary Go + React walking skeleton for Flytrap: frontend calls `/api/health`, backend serves the embedded React bundle, end-to-end tested via Playwright against the built binary.

**Architecture:** Single Go binary embeds the built React SPA via `go:embed`. `internal/app.New(fs.FS) http.Handler` composes the `/api/health` handler with an SPA-fallback static file server. Dev loop runs Vite (`:5173`) + `go run` (`:8080`) via docker-compose, with the Vite proxy forwarding `/api` → backend.

**Tech Stack:** Go 1.26 · React 19 · Vite 8 · Tailwind v4 + daisyUI 5 · pnpm · Vitest · Playwright · Taskfile · golangci-lint · terryyin/lizard.

**Spec:** `docs/superpowers/specs/2026-04-17-walking-skeleton-design.md`

---

## Conventions for this plan

- Every library-touching task MUST start with a context7 lookup via `mcp__claude_ai_Context7__resolve-library-id` + `mcp__claude_ai_Context7__query-docs`. Training data is stale for Vite 8, Tailwind v4, daisyUI 5, React 19, Go 1.26.
- Write tests before implementation wherever there is behavior to test (handlers, hooks, components).
- Commit after each passing checkpoint; commit messages follow conventional-commit style (`feat:`, `test:`, `chore:`, `docs:`).
- After every task: run the task-level verification and only then move on.
- File-tree targets come from §4 of the spec. Do not invent new paths.

## File structure (target end-state)

```
flytrap/
├── .golangci.yml
├── .gitignore
├── Taskfile.yml
├── docker-compose.yaml
├── go.mod / go.sum
├── README.md
├── PROMPT.md
├── LICENSE
├── backend/
│   ├── cmd/flytrap/main.go
│   └── internal/
│       ├── api/
│       │   ├── health.go
│       │   └── health_test.go
│       └── app/
│           ├── app.go
│           ├── app_test.go
│           ├── embed.go
│           └── dist/.gitkeep
├── frontend/
│   ├── package.json / pnpm-lock.yaml
│   ├── tsconfig.json / tsconfig.node.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── eslint.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── App.test.tsx
│   │   ├── index.css
│   │   ├── test/setup.ts
│   │   ├── components/
│   │   │   ├── ThemeSwitcher.tsx
│   │   │   └── ThemeSwitcher.test.tsx
│   │   └── feature/health/
│   │       ├── components/
│   │       │   ├── HealthStatus.tsx
│   │       │   └── HealthStatus.test.tsx
│   │       └── hooks/
│   │           ├── useHealth.ts
│   │           └── useHealth.test.ts
├── e2e/
│   ├── package.json
│   ├── playwright.config.ts
│   └── tests/
│       ├── embedded-frontend.spec.ts
│       └── health-flow.spec.ts
└── docs/superpowers/
    ├── specs/2026-04-17-walking-skeleton-design.md
    └── plans/2026-04-17-walking-skeleton.md
```

---

## Chunk 1: Backend scaffolding (Phase 1, Backend Dev agent)

This chunk scaffolds the Go backend: module init, handlers, app composition, embed, entrypoint. Runs fully in isolation from the frontend chunk. When you finish, `go test ./...` and `go build ./backend/cmd/flytrap` both succeed, the binary runs and serves `/api/health`, and the golangci-lint config is in place.

### Task 1: Initialize the Go module and repo-root ignore rules

**Files:**
- Create: `go.mod`
- Create: `.gitignore`
- Create: `.golangci.yml`
- Create: `backend/internal/app/dist/.gitkeep`

- [ ] **Step 1: Run `go mod init`**

Run:
```bash
go mod init github.com/xico42/flytrap
```
Expected: `go.mod` created with `module github.com/xico42/flytrap` and `go 1.26`.

- [ ] **Step 2: Verify Go version**

Run:
```bash
go version
```
Expected: `go version go1.26.x ...`. If not 1.26, STOP and surface — do not downgrade.

- [ ] **Step 3: Create `.gitignore`**

Contents:
```
# build artifacts
/bin/
/backend/internal/app/dist/*
!/backend/internal/app/dist/.gitkeep

# frontend
/frontend/node_modules/
/frontend/dist/
/frontend/coverage/
/frontend/.vite/

# e2e
/e2e/node_modules/
/e2e/test-results/
/e2e/playwright-report/
/e2e/playwright/.cache/

# tooling
.DS_Store
*.log
```

- [ ] **Step 4: Create `.golangci.yml`**

Minimal, opinionated config:
```yaml
run:
  timeout: 3m
  tests: true

linters:
  default: none
  enable:
    - errcheck
    - govet
    - ineffassign
    - staticcheck
    - unused
    - gofmt
    - goimports
    - revive

issues:
  exclude-dirs:
    - backend/internal/app/dist
    - frontend
    - e2e
```

- [ ] **Step 5: Create embed placeholder**

```bash
mkdir -p backend/internal/app/dist
touch backend/internal/app/dist/.gitkeep
```

- [ ] **Step 6: Commit**

```bash
git add go.mod .gitignore .golangci.yml backend/internal/app/dist/.gitkeep
git commit -m "chore: bootstrap Go module and repo hygiene"
```

---

### Task 2: Health handler (TDD)

**Files:**
- Create: `backend/internal/api/health.go`
- Create: `backend/internal/api/health_test.go`

**Context7 step** (do before any code):
- [ ] Query context7 for `/golang/go` about `net/http` handler idioms in Go 1.26 and `httptest.NewRecorder` usage. Note any changes from older Go versions.

- [ ] **Step 1: Write the failing test**

Create `backend/internal/api/health_test.go`:
```go
package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/xico42/flytrap/backend/internal/api"
)

func TestHealthHandler_ReturnsHealthyJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	rec := httptest.NewRecorder()

	api.HealthHandler().ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	require.Equal(t, "application/json", rec.Header().Get("Content-Type"))

	var body map[string]string
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	require.Equal(t, map[string]string{"status": "healthy"}, body)
}
```

- [ ] **Step 2: Run and confirm test fails**

Run:
```bash
go test ./backend/internal/api/...
```
Expected: compile error (`api.HealthHandler` undefined). `go get github.com/stretchr/testify` first if needed.

- [ ] **Step 3: Install testify dependency**

Run:
```bash
go get github.com/stretchr/testify@latest
```
Expected: `go.mod` / `go.sum` updated.

- [ ] **Step 4: Write minimal implementation**

Create `backend/internal/api/health.go`:
```go
package api

import (
	"net/http"
)

// HealthHandler returns the stub health endpoint for the walking skeleton.
// It always responds 200 with {"status":"healthy"}.
func HealthHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"healthy"}`))
	})
}
```

- [ ] **Step 5: Run and confirm test passes**

Run:
```bash
go test ./backend/internal/api/... -v
```
Expected: `--- PASS: TestHealthHandler_ReturnsHealthyJSON`.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/api/ go.mod go.sum
git commit -m "feat(api): add /api/health handler"
```

---

### Task 3: App package — HTTP composition with injectable `fs.FS`

**Files:**
- Create: `backend/internal/app/app.go`
- Create: `backend/internal/app/app_test.go`

**Context7 step** (do before any code):
- [ ] Query context7 for `/golang/go` about `embed.FS` + `fs.Sub` idioms and `http.FileServerFS` (Go 1.22+). Note exact signatures for Go 1.26.

The package interface is frozen by the spec: `func New(fsys fs.FS) http.Handler`. Tests inject an `fstest.MapFS` to exercise the full routing precedence table without touching the real embed.

- [ ] **Step 1: Write the failing test**

Create `backend/internal/app/app_test.go`:
```go
package app_test

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"

	"github.com/stretchr/testify/require"
	"github.com/xico42/flytrap/backend/internal/app"
)

func fixtureFS() fstest.MapFS {
	return fstest.MapFS{
		"index.html": {Data: []byte(`<!doctype html><div id="root"></div>`)},
		"assets/app.js": {Data: []byte(`console.log("flytrap");`)},
	}
}

func do(t *testing.T, h http.Handler, method, target string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(method, target, nil))
	return rec
}

func TestApp_HealthRouteServesAPI(t *testing.T) {
	rec := do(t, app.New(fixtureFS()), http.MethodGet, "/api/health")

	require.Equal(t, http.StatusOK, rec.Code)
	require.Contains(t, rec.Body.String(), `"status":"healthy"`)
}

func TestApp_UnknownAPIRouteIs404JSON(t *testing.T) {
	rec := do(t, app.New(fixtureFS()), http.MethodGet, "/api/nope")

	require.Equal(t, http.StatusNotFound, rec.Code)
	require.Equal(t, "application/json", rec.Header().Get("Content-Type"))
	require.Contains(t, rec.Body.String(), `"error":"not found"`)
}

func TestApp_RootServesIndexHTML(t *testing.T) {
	rec := do(t, app.New(fixtureFS()), http.MethodGet, "/")

	require.Equal(t, http.StatusOK, rec.Code)
	require.Contains(t, rec.Body.String(), `id="root"`)
}

func TestApp_AssetServedFromFS(t *testing.T) {
	rec := do(t, app.New(fixtureFS()), http.MethodGet, "/assets/app.js")

	require.Equal(t, http.StatusOK, rec.Code)
	body, err := io.ReadAll(rec.Body)
	require.NoError(t, err)
	require.Equal(t, `console.log("flytrap");`, string(body))
}

func TestApp_DeepLinkFallsBackToIndex(t *testing.T) {
	rec := do(t, app.New(fixtureFS()), http.MethodGet, "/messages/42")

	require.Equal(t, http.StatusOK, rec.Code)
	require.Contains(t, rec.Body.String(), `id="root"`)
}

// When dist is empty (frontend never built) the binary must still serve the API.
// Non-API requests get a clear 503 instead of a cryptic 404.
func TestApp_EmptyFSStillServesHealthAPI(t *testing.T) {
	empty := fstest.MapFS{}
	h := app.New(empty)

	rec := do(t, h, http.MethodGet, "/api/health")
	require.Equal(t, http.StatusOK, rec.Code)
	require.Contains(t, rec.Body.String(), `"status":"healthy"`)
}

func TestApp_EmptyFSReturns503OnSPAPath(t *testing.T) {
	rec := do(t, app.New(fstest.MapFS{}), http.MethodGet, "/")
	require.Equal(t, http.StatusServiceUnavailable, rec.Code)
	require.Contains(t, rec.Body.String(), "frontend not built")
}

// Guard against accidental index.html short-circuits on API paths.
func TestApp_ApiPrefixIsNotSwallowedByFallback(t *testing.T) {
	rec := do(t, app.New(fixtureFS()), http.MethodGet, "/api/")
	require.Equal(t, http.StatusNotFound, rec.Code)
	require.Contains(t, rec.Body.String(), `"error":"not found"`)
}
```

- [ ] **Step 2: Run and confirm tests fail**

Run:
```bash
go test ./backend/internal/app/... -v
```
Expected: compile errors (`app.New` undefined).

- [ ] **Step 3: Write minimal implementation**

Create `backend/internal/app/app.go`:
```go
package app

import (
	"io/fs"
	"net/http"
	"strings"

	"github.com/xico42/flytrap/backend/internal/api"
)

// New composes the Flytrap HTTP handler against the supplied frontend filesystem.
// The fsys root is expected to contain index.html (the built React SPA).
// If index.html is missing (e.g. `task build:frontend` hasn't run yet),
// API routes still work; non-API requests get a clear 503 at request time,
// instead of the binary refusing to boot.
func New(fsys fs.FS) http.Handler {
	mux := http.NewServeMux()
	mux.Handle("GET /api/health", api.HealthHandler())
	mux.HandleFunc("/api/", apiNotFound)
	mux.Handle("/", spaHandler(fsys))
	return mux
}

func apiNotFound(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotFound)
	_, _ = w.Write([]byte(`{"error":"not found"}`))
}

func spaHandler(fsys fs.FS) http.Handler {
	fileServer := http.FileServerFS(fsys)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, err := fs.Stat(fsys, "index.html"); err != nil {
			http.Error(w, "frontend not built — run `task build:frontend` first", http.StatusServiceUnavailable)
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			fileServer.ServeHTTP(w, r)
			return
		}
		if _, err := fs.Stat(fsys, path); err == nil {
			fileServer.ServeHTTP(w, r)
			return
		}
		// SPA deep-link fallback: serve index.html so the client router can take over.
		r2 := r.Clone(r.Context())
		r2.URL.Path = "/"
		fileServer.ServeHTTP(w, r2)
	})
}
```

- [ ] **Step 4: Run and confirm tests pass**

Run:
```bash
go test ./backend/internal/app/... -v
```
Expected: all 8 tests PASS. If the `http.FileServerFS` API differs in Go 1.26 (check context7), adapt the call but keep the behavior.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/app/
git commit -m "feat(app): compose API + SPA handler with injectable fs.FS"
```

---

### Task 4: Embed wiring + main entrypoint

**Files:**
- Create: `backend/internal/app/embed.go`
- Create: `backend/cmd/flytrap/main.go`

- [ ] **Step 1: Create `embed.go`**

```go
package app

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var distFS embed.FS

// FrontendFS returns the built frontend filesystem rooted at dist/.
// The returned FS contains index.html at its root when the frontend has been built.
func FrontendFS() fs.FS {
	sub, err := fs.Sub(distFS, "dist")
	if err != nil {
		panic("app: unable to sub-FS dist: " + err.Error())
	}
	return sub
}
```

- [ ] **Step 2: Create `main.go`**

```go
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/xico42/flytrap/backend/internal/app"
)

func main() {
	addr := ":" + port()
	handler := app.New(app.FrontendFS())

	log.Printf("flytrap listening on %s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("flytrap: %v", err)
	}
}

func port() string {
	if p := os.Getenv("PORT"); p != "" {
		return p
	}
	return "8080"
}
```

- [ ] **Step 3: Verify build + boot succeed (even with empty dist)**

The `.gitkeep` keeps the directory embeddable. `app.New` no longer panics on a missing `index.html` — the binary boots and serves `/api/health`; SPA routes return 503 until the frontend is built.

Run:
```bash
go build -o /tmp/flytrap-bootstrap ./backend/cmd/flytrap
PORT=18080 /tmp/flytrap-bootstrap &
FLY_PID=$!
sleep 0.5
curl -sS http://localhost:18080/api/health
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:18080/
kill ${FLY_PID} 2>/dev/null || true
wait ${FLY_PID} 2>/dev/null || true
rm -f /tmp/flytrap-bootstrap
```
Expected: first curl prints `{"status":"healthy"}`; second curl prints `503`.

- [ ] **Step 4: Run golangci-lint on backend**

Verify `golangci-lint` v2 is installed (the `.golangci.yml` in this repo uses the v2 schema):
```bash
golangci-lint version
```
Expected: reports `v2.x.y`. If v1 is installed, either (a) upgrade to v2 per `https://golangci-lint.run/welcome/install/`, or (b) rewrite `.golangci.yml` into v1 schema before running. Do NOT silently mix a v1 binary with a v2 config.

Then:
```bash
golangci-lint run ./...
```
Expected: 0 issues.

- [ ] **Step 5: Commit**

```bash
git add backend/ go.mod go.sum
git commit -m "feat: wire embed.FS and main entrypoint"
```

---

### Task 5: Backend chunk verification

- [ ] **Step 1: Run all Go tests**

```bash
go test ./...
```
Expected: `ok github.com/xico42/flytrap/backend/internal/api` and `ok github.com/xico42/flytrap/backend/internal/app`.

- [ ] **Step 2: Run linter**

```bash
golangci-lint run ./...
```
Expected: 0 issues.

- [ ] **Step 3: Verify embed succeeds**

```bash
go build -o bin/flytrap ./backend/cmd/flytrap && rm -f bin/flytrap
```
Expected: build succeeds.

At this point, the backend chunk is green. Phase 1 Backend agent hands off.

---

## Chunk 2: Frontend scaffolding (Phase 1, Frontend Dev agent)

This chunk scaffolds the React + Vite 8 + Tailwind v4 + daisyUI 5 frontend. Runs in parallel with Chunk 1 — zero shared files. When finished, `pnpm --dir frontend test` and `pnpm --dir frontend build` both succeed, and the built `frontend/dist/` directory contains `index.html` and hashed asset files.

**Per-task reminder:** every task in this chunk whose verb is "install" or "configure" MUST start with a context7 lookup. Versions drift fast.

### Task 6: Scaffold Vite 8 + React 19 + TypeScript

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx` (placeholder only; real composition happens in Task 12)

**Context7 step:**
- [ ] Query `/vitejs/vite` (version `v8.0.7`) for "React TypeScript project scaffold and package.json deps for Vite 8".
- [ ] Query context7 for React 19 peer dependency and `react-dom/client` entrypoint.

- [ ] **Step 1: Create `frontend/package.json`**

Based on context7 findings, use the current Vite 8 + React 19 dep set. Starting template (update versions to what context7 reports):
```json
{
  "name": "flytrap-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "eslint": "^9.0.0",
    "@eslint/js": "^9.0.0",
    "typescript-eslint": "^8.0.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.6.0",
    "vite": "^8.0.7",
    "vitest": "^3.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```
**Version reconcile rule:** if context7 reports a newer major for any dep, surface it; do NOT silently bump.

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
```

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Flytrap</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `src/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 7: Create placeholder `src/App.tsx`**

```tsx
export default function App() {
  return <div>bootstrap</div>;
}
```

- [ ] **Step 8: Install dependencies**

Run:
```bash
cd frontend && pnpm install
```
Expected: `pnpm-lock.yaml` created, `node_modules/` populated, exit 0.

- [ ] **Step 9: Verify Vite builds**

Run:
```bash
pnpm --dir frontend build
```
Expected: `frontend/dist/index.html` and `frontend/dist/assets/*.js` created. `frontend/dist/index.html` contains `<div id="root">`.

- [ ] **Step 10: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/tsconfig.json \
  frontend/tsconfig.node.json frontend/vite.config.ts frontend/index.html \
  frontend/src/main.tsx frontend/src/App.tsx
git commit -m "chore(frontend): scaffold Vite 8 + React 19 + TypeScript"
```

---

### Task 7: Install Tailwind v4 + daisyUI 5

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/index.css`

**Context7 step:**
- [ ] Query `/tailwindlabs/tailwindcss` for "Tailwind v4 Vite plugin install and configuration (CSS-first, no config file)".
- [ ] Query context7 for daisyUI 5 — search `daisyui` or `/saadeghi/daisyui`, get the v5 install snippet for Tailwind v4.

Tailwind v4 is CSS-first — no `tailwind.config.js`. The configuration goes in the CSS file via `@import` / `@plugin` directives. Confirm exact syntax via context7.

- [ ] **Step 1: Add Tailwind + daisyUI deps**

```bash
cd frontend && pnpm add -D tailwindcss @tailwindcss/vite daisyui
```
Expected: `package.json` devDependencies updated. Use whichever versions context7 confirms for Tailwind v4 and daisyUI 5.

- [ ] **Step 2: Register the Vite plugin**

Update `vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
```

- [ ] **Step 3: Create `src/index.css`**

Exact syntax depends on daisyUI 5 docs (context7). Typical pattern:
```css
@import "tailwindcss";
@plugin "daisyui" {
  themes: all;
}
```
This enables **all** daisyUI themes (required by the spec). Confirm the directive name and option syntax via context7 before committing.

- [ ] **Step 4: Verify build still succeeds and CSS is emitted**

```bash
pnpm --dir frontend build
```
Expected: `frontend/dist/assets/*.css` exists and contains Tailwind utility classes (spot-check: `grep -l 'data-theme' frontend/dist/assets/*.css` should find a match).

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml \
  frontend/vite.config.ts frontend/src/index.css
git commit -m "chore(frontend): add Tailwind v4 + daisyUI 5 (all themes)"
```

---

### Task 8: Vitest configuration + jsdom test setup

**Files:**
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test/setup.ts`

**Context7 step:**
- [ ] Query context7 for `/vitest-dev/vitest` about "vitest config with jsdom and testing-library jest-dom matchers".

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
});
```

- [ ] **Step 2: Create `src/test/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 3: Verify Vitest starts with zero tests**

Run:
```bash
pnpm --dir frontend test
```
Expected: `No test files found` (not an error for this step — we have no tests yet). If it errors on config, fix per context7 output.

- [ ] **Step 4: Commit**

```bash
git add frontend/vitest.config.ts frontend/src/test/setup.ts
git commit -m "chore(frontend): wire vitest + jsdom + testing-library"
```

---

### Task 9: `<ThemeSwitcher />` component (TDD)

**Files:**
- Create: `frontend/src/themes.ts`
- Create: `frontend/src/components/ThemeSwitcher.tsx`
- Create: `frontend/src/components/ThemeSwitcher.test.tsx`

**Behavior:**
- Renders a `<select>` containing every daisyUI theme the CSS enables.
- On mount, reads `localStorage.getItem("flytrap-theme")`; if absent, defaults to `"light"`.
- On change, sets `document.documentElement.dataset.theme` AND writes to `localStorage`.

**Source of truth for themes:** a single `src/themes.ts` constant. The CSS `@plugin "daisyui"` block enables `themes: all` (whatever daisyUI 5 ships), and `themes.ts` enumerates the names that the UI exposes. If daisyUI ships new themes upstream, the UI will stay stable until `themes.ts` is updated — known, documented drift, acceptable for the skeleton.

**Context7 step before writing `themes.ts`:**
- [ ] Query daisyUI 5 docs for the current list of built-in theme names. Use EXACTLY that list in `themes.ts` — including newer themes like `abyss`, `silk`, `caramellatte` if they ship. The returned list is the authoritative source for this task; do not copy from stale training data.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/ThemeSwitcher.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { ThemeSwitcher } from "./ThemeSwitcher";

describe("<ThemeSwitcher />", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  test("defaults to the 'light' theme on first render", () => {
    render(<ThemeSwitcher />);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getByRole("combobox")).toHaveValue("light");
  });

  test("applies a persisted theme from localStorage", () => {
    localStorage.setItem("flytrap-theme", "dracula");
    render(<ThemeSwitcher />);
    expect(document.documentElement.dataset.theme).toBe("dracula");
  });

  test("updates the data-theme attribute and localStorage on change", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.selectOptions(screen.getByRole("combobox"), "synthwave");

    expect(document.documentElement.dataset.theme).toBe("synthwave");
    expect(localStorage.getItem("flytrap-theme")).toBe("synthwave");
  });

  test("exposes every supported theme as an option", () => {
    render(<ThemeSwitcher />);
    // Spot-check a handful of daisyUI 5 themes that must be present.
    for (const theme of ["light", "dark", "dracula", "synthwave", "cupcake"]) {
      expect(
        screen.getByRole("option", { name: theme }),
      ).toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm --dir frontend test
```
Expected: all four tests fail — module not found.

- [ ] **Step 3a: Write `src/themes.ts` (single source of truth)**

Use the theme list retrieved from context7 above. Template:
```ts
// Keep this list in sync with daisyUI 5's built-in themes.
// The CSS directive `@plugin "daisyui" { themes: all; }` enables every
// theme daisyUI ships; this array exposes them in the UI.
// Verified against daisyUI 5 docs via context7 on <YYYY-MM-DD>.
export const THEMES = [
  "light",
  "dark",
  // …populate from context7 output…
] as const;

export type Theme = (typeof THEMES)[number];
```

- [ ] **Step 3b: Write `ThemeSwitcher.tsx`**

```tsx
import { useEffect, useState } from "react";
import { THEMES, type Theme } from "../themes";

const STORAGE_KEY = "flytrap-theme";

function isTheme(value: string | null): value is Theme {
  return value !== null && (THEMES as readonly string[]).includes(value);
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return isTheme(stored) ? stored : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <select
      className="select select-bordered"
      aria-label="theme"
      value={theme}
      onChange={(event) => {
        const next = event.target.value;
        if (isTheme(next)) setTheme(next);
      }}
    >
      {THEMES.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}

export default ThemeSwitcher;
```

- [ ] **Step 4: Run and confirm tests pass**

```bash
pnpm --dir frontend test
```
Expected: all four tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/
git commit -m "feat(frontend): add ThemeSwitcher with persistent daisyUI theme"
```

---

### Task 10: `useHealth` hook (TDD)

**Files:**
- Create: `frontend/src/feature/health/hooks/useHealth.ts`
- Create: `frontend/src/feature/health/hooks/useHealth.test.ts`

**Behavior:** calls `fetch("/api/health")` on mount; exposes `{ status: "loading" | "healthy" | "unhealthy" }`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/feature/health/hooks/useHealth.test.ts`:
```ts
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useHealth } from "./useHealth";

describe("useHealth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("starts in the 'loading' state", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    const { result } = renderHook(() => useHealth());
    expect(result.current.status).toBe("loading");
  });

  test("reports 'healthy' when the API returns status:healthy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "healthy" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const { result } = renderHook(() => useHealth());

    await waitFor(() => expect(result.current.status).toBe("healthy"));
    expect(fetch).toHaveBeenCalledWith("/api/health");
  });

  test("reports 'unhealthy' when the API responds non-200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 500 })),
    );

    const { result } = renderHook(() => useHealth());

    await waitFor(() => expect(result.current.status).toBe("unhealthy"));
  });

  test("reports 'unhealthy' on network errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const { result } = renderHook(() => useHealth());

    await waitFor(() => expect(result.current.status).toBe("unhealthy"));
  });
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm --dir frontend test
```
Expected: four failures — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/feature/health/hooks/useHealth.ts`:
```ts
import { useEffect, useState } from "react";

export type HealthStatus = "loading" | "healthy" | "unhealthy";

export interface HealthState {
  status: HealthStatus;
}

export function useHealth(): HealthState {
  const [status, setStatus] = useState<HealthStatus>("loading");

  useEffect(() => {
    let active = true;

    fetch("/api/health")
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setStatus("unhealthy");
          return;
        }
        const body = (await response.json()) as { status?: string };
        setStatus(body.status === "healthy" ? "healthy" : "unhealthy");
      })
      .catch(() => {
        if (active) setStatus("unhealthy");
      });

    return () => {
      active = false;
    };
  }, []);

  return { status };
}
```

- [ ] **Step 4: Run and confirm tests pass**

```bash
pnpm --dir frontend test
```
Expected: all four tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/feature/health/hooks/
git commit -m "feat(frontend): add useHealth hook"
```

---

### Task 11: `<HealthStatus />` component (TDD)

**Files:**
- Create: `frontend/src/feature/health/components/HealthStatus.tsx`
- Create: `frontend/src/feature/health/components/HealthStatus.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/feature/health/components/HealthStatus.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { HealthStatus } from "./HealthStatus";
import * as hook from "../hooks/useHealth";

describe("<HealthStatus />", () => {
  test("shows a loading indicator while fetching", () => {
    vi.spyOn(hook, "useHealth").mockReturnValue({ status: "loading" });
    render(<HealthStatus />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test("shows 'healthy' when the API is healthy", () => {
    vi.spyOn(hook, "useHealth").mockReturnValue({ status: "healthy" });
    render(<HealthStatus />);
    expect(screen.getByText("healthy")).toBeInTheDocument();
  });

  test("shows 'unhealthy' when the API is not healthy", () => {
    vi.spyOn(hook, "useHealth").mockReturnValue({ status: "unhealthy" });
    render(<HealthStatus />);
    expect(screen.getByText("unhealthy")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm --dir frontend test
```
Expected: three failures — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/feature/health/components/HealthStatus.tsx`:
```tsx
import { useHealth } from "../hooks/useHealth";

export function HealthStatus() {
  const { status } = useHealth();

  if (status === "loading") {
    return <span className="loading loading-dots loading-sm" aria-label="loading" />;
  }

  return <span data-testid="health-status">{status}</span>;
}

export default HealthStatus;
```

- [ ] **Step 4: Run and confirm tests pass**

```bash
pnpm --dir frontend test
```
Expected: all three PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/feature/health/components/
git commit -m "feat(frontend): add HealthStatus component"
```

---

### Task 12: App composition + integration test

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/App.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import App from "./App";
import * as hook from "./feature/health/hooks/useHealth";

describe("<App />", () => {
  test("renders the hello-world heading and health status", () => {
    vi.spyOn(hook, "useHealth").mockReturnValue({ status: "healthy" });
    render(<App />);
    expect(screen.getByRole("heading", { name: /hello/i })).toBeInTheDocument();
    expect(screen.getByText("healthy")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /theme/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm --dir frontend test
```
Expected: fails because the placeholder App has no heading or health text.

- [ ] **Step 3: Implement `App.tsx`**

Replace `frontend/src/App.tsx`:
```tsx
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { HealthStatus } from "./feature/health/components/HealthStatus";

export default function App() {
  return (
    <div className="min-h-screen bg-base-200 p-8">
      <header className="flex items-center justify-between max-w-xl mx-auto mb-8">
        <h1 className="text-3xl font-bold">Hello, Flytrap</h1>
        <ThemeSwitcher />
      </header>
      <main className="max-w-xl mx-auto">
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">API health</h2>
            <p>
              Status: <HealthStatus />
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Run and confirm all tests pass**

```bash
pnpm --dir frontend test
```
Expected: full green (App + ThemeSwitcher + HealthStatus + useHealth).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/App.test.tsx
git commit -m "feat(frontend): compose App with ThemeSwitcher and HealthStatus"
```

---

### Task 13: ESLint config

**Files:**
- Create: `frontend/eslint.config.js`

**Context7 step:**
- [ ] Query context7 for ESLint 9 flat-config with `typescript-eslint` and React plugin recommendations (React 19 / flat config).

- [ ] **Step 1: Create `eslint.config.js`**

Minimal flat config (update per context7 findings):
```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  { ignores: ["dist", "node_modules", "coverage"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        fetch: "readonly",
        HTMLElement: "readonly",
        Response: "readonly",
      },
    },
  },
];
```

- [ ] **Step 2: Verify lint passes**

```bash
pnpm --dir frontend lint
```
Expected: zero issues. Fix any surfaced ones before moving on.

- [ ] **Step 3: Commit**

```bash
git add frontend/eslint.config.js
git commit -m "chore(frontend): add ESLint flat config"
```

---

### Task 14: Frontend chunk verification

- [ ] **Step 1: Run all vitest tests**

```bash
pnpm --dir frontend test
```
Expected: all tests PASS (ThemeSwitcher: 4, useHealth: 4, HealthStatus: 3, App: 1).

- [ ] **Step 2: Typecheck**

```bash
pnpm --dir frontend exec tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Lint**

```bash
pnpm --dir frontend lint
```
Expected: exit 0.

- [ ] **Step 4: Production build**

```bash
pnpm --dir frontend build
```
Expected: `frontend/dist/index.html` exists, `frontend/dist/assets/*.css` exists and contains daisyUI utility classes.

Phase 1 Frontend agent hands off.

---

## Chunk 3: Integration — Taskfile, docker-compose, first green binary (Phase 2)

Runs on the main thread after Chunks 1 and 2 have both landed. Wires the two halves together: Taskfile.yml stitches leaves into composites, docker-compose.yaml runs the dev loop, and a manual smoke test proves the built binary serves the real React UI and reaches the health endpoint.

### Task 15: Taskfile.yml

**Files:**
- Create: `Taskfile.yml`

**Context7 step:**
- [ ] Query context7 for `/go-task/task` about the v3 schema — especially `deps:` vs `cmds:` semantics and how to invoke another task (`task: <name>` inside `cmds:`).

- [ ] **Step 1: Write `Taskfile.yml`**

```yaml
version: "3"

vars:
  BIN: bin/flytrap
  BACKEND_PKG: ./backend/cmd/flytrap
  FRONTEND_DIST: frontend/dist
  EMBED_DIST: backend/internal/app/dist

tasks:
  # ---------- lint ----------
  lint:backend:
    desc: Run golangci-lint against the Go code
    cmds:
      - golangci-lint run ./...

  lint:frontend:
    desc: Run ESLint on the frontend
    cmds:
      - pnpm --dir frontend lint

  lint:types:
    desc: Typecheck the frontend with tsc
    cmds:
      - pnpm --dir frontend exec tsc --noEmit

  lint:lizard:
    desc: Enforce cyclomatic complexity under 20 (backend + frontend sources)
    cmds:
      - lizard backend frontend/src --CCN 20 -w
          --exclude "backend/internal/app/dist/*"
          --exclude "frontend/dist/*"
          --exclude "**/node_modules/*"

  lint:
    desc: Run every lint in parallel
    deps: [lint:backend, lint:frontend, lint:types, lint:lizard]

  # ---------- test ----------
  test:backend:
    desc: Run Go unit tests
    cmds:
      - go test ./...

  test:frontend:
    desc: Run Vitest
    cmds:
      - pnpm --dir frontend test

  test:
    desc: Run every unit-test suite in parallel
    deps: [test:backend, test:frontend]

  # ---------- build ----------
  build:frontend:
    desc: Build the frontend and copy dist into the embed location
    cmds:
      - pnpm --dir frontend build
      - rm -rf {{.EMBED_DIST}}
      - mkdir -p {{.EMBED_DIST}}
      - cp -R {{.FRONTEND_DIST}}/. {{.EMBED_DIST}}/
    sources:
      - frontend/src/**/*
      - frontend/index.html
      - frontend/vite.config.ts
      - frontend/package.json
      - frontend/pnpm-lock.yaml
    generates:
      - "{{.EMBED_DIST}}/index.html"

  build:backend:
    desc: Build the Go binary (requires frontend dist embedded)
    deps: [build:frontend]
    cmds:
      - go build -o {{.BIN}} {{.BACKEND_PKG}}
    sources:
      - backend/**/*.go
      - "{{.EMBED_DIST}}/**/*"
    generates:
      - "{{.BIN}}"

  build:
    desc: Full build (frontend → embed → Go binary)
    deps: [build:backend]

  # ---------- dev ----------
  dev:frontend:
    desc: Run the Vite dev server (host use; compose calls it too)
    cmds:
      - pnpm --dir frontend dev

  dev:backend:
    desc: Run the Go backend with go run (host use; compose calls it too)
    cmds:
      - go run {{.BACKEND_PKG}}

  dev:
    desc: Start the full dev environment via docker compose
    cmds:
      - docker compose up --build

  # ---------- e2e ----------
  e2e:install:
    desc: Install e2e dependencies (Playwright browsers included)
    cmds:
      - pnpm --dir e2e install
      - pnpm --dir e2e exec playwright install chromium

  e2e:playwright:
    desc: Run Playwright specs (assumes a binary is already listening)
    cmds:
      - pnpm --dir e2e test

  e2e:
    desc: Full e2e — build, start binary, probe, run tests, tear down
    deps: [build, e2e:install]
    cmds:
      - cmd: ./scripts/run-e2e.sh
        silent: false

  # ---------- ci ----------
  # Sequential by design: `e2e` runs `build:frontend` which writes into
  # `backend/internal/app/dist/`. That directory is scanned by `lint:lizard`,
  # so parallelizing lint+test+e2e would race. Run them in order.
  ci:
    desc: Lint + unit tests + e2e (sequential)
    cmds:
      - task: lint
      - task: test
      - task: e2e
```

- [ ] **Step 2: Create `scripts/run-e2e.sh`**

The `e2e` task needs shell orchestration (start binary in background → poll health → run Playwright → teardown). Kept out of the Taskfile body per the spec's "lifecycle composite" rule.

Create `scripts/run-e2e.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

BIN="${BIN:-bin/flytrap}"
PORT="${PORT:-8080}"

cleanup() {
  if [[ -n "${PID:-}" ]] && kill -0 "${PID}" 2>/dev/null; then
    kill "${PID}" 2>/dev/null || true
    wait "${PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

PORT="${PORT}" "${BIN}" &
PID=$!

# readiness probe — up to 15 seconds
for _ in $(seq 1 30); do
  if curl -fsS "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

if ! curl -fsS "http://localhost:${PORT}/api/health" >/dev/null; then
  echo "flytrap failed to become ready on :${PORT}" >&2
  exit 1
fi

pnpm --dir e2e test
```

Make it executable:
```bash
chmod +x scripts/run-e2e.sh
```

- [ ] **Step 3: Install terryyin/lizard**

```bash
pipx install lizard || pip install --user lizard
```
Verify:
```bash
lizard --version
```
Expected: version prints. If the host already has `lizard`, skip.

- [ ] **Step 4: Verify each leaf task runs**

Run:
```bash
task lint:backend
task test:backend
```
Expected: both succeed (frontend tasks require pnpm install already done in Chunk 2).

- [ ] **Step 5: Commit**

```bash
git add Taskfile.yml scripts/run-e2e.sh
git commit -m "chore: add Taskfile with composable lint/test/build/dev/e2e/ci"
```

---

### Task 16: docker-compose.yaml (dev orchestration)

**Files:**
- Create: `docker-compose.yaml`

**Context7 step:**
- [ ] Quick sanity-check on current docker-compose version + `develop.watch` / bind-mount syntax if unsure.

- [ ] **Step 1: Create `docker-compose.yaml`**

```yaml
services:
  backend:
    image: golang:1.26-alpine
    working_dir: /workspace
    command: sh -c "apk add --no-cache git && go run ./backend/cmd/flytrap"
    environment:
      PORT: "8080"
      CGO_ENABLED: "0"
    volumes:
      - .:/workspace
      - go-mod-cache:/go/pkg/mod
      - go-build-cache:/root/.cache/go-build
    ports:
      - "8080:8080"

  frontend:
    image: node:22-alpine
    working_dir: /workspace/frontend
    command: sh -c "corepack enable && pnpm install && pnpm dev --host 0.0.0.0"
    environment:
      VITE_API_PROXY: http://backend:8080
    volumes:
      - .:/workspace
      - frontend-node-modules:/workspace/frontend/node_modules
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  go-mod-cache:
  go-build-cache:
  frontend-node-modules:
```

**Note on the Vite proxy target:** when Vite runs inside compose, `localhost:8080` no longer points at the backend — it needs `http://backend:8080`. Update `frontend/vite.config.ts` to read `VITE_API_PROXY` with a fallback:

- [ ] **Step 2: Update `vite.config.ts` to honor `VITE_API_PROXY`**

```ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxy = env.VITE_API_PROXY ?? "http://localhost:8080";
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        "/api": {
          target: apiProxy,
          changeOrigin: false,
        },
      },
    },
    build: { outDir: "dist", emptyOutDir: true },
  };
});
```

- [ ] **Step 3: Smoke-test dev mode**

Run:
```bash
task dev
```
Expected:
- Both services start.
- `curl -sS http://localhost:8080/api/health` returns `{"status":"healthy"}`.
- `curl -sSI http://localhost:5173/` returns a 200 HTML response from Vite.
- `curl -sS http://localhost:5173/api/health` returns the proxied health JSON.

Stop with `Ctrl+C` once verified.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yaml frontend/vite.config.ts
git commit -m "chore: add docker-compose dev stack (backend + frontend + Vite proxy)"
```

---

### Task 17: README update + first end-to-end smoke

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Overwrite `README.md` with developer-onboarding content**

Write exactly this content (the outer fence below uses four backticks to contain the nested triple-backtick block — use three backticks in the actual file):

````markdown
# Flytrap

Developer tooling to work with pubsub / streaming services.

## Quickstart

Prerequisites: Go 1.26, Node 22+, pnpm 9, Docker (for `task dev`), `go-task`, `golangci-lint` v2, `lizard`.

```bash
task dev      # runs docker-compose: Vite dev server + Go backend
task build    # produces a single static binary at bin/flytrap
task test     # Go unit tests + Vitest
task lint     # golangci-lint + ESLint + tsc --noEmit + lizard (CCN <20)
task e2e      # builds, starts the binary, runs Playwright against it
task ci       # everything: lint + test + e2e (sequential)
```

Layout and design: see `docs/superpowers/specs/2026-04-17-walking-skeleton-design.md`.
````

- [ ] **Step 2: Full local build + manual smoke**

Run:
```bash
task build
./bin/flytrap &
sleep 1
curl -sS http://localhost:8080/api/health
curl -sSI http://localhost:8080/ | head -1
curl -sS http://localhost:8080/ | grep -c 'id="root"'
kill %1 || true
```
Expected: `{"status":"healthy"}`, `HTTP/1.1 200 OK`, and the final grep returns `1`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: refresh README with quickstart commands"
```

Integration chunk done. Phase 2 hands off to QA.

---

## Chunk 4: QA — Playwright end-to-end tests (Phase 3)

Scaffolds the Playwright harness and writes the two acceptance tests. All tests run against the built binary (never the Vite dev server), which is the only path that exercises the embed.

### Task 18: Scaffold the Playwright project

**Files:**
- Create: `e2e/package.json`
- Create: `e2e/playwright.config.ts`
- Create: `e2e/tsconfig.json`

**Context7 step:**
- [ ] Query `/microsoft/playwright` for "Playwright test config for testing an externally-started server" (we don't want Playwright to start the server — `scripts/run-e2e.sh` does).

- [ ] **Step 1: Create `e2e/package.json`**

```json
{
  "name": "flytrap-e2e",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "test": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "typescript": "^5.6.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 2: Create `e2e/playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? "8080";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
```

- [ ] **Step 3: Create `e2e/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["playwright.config.ts", "tests/**/*"]
}
```

- [ ] **Step 4: Install Playwright**

Run:
```bash
task e2e:install
```
Expected: `e2e/node_modules/` populated, Chromium browser downloaded.

- [ ] **Step 5: Commit**

```bash
git add e2e/package.json e2e/pnpm-lock.yaml e2e/playwright.config.ts e2e/tsconfig.json
git commit -m "chore(e2e): scaffold Playwright harness"
```

---

### Task 19: `embedded-frontend.spec.ts`

**Files:**
- Create: `e2e/tests/embedded-frontend.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { expect, test } from "@playwright/test";

test("binary serves the built React app from embedded FS", async ({ page, request }) => {
  await page.goto("/");

  // The React app mounts content into #root.
  const root = page.locator("#root");
  await expect(root).toBeVisible();
  await expect(root).not.toBeEmpty();

  // The hello-world heading is the easiest stable marker.
  await expect(page.getByRole("heading", { name: /hello/i })).toBeVisible();

  // Embedded JS asset is reachable (proves the FS contains assets, not just index.html).
  const html = await page.content();
  const jsAsset = html.match(/\/assets\/[^"']+\.js/)?.[0];
  expect(jsAsset, "built index.html must reference a hashed JS asset").toBeTruthy();

  const assetResponse = await request.get(jsAsset!);
  expect(assetResponse.status()).toBe(200);
});

test("unknown API routes are 404 JSON", async ({ request }) => {
  const response = await request.get("/api/does-not-exist");
  expect(response.status()).toBe(404);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect(await response.json()).toEqual({ error: "not found" });
});

test("deep links fall back to index.html so the SPA can take over", async ({ request }) => {
  const response = await request.get("/messages/42");
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain('id="root"');
});
```

- [ ] **Step 2: Run the full e2e flow**

Run:
```bash
task e2e
```
Expected: three tests PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/embedded-frontend.spec.ts
git commit -m "test(e2e): verify the embedded frontend + API routing"
```

---

### Task 20: `health-flow.spec.ts`

**Files:**
- Create: `e2e/tests/health-flow.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { expect, test } from "@playwright/test";

test("frontend renders 'healthy' after calling /api/health", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("health-status")).toHaveText("healthy");
});

test("theme switcher changes data-theme on the document root", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("combobox", { name: "theme" }).selectOption("dracula");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dracula");
});
```

- [ ] **Step 2: Run e2e**

Run:
```bash
task e2e
```
Expected: all five tests (3 from Task 19 + 2 here) PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/health-flow.spec.ts
git commit -m "test(e2e): verify health flow + theme switcher in the built binary"
```

Phase 3 QA hands off to Reviewer.

---

## Chunk 5: Review — run CI end-to-end and audit (Phase 4)

Final gate. Reviewer runs the full `task ci`, inspects the tree against spec §8 acceptance criteria, and produces a gap report.

### Task 21: Full CI run

- [ ] **Step 1: Run `task ci`**

```bash
task ci
```
Expected: every leaf (lint:backend, lint:frontend, lint:types, lint:lizard, test:backend, test:frontend, e2e:playwright) exits 0.

If any task fails, FIX the underlying issue — do not weaken tests or disable lint rules. The spec's acceptance criteria are the contract.

### Task 22: Audit against spec §8

For each acceptance-criteria checkbox in `docs/superpowers/specs/2026-04-17-walking-skeleton-design.md` §8, verify it is satisfied by the current tree:

- [ ] `task dev` starts a working dev environment (hot-reload frontend, backend running). — verify via `task dev` + curl probes, then `Ctrl+C`.
- [ ] `task build` produces `bin/flytrap` as a single binary. Check `file bin/flytrap` and `ldd bin/flytrap` (expect "not a dynamic executable" on Linux since `CGO_ENABLED=0`).
- [ ] Running `bin/flytrap` and visiting http://localhost:8080 shows the hello-world UI, theme switcher, "healthy" status.
- [ ] `task lint` passes.
- [ ] `task test` passes.
- [ ] `task e2e` passes.
- [ ] `task ci` passes.
- [ ] Spot-check each Phase-1 agent's hand-off notes: every library-touching task should cite a context7 lookup. Flag any commits whose subject mentions scaffolding / installing a library without a corresponding lookup.

### Task 23: Final commit (if any audit fixes were needed)

Only if the audit surfaced fixes:
```bash
git add -A
git commit -m "fix: address walking-skeleton review findings"
```

Walking skeleton is complete.

---


