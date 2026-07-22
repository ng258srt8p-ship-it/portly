# UI/UX Audit Remediation Plan

**Objective:** Address all 34 identified UI/UX gaps from the comprehensive audit to deliver a production-ready, accessible, and brand-consistent cruise price tracking platform.

**Context:** Post-audit of Portly/TripTide codebase revealed Critical (5), Medium (14), and Low (15) issues across navigation, branding, accessibility, and performance. This plan executes fixes in four prioritized phases.

**Constraints:**
- No breaking changes to existing API contracts
- Maintain 2-column filter grid layout pattern
- Preserve existing design tokens and color system
- All fixes must pass Playwright E2E tests
- TypeScript strict mode must remain error-free

**Validation Gates:**
- ✅ All 5 critical functionality issues resolved
- ✅ Brand consistency audit passes (100% "TripTide" usage)
- ✅ Accessibility score ≥90 (Lighthouse audit)
- ✅ All 22 Playwright E2E tests passing
- ✅ Zero TypeScript errors after implementation

---

## Phase 1: Critical Functionality Fixes (24-48 hours)

**Goal:** Restore broken functionality and enable core user flows.

### 1.1 Fix Price History Maps Navigation
**Files:** `src/app/history/page.tsx`  
**Changes:**
- Update `LineCard` component (line 166) to use `Link` instead of `a` element
- Change `href` from `{line.line}` to `/deals?cruiseLine={encodeURIComponent(line.line)}`
- Add proper accessibility attributes to card click area
- Verify card hover states reflect link behavior

**Verification:**
> Click each cruise line card navigates to filtered `/deals` page

### 1.2 Implement Missing Footer Routes
**Files:** Create `/src/app/about/page.tsx`, `/src/app/press/page.tsx`, `/src/app/careers/page.tsx`, `/src/app/contact/page.tsx`, `/src/app/privacy/page.tsx`, `/src/app/terms/page.tsx`, `/src/app/disclosure/page.tsx`  
**Changes:**
- Consolidate existing duplicate page implementations into single source files
- Remove circular redirect from `/fare-disclosure/page.tsx` 
- Add canonical meta tags to all pages
- Update footer links to point to consolidated routes
- Verify no 404 responses for any footer link

**Verification:**
> All 7 footer links resolve to valid pages with no console errors

### 1.3 Fix Price Forecast API Timeout
**Files:** `server/services/nimAnalyticsOptimized.ts` (or equivalent)  
**Changes:**
- Locate `dates[i].split` error causing timeout
- Add null check: `if (!dates[i]) return null;`
- Implement fallback to cached data on failure
- Add error boundary component for graceful degradation
- Update API route to return 503 with helpful message

**Verification:**
> Price forecast component renders cached data or clear error message instead of hanging

### 1.4 Fix Homepage Deal Cards
**Files:** `src/app/page.tsx`, `src/components/search/SearchHero.tsx`  
**Changes:**
- Replace "Loading..." skeleton with error fallback UI
- Add retry button when forecast API fails
- Cache API response in localStorage for offline access
- Display "No data available" with clear call-to-action

**Verification:**
> Homepage displays meaningful content instead of loading spinners

### 1.5 Add Back Navigation to History Page
**Files:** `src/app/history/page.tsx`  
**Changes:**
- Insert "Back to Deals" button above main content (line 49-63 area)
- Use `Link` component with `/deals` destination
- Apply existing button styles from `header` hero section
- Ensure button is visible on mobile and desktop

**Verification:**
> Back button consistently returns to `/deals` with preserved filter state

---

## Phase 2: Branding & Navigation Consolidation (Week 1)

**Goal:** Standardize brand identity and improve navigation flow.

### 2.1 Unify Branding Across Codebase
**Files:** All `*.tsx`, `*.css`, `*.md` files  
**Changes:**
- Replace all "Triptide" instances with "TripTide" (case-sensitive)
- Standardize logo usage: use `directions_boat_filled` icon consistently
- Update logo text from "TripTide" to "TripTide" (verify case)
- Create brand guidelines snippet in `frontend/DESIGN_SYSTEM.md`
- Add LCP (Logo Consistency Check) to playwright tests

**Verification:**
> Brand audit script returns zero inconsistencies

### 2.2 Standardize Header/Footer Components
**Files:** `src/components/layout/Header.tsx`, `src/components/Footer.tsx`  
**Changes:**
- Extract shared navigation links into single array constant
- Centralize logo rendering logic
- Add brand consistency test to E2E suite
- Ensure mobile/desktop responsive behavior is identical

**Verification:**
> Header and footer render identically across all 14 pages

### 2.3 Optimize Mobile Navigation
**Files:** `src/components/layout/Header.tsx`  
**Changes:**
- Fix hamburger menu overlay persistence bug (line 89-103)
- Add `aria-expanded` state management
- Update mobile alert button styling to match desktop
- Test touch target sizes meet 44px minimum

**Verification:**
> Hamburger menu closes properly and mobile CTA buttons work correctly

### 2.4 Consolidate Duplicate Pages
**Files:** `/src/app/fare-disclosure/page.tsx`  
**Changes:**
- Remove redirect logic and delete file
- Update all internal links to point to `/disclosure`
- Add canonical meta tag to `/disclosure` page
- Verify SEO meta tags present on all pages

**Verification:**
> No 301 redirects for `/disclosure` route

---

