---
trigger: always_on
description: Staged specship workflow with shared task state on disk
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

Git follows WORKFLOW.md → "Git flow": each task runs on its own `task/TASK-<ID>` branch (created by `spec`) and every stage commits its own checkpoints there (`coding` per ticked `S#`), staging only explicitly listed files — never `git add -A`. Never push or merge; on approval `review` fills the Merge block in `review.md` and the user merges.
