---
name: archive-task
description: Shelve a task out of the active set by moving its whole folder into tasks/archive/, history intact, so active scans stay clean. Use for finished or abandoned tasks, or when asked to "archive", "shelve", "put this task away", "lưu trữ task", "dọn task xong". Reversible — resume-task restores it. Lifecycle skill, not a stage.
---

# Archive Task

Goal: **move a task out of the active working set** by relocating its folder `tasks/TASK-<ID>/` → `tasks/archive/TASK-<ID>/`, preserving every file and the full history. This keeps `tasks/` focused on live work and stops finished/abandoned tasks from cluttering "current task" scans — without deleting anything.

`archive-task` is a **lifecycle skill, not a stage**: it changes only the task's location (and logs why), never its `stage` or `artifacts:`. It's reversible — `resume-task <ID>` finds an archived task and restores it.

## When to use
- A task is `done` and you want it off the active list.
- A task is being abandoned/superseded and shouldn't show up as live work.
- The user asks to archive / shelve / put away a task.
- Not for tasks you'll resume soon (use `pause-task` — it stays in place) and never to delete history (archiving moves, never removes).

## Shared task state
Part of the task pipeline — see `../WORKFLOW.md` → "Task lifecycle". This skill **writes** `tasks/` (it moves a folder); archived ids are retired and never reused for new tasks.

## Method

**Input:** an optional task id argument in any form (`archive-task 007`, `archive-task 7`, `archive-task TASK-007`), normalized to the on-disk folder name `TASK-<ID>` (a non-numeric ticket key like `PROJ-123` → `TASK-PROJ-123`). No argument → resolve the current task (below).

1. **Locate** the task: the normalized id argument, one named in conversation, else the most-recently-`updated:` task under `tasks/TASK-*` (skip `tasks/archive/*`, and don't auto-pick a `status: paused` task — to archive a paused one, name it explicitly). If ambiguous, list candidates and ask — don't guess. If the folder doesn't exist, say so; don't create anything.
2. **Confirm intent — this moves a folder.** State which task and its current `stage`/`status`, then:
   - If `status: done` → proceed (still confirm once). **But first check the draft shipped:** if `review.md` holds a commit/PR draft, look for a matching commit (`git log`) — if none exists, the work may be finished but unshipped; surface the draft to the user before archiving so it doesn't get buried in `archive/`.
   - If **not** done (active / blocked / paused — unfinished work) → **ask the user to confirm** archiving unfinished work, and capture a reason (e.g. "superseded by TASK-012"). Never archive live work silently.
3. **Log before moving** — get the real time (`date "+%Y-%m-%d %H:%M %Z"`), then in `tasks/TASK-<ID>/task.md`: bump `updated:` and append a dated **Pipeline Log** line `- <YYYY-MM-DD HH:MM +TZ> archived: <reason>`. **Leave `stage` and `artifacts:` untouched.**
4. **Move the folder** to `tasks/archive/TASK-<ID>/` (create `tasks/archive/` if missing). Move the whole folder intact — every artifact comes along. Don't `git rm`/`git mv` or commit unless the user asks.
5. **Confirm** to the user: the task is archived at `tasks/archive/TASK-<ID>/`, and `/resume-task <ID>` restores it if needed.

## When done
Report the task id, where it moved, and the reason. The task no longer appears in active scans; nothing was deleted.