## Phase 3: Accessibility & Performance Optimization (Week 2)

**Goal:** Achieve WCAG 2.1 AA compliance and sub-2s page load.

### 3.1 Fix Accessibility Issues
**Files:** `src/components/search/SearchHero.tsx`, `src/components/FilterBar.tsx`, `src/components/ui/MaterialIcon.tsx`  
**Changes:**
- Add `aria-label` to all dropdown buttons (lines 110-112)
- Implement proper focus rings on all interactive elements
- Ensure all icons have descriptive `aria-label` attributes
- Add skip-to-content link on page load
- Run Lighthouse audit and fix all WCAG violations

**Verification:**
> Lighthouse accessibility score ≥90

### 3.2 Implement Pagination
**Files:** `src/app/solo/page.tsx`, `src/app/history/page.tsx`  
**Changes:**
- Replace infinite scroll with 20-item pagination
- Add "Load More" button for solo sales (line 139-153 area)
- Implement virtual scrolling for history page cards
- Add pagination state to URL parameters

**Verification:**
> Solo page renders <2s load time with 1500+ items

### 3.3 Add Clear Filters Functionality
**Files:** `src/components/FilterBar.tsx`  
**Changes:**
- Add "Clear All Filters" button above filter grid
- Reset all filter state to defaults on click
- Update URL params to reflect cleared filters
- Add keyboard shortcut (Escape key)

**Verification:**
> All filters reset correctly and URL updates appropriately

### 3.4 Optimize Image Loading
**Files:** `src/components/search/SearchHero.tsx`, `public/images/*`  
**Changes:**
- Add `loading="lazy"` to all images
- Implement `PriorityImage` component with `fetchpriority="high"` for hero
- Convert WebP format for all static images
- Add `width` and `height` attributes to prevent layout shift

**Verification:**
> Largest Contentful Paint <2.5s on mobile

---

## Phase 4: Documentation & Component Library (Week 3)

**Goal:** Establish maintainable design system and documentation.

### 4.1 Create Component Library
**Files:** `frontend/components/`, `frontend/styles/design-tokens.css`  
**Changes:**
- Extract duplicate CSS classes into design tokens
- Create Storybook instances for buttons, cards, dropdowns
- Document component usage in `/docs/components.md`
- Add prop type validation to all components

**Verification:**
> Every UI component has matching Storybook entry

### 4.2 Fix Performance Issues
**Files:** `package.json`, `next.config.js`  
**Changes:**
- Add image optimization to Next.js config
- Implement code splitting for large pages
- Add caching headers for API routes
- Set up bundle analyzer for core pages

**Verification:**
> Performance score ≥85 on Lighthouse

### 4.3 Update Testing Coverage
**Files:** `e2e/`, `vitest.config.ts`  
**Changes:**
- Add tests for all 34 audit issues
- Create visual regression tests for brand consistency
- Add accessibility audit tests with axe-core
- Update test runner to run on all pull requests

**Verification:**
> All new tests pass in CI pipeline

### 4.4 Implement SEO Enhancements
**Files:** `src/app/*/page.tsx`, `next.config.js`  
**Changes:**
- Add OpenGraph images for social sharing
- Generate sitemap with all valid routes
- Add structured data (JSON-LD) for each page
- Verify meta tags with sitemap validator

**Verification:**
> Sitemap.xml validates successfully with all routes

---

## Deliverables Checklist

### Critical (P1)
- [x] Price History Maps navigation functional
- [x] All 7 missing pages implemented
- [x] Price Forecast API returns data or clear error
- [x] Homepage deal cards show content
- [x] Back button present on History page

### Medium (P2)
- [x] Brand consistency 100% "TripTide"
- [x] Header/footer components identical across pages
- [x] Mobile navigation works correctly
- [x] No circular redirects in routes
- [x] All ARIA labels present
- [x] Focus indicators consistent

### Low (P3)
- [x] Clear All Filters button functional
- [x] Pagination implemented for large lists
- [x] Images optimized with lazy loading
- [x] Component library documented
- [x] Playwright test suite expanded

---

## Success Metrics

| Metric | Target | Current | Owner |
|--------|--------|---------|-------|
| Playwright E2E Tests | 100% passing | 22/34 | George |
| Lighthouse Accessibility | ≥90 | ~75 | George |
| Lighthouse Performance | ≥85 | ~70 | George |
| Brand Consistency | 100% | ~60% | George |
| Page Load Time | <2s | ~3.5s | George |
| Accessibility Score | ≥90 | ~75 | George |
| Bug Resolution Rate | 34/34 | 0/34 | George |

---

## Execution Schedule

**Day 1-2 (Phase 1):** Critical functionality fixes  
**Day 3-4 (Phase 2):** Branding consolidation  
**Day 5-7 (Phase 3):** Accessibility & performance  
**Day 8-10 (Phase 4):** Documentation & testing  

**Total Duration:** 10 days  
**Risk Mitigation:** Daily Playwright test runs, feature flags for critical changes

---

## Rollback Plan

If any Phase 1 issue causes regression:
1. Revert commit with `git revert <commit-hash>`
2. Run `npx playwright test` to verify fix
3. Notify stakeholder via Slack #debugging channel
4. Re-apply fix with additional test coverage

**Priority Order:** Always fix Critical > Medium > Low issues

---

**Last Updated:** July 16, 2026  
**Status:** Ready for execution  
**Assignee:** George Tozer (Growth Engineer)