---
name: coding
description: Implement an approved plan step by step, following the project's conventions, and verify each step. Use after a plan exists, when asked to "implement this", "code it up", or "build the feature". Writes minimal, surgical code matching existing style and runs the success checks. Final stage of the spec → plan → coding workflow.
---

# Coding

Goal: execute the approved plan into working, clean code — one verifiable step at a time, matching the project's existing conventions.

## When to use
- A plan exists (ideally from the `plan` skill) and is approved.
- You're asked to implement, build, or code up a feature.
- Third stage of the workflow: **spec → plan → coding → review** (+ `debug`).

## Shared task state
Part of the task pipeline — see `../WORKFLOW.md` for the full contract.
- **Hydrate:** resolve the active `TASK-<ID>`, read `tasks/TASK-<ID>/task.md`, `plan.md`, `spec.md`, and `docs/onboarding/how-to-code.md`. If `plan.md` is missing, run `plan` first.
- **Checkpoint:** as steps pass, tick `S#` in `plan.md`; update `task.md` — set `stage: coding`, `coding` artifact `in-progress`→`done`, bump `updated:`, append a Pipeline Log line.
- **Blocked?** If a step can't proceed because of an external dependency (an unmerged API, missing data/access, another team), set `status: blocked`, note it in `Blocked by:`, and log it; flip back to `active` when it clears. A *blocker bug* instead goes through `debug` (which sets `blocked` itself). `blocked` is involuntary — to set the task aside by choice, use `pause-task`. See `../WORKFLOW.md` → Status values.
- **Lessons:** read `tasks/LESSONS.md` at hydrate and apply its rules; if you detect a process mistake, fix it and append an `L#` entry there (see `../WORKFLOW.md` → Lessons).

## Before you write
- **Read `tasks/TASK-<ID>/plan.md` and `spec.md`** so every change traces to a planned step and a requirement. If they're missing, run `plan` / `spec` first.
- Know the conventions: if `docs/onboarding/how-to-code.md` / `source-structure.md` exist, follow them (placement, naming, layer separation, error handling, imports); otherwise read neighbouring code and **match its style**.
- **Ask the user which approach they want** — e.g. "Bạn muốn code theo TDD hay cách thông thường?":
  - **TDD** — write a failing test first, then code to make it pass, then refactor (red → green → refactor).
  - **Thông thường (conventional)** — implement first, then add tests to verify.
  - If the user has no preference, default to whatever the codebase already does (if tests are pervasive, lean TDD); otherwise conventional. (Under `ship`, don't ask — apply this default directly.)

## Method — loop per step
For each step in the plan, follow the chosen approach:

**If TDD** — work in **vertical slices, one behavior at a time** (the `tdd` skill has the full method; invoke it for depth):
1. **Red** — write **one** test for the next behavior the step needs; run it and confirm it fails for the right reason. Test observable behavior through the **public interface**, not implementation details — so it survives a refactor.
2. **Green** — write the **minimum** code to make that one test pass. Don't anticipate the next test.
3. **Refactor** — only once green, clean up duplication while keeping tests green; stay surgical. **Never refactor while red.**
4. **Loop** — repeat 1-3 for the step's next behavior. The first test is a tracer bullet that proves the path end-to-end; each later test responds to what the previous cycle taught you.

> Anti-pattern — **don't** write all the step's tests first and then all the code ("horizontal slicing"). Tests written in bulk verify imagined behavior, not real behavior. One test → one bit of code → repeat.

**If conventional:**
1. **Implement** the minimum code that satisfies the step. No features, abstractions, or error handling beyond what's required.
2. **Verify** — write/run the test or run the step's success check; observe the behavior.

**Both approaches:**
- **Stay surgical** — touch only what the step needs. Don't refactor or "improve" adjacent code. Remove only orphans your own change created.
- **Run the step's own `verify:` from `plan.md`, verbatim.** That command is the step's definition of done — don't substitute an easier check, and report its real output. **Never weaken the check to make it pass** (loosening an assertion, deleting a test case, widening a type): if the check itself is wrong, that's a plan/spec change — update the artifact with a Change History line, then fix the check openly.
- **Don't claim done until the check passes.** If it fails, fix and re-verify before moving on. **If the same check is still failing after ~3 distinct fix attempts, stop patching** — you're guessing, not fixing. Switch to the `debug` skill with the failing command as the repro (it records the fix in `tasks/TASK-<ID>/debug.md`) and resume after.
- **Tick the step in `plan.md`** — change its `- [ ] S#` to `- [x] S#` once its verify check passes, so the file tracks real progress.
- **When reality contradicts the plan, update the plan — don't force it or drift silently.** A small deviation (different file, extra helper): note it inline on the `S#` and add a Change History line. A structural one (approach doesn't work, step obsolete, new step needed): stop, edit `plan.md` in place per its own rules (append `S#`, never renumber, strike obsolete steps), get it re-approved if the approach changed, then continue. If the *requirement* turns out wrong, that goes back to `spec.md`, not just the plan.

## Parallelizing independent steps
Default to coding **sequentially in this thread** — for dependent steps, TDD, or anything needing tight verification, that's faster and safer than a subagent (which pays a cold-start cost and breaks the per-step loop).

Only fan out to parallel subagents when the speed-up is real:
- **Eligible when** the `S#` steps are genuinely independent — no shared state, and **non-overlapping files** (judge this from the plan's `covers:` IDs and "Files to Touch"). Good fits: separate modules/endpoints, or mechanical bulk work (scaffolding, repetitive edits across many files).
- **How:** give each subagent a tight brief — its `S#` step(s), the exact files it owns, and the `docs/onboarding/how-to-code.md` rules. Run independent agents in parallel; if files might still collide, give each its own **git worktree**.
- **Main thread stays the owner:** integrate the agents' output, run the **full gate** (lint + type-check + entire test suite), tick the `S#` in `plan.md`, and update `task.md`. Agents implement; you verify and own the state — same pattern as `explore-source`/`debug`.
- **Not eligible** when steps build on each other, share files, or follow TDD — keep those sequential.

## Quality rules
- **Simplicity first:** if it could be 50 lines, don't write 200.
- **Match, don't impose:** follow existing style even if you'd personally differ.
- **Run the gates:** lint, format, type-check, and tests as the project defines them (the exact commands from `docs/onboarding/how-to-code.md`).
- Don't run `git add` / `commit` / `push` unless the user asks.

## When done
- **Re-run the full gate fresh** (lint + type-check + the entire test suite), even though every step passed individually — a later step can regress an earlier one, and per-step checks won't catch it.
- Confirm all plan steps are implemented and their checks pass — state results plainly (if a test fails or a step was skipped, say so with the output).
- Summarize what changed (files + behavior) and note any follow-ups or deviations from the plan.

## Next step
Once the implementation is complete, **ask the user whether they want to review and wrap up** — e.g. "Bạn có muốn tôi review lại và hoàn tất không?".

- If the user agrees, **immediately invoke the `review` skill** (via the Skill tool) and continue in the same flow — don't make them ask again.
- If the user declines, stop here.
- Under `ship` (autopilot), skip the question and invoke `review` directly.
