---
name: review
description: Wrap up a finished change — self-review the diff, run the full test/lint gate, verify against acceptance criteria, update docs, then prepare commit/PR. Use after coding is done, when asked to "review my changes", "wrap up", "finalize", or "is this ready to merge". Final stage of the spec → plan → coding → review workflow.
---

# Review

Goal: take a change from "code written" to "ready to ship" — verified correct, clean, and consistent with the spec, before it's committed.

## When to use
- Implementation is finished (ideally via the `coding` skill).
- You're asked to review, wrap up, finalize, or check if a change is merge-ready.
- Final stage of the workflow: **spec → plan → coding → review** (+ `debug`).

## Shared task state
Part of the task pipeline — see `../WORKFLOW.md` for the full contract.
- **Hydrate:** resolve the active `TASK-<ID>`, read `tasks/TASK-<ID>/task.md`, `spec.md`, `plan.md`, `docs/onboarding/how-to-code.md`, and the diff.
- **Checkpoint:** write `review.md` and tick verified `AC#` in `spec.md`; update `task.md` — set `review` artifact `changes-requested`/`approved`, set `stage: done` + `status: done` only when approved, bump `updated:`, append a Pipeline Log line.

## Method

### 0. Load the artifacts
Read the files the earlier stages produced so the review is grounded, not generic:
- `tasks/TASK-<ID>/spec.md` — requirements, acceptance criteria, edge cases.
- `tasks/TASK-<ID>/plan.md` — the intended approach and steps.
- `docs/onboarding/how-to-code.md` + `source-structure.md` — the code-style and placement rules.

### 1. Self-review the diff
- Read the full diff (`rtk git diff`). Check every changed line traces to a planned step / spec requirement — flag anything unrelated or speculative.
- Look for correctness bugs and missed edge cases (from `spec.md`), and reuse/simplification opportunities.
- Check the change followed the plan — note any deviation from `plan.md`.
- **Check code style against `docs/onboarding/how-to-code.md`** — verify the documented rules: correct placement (right folder/file), naming, module size/responsibility, layer separation, error handling, logging, imports. Flag every deviation. If that file doesn't exist, fall back to matching neighbouring code.

### 2. Run the full gate
- Run the **entire** test suite, not just the tests for the last step — catch regressions elsewhere.
- Run lint, format check, and type-check as the project defines them. Use `rtk` wrappers (`rtk <test-runner>`, `rtk lint`, `rtk tsc`) for compact output.
- **Don't proceed until these are green.** If something fails, report it plainly with the output and fix before continuing. For a non-obvious failure, use the `debug` skill (it records the fix in `tasks/TASK-<ID>/debug.md`) and resume the review.

### 3. Verify against acceptance criteria
- Walk through each `AC#` in `spec.md` and confirm it's met; **tick it `- [x]`** when verified. Any unchecked `AC#` or `S#` means the work isn't done.
- For user-facing behavior, run the app and observe the actual result rather than trusting tests alone.

### 4. Update docs
- Update anything the change affects: `README`, API docs, `docs/onboarding/*`, changelog, env-var docs.

## Output: write the review to the task folder
Write the result to **`tasks/TASK-<ID>/review.md`** (same `TASK-<ID>` as `spec.md`/`plan.md`) using the template below, then show the user a short summary.

```markdown
---
task: TASK-<ID>
title: <short title>
type: review
status: changes-requested   # changes-requested | approved
created: <YYYY-MM-DD HH:MM +TZ>
updated: <YYYY-MM-DD HH:MM +TZ>
---

# Review: <title>

## Gate Results
- Tests: <pass/fail + summary>
- Lint / format / type-check: <pass/fail>

## Acceptance Criteria
- [x] AC1 — verified
- [ ] AC2 — <why not met>

## Findings
- <bug / style deviation from how-to-code / plan deviation>, ref `path:line`

## Commit / PR Draft
<commit message; PR title + body if relevant>

## Follow-ups
- <known limitations or deferred work>

## Change History
- <YYYY-MM-DD HH:MM +TZ>: Reviewed.
```

## When done — prepare commit / PR
- Summarize what changed (files + behavior) and confirm all checks passed, stating results plainly (if a test fails or a step was skipped, say so).
- Put the **drafted** commit message + PR title/body in `review.md` for the user.
- **Do not run `git add` / `commit` / `push`** — the user runs these themselves. Hand them the drafted message to use.
- Set `status: approved` only when all `AC#`/`S#` are ticked and the gate is green; otherwise `changes-requested` and list what's missing in Findings.

## Next step
- **`approved`** — the task is done: hand the user the drafted commit/PR message; they run git themselves.
- **`changes-requested`** — ask the user whether to loop back: invoke the `coding` skill to address the Findings (or `debug` if a finding is a defect), then re-run this review. Keep the same `TASK-<ID>`; the Findings are the input for the fix.
