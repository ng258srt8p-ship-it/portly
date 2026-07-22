# /goal Filter Responsive Refactor — Full Execution Loop

**Objective:** Fix all 12 responsive issues in the FilterBar and FilterSelectionGrid components to eliminate overlapping buttons, overflow text, and poor mobile UX at narrow viewport widths (320px+).

**Read first:** plan/FILTER_REFACTOR_GOALLOOP.md — then src/components/FilterBar.tsx, src/components/FilterSelectionGrid.tsx, src/components/search/SearchHero.tsx

**Constraints:**
- Do NOT add new dependencies
- Do NOT change filter functionality (only layout/spacing)
- Keep MaterialIcon components and dropdown structure intact
- Maintain existing test IDs (data-testid) for compatibility
- Do not refactor unrelated code outside filter components
- Shorten text labels on mobile only (desktop keeps full labels)

**Validate:** `npx next build` after each phase — build must succeed with zero errors

**Document:** Write concise, targeted documentation for all changes — update plan/FILTER_REFACTOR_GOALLOOP.md with checkmarks as each phase completes.

**Checkpoints:** Work in checkpoints (Phase A → B → C). Log progress briefly in plan/FILTER_REFACTOR_GOALLOOP.md.

**Stop when:** All 12 issues resolved AND `npx playwright test` passes with no visual regressions (screenshots at 320px, 480px, 768px, 1024px all look correct), OR when further changes need human/product input (e.g., label text preferences).

---

## Execution Order (follow exactly)

### Phase A: Mobile Layout Fixes (30 min)
1. **Item A1** — Reduce toggle button padding (`py-3` → `py-2`)
2. **Item A2** — Stack price inputs vertically on mobile
3. **Item A3** — Stack expanded filter rows with `space-y-2`
4. **Item A4** — Shorten Night options to "0–3", "4–7", "8+" (remove "nights" on mobile)
5. **Item A5** — Shorten Type options to "Drop", "Solo", "Value" (mobile only)
6. **Item A6** — Shorten Sort option labels (mobile only)
7. **Item A7** — Add bottom margin to expanded mobile body
8. **Item A8** — Add "Scroll to see more" indicator

### Phase B: Desktop Layout Fixes (20 min)
9. **Item B1** — Use `flex-wrap` with explicit responsive breakpoints
10. **Item B2** — Add `gap-2` between filter groups
11. **Item B3** — Shrink label text to `text-[10px]` on mobile
12. **Item B4** — Ensure right padding is 12px (not 8px) for dropdown arrows

### Phase C: Verification (15 min)
13. **Item C1** — Screenshot tests at 320px, 480px, 768px, 1024px
14. **Item C2** — No console errors at all widths
15. **Item C3** — All filter buttons clickable

**Validate:** `npx next build` after each phase
**Stop when:** All screenshots pass AND build succeeds clean
