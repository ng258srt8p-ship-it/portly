#!/usr/bin/env bash
# File: run-hermes-loop.sh
# 30-Minute Infinite Execution Runner for Hermes Agent targeting live Cloudflare Pages.
#
# Usage:
#   chmod +x run-hermes-loop.sh
#   ./run-hermes-loop.sh                # run forever, one cycle every 30 min
#   INTERVAL_SECONDS=60 ./run-hermes-loop.sh   # custom interval
#   DRY_RUN=1 ./run-hermes-loop.sh      # print the would-be command, don't run
#
# Each cycle invokes Hermes Agent with the prompt in HERMES_LOOP_PROMPT.md.
# Cycle output is appended to hermes-cycles.log (in addition to stdout).

set -euo pipefail

INTERVAL_SECONDS="${INTERVAL_SECONDS:-1800}" # 30 minutes
CYCLE=1
PROMPT_FILE="HERMES_LOOP_PROMPT.md"
LIVE_URL="https://portly-1i0.pages.dev/"
LOG_FILE="hermes-cycles.log"
LOCK_FILE=".hermes-loop.lock"

# Resolve project root so the script works from any CWD.
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

if [ ! -f "$PROMPT_FILE" ]; then
    echo "❌ Error: $PROMPT_FILE not found in $PROJECT_ROOT"
    exit 1
fi

# Single-instance guard. Remove .hermes-loop.lock manually if Hermes crashed
# and you want to relaunch.
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "❌ Another Hermes loop is already running (lock held: $LOCK_FILE)"
    echo "   If you're sure it's stale, delete it and re-run."
    exit 1
fi

echo "🚀 Starting Hermes Autonomous Improvement Loop..."
echo "🎯 Target URL: $LIVE_URL"
echo "⏱️  Cadence: Every $INTERVAL_SECONDS seconds"
echo "📄 Prompt:    $PROJECT_ROOT/$PROMPT_FILE"
echo "📝 Log:       $PROJECT_ROOT/$LOG_FILE"
echo ""

if [ "${DRY_RUN:-0}" = "1" ]; then
    echo "🧪 DRY_RUN=1 — printing the command that would run, then exiting."
    echo "   hermes run --prompt \"\$(cat $PROMPT_FILE)\""
    exit 0
fi

run_cycle() {
    local cycle_num="$1"
    local stamp
    stamp="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    {
        echo ""
        echo "=================================================="
        echo "🤖 HERMES CYCLE #${cycle_num} STARTED — ${stamp}"
        echo "=================================================="
    } | tee -a "$LOG_FILE"

    # Pick whichever Hermes invocation is available.
    local prompt
    prompt="$(cat "$PROMPT_FILE")"
    if command -v hermes >/dev/null 2>&1; then
        hermes run --prompt "$prompt" 2>&1 | tee -a "$LOG_FILE"
    elif command -v npx >/dev/null 2>&1; then
        npx hermes-agent run --prompt "$prompt" 2>&1 | tee -a "$LOG_FILE"
    else
        echo "❌ Neither 'hermes' nor 'npx' found in PATH. Install Hermes Agent first."
        return 127
    fi

    {
        echo ""
        echo "✅ Hermes Cycle #${cycle_num} finished execution at $(date -u +'%Y-%m-%dT%H:%M:%SZ')."
        echo "⏳ Sleeping ${INTERVAL_SECONDS}s before triggering Cycle #$((cycle_num + 1))..."
    } | tee -a "$LOG_FILE"
}

# Trap SIGINT/SIGTERM so Ctrl-C writes a clean exit line to the log.
trap 'echo ""; echo "🛑 Hermes loop interrupted at $(date -u +%Y-%m-%dT%H:%M:%SZ) after cycle $((CYCLE - 1))." | tee -a "$LOG_FILE"; exit 130' INT TERM

while true; do
    run_cycle "$CYCLE"
    CYCLE=$((CYCLE + 1))
    sleep "$INTERVAL_SECONDS"
done
