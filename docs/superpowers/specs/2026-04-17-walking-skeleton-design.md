# Flytrap Walking Skeleton — Design Spec

**Date:** 2026-04-17
**Status:** Approved (pending spec review)
**Source prompt:** `/PROMPT.md`

## 1. Purpose

Bootstrap the minimum viable infrastructure for Flytrap — a developer-tooling project that will eventually consume messages from pub/sub systems (Kafka, PubSub, Redis, RabbitMQ), persist them, and expose them via an HTTP API and UI. This spec covers only the **walking skeleton**: the end-to-end backbone that proves the architecture can be built upon. No real pub/sub, no database, no domain features.

The skeleton is complete when:

- A single command (`task dev`) starts a working dev environment.
- `task build` produces a single static Go binary that embeds the React frontend.
- The frontend calls a backend HTTP API and renders a result.
- The golden path is exercised by a Playwright e2e test against the built binary.
- Unit tests, linters, and a cyclomatic-complexity gate all pass.

## 2. Out of scope

- SQLite integration
- Any pub/sub integration (Kafka, PubSub, Redis, RabbitMQ, Watermill handlers)
- Authentication, authorization, configuration management
- CI pipeline definition (only the local `task ci` target)
- Deployment/packaging beyond the single binary

## 3. Stack & versions

| Area | Choice |
|------|--------|
| Backend language | Go 1.26 |
| Go module path | `github.com/xico42/flytrap` |
| Backend error abstraction | `github.com/arquivei/errors` (imported where it genuinely adds value; not forced everywhere) |
| Backend testing | `github.com/stretchr/testify` |
| Frontend framework | React 19 + TypeScript |
| Frontend build tool | Vite 8 |
| Frontend styling | Tailwind CSS v4 + daisyUI 5 |
| Frontend package manager | `pnpm` |
| Frontend testing | Vitest + `@testing-library/react` |
| Theme switching | `theme-switcher` (or current daisyUI-compatible equivalent — verify via context7) |
| E2E testing | Playwright |
| Task orchestration | Taskfile (`task`) |
| Complexity gate | `terryyin/lizard`, CCN threshold `< 20` |
| Linting (Go) | `golangci-lint` |
| Linting (Frontend) | ESLint + `tsc --noEmit` |
| Dev environment | Docker Compose (frontend dev server + `go run`) |

> **Doc-freshness rule:** Every agent that scaffolds a library-touching piece of code MUST use context7 (`mcp__claude_ai_Context7__resolve-library-id` + `query-docs`) to verify current idioms for that library. Training data is stale for Vite 8, daisyUI 5, Tailwind v4, React 19, and Go 1.26 embedded-FS patterns.

> **Version pin policy:** Agents may NOT bump a pinned major version above without a checkpoint. Patch/minor bumps (e.g. Node LTS image tag, `golangci-lint` release, pnpm minor) are fine; flag them in the phase hand-off so the Reviewer can sanity-check.

## 4. Repository layout

```
flytrap/
├── backend/
│   ├── cmd/
│   │   └── flytrap/
│   │       └── main.go               # entrypoint — wires app, starts http server
│   └── internal/
│       ├── api/                      # http route handlers (health)
│       │   ├── health.go
│       │   └── health_test.go
│       ├── app/                      # application composition; owns embed.FS
│       │   ├── app.go                # http.Handler: /api/* → api, /* → SPA fallback
│       │   ├── app_test.go
│       │   ├── embed.go              # //go:embed dist
│       │   └── dist/                 # populated by build:frontend — gitignored
│       └── (sub/ will be introduced with the first real subscriber — not in the skeleton)
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                   # composes ThemeSwitcher + HealthStatus
│   │   ├── index.css                 # Tailwind + daisyUI imports
│   │   ├── components/
│   │   │   ├── ThemeSwitcher.tsx
│   │   │   └── ThemeSwitcher.test.tsx
│   │   └── feature/
│   │       └── health/
│   │           ├── components/
│   │           │   ├── HealthStatus.tsx
│   │           │   └── HealthStatus.test.tsx
│   │           └── hooks/
│   │               ├── useHealth.ts
│   │               └── useHealth.test.ts
│   ├── index.html
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── tsconfig.json
│   ├── vite.config.ts                # proxy /api → localhost:8080 in dev
│   ├── vitest.config.ts
│   └── .eslintrc.*
├── e2e/
│   ├── tests/
│   │   ├── embedded-frontend.spec.ts
│   │   └── health-flow.spec.ts
│   ├── playwright.config.ts
│   └── package.json
├── docs/superpowers/specs/           # this spec lives here
├── docker-compose.yaml               # dev orchestration
├── Taskfile.yml
├── go.mod
├── go.sum
├── .golangci.yml
├── .gitignore                        # ignore backend/internal/app/dist, bin/, node_modules, etc.
├── LICENSE
├── PROMPT.md
└── README.md
```

