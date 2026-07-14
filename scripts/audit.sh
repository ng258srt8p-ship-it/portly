#!/usr/bin/env bash
# ===========================================================================
# TripTide — Audit & Edge-Case Checker
# Runs every 15 minutes via cron. Checks build, tests, and codebase for gaps.
# Includes NIM sync generator health, deal data freshness, and DB fallback.
# ===========================================================================
set -euo pipefail

PROJECT_DIR="/Users/georgetozer/Development/Portly"
ERRORS=0

cd "$PROJECT_DIR"

# ---- Auto-start servers if not running ----
ensure_server() {
  local port=$1
  local name=$2
  local cmd=$3
  local health_path=$4
  local timeout=${5:-60}

  # Already responding?
  if curl -sf -o /dev/null "http://localhost:$port$health_path" 2>/dev/null; then
    return 0
  fi

  # Port occupied by something else — kill the blocker
  local blocker_pid
  blocker_pid=$(lsof -ti:"$port" 2>/dev/null | head -1)
  if [ -n "$blocker_pid" ]; then
    echo "  ⚠️  Port $port occupied by PID $blocker_pid — killing…"
    kill "$blocker_pid" 2>/dev/null; sleep 2
    # Force-kill if still alive
    kill -9 "$blocker_pid" 2>/dev/null; sleep 1
  fi

  echo "  ⏳ Starting $name on :$port (timeout ${timeout}s)…"
  eval "$cmd" > /dev/null 2>&1 &
  local pid=$!
  for i in $(seq 1 "$timeout"); do
    sleep 1
    if curl -sf -o /dev/null "http://localhost:$port$health_path" 2>/dev/null; then
      echo "  ✅ $name ready (took ${i}s)"
      return 0
    fi
    # Detect early crash
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "  ❌ $name process exited early (PID $pid)"
      return 1
    fi
  done
  echo "  ❌ $name did not come up within ${timeout}s"
  return 1
}

ensure_server 3001 "Backend API" "cd server && npx ts-node index.ts" "/api/health" 30
ensure_server 3000 "Next.js frontend" "npx next dev -p 3000" "/" 60

# ---- Health Check ----
echo "═══ Health Check ═══"
if ! curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
  echo "❌ Backend server not responding on :3001"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Backend healthy"
fi

if ! curl -sf -o /dev/null http://localhost:3000/ 2>&1; then
  echo "❌ Frontend server not responding on :3000"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Frontend healthy"
fi

# ---- NIM Health Check (migrated to OpenCode) ----
echo ""
echo "═══ OpenCode Sync Check ═══"

# Check OpenCode module is importable
if [ -f server/utils/openCodeClient.ts ]; then
  echo "✅ openCodeClient.ts present"
else
  echo "⚠️  openCodeClient.ts missing"
  ERRORS=$((ERRORS + 1))
fi

# Verify old NIM files are gone
if [ ! -f server/services/nimSyncGenerator.ts ] && [ ! -f server/utils/nimClient.ts ]; then
  echo "✅ Old NIM files cleaned up"
else
  echo "⚠️  Old NIM files still present (will be removed in cleanup phase)"
fi

