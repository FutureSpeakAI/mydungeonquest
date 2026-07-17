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
  # (54B §5) ONE out-of-band probe of the DM stream endpoint per iteration,
  # fired while the suite (and its harvest) is running — transport truth
  # measured beside the app, never through it. Evidence only: the probe
  # never fails a run; G5's split assertion does the deciding.
  (
    for _ in $(seq 1 90); do
      curl -sf -o /dev/null --max-time 2 http://localhost:5199/ && break
      sleep 2
    done
    sleep 20
    node tests/e2e/g05-probe.mjs > "test-results/g05-probe-iter${ITER}.json" 2>>"$LOG" || true
    echo "[proving] g05 probe iter=${ITER}: $(head -c 400 "test-results/g05-probe-iter${ITER}.json" 2>/dev/null)" >> "$LOG"
  ) &
  PROBE_PID=$!
  ./node_modules/.bin/playwright test > "$LOG" 2>&1
  EXIT=$?
  wait "$PROBE_PID" 2>/dev/null
  # THE VERDICT (Task 54 §6.2) — parse report.json into an auditable
  # green/red verdict (zero skips, every project sat, named courts
  # EXECUTED) before the exit flag lands, so pollers read both together.
  node tests/e2e/verdict.mjs "$ITER" "$EXIT" >> "$LOG" 2>&1 || true
  echo "$EXIT" > "test-results/run-iter${ITER}.exit"
  echo "[proving] iteration ${ITER} complete exit=${EXIT}"
else
  echo "[proving] no run requested; standing by."
fi
sleep infinity
