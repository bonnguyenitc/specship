---
name: pause-task
description: Deliberately set an in-progress task aside without losing its place — mark it paused with a reason, leaving all pipeline state intact. Use when shelving work to pick up later, or when asked to "pause", "park", "hold this task", "tạm dừng task", "để task này lại sau". The inverse of resume-task; for status, not pipeline progress.
---

# Pause Task

Goal: **shelve a task on purpose** — record that it's intentionally set aside (`status: paused`) with a reason, while preserving its pipeline `stage` and every artifact exactly as they are, so `resume-task` can pick it up later with zero loss.

`paused` is a deliberate choice, distinct from `blocked` (stuck on an external dependency, not by choice) and from `done` (finished). `pause-task` is a **lifecycle skill, not a stage**: it touches only `status` and the log — never `stage` or `artifacts:`. It's the inverse of `resume-task`.

## When to use
- You're stepping away from a task and want it clearly marked so it isn't mistaken for active work, and isn't auto-picked when resolving "the current task".
- The user asks to pause / park / hold a task.
- Not for tasks stuck on a dependency (that's just `status: blocked`, set by the stage skill) and not for finished work (use `archive-task`).

## Shared task state
Part of the task pipeline — see `../WORKFLOW.md` → "Task lifecycle". Unlike `resume-task`, this skill **does** write `tasks/` — that's its job.

## Method

**Input:** an optional task id argument in any form (`pause-task 007`, `pause-task 7`, `pause-task TASK-007`), normalized to the on-disk folder name `TASK-<ID>` (a non-numeric ticket key like `PROJ-123` → `TASK-PROJ-123`). No argument → resolve the current task (below).

1. **Locate** the task: the normalized id argument, one named in conversation, else the most-recently-`updated:` task under `tasks/TASK-*` (skip `tasks/archive/*` and any `status: paused` task — already-shelved tasks aren't auto-picked). If several are active or it's ambiguous, list candidates and ask — don't guess.
2. **Check it's pausable:** the task must be `active` or `blocked`. If it's already `paused`, say so and stop. If it's `done`, suggest `archive-task` instead.
3. **Get the reason:** use the reason the user gave; if none, ask one line ("Tạm dừng vì lý do gì?") so the pause is self-explanatory later. Don't invent one.
4. **Write the state** in `tasks/TASK-<ID>/task.md` — get the real time first (`date "+%Y-%m-%d %H:%M %Z"`):
   - set `status: paused`; **leave `stage` and every `artifacts:` value untouched**.
   - bump `updated:`.
   - in the **Now** block, note it's paused and why (e.g. `- Blocked by: none (paused — waiting on design)`).
   - **Snapshot the working tree:** check `git status` — if this task's work sits uncommitted, list the mid-flight files in the **Now** block (e.g. `- In flight: src/auth.ts, src/auth.test.ts (uncommitted)`), so resuming doesn't mistake them for another task's changes. Suggest the user stash or WIP-commit before switching tasks — don't run git yourself.
   - append a dated **Pipeline Log** line: `- <YYYY-MM-DD HH:MM +TZ> paused: <reason>`.
5. **Confirm** to the user: which task, what stage it's frozen at, and that `/resume-task <ID>` brings it back exactly here.

## When done
Report the task id, the stage it's paused at, and the reason logged. Don't run any stage work — pausing only changes status. To bring it back, the user runs `resume-task`.
