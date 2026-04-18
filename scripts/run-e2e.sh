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
