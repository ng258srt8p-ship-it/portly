# GOAL LOOP: Fix All UI/UX Bugs

## Overview
This goal loop systematically addresses all UI/UX bugs found by the QA subagent.

## Bugs to Fix (from QA Findings)

### Critical (Severity: 🔴)
1. **Blank Pricing Table** - Home page shows loading forever
   - Fix: Ensure `/api/sailing/1049` returns data
   - Verify: Check if server is running on port 3001

2. **Failed API Fetch** - History page shows error message
   - Fix: Fix API endpoint to return valid data

3. **No Sailing Data** - All pages show blank states
   - Fix: Start development server to populate data

### Medium (Severity: 🟡)
4. **Unreadable Fonts** - Syne font hard to read on titles
   - Fix: Changed `font-display` to `font-sans` throughout
   - Files: `/src/app/page.tsx`, `/src/app/history/page.tsx`

5. **Missing Font Classes** - Multiple pages use `font-display`
   - Fix: Replace `font-display` with `font-sans` everywhere

## Progress Tracking

### ✅ COMPLETED
1. Fixed `/src/app/page.tsx` - Changed `font-display text-4xl` to `text-4xl font-sans`
   - Action: Patched file to remove `font-display` class

2. Fixed `/src/app/history/page.tsx` - Removed Syne font dependency
   - Action: Rewrote loading logic to use proper data fetching

3. Created `goals/UI_BUGS_GOALLOOP.md` - Documents all findings and fixes

### 🟡 IN PROGRESS
4. Verify home page renders properly
   - Action: Navigate to `http://localhost:3002/` and verify data loads

5. Verify history page renders properly  
   - Action: Navigate to `http://localhost:3002/history` and verify data loads

6. Run Playwright tests to verify fixes
   - Action: Run `npx playwright test` to verify no regressions

### 🔴 TODO
7. Fix `/api/sailing/1049` data endpoints
   - Action: Check backend server, ensure data exists
   - Verify: Run curl to test endpoints

8. Verify all other routes render correctly
   - Action: Navigate to `/deals`, `/solo`, `/alerts`, `/careers`, `/sailing/[id]`
   - Verify: No blank states, proper data loading

## Verification Steps

### 1. Server Health Check
```bash
lsof -i :3001  # Check if backend is running
curl http://localhost:3001/api/deals?limit=1  # Test data
curl http://localhost:3001/api/history  # Test history
```

### 2. Visual Verification
- Navigate to home page: `http://localhost:3002/`
- Verify actual sailing prices shown (not loading state)
- Check all titles use readable fonts (not Syne)

- Navigate to history: `http://localhost:3002/history`
- Verify data loads correctly
- Verify no blank states or error messages

### 3. Playwright Tests
```bash
npx playwright test e2e/phase6-accessibility.spec.ts --reporter=line
```

## Files Modified
- `/Users/georgetozer/Development/Portly/src/app/page.tsx` - Fixed font classes
- `/Users/georgetozer/Development/Portly/src/app/history/page.tsx` - Fixed loading logic

## Goal Loop Execution
Run subagents to:
1. Verify all pages render correctly (not blank)
2. Take screenshots of all pages for evidence
3. Run Playwright tests
4. Report all findings with severity ratings

This goal loop will ensure all UI/UX bugs are systematically fixed and verified.
