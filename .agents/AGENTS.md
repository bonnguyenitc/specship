## Agent feature workflow (specship)

For any non-trivial change, follow the staged workflow: **spec → plan → coding →
review** (+ `debug` when a defect appears).

Read the first workflow contract that exists:

1. `.codex/skills/WORKFLOW.md` — Codex native install.
2. `.agents/skills/WORKFLOW.md` — AGENTS.md-compatible install.

Then run the stage that fits the request, following its playbook in the matching
skills directory:

- `spec` → understand the request → `tasks/TASK-<ID>/spec.md`
- `plan` → design steps → `tasks/TASK-<ID>/plan.md`
- `coding` → implement (TDD or conventional), tick `S#`
- `review` → run the full gate, verify every `AC#` → `tasks/TASK-<ID>/review.md`
- `debug` → when a defect appears, log it in `tasks/TASK-<ID>/debug.md`, fix, resume
- `ship` → autopilot: given a feature request, run spec → plan → coding → review end-to-end
- `resume-task` → re-entry: locate an in-progress (or paused) task, report where it stands, resume the right stage
- `pause-task` / `archive-task` → lifecycle: shelve a task as `paused`, or move it into `tasks/archive/`; both keep pipeline state intact

Maintain the shared state in `tasks/TASK-<ID>/`: read `task.md` on start, update
it on finish; keep IDs (`R#`/`AC#`/`S#`/`BUG#`) stable; timestamp every log entry
as `YYYY-MM-DD HH:MM +TZ` (get it from `date`, don't guess).

Conventions live in `docs/onboarding/` — read `how-to-code.md` before writing code
and `source-structure.md` to decide where it goes (run `explore-source` to generate
them if missing). Only the pipeline stages and lifecycle skills
(`pause-task`/`archive-task`/`resume-task`) write to `tasks/`. Don't run
git add/commit/push unless asked.
