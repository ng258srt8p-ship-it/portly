#!/usr/bin/env bash
# File: scripts/portly-cycle.sh
# Single Portly improvement cycle. Used by the Hermes cron job
# (no_agent=True — the cron scheduler just runs this script and delivers its
# stdout). The script itself drives a full agent cycle via `hermes chat -q`.
#
# Model auto-discovery
# --------------------
# Instead of pinning a model (which dies when OpenCode Zen retires it), this
# wrapper probes for a working free model each cycle via
# opencode-model-probe.sh. If the first probe fails, it walks an ordered
# fallback list. The chosen model is passed to `hermes chat` via the
# `--provider custom:opencode-zen --model <name>` flags.
#
# Artifacts emitted each cycle
# ----------------------------
#   - Code change committed to git (the agent does this inside the chat session)
#   - New `### Cycle #N` section in HERMES_AUTONOMOUS_LOG.md (append-only)
#   - Streaming log appended to hermes-cycles.log
#
# Exit codes
# ----------
#   0  cycle finished (success or partial — check the log)
#   1  no working model found (probe failed for all candidates)
#   2  `hermes` not on PATH
#   3  pre-flight check failed (missing prompt or log file)
#
# Usage
# -----
#   ./scripts/portly-cycle.sh                       # one cycle (for cron)
#   SINGLE_CYCLE=1 ./scripts/portly-cycle.sh        # explicit one-shot
#   OVERRIDE_MODEL=big-pickle ./scripts/portly-cycle.sh   # skip auto-probe

set -euo pipefail

# When this script is invoked by the Hermes cron scheduler (no_agent=True),
# it runs from ~/.hermes/scripts/ — not the project repo. The workdir in the
# cron config is NOT applied to script-only jobs, so we must cd explicitly.
# PORTLY_ROOT can override the default for testing; otherwise use a hard path.
PROJECT_ROOT="${PORTLY_ROOT:-/Users/georgetozer/Development/Portly}"
cd "$PROJECT_ROOT"

PROMPT_FILE="HERMES_LOOP_PROMPT.md"
LOG_FILE="HERMES_AUTONOMOUS_LOG.md"
LIVE_LOG="hermes-cycles.log"
PROBE="$PROJECT_ROOT/scripts/opencode-model-probe.sh"

# ---- Pre-flight ------------------------------------------------------------
[ -f "$PROMPT_FILE" ] || { echo "❌ Missing $PROMPT_FILE" >&2; exit 3; }
[ -f "$LOG_FILE" ]    || { echo "❌ Missing $LOG_FILE" >&2; exit 3; }
[ -x "$PROBE" ]       || { echo "❌ Missing $PROBE" >&2; exit 3; }
command -v hermes >/dev/null 2>&1 || { echo "❌ 'hermes' not on PATH" >&2; exit 2; }

# ---- Pick a model ----------------------------------------------------------
MODEL="${OVERRIDE_MODEL:-}"
if [ -z "$MODEL" ]; then
    echo "🔎 Probing OpenCode Zen for a working free model..." >&2
    if ! MODEL="$("$PROBE" 2>/dev/null)"; then
        echo "❌ No OpenCode Zen free model is responding. Cycle aborts." >&2
        exit 1
    fi
fi
PROVIDER="${PROVIDER:-custom:opencode-zen}"
echo "🤖 Cycle model: $MODEL (via $PROVIDER)" >&2

# ---- Cycle counter (next cycle = last + 1) ---------------------------------
# Read the highest existing "### Cycle #N" header from the log so the new cycle
# number continues the sequence even if some cycles were skipped.
LAST_CYCLE=$(grep -oE 'Cycle #[0-9]+' "$LOG_FILE" \
    | grep -oE '[0-9]+' | sort -n | tail -1 || true)
NEXT_CYCLE=${LAST_CYCLE:-0}
NEXT_CYCLE=$((NEXT_CYCLE + 1))
STAMP=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

# ---- Build the effective prompt (cycle header + standing instructions) -----
build_prompt() {
    local n="$1"
    cat <<EOF
## Cycle ${n} — ${STAMP} UTC

This is Hermes autonomous cycle **#${n}** for the Portly cruise platform.

Treat the body of HERMES_LOOP_PROMPT.md as your standing instructions for this
cycle. Before you finish:

1. Implement exactly **ONE** improvement.
2. Update \`HERMES_AUTONOMOUS_LOG.md\` with a \`### Cycle #${n}\` section
   (append below the existing divider — do NOT overwrite prior cycles).
3. Commit both the code change AND the log update together, then push:
   \`\`\`bash
   git add .
   git commit -m "feat(hermes-loop): [Cycle #${n}] [Brief Description]"
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

PROMPT="$(build_prompt "$NEXT_CYCLE")"

# ---- Log cycle start -------------------------------------------------------
{
    echo ""
    echo "=================================================="
    echo "🤖 PORTLY CYCLE #${NEXT_CYCLE} STARTED — ${STAMP}"
    echo "   Model:    $MODEL"
    echo "   Provider: $PROVIDER"
    echo "=================================================="
} >> "$LIVE_LOG"

# ---- Invoke Hermes non-interactively ---------------------------------------
# --max-turns caps the agent's tool budget so a stuck cycle can't run forever.
# We deliberately do NOT pass --yolo: the cycle prompt itself gates
# destructive git operations, and the human-equivalent judgment helps the
# agent avoid bad commits/pushes.
rc=0
hermes chat -q "$PROMPT" \
    --provider "$PROVIDER" \
    --model "$MODEL" \
    --max-turns 60 \
    2>&1 | tee -a "$LIVE_LOG" || rc=$?

# ---- Log cycle end ---------------------------------------------------------
END_STAMP=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
{
    echo ""
    echo "✅ PORTLY CYCLE #${NEXT_CYCLE} finished (rc=$rc) at ${END_STAMP}."
} >> "$LIVE_LOG"

exit "$rc"
