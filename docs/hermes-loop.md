# Hermes Autonomous Improvement Loop

Continuous 30-minute audit → implement → deploy → verify cycle targeting the
live Cloudflare Pages deployment at **https://portly-1i0.pages.dev/**.

## What's in this directory

| File | Purpose |
|---|---|
| [`../HERMES_LOOP_PROMPT.md`](../HERMES_LOOP_PROMPT.md) | Standing system instruction for each cycle (5 phases) |
| [`../HERMES_AUTONOMOUS_LOG.md`](../HERMES_AUTONOMOUS_LOG.md) | Append-only cycle history (never rewritten) |
| [`../run-hermes-loop.sh`](../run-hermes-loop.sh) | Shell runner — locking, logging, scheduling |
| [`../playwright.config.ts`](../playwright.config.ts) | Patched to honor `BASE_URL` env var for live E2E |

## How a cycle works

1. **Phase 1 — Audit:** Run Playwright against `https://portly-1i0.pages.dev/`,
   inspect routes, pick the SINGLE highest-impact improvement.
2. **Phase 2 — Implement:** Touch the smallest set of files needed. Pass
   `npm run lint`, `npm run build` locally.
3. **Phase 3 — Commit, doc, & deploy:** Stage **both** the code change AND
   a new `### Cycle #N` section in `HERMES_AUTONOMOUS_LOG.md`. Single commit
   pushed to `origin/main`. Cloudflare Pages auto-builds.
4. **Phase 4 — Live verify:** Wait ~60s for deploy, then
   `BASE_URL=https://portly-1i0.pages.dev/ npx playwright test`.
5. **Phase 5 — Log & reset:** Mark the cycle section ✅/⚠️/❌ with results.

## How to run

The runner is scheduled via `hermes cron` (see `hermes cron list`) and fires
every 30 minutes. Manual control:

```bash
# One full cycle (recommended for ad-hoc verification)
SINGLE_CYCLE=1 ./run-hermes-loop.sh

# Forever, every 30 minutes (default — what the cron job does)
./run-hermes-loop.sh

# Faster cadence for testing
INTERVAL_SECONDS=60 ./run-hermes-loop.sh

# Show the effective prompt without running
DRY_RUN=1 ./run-hermes-loop.sh
```

The runner uses a `mkdir`-based atomic lock at `.hermes-loop.lock/` so two
processes can't run concurrently. If a cycle crashes, the next launch detects
the dead holder PID and steals the lock.

## Guardrails (enforced by the prompt)

- One improvement per cycle (no scope creep).
- Fix the root cause — no `.skip()` or test deletion to make CI green.
- The cycle log is append-only — past cycles are never edited.
- Push retry: one retry on `git push` failure, then ⚠️ log and continue.
- Max 60 tool turns per cycle (cap from `hermes chat --max-turns 60`).
- No `--yolo` — destructive ops still gated.

## Inspecting past cycles

```bash
# Recent cycle history
git log --oneline | grep 'hermes-loop' | head -20

# Full log (Markdown)
cat HERMES_AUTONOMOUS_LOG.md

# Live streaming log (when a cycle is running)
tail -f hermes-cycles.log
```

## Pausing the loop

```bash
hermes cron list                # find the job_id
hermes cron pause <job_id>
hermes cron resume <job_id>
```

The lock file is released automatically when the runner exits; pausing the
cron just stops new cycles from starting.