## 5. Architecture

### 5.1 Backend

Single Go binary. `cmd/flytrap/main.go` builds the `app.Handler` and starts `http.ListenAndServe`.

**Public package interface (`internal/app`):**

```go
// Exported seam so tests can inject a fixture FS instead of the real embed.
func New(fsys fs.FS) http.Handler
```

`New` returns the composed `http.Handler`. The production entrypoint wraps the embedded `distFS` as `fs.Sub(distFS, "dist")` and hands it to `New`. Tests pass a `fstest.MapFS` or equivalent.

**Routing precedence** (in `app.New`, checked top-to-bottom):

1. `GET /api/health` → `api.HealthHandler` returns `{"status":"healthy"}` with HTTP 200 and `Content-Type: application/json`. The backend always returns 200 in the skeleton — the frontend's `unhealthy` state exists only to exercise the network-error rendering path, never a backend-emitted "not healthy".
2. Any other `/api/*` → HTTP 404 JSON `{"error":"not found"}`.
3. Otherwise → served from the provided `fs.FS`. If the requested path does not exist in the FS, fall back to `index.html` so React Router deep links work.

**JSON contract (frozen):** Backend emits exactly `{"status":"healthy"}` (no whitespace, lowercase). The frontend hook reads `data.status === "healthy"`. Both sides' tests reference this literal so Phase-1 agents cannot drift.

**Embed strategy:**

- `backend/internal/app/embed.go` contains:
  ```go
  //go:embed all:dist
  var distFS embed.FS
  ```
