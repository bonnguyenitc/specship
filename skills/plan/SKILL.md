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
- **Blocked?** If planning can't be finalized because of an unresolved **blocker `Q#`** or an external dependency (an API/data/decision the plan hinges on), set `status: blocked`, note it in `Blocked by:`, and log it; flip back to `active` when it clears. `blocked` is involuntary — to set the task aside by choice, use `pause-task`. See `../WORKFLOW.md` → Status values.
- **Lessons:** read `tasks/LESSONS.md` at hydrate and apply its rules; if you detect a process mistake, fix it and append an `L#` entry there (see `../WORKFLOW.md` → Lessons).

## Method

### 1. Read the inputs
- **Read `tasks/TASK-<ID>/spec.md`** (produced by `spec`) — every step must trace to a requirement or acceptance criterion in it, and its **Assumptions** can decide the design, so read them too. If it's missing, run `spec` first.
- Know where the code will live and the patterns to follow: reuse `docs/onboarding/source-structure.md` and `how-to-code.md` if present, or run `explore-source` if the project is unfamiliar.
- **Open the actual files the plan will touch** — confirm the functions, signatures, and patterns the steps rely on really exist as you believe. A plan referencing imagined code doesn't fail now; it fails at `coding`, where it's more expensive.

### 2. Choose an approach
- If multiple designs are viable, lay out the options with **tradeoffs** and pick one with a clear reason. Don't silently choose.
- Prefer the **simplest** design that satisfies the spec — no speculative abstractions or unrequested flexibility.
- Reuse existing patterns/utilities instead of inventing new ones.

### 3. Break into steps
- Order steps so each leaves the code in a working, testable state.
- **Size each step like a commit:** one coherent change, independently verifiable. Too big: it mixes refactoring with behavior change, or its `verify:` can only pass once later steps land — split it (prep/refactor steps first, behavior steps after). Too small: it can't be verified on its own — merge it into the step that makes it observable.
- **Turn unknowns into spike steps, not guesses.** If an approach hinges on something you can't know without trying (a library's behavior, a perf ceiling, an undocumented API), make the first step a time-boxed spike whose `verify:` is the question answered — and note that its outcome may revise the later steps.
- For each step define: **what changes**, **which files** (`path`), and a **verify** check. The `verify:` must be **executable, not a description** — a concrete command or test the coding loop can run and read a pass/fail from (`<test-runner> path::case`, `tsc --noEmit`, `curl … | grep`, an assertion), not prose like "behavior works" or "looks correct". If a step's only honest check is a manual observation, name the **exact action and expected output** so it's still a binary check, not a vibe. A vague `verify:` hands the coding stage a strong loop pointed at a blurry target — it'll report "done" without proof.
- **For a step that covers an `AC#`, its `verify:` should run (or extend) that AC's own `verify:` check from `spec.md`** — don't invent a parallel one. This is what carries the spec's acceptance check through to executable code and back up to `review`.
- Call out data/schema migrations, API contract changes, and anything irreversible early.
- Note risks, unknowns, and where you might need to revisit the spec.

## Output: write the plan to the task folder
Write the plan to **`tasks/TASK-<ID>/plan.md`** (same `TASK-<ID>` as `spec.md`) using the **exact template below** — `coding` and `review` parse it. Then show the user a short summary.

Rules for the IDs: steps are `S1, S2, …` and never renumbered (only appended). Each step's `covers:` field references the `R#`/`AC#` IDs from `spec.md` it satisfies — this is how every step traces to a requirement, and how `review` checks nothing was missed. **Coverage runs both ways:** before approval, sweep `spec.md` and confirm every `R#` and `AC#` appears in at least one step's `covers:` — an uncovered ID means a missing step, or a scope question to raise with the user. Don't leave the gap for `review` to find.

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
<!-- verify: must be a runnable command/test with a pass/fail, not a description -->
- [ ] S1 — <change> (covers: R1, AC1) → verify: <exact command/test to run, e.g. `vitest run auth.test.ts`>
- [ ] S2 — <change> (covers: R2) → verify: ...

## Risks / Open Questions
- <anything that could change the plan>

## Change History
- <YYYY-MM-DD HH:MM +TZ>: Created.
```

Keep it minimal and surgical, and **right-size it**: a small task gets a small plan — two or three steps and `- none` in the empty sections, never steps invented to fill the template. Approval gate: every step lists at least one `covers:` ID **and an executable `verify:`**, and **every `R#`/`AC#` in `spec.md` is covered by at least one step** — a plan failing either check is not ready to approve. For non-trivial plans, present it for approval before coding (use EnterPlanMode when appropriate). Set `status: approved` once the user approves. (Under `ship`, approval is delegated: set `status: approved` directly and log it.)

When the plan changes (including after a `spec.md` update), edit it in place: bump `updated:`, append a dated **Change History** line, keep `S#` IDs stable.

## Next step
Once the plan is approved, **ask the user whether they want to start implementing** — e.g. "Bạn có muốn tôi code theo plan này luôn không?".

- If the user agrees, **immediately invoke the `coding` skill** (via the Skill tool) and continue into implementation in the same flow — don't make them ask again.
- If the user declines or wants to revise the plan first, stop here.
- Under `ship` (autopilot), skip the question and invoke `coding` directly.
