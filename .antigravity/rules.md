---
description: Staged spec→plan→coding→review workflow with shared task state on disk
alwaysApply: true
---

## Agent feature workflow (specship)

For any non-trivial change, follow the staged workflow defined in
`.agent/skills/WORKFLOW.md`:

1. Read `.agent/skills/WORKFLOW.md` — the shared-state contract.
2. Run the stage that fits the request, following its playbook in
   `.agent/skills/<stage>/SKILL.md`:
   - `spec` → understand the request → `tasks/TASK-<ID>/spec.md`
   - `plan` → design steps → `tasks/TASK-<ID>/plan.md`
   - `coding` → implement (TDD or conventional), tick `S#`
   - `review` → run the full gate, verify every `AC#` → `tasks/TASK-<ID>/review.md`
   - `debug` → when a defect appears, log it in `tasks/TASK-<ID>/debug.md`, fix, resume
3. Maintain the shared state in `tasks/TASK-<ID>/`: read `task.md` on start, update
   it on finish; keep IDs (`R#`/`AC#`/`S#`/`BUG#`) stable; timestamp every log entry
   as `YYYY-MM-DD HH:MM +TZ` (get it from `date`, don't guess).
4. Ask the user before auto-advancing to the next stage.

Conventions live in `docs/onboarding/` — read `how-to-code.md` before writing code
and `source-structure.md` to decide where it goes. Only the pipeline stages write
to `tasks/`. Don't run git add/commit/push unless asked.
