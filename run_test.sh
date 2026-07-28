#!/bin/bash
export BASE_URL=https://portly-1i0.pages.dev/
npx playwright test e2e/deals-count-fix.spec.ts --timeout=30000