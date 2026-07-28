#!/bin/bash
BASE_URL=https://portly-1i0.pages.dev/ npx playwright test e2e/deals-hero-filters.spec.ts --project=chromium --workers=1