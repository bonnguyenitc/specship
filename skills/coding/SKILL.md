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

## Before you write
- **Read `tasks/TASK-<ID>/plan.md` and `spec.md`** so every change traces to a planned step and a requirement. If they're missing, run `plan` / `spec` first.
- Know the conventions: if `docs/onboarding/how-to-code.md` / `source-structure.md` exist, follow them (placement, naming, layer separation, error handling, imports); otherwise read neighbouring code and **match its style**.
- **Ask the user which approach they want** — e.g. "Bạn muốn code theo TDD hay cách thông thường?":
  - **TDD** — write a failing test first, then code to make it pass, then refactor (red → green → refactor).
  - **Thông thường (conventional)** — implement first, then add tests to verify.
  - If the user has no preference, default to whatever the codebase already does (if tests are pervasive, lean TDD); otherwise conventional.

## Method — loop per step
For each step in the plan, follow the chosen approach:

**If TDD:**
1. **Red** — write a test that captures the step's expected behavior; run it and confirm it fails for the right reason.
2. **Green** — write the minimum code to make the test pass. Nothing more.
3. **Refactor** — clean up while keeping the test green; stay surgical.

**If conventional:**
1. **Implement** the minimum code that satisfies the step. No features, abstractions, or error handling beyond what's required.
2. **Verify** — write/run the test or run the step's success check; observe the behavior.

**Both approaches:**
- **Stay surgical** — touch only what the step needs. Don't refactor or "improve" adjacent code. Remove only orphans your own change created.
- **Don't claim done until the check passes.** If it fails, fix and re-verify before moving on. If reality contradicts the plan, stop and revisit the plan rather than forcing it. For a non-obvious failure, switch to the `debug` skill (it records the fix in `tasks/TASK-<ID>/debug.md`) and resume after.
- **Tick the step in `plan.md`** — change its `- [ ] S#` to `- [x] S#` once its verify check passes, so the file tracks real progress. If a step deviates from the plan, note it inline.

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
- **Run the gates:** lint, format, type-check, and tests as the project defines them. Use `rtk` wrappers (`rtk lint`, `rtk tsc`, `rtk <test-runner>`) for compact output.
- Don't run `git add` / `commit` / `push` unless the user asks.

## When done
- Confirm all plan steps are implemented and their checks pass — state results plainly (if a test fails or a step was skipped, say so with the output).
- Summarize what changed (files + behavior) and note any follow-ups or deviations from the plan.

## Next step
Once the implementation is complete, **ask the user whether they want to review and wrap up** — e.g. "Bạn có muốn tôi review lại và hoàn tất không?".

- If the user agrees, **immediately invoke the `review` skill** (via the Skill tool) and continue in the same flow — don't make them ask again.
- If the user declines, stop here.
