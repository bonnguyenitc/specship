---
name: debug
description: Diagnose and fix a bug methodically, and track the investigation in the owning task. Use when something is broken, a test fails, behavior is wrong, or asked to "debug X", "fix this bug", "why is this failing". Reproduces, finds root cause, fixes minimally, verifies, and records it in tasks/TASK-<ID>/debug.md. Attaches to the spec → plan → coding → review workflow whenever a defect appears.
---

# Debug

Goal: find the **root cause** of a defect and fix it with the smallest correct change — never patch symptoms. Record the investigation so it's not lost.

## When to use
- A test fails, the app misbehaves, or a regression appears.
- Asked to "debug", "fix this bug", or "why is this failing".
- Can be triggered at any point in the workflow (during `coding`, during `review`, or on a bug found later).

## Shared task state
Part of the task pipeline — see `../WORKFLOW.md` for the full contract. `debug` attaches to a task rather than being a fixed pipeline stage.
- **Hydrate:** resolve the owning `TASK-<ID>` (see "Attach the bug to a task" below), read its `task.md`, and `spec.md`/`plan.md` as needed. If no task owns it, create a new one.
- **Checkpoint:** append the `BUG#` entry to `debug.md`; update `task.md` — set `debug` artifact `open-bugs`/`clear`, set `status: blocked` while a blocker bug is open, bump `updated:`, append a Pipeline Log line. Return to the stage you came from when fixed.
- **Lessons:** read `tasks/LESSONS.md` at hydrate and apply its rules; if the bug's root cause was a process mistake (e.g. a skipped verify, a stale plan), fix the process trace too and append an `L#` entry there (see `../WORKFLOW.md` → Lessons).

## Attach the bug to a task
- **If the bug belongs to an existing task** (it's in code that task touched, or found during its `coding`/`review`): track it in that task's folder → `tasks/TASK-<ID>/debug.md`.
- **If it's a standalone bug with no task**: create a new `tasks/TASK-<ID>/` (sequential or from a ticket id) and record it there. A `spec.md` is optional for a pure bugfix, but always keep the debug record.
- If unsure which task owns it, ask the user before picking.

## Method — scientific debugging
Work from evidence, one hypothesis at a time. Don't guess-and-change.

1. **Reproduce** — get a reliable, minimal reproduction. Capture the exact error/stack, inputs, and environment. Ideally **write a failing test** that triggers the bug — it becomes the regression test.
2. **Locate** — narrow where it happens: read the stack trace, follow the data, add targeted logging or use the debugger, bisect if needed. Use `rtk grep` to trace the code path. For a deep, noisy investigation (large logs, many files), delegate the search to the **Explore** / `general-purpose` agent and ask only for the suspected location + evidence — then do the fix and verification yourself in this thread.
3. **Hypothesize** — state the suspected root cause explicitly before changing anything. Confirm it with evidence (a log, a value, a failing assertion), don't assume.
4. **Fix** — apply the **minimum** change that addresses the root cause. Stay surgical; don't refactor unrelated code or fix symptoms downstream.
5. **Verify** — the failing test now passes, the full suite stays green, and the original reproduction is gone.
6. **Prevent regression** — keep the test that reproduces it. Note if the same bug class could exist elsewhere.

If the root cause turns out to be a wrong/missing requirement, flag it back to `spec.md` (add an `R#`/edge case) rather than silently coding around it.

## Output: record the investigation in the task
Append the bug to **`tasks/TASK-<ID>/debug.md`** (create it if missing). Each bug is a `BUG#` entry — never renumber, only append — so it reads as a chronological debug log for the task.

```markdown
---
task: TASK-<ID>
title: <short title>
type: debug
created: <YYYY-MM-DD HH:MM +TZ>
updated: <YYYY-MM-DD HH:MM +TZ>
---

# Debug Log: TASK-<ID>

## BUG1 — <one-line summary>
- status: fixed        # investigating | fixed | wont-fix
- date: <YYYY-MM-DD HH:MM +TZ>
- symptom: <observed wrong behavior + error/stack>
- reproduce: <steps / failing test that triggers it>
- root cause: <the actual underlying cause, at `path:line`>
- fix: <what changed and why, files touched>
- regression test: <test name/path guarding it>
- related: <R#/AC#/S# affected, or other code with the same risk>
```

Update the entry's `status` as you go, and bump `updated:` on each change so the log tracks the fix over time.

## When done
- State plainly: reproduced? root cause found? fix verified with the full suite green?
- **Do not run `git add` / `commit` / `push`** unless the user asks.

## Next step
The `BUG#` entry and its regression test are the input for whatever stage resumes.

- **Interrupted `coding` or `review`** — once the fix is verified, **ask the user whether to resume that stage** — e.g. "Bug đã fix xong, bạn có muốn tôi tiếp tục coding/review không?". If yes, **immediately invoke that skill** (via the Skill tool); it re-hydrates from `task.md` and picks up where it left off.
- **Standalone bugfix** (no interrupted stage) — suggest the `review` skill to run the full gate and draft the commit message before handing off.
- If the user declines, stop here.
