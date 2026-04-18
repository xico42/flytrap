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
