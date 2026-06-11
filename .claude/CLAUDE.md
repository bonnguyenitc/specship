## Agent feature workflow (specship)

For any non-trivial change, follow the staged workflow: **spec → plan → coding →
review** (+ `debug` when a defect appears). The full contract is in
`.claude/skills/WORKFLOW.md`; each stage's playbook is in
`.claude/skills/<stage>/SKILL.md`.

These are native Claude Code skills — invoke `/spec`, `/plan`, `/coding`,
`/review`, `/debug`, `/explore-source`, or just describe the task and they
auto-trigger.

Maintain the shared task state in `tasks/TASK-<ID>/` as the contract specifies:
read `task.md` on start, update it on finish; keep IDs (`R#`/`AC#`/`S#`/`BUG#`)
stable; timestamp every log entry as `YYYY-MM-DD HH:MM +TZ` (get it from `date`).
Only the pipeline stages write to `tasks/`. Don't run git add/commit/push unless asked.
