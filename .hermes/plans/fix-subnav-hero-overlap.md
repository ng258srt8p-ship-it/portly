**Objective:** Fix SailingSubNav sticky overlap with hero card on sailing detail pages (`SailingSubNav` pill bar overlaps dark hero section).
**Read first:** src/components/sailing/SailingSubNav.tsx, src/app/sailing/[id]/page.tsx, .hermes/skills/goal-loop/SKILL.md
**Constraints:** No changes to Header.tsx; preserve subnav sticky behavior; keep scroll-margin-top on sections; only add spacing/padding (no class removal).
**Validate:** `npm run build` passes; Playwright `e2e/uiux-audit.spec.ts` passes (7 passed / 2 skipped); manual visual check shows separation between subnav and hero.
**Checkpoints:** (1) Confirm overlap (subnav sticky at 98px, hero has no top offset), (2) Apply padding fix, (3) Re-run audit + build.
**Stop when:** Subnav pill no longer overlaps hero card (visible gap maintained on scroll), OR build breaks / scroll-margin breaks.
**Document:** Update .hermes/sk... (skipped — docs already accurate)
