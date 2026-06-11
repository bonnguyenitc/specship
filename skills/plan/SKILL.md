---
name: plan
description: Design an implementation plan from an understood spec before writing code. Use after the spec is understood, when asked to "plan this feature", "how should we implement X", or "break this down into steps". Produces an ordered, verifiable step-by-step plan with files to touch, approach, tradeoffs, and per-step success checks. Second stage of the spec → plan → coding workflow.
---

# Plan

Goal: turn an understood spec into a concrete, ordered implementation plan — small steps, each independently verifiable — **before** any code is written.

## When to use
- The spec is understood (ideally via the `spec` skill) and you're ready to design.
- You're asked to break a feature into steps or weigh implementation approaches.
- Second stage of the workflow: **spec → plan → coding → review** (+ `debug`).

## Shared task state
Part of the task pipeline — see `../WORKFLOW.md` for the full contract.
- **Hydrate:** resolve the active `TASK-<ID>`, read `tasks/TASK-<ID>/task.md` + `spec.md`, plus `docs/onboarding/{source-structure,how-to-code}.md` if present. If `spec.md` is missing or `status: draft` with open blockers, run `spec` first.
- **Checkpoint:** write `plan.md`, then update `task.md` — set `stage: plan`, `plan` artifact `draft`→`approved`, bump `updated:`, append a Pipeline Log line.
- **Lessons:** read `tasks/LESSONS.md` at hydrate and apply its rules; if you detect a process mistake, fix it and append an `L#` entry there (see `../WORKFLOW.md` → Lessons).

## Method

### 1. Read the inputs
- **Read `tasks/TASK-<ID>/spec.md`** (produced by `spec`) — every step must trace to a requirement or acceptance criterion in it. If it's missing, run `spec` first.
- Know where the code will live and the patterns to follow: reuse `docs/onboarding/source-structure.md` and `how-to-code.md` if present, or run `explore-source` if the project is unfamiliar.
- Identify the existing files, modules, and conventions the change touches.

### 2. Choose an approach
- If multiple designs are viable, lay out the options with **tradeoffs** and pick one with a clear reason. Don't silently choose.
- Prefer the **simplest** design that satisfies the spec — no speculative abstractions or unrequested flexibility.
- Reuse existing patterns/utilities instead of inventing new ones.

### 3. Break into steps
- Order steps so each leaves the code in a working, testable state.
- For each step define: **what changes**, **which files** (`path`), and a **verify** check (test to write, command to run, behavior to observe).
- Call out data/schema migrations, API contract changes, and anything irreversible early.
- Note risks, unknowns, and where you might need to revisit the spec.

## Output: write the plan to the task folder
Write the plan to **`tasks/TASK-<ID>/plan.md`** (same `TASK-<ID>` as `spec.md`) using the **exact template below** — `coding` and `review` parse it. Then show the user a short summary.

Rules for the IDs: steps are `S1, S2, …` and never renumbered (only appended). Each step's `covers:` field references the `R#`/`AC#` IDs from `spec.md` it satisfies — this is how every step traces to a requirement, and how `review` checks nothing was missed.

```markdown
---
task: TASK-<ID>
title: <short title>
type: plan
status: draft        # draft | approved
created: <YYYY-MM-DD HH:MM +TZ>
updated: <YYYY-MM-DD HH:MM +TZ>
---

# Plan: <title>

## Approach
<chosen design + key tradeoffs, and why if alternatives existed>

## Files to Touch
- `path/to/file` — <one-line role of the change>

## Steps
- [ ] S1 — <change> (covers: R1, AC1) → verify: <test to write / command to run / behavior>
- [ ] S2 — <change> (covers: R2) → verify: ...

## Risks / Open Questions
- <anything that could change the plan>

## Change History
- <YYYY-MM-DD HH:MM +TZ>: Created.
```

Keep it minimal and surgical: every step must list at least one `covers:` ID. For non-trivial plans, present it for approval before coding (use EnterPlanMode when appropriate). Set `status: approved` once the user approves.

When the plan changes (including after a `spec.md` update), edit it in place: bump `updated:`, append a dated **Change History** line, keep `S#` IDs stable.

## Next step
Once the plan is approved, **ask the user whether they want to start implementing** — e.g. "Bạn có muốn tôi code theo plan này luôn không?".

- If the user agrees, **immediately invoke the `coding` skill** (via the Skill tool) and continue into implementation in the same flow — don't make them ask again.
- If the user declines or wants to revise the plan first, stop here.
