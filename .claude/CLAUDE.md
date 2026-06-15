## Agent feature workflow (specship)

For any non-trivial change, follow the staged workflow: **spec → plan → coding →
review** (+ `debug` when a defect appears). The full contract is in
`.claude/skills/WORKFLOW.md`; each stage's playbook is in
`.claude/skills/<stage>/SKILL.md`.

These are native Claude Code skills — invoke `/spec`, `/plan`, `/coding`,
`/review`, `/debug`, `/explore-source`, or just describe the task and they
auto-trigger. `/ship <feature request>` is the autopilot: it runs spec → plan →
coding → review (+ debug) end-to-end without asking at each stage. `/resume-task`
picks up an in-progress task where it was left off — it locates the task, reports
where it stands, and resumes the right stage.

Maintain the shared task state in `tasks/TASK-<ID>/` as the contract specifies:
read `task.md` on start, update it on finish; keep IDs (`R#`/`AC#`/`S#`/`BUG#`)
stable; timestamp every log entry as `YYYY-MM-DD HH:MM +TZ` (get it from `date`).
Only the pipeline stages write to `tasks/`. Don't run git add/commit/push unless asked.
