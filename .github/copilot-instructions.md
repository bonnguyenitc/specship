## Agent feature workflow (specship)

For any non-trivial change, follow `.specship/skills/WORKFLOW.md` and the
per-stage playbooks in `.specship/skills/<stage>/SKILL.md`.

Stages:

- `spec` → understand the request → `tasks/TASK-<ID>/spec.md`
- `plan` → design steps → `tasks/TASK-<ID>/plan.md`
- `coding` → implement (TDD or conventional), tick `S#`
- `review` → run the full gate, verify every `AC#` → `tasks/TASK-<ID>/review.md`
- `debug` → when a defect appears, log it in `tasks/TASK-<ID>/debug.md`, fix, resume
- `ship` → autopilot: given a feature request, run spec → plan → coding → review end-to-end
- `resume-task`, `pause-task`, `archive-task` → task lifecycle without losing pipeline state
- `research` → answer an external-fact question with the strongest search tool available (specialized MCP search first) → complete cited report in `docs/research/`

Maintain shared state in `tasks/TASK-<ID>/`: read `task.md` first, update it last,
keep IDs stable, and timestamp every log entry as `YYYY-MM-DD HH:MM +TZ` using
`date`. Only the pipeline stages and lifecycle skills write to `tasks/`.

Git follows WORKFLOW.md → "Git flow": each task runs on its own `task/TASK-<ID>` branch (created by `spec`) and every stage commits its own checkpoints there (`coding` per ticked `S#`), staging only explicitly listed files — never `git add -A`. Never push or merge; on approval `review` fills the Merge block in `review.md` and the user merges.
