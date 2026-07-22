#!/bin/bash
cd /Users/georgetozer/Development/Portly

while true; do
  REMAINING=$(psql triptide -t -c "SELECT COUNT(*) FROM sailings WHERE sync_status = 'active' AND deal_analysis IS NOT NULL AND deal_analysis ~ '^\s*\{' AND deal_analysis::json->>'dealScore' = '50';" | tr -d ' \n')
  
  if [ "$REMAINING" = "0" ]; then
    echo "[BATCH LOOP] All sailings processed. Remaining: 0"
    break
  fi
  
  echo "[BATCH LOOP] $REMAINING remaining - running batch of 25..."
  BATCH=$((REMAINING > 25 ? 25 : REMAINING))
  
  npx tsx scripts/regenerate-deal-analysis.ts $BATCH 2>&1 | tail -5
  
  # Wait between batches to avoid rate limits
  sleep 3
done

echo "[BATCH LOOP] Done!"
