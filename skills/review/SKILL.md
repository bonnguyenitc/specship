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
- **Blocked?** If the review can't complete because of an external dependency (a staging env, access, or sign-off it's waiting on), set `status: blocked`, note it in `Blocked by:`, and log it; flip back to `active` when it clears. A *blocker defect* found in review goes through `debug` (which sets `blocked` itself). `blocked` is involuntary — to set the task aside by choice, use `pause-task`. See `../WORKFLOW.md` → Status values.
- **Lessons:** read `tasks/LESSONS.md` at hydrate and apply its rules; if you detect a process mistake (in this stage or an earlier one), fix it and append an `L#` entry there (see `../WORKFLOW.md` → Lessons).

## Method

### 0. Load the artifacts
Read the files the earlier stages produced so the review is grounded, not generic:
- `tasks/TASK-<ID>/spec.md` — requirements, acceptance criteria, edge cases.
- `tasks/TASK-<ID>/plan.md` — the intended approach and steps.
- `docs/onboarding/how-to-code.md` + `source-structure.md` — the code-style and placement rules.

### 1. Review the diff — independent eyes for bugs, task-grounded eyes for fit

Split the review by what kind of signal each check needs. **You wrote (or drove) this code, so you are the weakest judge of its correctness** — don't rely on re-reading your own diff to catch your own bugs. Get a fresh, context-free pass for that, and keep for yourself only the checks that need the task's context.

**a. Delegate correctness bug-hunting to `/code-review`** (an independent reviewer with fresh context):
- Invoke the `code-review` skill (via the Skill tool) at an appropriate effort — it reads the working diff and reports correctness bugs, missed edge cases, and reuse/simplification/efficiency findings without the bias of having just written the code.
- Treat its output as input: fold every finding into your **Findings** below. For a genuine defect, hand it to `debug` (it gets a `BUG#` + regression test); don't just hand-wave it.

**b. Keep the task-grounded checks here** (these need `spec.md`/`plan.md`/onboarding context that an independent pass doesn't have):
- **Coverage sweep — nothing missed, both ways.** Walk `spec.md` top-down: every `R#` and `AC#` maps to a ticked `S#` in `plan.md`, and the diff actually contains that step's change. Then the reverse: every changed line traces to a planned step / spec requirement — flag anything unrelated or speculative. An `R#` no ticked step covers means the work isn't done, however green the gate is.
- **Audit the test diff for weakened checks.** Look specifically at changes to tests and checks: loosened assertions, deleted or skipped cases (`.skip`, `xit`), blindly-updated snapshots, widened types. Each one is legitimate only if traced to a spec/plan change (Change History line) — untraced, it's a `blocker` finding, because it silently redefines "done".
- Cross-check the diff against each `spec.md` **edge case** — confirm it's actually handled, not just assumed. Confirm the spec's **Assumptions** still hold in the implementation.
- Check the change followed the plan — every deviation must already be traced in `plan.md` (inline note / Change History per the `coding` contract); flag any untraced drift.
- **Check code style against `docs/onboarding/how-to-code.md`** — verify the documented rules: correct placement (right folder/file), naming, module size/responsibility, layer separation, error handling, logging, imports. Flag every deviation. If that file doesn't exist, fall back to matching neighbouring code.

### 2. Run the full gate
- Run the **entire** test suite, not just the tests for the last step — catch regressions elsewhere.
- Run lint, format check, and type-check as the project defines them (the exact commands from `docs/onboarding/how-to-code.md`).
- **Don't proceed until these are green.** If something fails, report it plainly with the output and fix before continuing. For a non-obvious failure, use the `debug` skill (it records the fix in `tasks/TASK-<ID>/debug.md`) and resume the review.

### 3. Verify against acceptance criteria
- Walk through each `AC#` in `spec.md` and confirm it's met by **running its `verify:` check** (the test/command/observation the spec attached to it) — tick `- [x]` only on a green result, not on judgement, and quote the outcome. If an `AC#` has no `verify:`, that's a spec gap: flag it as a Finding and don't tick it on a guess. Any unchecked `AC#` or `S#` means the work isn't done.
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
<!-- source: code-review (independent) | self (task-grounded); severity: blocker (must fix before approve) | minor (may ship as follow-up) -->
<!-- checkbox = addressed; tick it on re-review once the fix is verified -->
- [ ] [code-review][blocker] <correctness bug / missed edge case>, ref `path:line`
- [ ] [self][minor] <style deviation from how-to-code / simplification>, ref `path:line`

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
- **Approval gate:** set `status: approved` only when all `AC#`/`S#` are ticked, the gate is green, and **no unaddressed `blocker` finding remains**. Open `minor` findings don't block approval — move them to **Follow-ups** explicitly (never drop them silently). Anything else is `changes-requested`, with what's missing listed in Findings.

## Next step
- **`approved`** — the task is done: hand the user the drafted commit/PR message; they run git themselves.
- **`changes-requested`** — ask the user whether to loop back: invoke the `coding` skill to address the Findings (or `debug` if a finding is a defect), then re-run this review. Keep the same `TASK-<ID>`; the Findings are the input for the fix. (Under `ship`, loop back automatically — its loop cap applies.)
- **Re-review after a loop-back is targeted, not from scratch:** re-run the full gate (step 2 — always), then for each finding verify its fix and tick its checkbox in `review.md`, re-verify only the `AC#`s the fixes touch, and diff-review only the new changes. Don't re-litigate code that didn't change — but a fix that touches new files gets the full task-grounded checks on those files. Update `review.md` in place (bump `updated:`, Change History line), never fork a second review file.
