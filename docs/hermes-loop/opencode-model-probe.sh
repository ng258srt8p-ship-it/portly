#!/usr/bin/env bash
# File: scripts/opencode-model-probe.sh
# Discovers which OpenCode Zen free models are currently alive and supporting
# chat completions, with NO API key required. Used by portly-cycle.sh to pick
# a model at runtime — insulated from upstream model renames/EOLs.
#
# Output:
#   Default mode: echo's the first working model ID (one line) — callers capture via $(...).
#   --list-all:   echo's ALL working model IDs (one per line), for CI discovery.
#   If nothing works, exits non-zero with a stderr message.
#
# Strategy:
#   1. Query the OpenCode Zen /v1/models endpoint (if it works, use it as the
#      candidate list).
#   2. If the models endpoint returns 404 (as it does at time of writing),
#      fall back to a curated candidate list maintained below.
#   3. For each candidate, POST a tiny chat/completions and check for a valid
#      response. First one that returns a 200 with JSON 'choices' wins.
#   4. 'big-pickle' and 'deepseek-v4-flash-free' are preferred for
#      tool-calling/code-work cycles because they have larger context budgets.
#
# Adding/removing models when the upstream catalog changes:
#   Just edit PREFERRED_MODELS below. No other changes needed.

set -euo pipefail

OPENCODE_ZEN_BASE="${OPENCODE_ZEN_BASE:-http://127.0.0.1:3459}"
# Timeout per probe — if a model takes longer than this to answer, skip it.
PROBE_TIMEOUT="${PROBE_TIMEOUT:-10}"

# Parse flags
LIST_ALL=false
if [[ "${1:-}" == "--list-all" ]]; then
  LIST_ALL=true
fi

# Candidate free models on OpenCode Zen, ordered by preference for this workload
# (code-agent + tool-calling needs large context + JSON output).
# Update this list when OpenCode Zen publishes new free models or retires old ones.
PREFERRED_MODELS=(
  "big-pickle"               # general-purpose, large context, consistently available
  "deepseek-v4-flash-free"   # code-specialised, large context — best for agent cycles
  "mimo-v2.5-free"           # fast fallback
  "nemotron-3-ultra-free"    # NVIDIA fallback
  "north-mini-code-free"     # tiny code model, last-resort
)

# Optionally extend the candidate list from the live /v1/models endpoint.
# This auto-adapts to catalog changes; if the endpoint 404s, we skip silently.
discover_live_models() {
    local fetched
    if fetched=$(curl -s --max-time 5 "${OPENCODE_ZEN_BASE}/v1/models" 2>/dev/null); then
        # Extract id fields containing "-free" (only free models qualify).
        printf '%s\n' "$fetched" \
            | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
for m in d.get('data', []):
    mid = m.get('id', '')
    if '-free' in mid or 'free' in mid.lower():
        print(mid)
" 2>/dev/null || true
    fi
}

probe_one() {
    local model="$1"
    # Send a 1-token chat completion and check for a 'choices' array in the JSON.
    local resp http_body
    resp=$(curl -sS --max-time "$PROBE_TIMEOUT" -w '\n%{http_code}' \
        -X POST "${OPENCODE_ZEN_BASE}/v1/chat/completions" \
        -H "Content-Type: application/json" \
        -d "{\"model\":\"${model}\",\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}],\"max_tokens\":3}" \
        2>/dev/null) || return 1
    http_body="${resp%$'\n'*}"
    # Validate JSON has a choices array (success shape) vs. error shape.
    printf '%s' "$http_body" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(1)
if 'choices' in d and isinstance(d['choices'], list) and d['choices']:
    sys.exit(0)
sys.exit(1)
" 2>/dev/null
}

main() {
    # Build candidate list: preferred models first, then any discovered live ones.
    local candidates=()
    candidates+=("${PREFERRED_MODELS[@]}")
    # Append live-discovered models not already in list (deduplicated).
    while IFS= read -r m; do
        [ -z "$m" ] && continue
        local found=0
        for c in "${candidates[@]}"; do
            if [ "$c" = "$m" ]; then found=1; break; fi
        done
        [ "$found" -eq 0 ] && candidates+=("$m")
    done < <(discover_live_models)

    # Probe each in order.
    local working=()
    for model in "${candidates[@]}"; do
        if probe_one "$model" >/dev/null 2>&1; then
            working+=("$model")
            if [ "$LIST_ALL" = false ]; then
                printf '%s\n' "$model"
                exit 0
            fi
        fi
    done

    if [ "$LIST_ALL" = true ]; then
        if [ ${#working[@]} -gt 0 ]; then
            printf '%s\n' "${working[@]}"
            exit 0
        fi
    fi

    echo "❌ No working OpenCode Zen free model found." >&2
    echo "   Tried: ${candidates[*]}" >&2
    echo "   Endpoint: ${OPENCODE_ZEN_BASE}" >&2
    exit 1
}

main "$@"
