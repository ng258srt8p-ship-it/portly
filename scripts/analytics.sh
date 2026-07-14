#!/usr/bin/env bash
# ===========================================================================
# TripTide NIM Analytics CLI — Easy Analytical Data from the Terminal
# ===========================================================================
# Usage:
#   ./scripts/analytics.sh market         — Market summary report
#   ./scripts/analytics.sh deal <id>      — Analyze a specific sailing
#   ./scripts/analytics.sh forecast <id>  — Price forecast for a sailing
#   ./scripts/analytics.sh all            — Batch analyze every sailing
#   ./scripts/analytics.sh api <path>     — Hit any analytics API endpoint
# ===========================================================================
set -euo pipefail

API_BASE="http://localhost:3001"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
KEYS_FILE="$PROJECT_DIR/keys"

# Check server is running
if ! curl -sf "$API_BASE/api/health" > /dev/null 2>&1; then
  echo "❌ TripTide API server is not running at $API_BASE"
  echo "   Start it with: cd server && npm run dev"
  exit 1
fi

# Check keys file exists
if [ ! -f "$KEYS_FILE" ]; then
  echo "⚠️  Keys file not found at $KEYS_FILE"
  echo "   Analytics will still try to run but may fail without NIM API keys."
fi

case "${1:-help}" in
  market)
    echo "📊 Generating market summary..."
    curl -s "$API_BASE/api/analytics/market-summary" | python3 -m json.tool 2>/dev/null || curl -s "$API_BASE/api/analytics/market-summary"
    ;;

  deal)
    ID="${2:-}"
    if [ -z "$ID" ]; then
      echo "Usage: $0 deal <sailing-id>"
      echo "Example: $0 deal 1"
      exit 1
    fi
    echo "🔍 Analyzing sailing $ID..."
    curl -s "$API_BASE/api/analytics/deal-analysis/$ID" | python3 -m json.tool 2>/dev/null || curl -s "$API_BASE/api/analytics/deal-analysis/$ID"
    ;;

  forecast)
    ID="${2:-}"
    if [ -z "$ID" ]; then
      echo "Usage: $0 forecast <sailing-id>"
      echo "Example: $0 forecast 1"
      exit 1
    fi
    echo "📈 Generating price forecast for sailing $ID..."
    curl -s "$API_BASE/api/analytics/price-forecast/$ID" | python3 -m json.tool 2>/dev/null || curl -s "$API_BASE/api/analytics/price-forecast/$ID"
    ;;

  all)
    echo "📋 Batch analyzing all sailings..."
    echo "   This may take a minute (rate-limited to 5 sailings)."
    curl -s -X POST "$API_BASE/api/analytics/analyze-all" | python3 -m json.tool 2>/dev/null || curl -s -X POST "$API_BASE/api/analytics/analyze-all"
    ;;

  api)
    PATH="${2:-}"
    if [ -z "$PATH" ]; then
      echo "Usage: $0 api <path>"
      echo "Example: $0 api /market-summary"
      exit 1
    fi
    echo "📡 Fetching $API_BASE/api/analytics$PATH..."
    curl -s "$API_BASE/api/analytics$PATH" | python3 -m json.tool 2>/dev/null || curl -s "$API_BASE/api/analytics$PATH"
    ;;

  health|status)
    echo "🏥 Checking analytics service health..."
    RESULT=$(curl -s "$API_BASE/api/health")
    echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
    ;;

  *)
    echo "TripTide NIM Analytics CLI"
    echo ""
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  market              Generate AI market summary of all sailings"
    echo "  deal <id>           AI analysis of a specific sailing's deal quality"
    echo "  forecast <id>       AI price forecast for a specific sailing"
    echo "  all                 Batch analyze ALL sailings (rate-limited)"
    echo "  api <path>          Direct API call (/api/analytics/<path>)"
    echo "  health              Check service health"
    echo ""
    echo "Examples:"
    echo "  $0 market"
    echo "  $0 deal 1"
    echo "  $0 forecast 3"
    echo "  $0 all"
    echo "  $0 api /market-summary"
    echo "  $0 health"
    echo ""
    echo "Analytics API: $API_BASE/api/analytics/"
    echo "NIM Keys: $KEYS_FILE ($([ -f "$KEYS_FILE" ] && echo '✓ present' || echo '✗ missing'))"
    ;;
esac
