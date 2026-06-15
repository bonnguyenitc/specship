---
name: resume-task
description: Pick up an in-progress task exactly where it was left off — locate it, report where it stands, and continue from the current stage. Use when returning after a break or context reset, or when asked to "resume", "continue the task", "pick up where we left off", "tiếp tục task", "đang làm tới đâu rồi". Entry point over the stage skills; the interactive counterpart to ship.
---

# Resume Task

Goal: given little or no context, **re-enter an existing task** — find it, reconstruct where it stands from the on-disk state, and hand off to the right stage skill so work continues without redoing finished stages.

Task state lives on disk (`tasks/TASK-<ID>/`), not in the chat session — that's exactly what makes resuming possible. This skill turns that durable state back into momentum.

`resume-task` is an **entry point, not a stage**: it doesn't produce its own artifact. It reads the shared state, reports it, and invokes the correct stage skill. It's the **interactive** counterpart to `ship` — where `ship` auto-advances every handoff, `resume-task` resumes one stage and then follows the normal per-stage checkpoints (ask before advancing).

## When to use
- You're starting a fresh session and want to continue a task already underway.
- After a context reset, an interruption, or switching away and back.
- The user asks where a task stands, or to "continue / pick up / resume" — and you need to reconstruct state before acting.
- Not for starting new work (use `spec` / `ship`) and not for mapping an unfamiliar codebase (use `explore-source`).

## Shared task state
Part of the task pipeline — see `../WORKFLOW.md` for the full contract. `resume-task` reads the shared state and delegates; the stage skill it invokes does the writing.
- **Hydrate:** read `tasks/LESSONS.md` if present (apply its rules) and the target task's `task.md` + its artifacts (below).
- **Checkpoint:** `resume-task` itself writes nothing to `task.md`. Log one dated Pipeline Log line only if you **repair a missing trace** while reconstructing state (see `../WORKFLOW.md` → Flow integrity); otherwise the resumed stage skill does all the checkpointing.

## Method

**Input:** an optional task id argument. Accept it in any form — `resume-task 007`, `resume-task 7`, or `resume-task TASK-007` — and **normalize** to the on-disk folder name (`TASK-<ID>`): a bare number maps to `tasks/TASK-<number>/` matched as written (don't re-pad or strip leading zeros — match the actual folder, e.g. `7` and `007` both resolve to `TASK-007` if that's the folder). A non-numeric id (e.g. a ticket key like `PROJ-123`) maps to `TASK-PROJ-123`. If no argument is given, auto-detect (step 1.2).

### 1. Locate the task
Resolve which `TASK-<ID>` to resume, in order:
1. An explicit id argument (`007`, `7`, `TASK-007`, normalized as above) or one named in the conversation. If the normalized folder doesn't exist under `tasks/`, list the available tasks and ask — don't start a new one.
2. Otherwise, scan `tasks/TASK-*/task.md` and pick the **most recently `updated:`** one. If several are close or any is `status: active`/`blocked`, **list the candidates** (id, title, stage, status, `updated:`) and let the user choose — don't silently guess.
3. If `tasks/` has no task, say so and suggest `/spec <request>` (or `/ship`) to start one.

### 2. Reconstruct state
Read the chosen task's `task.md` (frontmatter `stage` / `status` / `artifacts`, the **Now** block, and the **Pipeline Log**), then the artifacts that matter for the current stage (`spec.md`, `plan.md`, `review.md`, `debug.md`). Cross-check that the recorded `stage`/`artifacts` match what's actually on disk — if they disagree, that's a missing/stale trace: repair it per the contract before resuming, and record a lesson.

### 3. Report where it stands
Give the user a tight status read before doing anything:
- **Task**: id + title, current `stage` / `status`.
- **Done**: ticked `S#` / `AC#`, confirmed/approved artifacts.
- **Blocking**: `status: blocked`, any open blocker `Q#` in `spec.md`, open `BUG#` in `debug.md`, or `review: changes-requested` findings.
- **Next**: the one concrete action to move forward (the resume point from step 4).

### 4. Pick the resume point
Derive the next stage from `task.md` — honor **flow integrity** (no skipping upstream stages; resolve blockers before advancing):

| Current state | Resume into |
|---|---|
| `status: blocked` / `debug: open-bugs` (open `BUG#`) | `debug` — fix to root cause first, then back to the interrupted stage |
| `review: changes-requested` | `coding` (or `debug` for a defect) with the Findings as input, then re-run `review` |
| `stage: spec`, `spec: draft` (or open blocker `Q#`) | `spec` — finish/confirm it |
| `spec: confirmed`, `plan` missing/`draft` | `plan` |
| `plan: approved`, `coding` missing/`in-progress` | `coding` |
| `coding: done`, `review` missing | `review` |
| `status: done` | nothing to resume — report it's complete (and the commit/PR draft in `review.md` if not yet shipped) |

If an upstream artifact a stage needs is missing or not in the required status, run that earlier skill first — never resume ahead silently.

### 5. Resume
Confirm with the user — e.g. "Task đang ở stage `<stage>`, tiếp tục với `<next>` chứ?" — then **invoke the resume-point skill via the Skill tool** so work continues in the same flow. The invoked stage skill takes over the contract from there (its own hydrate, work, checkpoint, and per-stage "ask before advancing").

- If the user wants the rest of the pipeline run autonomously instead of stage-by-stage, hand off to `ship` (it resumes mid-pipeline from the current stage).
- If the user just wanted a status read, stop after step 3 — don't auto-resume.

## When done
`resume-task` is done once it has handed off to the resume-point skill (or reported a `done`/empty state). Don't claim any stage's work as finished — that's the resumed skill's job to report.
