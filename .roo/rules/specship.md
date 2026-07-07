---
description: Staged specship workflow with shared task state on disk
alwaysApply: true
---

## Agent feature workflow (specship)

For any non-trivial change, follow `.specship/skills/WORKFLOW.md` and the
per-stage playbooks in `.specship/skills/<stage>/SKILL.md` (spec → plan →
coding → review; debug as needed; `ship` runs the full flow end-to-end).

Maintain shared state in `tasks/TASK-<ID>/`: read `task.md` first, update it last,
keep IDs stable (`R#`, `AC#`, `S#`, `BUG#`), and timestamp every log entry as
`YYYY-MM-DD HH:MM +TZ` using `date`.

Read `docs/onboarding/how-to-code.md` before writing code and
`docs/onboarding/source-structure.md` to decide where changes belong; run
`explore-source` to generate those docs if missing. Only pipeline stages and
lifecycle skills (`pause-task`/`archive-task`/`resume-task`) write to `tasks/`.
Don't run git add/commit/push unless asked.
