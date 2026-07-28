#!/usr/bin/env bash
# File: run-hermes-loop.sh
# 30-Minute Infinite Execution Runner for Hermes Agent targeting live Cloudflare Pages.
#
# Usage:
#   ./run-hermes-loop.sh                       # run forever, one cycle every 30 min
#   SINGLE_CYCLE=1 ./run-hermes-loop.sh        # run exactly one cycle and exit
#   INTERVAL_SECONDS=60 ./run-hermes-loop.sh   # custom interval
#   DRY_RUN=1 ./run-hermes-loop.sh             # print the would-be command, don't run
#
# Each cycle invokes Hermes Agent with the prompt in HERMES_LOOP_PROMPT.md
# (auto-prefixed with a Cycle header so the log stays append-only).
# Cycle output is mirrored to hermes-cycles.log (in addition to stdout).
#
# Lock file:    .hermes-loop.lock/  (mkdir-based, portable to macOS + Linux)
# Cycle log:    hermes-cycles.log
# Cycle records: HERMES_AUTONOMOUS_LOG.md (committed by the agent each cycle)

set -euo pipefail

INTERVAL_SECONDS="${INTERVAL_SECONDS:-1800}" # 30 minutes
CYCLE=1
PROMPT_FILE="${PROMPT_FILE:-HERMES_LOOP_PROMPT.md}"
LOG_FILE="HERMES_AUTONOMOUS_LOG.md"
LIVE_LOG="hermes-cycles.log"
LOCK_FILE=".hermes-loop.lock"
LIVE_URL="https://portly-1i0.pages.dev/"

# Resolve project root so the script works from any CWD.
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# ---- Pre-flight: required files -------------------------------------------
for f in "$PROMPT_FILE" "$LOG_FILE" "playwright.config.ts"; do
    if [ ! -f "$f" ]; then
        echo "❌ Error: $f not found in $PROJECT_ROOT"
        exit 1
    fi
done

