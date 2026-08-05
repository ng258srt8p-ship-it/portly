---
name: goal-loop
description: Autonomous goal-driven implementation loop. Iterates through plan phases, executes tasks, validates gates, and continues until complete or blocked.
version: 1.0.0
---

# Goal Loop Skill

## Purpose
Autonomously implement multi-phase plans by iterating through phases, executing tasks, validating gates, and continuing until complete or blocked.

## When to Use
- Multi-phase implementation plans with clear gates
- Plans that require sequential execution with validation checkpoints
- Goals that can be broken into discrete, testable phases

## Loop Structure

```
1. READ plan file (e.g., SCRAPE_REAL_DATA_GROWTH_PLAN.md)
2. FOR each phase in plan:
   a. EXECUTE all tasks in phase
   b. VALIDATE gate criteria
   c. IF gate passes: log progress, continue to next phase
   d. IF gate fails: log failure, stop or retry as configured
3. REPORT final status
```

## Execution Rules

### Phase Execution
- Execute tasks in order within each phase
- Log each task completion with timestamp
- Capture any errors or blockers

### Gate Validation
- Check all gate criteria listed in phase
- Use concrete validation (file checks, type checks, test runs)
- Document pass/fail status

### Progress Logging
- Create/update progress file: `.openclaude/goal-loop-progress.md`
- Log: phase, task, status, timestamp, notes
- Update after each phase completes

### Cost Constraints
- Respect $0 cost constraint unless explicitly overridden
- Use free tools, open-source libraries, existing infrastructure
- No paid APIs, no external services with costs

### Stop Conditions
- All phases complete successfully
- Gate failure that cannot be resolved
- External dependency unavailable (and no fallback)
- User explicitly stops the loop

## Output Format

### Progress File (`.openclaude/goal-loop-progress.md`)
```markdown
# Goal Loop Progress

## Status: IN_PROGRESS | COMPLETE | BLOCKED

## Current Phase: [Phase Name]

### Phase 1: [Name]
- [x] Task 1: Description — PASS/FAIL — Notes
- [ ] Task 2: Description — PENDING

### Phase 2: [Name]
- [ ] Task 1: Description — PENDING

## Blockers
- [List any blockers]

## Next Steps
- [What to do next]
```

### Final Report
When loop completes, generate summary:
- Total phases completed
- Gates passed/failed
- Time elapsed
- Remaining work (if any)

## Example Usage

```bash
# Start goal loop
openclaude goal-loop --plan SCRAPE_REAL_DATA_GROWTH_PLAN.md

# Or manually iterate
1. Read plan
2. Execute Phase 1 tasks
3. Validate Phase 1 gates
4. Execute Phase 2 tasks
5. Validate Phase 2 gates
...
```

## Integration with LM Studio Bionic

This skill should be used when:
- User provides a multi-phase plan
- Plan has clear gates/acceptance criteria
- Implementation can be done in discrete steps

The loop runs autonomously until:
- All phases complete
- A gate fails and cannot be resolved
- User interrupts

## Notes

- This is a meta-skill that guides implementation, not a technical skill
- It doesn't execute code itself, but guides the agent through execution
- Each phase should be self-contained and testable
- Gates must be objective (pass/fail, not subjective)
