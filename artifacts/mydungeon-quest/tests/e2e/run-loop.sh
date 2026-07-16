#!/usr/bin/env bash
# THE PROVING LOOP runner (Task 52). Runs as a supervised workflow because
# detached shells get reaped mid-suite. One flag, one run: the workflow only
# executes the suite when test-results/RUN_REQUESTED names an iteration, and
# consumes the flag first — so workflow reboots (package installs, restarts)
# can never silently re-run a paint-heavy suite on their own.
set -uo pipefail
cd "$(dirname "$0")/../.."

FLAG=test-results/RUN_REQUESTED
if [ -f "$FLAG" ]; then
  ITER=$(cat "$FLAG")
  rm -f "$FLAG"
  # Free the suite's own ports if a dead run left them held. These are the
  # proving ports (5199/5198), never the live preview's.
  fuser -k 5199/tcp 2>/dev/null; fuser -k 5198/tcp 2>/dev/null; sleep 1
  LOG="test-results/run-iter${ITER}.log"
  echo "[proving] iteration ${ITER} begins"
  ./node_modules/.bin/playwright test > "$LOG" 2>&1
  EXIT=$?
  echo "$EXIT" > "test-results/run-iter${ITER}.exit"
  echo "[proving] iteration ${ITER} complete exit=${EXIT}"
else
  echo "[proving] no run requested; standing by."
fi
sleep infinity