# ---- Build the effective prompt (Cycle header + standing instructions) ----
build_prompt() {
    local next_cycle="$1"
    local stamp
    stamp="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    cat <<EOF
## Cycle ${next_cycle} — ${stamp} UTC

This is Hermes autonomous cycle **#${next_cycle}** for the Portly cruise platform.

Treat the body of HERMES_LOOP_PROMPT.md as your standing instructions for this
cycle. Before you finish:

1. Implement exactly **ONE** improvement.
2. Update \`HERMES_AUTONOMOUS_LOG.md\` with a \`### Cycle #${next_cycle}\` section
   (append below the existing divider — do NOT overwrite prior cycles).
3. Commit both the code change AND the log update together, then push:
   \`\`\`bash
   git add .
   git commit -m "feat(hermes-loop): [Cycle #${next_cycle}] [Brief Description]"
   git push origin main
   \`\`\`
4. Wait ~60s for Cloudflare Pages, then run Playwright against the live site:
   \`\`\`bash
   BASE_URL=https://portly-1i0.pages.dev/ npx playwright test
   \`\`\`
5. Mark the cycle section ✅ Complete (or ⚠️/❌ with reasons). If tests failed,
   fix → commit → push → re-verify before logging Complete.

---

EOF
    cat "$PROMPT_FILE"
}

# ---- Dry-run short-circuit (before lock, so it always works) --------------
if [ "${DRY_RUN:-0}" = "1" ]; then
    echo "🧪 DRY_RUN=1 — printing the effective prompt and exiting."
    PROMPT="$(build_prompt 0)"
    echo "   hermes chat -q \"<$(printf '%s' "$PROMPT" | wc -c | tr -d ' ') bytes>\" --max-turns 60"
    echo ""
    echo "---- Effective prompt (first 40 lines) ----"
    printf '%s\n' "$PROMPT" | head -40
    echo "---- /first 40 lines ----"
    exit 0
fi

# ---- Single-instance guard (portable mkdir-based atomic lock) -------------
# mkdir is atomic across POSIX systems. Stale locks are detected via the PID
# file — if the holder PID is no longer running, we steal the lock.
acquire_lock() {
    if mkdir "$LOCK_FILE" 2>/dev/null; then
        echo $$ > "$LOCK_FILE/hermes.pid"
        return 0
    fi
    # Lock exists. Check whether the holder is still alive.
    if [ -f "$LOCK_FILE/hermes.pid" ]; then
        existing_pid="$(cat "$LOCK_FILE/hermes.pid" 2>/dev/null || echo "")"
        if [ -n "$existing_pid" ] && ! kill -0 "$existing_pid" 2>/dev/null; then
            echo "⚠️  Stale lock (PID $existing_pid is dead). Stealing it."
            rm -rf "$LOCK_FILE"
            mkdir "$LOCK_FILE"
            echo $$ > "$LOCK_FILE/hermes.pid"
            return 0
        fi
        echo "❌ Another Hermes loop is already running."
        echo "   Lock:    $LOCK_FILE"
        echo "   Holder:  PID $existing_pid (alive)"
        echo "   If you're sure it's stale: rm -rf $LOCK_FILE && re-run."
    else
        echo "❌ Lock directory $LOCK_FILE exists but is unreadable. Remove it manually."
    fi
    return 1
}

release_lock() {
    rm -rf "$LOCK_FILE" 2>/dev/null || true
}

if ! acquire_lock; then
    exit 1
fi

# ---- Trap: release lock + log clean exit ----------------------------------
cleanup() {
    local rc=$?
    release_lock
    if [ "$rc" -ne 0 ]; then
        echo "🛑 Hermes loop exited (code $rc) at $(date -u +%Y-%m-%dT%H:%M:%SZ) after cycle $((CYCLE - 1))." \
            | tee -a "$LIVE_LOG" >/dev/null || true
    fi
    exit "$rc"
}
trap cleanup INT TERM EXIT

# ---- Banner ---------------------------------------------------------------
echo "🚀 Starting Hermes Autonomous Improvement Loop..."
echo "🎯 Target URL: $LIVE_URL"
echo "⏱️  Cadence: Every $INTERVAL_SECONDS seconds"
echo "📄 Prompt:    $PROJECT_ROOT/$PROMPT_FILE"
echo "📝 Cycle log: $PROJECT_ROOT/$LOG_FILE"
echo "📺 Stream:    $PROJECT_ROOT/$LIVE_LOG"
echo ""

# ---- Cycle runner ---------------------------------------------------------
run_cycle() {
    local cycle_num="$1"
    local stamp
    stamp="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    {
        echo ""
        echo "=================================================="
        echo "🤖 HERMES CYCLE #${cycle_num} STARTED — ${stamp}"
        echo "=================================================="
    } >> "$LIVE_LOG"

    local prompt
    prompt="$(build_prompt "$cycle_num")"
    local rc=0
    # Hermes CLI single-query (non-interactive) mode: `hermes chat -q "..."`.
    # --max-turns caps the agent's tool budget so a stuck cycle can't loop forever.
    # NOTE: do NOT pass --yolo — the agent still needs human-equivalent judgment
    # before destructive git operations. Destructive actions are gated by the
    # cycle prompt itself.
    if command -v hermes >/dev/null 2>&1; then
        hermes chat -q "$prompt" --max-turns 60 2>&1 | tee -a "$LIVE_LOG" || rc=$?
    else
        echo "❌ 'hermes' not found in PATH. Install Hermes Agent first (brew install hermes-agent or pip install hermes-agent)."
        return 127
    fi
    {
        echo ""
        echo "✅ Hermes Cycle #${cycle_num} finished (rc=$rc) at $(date -u +'%Y-%m-%dT%H:%M:%SZ')."
        if [ "${SINGLE_CYCLE:-0}" = "1" ]; then
            echo "🏁 SINGLE_CYCLE=1 — exiting after cycle #${cycle_num}."
        else
            echo "⏳ Sleeping ${INTERVAL_SECONDS}s before triggering Cycle #$((cycle_num + 1))..."
        fi
    } >> "$LIVE_LOG"
    return "$rc"
}

# ---- Main loop ------------------------------------------------------------
# Disable ERR trap interference so a single bad cycle doesn't kill the loop.
set +e
while true; do
    run_cycle "$CYCLE"
    cycle_rc=$?
    CYCLE=$((CYCLE + 1))
    if [ "${SINGLE_CYCLE:-0}" = "1" ]; then
        exit 0
    fi
    if [ "$cycle_rc" -ne 0 ]; then
        echo "⚠️  Cycle exited with code $cycle_rc. Continuing to next iteration."
    fi
    sleep "$INTERVAL_SECONDS"
done