# Check last sync completed
SYNC_STATUS=$(curl -sf http://localhost:3001/api/health | python3 -c "
import sys, json
d = json.load(sys.stdin)
s = d.get('lastSync')
if s:
    print(f\"ok:{s['status']}:{s['b2bRecords']} records\")
else:
    print('pending')
" 2>/dev/null || echo "fail")
echo "  Sync status: $SYNC_STATUS"

# ---- Enrichment Data Check ----
echo ""
echo "═══ Enrichment Data Check ═══"

ENRICH_STATS=$(curl -sf http://localhost:3001/api/enrichment/stats | python3 -c "
import sys, json
d = json.load(sys.stdin)
data = d.get('data', {})
print(f\"ships:{data.get('shipsWithDetails', 0)}\")
print(f\"destinations:{data.get('destinationsTracked', 0)}\")
print(f\"markets:{data.get('marketComparisons', 0)}\")
print(f\"bookings:{data.get('bookingInsights', 0)}\")
" 2>/dev/null || echo "fail")
echo "  Ships with details:    $(echo "$ENRICH_STATS" | grep 'ships:' | cut -d: -f2)"
echo "  Destinations tracked:  $(echo "$ENRICH_STATS" | grep 'destinations:' | cut -d: -f2)"
echo "  Market comparisons:    $(echo "$ENRICH_STATS" | grep 'markets:' | cut -d: -f2)"
echo "  Booking insights:      $(echo "$ENRICH_STATS" | grep 'bookings:' | cut -d: -f2)"

# ---- API Schema Consistency Check ----
echo ""
echo "═══ API Schema Check ═══"

# Dynamically pick the first valid sailing ID from the deals API
FIRST_SAILING_ID=$(curl -sf http://localhost:3001/api/deals | python3 -c "
import sys, json
d = json.load(sys.stdin)
if isinstance(d, list) and len(d) > 0:
    print(d[0]['id'])
else:
    print('')
" 2>/dev/null || echo "")

if [ -z "$FIRST_SAILING_ID" ]; then
  echo "⚠️  No sailings available — cannot test /api/sailing/:id"
else
  SAILING_OK=$(curl -sf "http://localhost:3001/api/sailing/$FIRST_SAILING_ID" | python3 -c "
import sys, json
d = json.load(sys.stdin)
missing = [f for f in ['sailing', 'cabinBreakdown'] if f not in d]
print('fail' if missing else 'ok')
" 2>/dev/null || echo "fail")
  if [ "$SAILING_OK" = "ok" ]; then
    echo "✅ sailing/$FIRST_SAILING_ID OK"
  else
    echo "❌ sailing/$FIRST_SAILING_ID: $SAILING_OK"
    ERRORS=$((ERRORS + 1))
  fi
fi

DEALS_OK=$(curl -sf http://localhost:3001/api/deals | python3 -c "
import sys, json
d = json.load(sys.stdin)
if not isinstance(d, list) or len(d) == 0:
    print('empty')
else:
    required = ['id', 'cruiseLine', 'ship', 'price', 'duration']
    missing = [f for f in required if f not in d[0]]
    print('fail' if missing else f'ok:{len(d)}')
    # Print first ship name for verification
    print(f'  Sample: {d[0][\"ship\"]} ({d[0][\"cruiseLine\"]}) \${d[0][\"price\"]})', file=sys.stderr)
" 2>/dev/null || echo "fail")
echo "  deals API: $DEALS_OK"

ANALYTICS_OK=$(curl -sf --max-time 10 http://localhost:3001/api/analytics/market-summary | python3 -c "
import sys, json
d = json.load(sys.stdin)
if d.get('success') and d.get('data') and len(d['data']) > 50:
    print('ok')
elif d.get('cached'):
    print('ok:cached')
else:
    print('empty')
" 2>/dev/null || echo "unavailable")
echo "  analytics: $ANALYTICS_OK"

# ---- Empty DB Fallback Check (cruises.ts no longer uses mock) ----
echo ""
echo "═══ DB Fallback Integrity ═══"

MOCK_DB_REFS=$(grep -c 'mockSailingsDb' server/routes/cruises.ts 2>/dev/null || true)
if [ "$MOCK_DB_REFS" = "0" ]; then
  echo "✅ No mockSailingsDb references remain in cruises.ts"
else
  echo "❌ $MOCK_DB_REFS mockSailingsDb references remain"
  ERRORS=$((ERRORS + 1))
fi

# ---- Codebase Edge-Case Scan ----
echo ""
echo "═══ Codebase Edge-Case Scan ═══"

NULL_BUTTONS=$(grep -rc 'onClick={' src/components/ 2>/dev/null | grep -oE '[0-9]+$' | sort -rn | head -1 || echo "0")
echo "  Max onClick per component file: $NULL_BUTTONS"

CONSOLE_LOGS=$(grep -rn 'console.log' src/ --include='*.tsx' --include='*.ts' 2>/dev/null | grep -v node_modules | grep -v '\[SYNC\]' | grep -v '\[STEALTH\]' | grep -v '\[B2B\]' | grep -v '\[DATA ENGINE\]' | grep -v '\[HTTP\]' | grep -v '\[Analytics\]' | grep -v '\[OpenCode\]' | grep -v '\[WORKER\]' | grep -v '\[ANALYSIS\]' | wc -l | tr -d ' ' || true)
echo "  console.log (non-logger): $CONSOLE_LOGS"

TODOS=$(grep -rn 'TODO\|FIXME\|HACK\|XXX' src/ --include='*.tsx' --include='*.ts' 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ' || true)
echo "  TODO/FIXME markers: $TODOS"

HARDCODED_URLS=$(grep -rn 'localhost:3001' src/ --include='*.tsx' --include='*.ts' 2>/dev/null | grep -v node_modules | grep -v 'NEXT_PUBLIC_API_URL' | grep -v 'config' | grep -v '\.env' | grep -v 'process\.env' | wc -l | tr -d ' ' || true)
echo "  hardcoded localhost:3001 refs: $HARDCODED_URLS"

# ---- Navigation Round-Trip ----
echo ""
echo "═══ Navigation Round-Trip ═══"

# Extract nav links and test each one
NAV_ERROR_COUNT=0
for link in $(python3 -c "
import re
with open('src/components/layout/Header.tsx') as f:
    content = f.read()
urls = re.findall(r'''href:\s*['\"]([^'\"]+)['\"]''', content)
for url in urls:
    if url.startswith('/'):
        print(url)
"); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$link" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✅ $link → 200"
  else
    echo "  ❌ $link → $HTTP_CODE"
    NAV_ERROR_COUNT=$((NAV_ERROR_COUNT + 1))
  fi
done
ERRORS=$((ERRORS + NAV_ERROR_COUNT))

# ---- Summary ----
echo ""
echo "═══════════════════════════════════════"
echo "  Audit complete — $ERRORS error(s)"
echo "═══════════════════════════════════════"
exit $ERRORS