- `backend/internal/app/dist/` is gitignored and populated by `task build:frontend` (a `cp -r frontend/dist/. backend/internal/app/dist/` step) before `task build:backend` runs.
- `dist/` always contains at minimum a `.gitkeep` so the embed directive does not fail before the first build.
- The binary boots successfully even when `dist/` is empty. `/api/*` routes always work; if a non-API request arrives before the frontend has been built, the SPA handler responds `503 Service Unavailable` with body `frontend not built — run \`task build:frontend\` first`. This lets `task dev` (which only hits the backend's `/api/*` through the Vite proxy) start cleanly on a fresh clone without a pre-build step.

**Port:** Backend listens on `:8080`. Configurable via `PORT` env var; default `8080` is hardcoded in docker-compose, the Vite proxy, and the e2e task. Changing the default requires touching those three files consciously (acceptable at skeleton scale).

### 5.2 Frontend

- Entry: `src/main.tsx` mounts `<App />` into `#root`.
- `<App />` composes `<ThemeSwitcher />` and `<HealthStatus />` inside a simple daisyUI layout ("Hello world" heading + health panel + theme picker).
- `<ThemeSwitcher />` is a dumb `<select>` of all daisyUI themes bound to `document.documentElement.dataset.theme`. Selected theme is persisted in `localStorage`.
- `useHealth()` hook issues `fetch('/api/health')` on mount, exposes `{ status: 'loading' | 'healthy' | 'unhealthy' }`.
- `<HealthStatus />` renders the word `healthy` or `unhealthy` based on hook state (with a subtle loading state).

**Vite dev proxy:** `vite.config.ts` forwards `/api` to `http://localhost:8080` so the frontend dev server can hit the backend without CORS noise.

**Tailwind v4 + daisyUI 5:** configured via the CSS-first approach (no `tailwind.config.js` required in v4 — verify exact syntax via context7 at scaffold time).

### 5.3 Dev environment (docker-compose)

Two services, both mounting the repo as a bind-mount:

- `frontend`: runs `pnpm dev` on `5173`. Depends on `node:22-alpine` (or current LTS at scaffold time — verify).
- `backend`: runs `go run ./backend/cmd/flytrap` on `8080`. Uses `golang:1.26-alpine`.

A developer runs `task dev` → `docker compose up` and visits `http://localhost:5173`. API requests are proxied through Vite to the backend.

### 5.4 Build & e2e pipeline

```
pnpm --dir frontend install
  → pnpm --dir frontend build           (produces frontend/dist)
  → cp -r frontend/dist/. backend/internal/app/dist
  → go build -o bin/flytrap ./backend/cmd/flytrap
  → bin/flytrap &
  → playwright test                     (against http://localhost:8080)
```

## 6. Taskfile.yml — composable tasks

Leaf tasks (one tool each, no composition):

- `lint:backend` — `golangci-lint run ./...`
- `lint:frontend` — `pnpm --dir frontend lint`
- `lint:types` — `pnpm --dir frontend exec tsc --noEmit`
- `lint:lizard` — `lizard backend frontend/src --CCN 20 -w`
- `test:backend` — `go test ./...`
- `test:frontend` — `pnpm --dir frontend test`
- `build:frontend` — `pnpm --dir frontend build && rm -rf backend/internal/app/dist && mkdir -p backend/internal/app/dist && cp -r frontend/dist/. backend/internal/app/dist/`
- `build:backend` — `go build -o bin/flytrap ./backend/cmd/flytrap` (depends on `build:frontend`)
- `dev:frontend` — `pnpm --dir frontend dev`
- `dev:backend` — `go run ./backend/cmd/flytrap`
- `e2e:playwright` — `pnpm --dir e2e exec playwright test`

Composite tasks (deps-only, no duplicated shell):

- `lint` ← `[lint:backend, lint:frontend, lint:types, lint:lizard]`
- `test` ← `[test:backend, test:frontend]`
- `build` ← `[build:frontend, build:backend]` (order-independent at the composite level because `build:backend` already declares `build:frontend` as its own dep)
- `dev` — runs `docker compose up --build` (single-command composite)
- `ci` — sequential `cmds: [task: lint, task: test, task: e2e]`. Sequential, not `deps:`, because `e2e` runs `build:frontend` which writes into `backend/internal/app/dist/`, and `lint:lizard` scans that path — parallel execution would race.

**Lifecycle composite** (necessary exception): `e2e` is the one composite that cannot be pure deps-only. It declares `build` as a dep, then runs `bin/flytrap` in the background, polls `/api/health` until it responds (readiness probe, §10), invokes `e2e:playwright`, and kills the binary in a cleanup step. This orchestration stays inside the `e2e` task and is not duplicated anywhere else.

Composite tasks MUST NOT redefine a leaf's `cmds:`; they compose via `deps:` or invoke leaves as `cmds:` of the form `task: lint:backend`.

## 7. Testing strategy

**Backend unit tests** (`go test ./...`):

- `api/health_test.go` — asserts `HealthHandler` returns 200, JSON body `{"status":"healthy"}`, correct content type.
- `app/app_test.go` — exercises the composed handler using `httptest`:
  - `GET /api/health` → 200 JSON
  - `GET /api/nope` → 404 JSON
  - `GET /` → 200, body contains `<div id="root">` (fixture `index.html` injected via a test double FS)
  - `GET /some/deep/route` → 200, same `index.html` body (SPA fallback)
  - `GET /assets/some-real-file.js` → 200 with file contents

**Frontend unit tests** (vitest):

- `ThemeSwitcher.test.tsx` — changing the select updates `document.documentElement.dataset.theme`; value persisted to `localStorage`.
- `useHealth.test.ts` — mocks `fetch`:
  - Resolves `{status:"healthy"}` → hook state becomes `healthy`.
  - Rejects / non-200 → hook state becomes `unhealthy`.
- `HealthStatus.test.tsx` — renders "healthy" / "unhealthy" / loading based on injected hook state (pass the hook as a prop or mock the module).

**E2E** (`e2e/`) runs against the **built binary only**, started by the `e2e` task on port `8080`:

- `embedded-frontend.spec.ts` — visits `/`, asserts `#root` has rendered React output and that `/assets/*.js` returns 200 (proves the embed actually includes assets, not just index).
- `health-flow.spec.ts` — visits `/`, waits for "healthy" text, asserts it appears. This is the walking-skeleton's golden path: frontend build → embed → served → browser → fetch → backend → response → DOM update.

## 8. Acceptance criteria (from PROMPT.md + this spec)

- [ ] `task dev` starts a working dev environment (hot-reload frontend, backend running).
- [ ] `task build` produces `bin/flytrap` as a dependency-free single binary.
- [ ] Running `bin/flytrap` and visiting `http://localhost:8080` shows the hello-world UI with theme switcher and "healthy" status.
- [ ] `task lint` passes (`golangci-lint`, ESLint, `tsc --noEmit`, `lizard --CCN 20 -w`).
- [ ] `task test` passes (Go unit + vitest).
- [ ] `task e2e` passes (both Playwright tests green against the built binary).
- [ ] `task ci` runs all of the above.
- [ ] All agents used context7 for library-touching code.

## 9. Agent orchestration plan

**Phase 1 — parallel scaffolding** (no shared files; run concurrently):

- **Backend Dev agent** — scaffolds `backend/` tree, `go.mod`, handlers, embed setup (with a placeholder `dist/.gitkeep`), `.golangci.yml`. Writes Go unit tests. Uses context7 for Go 1.26 `embed` + `net/http` idioms.
- **Frontend Dev agent** — scaffolds `frontend/` tree (Vite 8, React 19, TS, Tailwind v4, daisyUI 5, theme-switcher integration). Writes vitest tests. Uses context7 for each of Vite 8, Tailwind v4, daisyUI 5, React 19.

**Phase 2 — integration** (main thread, sequential):

- Wire embed: `build:frontend` copy step, verify `go build` succeeds and the resulting binary serves the UI.
- Wire health API call end-to-end in a running binary.
- Write `Taskfile.yml`, `docker-compose.yaml`, `.gitignore`, root `README.md` updates.

**Phase 3 — QA agent** — scaffolds `e2e/`, writes the two Playwright tests, verifies they pass against the built binary via the `e2e` task.

**Phase 4 — Reviewer agent** — runs `task ci` end-to-end, audits the tree against §8 acceptance criteria and this spec, produces a gap report. Fixes are done on the main thread before declaring the walking skeleton complete.

Each phase boundary is a checkpoint where work is verified before the next phase starts.

## 10. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Tailwind v4 / daisyUI 5 / Vite 8 syntax drift | Mandatory context7 lookup per agent before writing config |
| `//go:embed dist` fails before first frontend build | Commit a `.gitkeep` under `backend/internal/app/dist/`; embed directive is tolerant of an empty dir; app code asserts `index.html` exists at startup in production mode |
| Port collisions (5173, 8080) | Make `PORT` configurable; document defaults in README |
| Flaky e2e due to race between binary start and test run | `e2e` task does an HTTP readiness probe against `/api/health` before running Playwright |
| Cyclomatic complexity gate false-positives on generated files | Configure `lizard` to exclude `dist/`, `node_modules/`, `backend/internal/app/dist/` |

## 11. Non-goals (explicit YAGNI list)

- No structured logging library yet (`log/slog` is fine when introduced later, not now).
- No graceful shutdown beyond default `http.Server` behavior.
- No config file; env vars are sufficient at this stage.
- No CORS middleware; dev uses Vite proxy, prod uses same-origin.
- No database, no migrations, no pub/sub adapters, no Watermill router — explicitly forbidden by PROMPT.md.
