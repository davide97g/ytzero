#!/usr/bin/env bash

set -uo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Every check below is independent: each test run builds its own temporary
# database root, and nothing binds a port. So they run at once and their output
# is replayed in declaration order, which keeps a parallel run as readable as
# the old sequential one.
LABELS=(
  "Large files"
  "Database migrations"
  "App typecheck"
  "UI typecheck"
  "App tests"
  "App tests in random order"
  "UI tests"
  "UI build"
)
DIRECTORIES=("." "." "app" "ui" "app" "app" "ui" "ui")
COMMANDS=(
  "bun scripts/check-large-files.ts"
  "bun scripts/check-database-migrations.ts"
  "bun run typecheck"
  "bun run typecheck"
  "bun run test"
  "bun run test:random"
  "bun run test"
  "bun run build:prepared"
)

LOG_DIR="$(mktemp -d)"
trap 'rm -rf "${LOG_DIR}"' EXIT

echo "Running pre-commit checks in parallel..."

PIDS=()
for index in "${!LABELS[@]}"; do
  (
    cd "${REPOSITORY_ROOT}/${DIRECTORIES[${index}]}"
    eval "${COMMANDS[${index}]}"
  ) >"${LOG_DIR}/${index}.log" 2>&1 &
  PIDS+=("$!")
done

FAILURES=()
for index in "${!LABELS[@]}"; do
  status=0
  wait "${PIDS[${index}]}" || status=$?

  echo
  if [ "${status}" -eq 0 ]; then
    echo "==> ${LABELS[${index}]} (ok)"
  else
    echo "==> ${LABELS[${index}]} (failed with ${status})"
    FAILURES+=("${LABELS[${index}]}")
  fi
  cat "${LOG_DIR}/${index}.log"
done

echo
if [ "${#FAILURES[@]}" -gt 0 ]; then
  echo "Pre-commit checks failed: ${FAILURES[*]}"
  exit 1
fi

echo "All pre-commit checks passed."
