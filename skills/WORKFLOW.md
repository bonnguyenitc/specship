# Task Workflow — Shared State Contract

All task skills (`spec`, `plan`, `coding`, `review`, `debug`) cooperate on one task by reading and writing **shared artifacts** in a single folder. This file is the canonical contract every skill follows so handoffs are seamless. `explore-source` is separate — it produces project-wide docs in `docs/onboarding/` that the task skills consume as the convention reference.

## Pipeline

```
explore-source ──▶ docs/onboarding/{source-structure, how-to-code, what-is-stack, how-to-deploy}.md
                         │ (convention reference, read by every task skill)
                         ▼
spec ──▶ plan ──▶ coding ──▶ review ──▶ done
                    ▲           │
                    └─ debug ◀──┘   (debug attaches to the task whenever a defect appears)
```

Each arrow is a checkpoint: the skill asks the user before auto-advancing to the next.

## Task folder layout

```
tasks/TASK-<ID>/
├── task.md      # SHARED STATE — index + state machine for the whole task (source of truth)
├── spec.md      # spec skill   — requirements (R#), acceptance criteria (AC#)
├── plan.md      # plan skill   — steps (S#), each covers: R#/AC#
├── review.md    # review skill — gate results, AC verification, commit/PR draft
└── debug.md     # debug skill  — chronological bug log (BUG#)
```

### Choosing `TASK-<ID>`
Reuse an existing ticket id (Jira/GitHub issue) → `TASK-PROJ-123`; otherwise the next sequential number by scanning `tasks/TASK-*` → `TASK-001`.

## The shared state file — `task.md`

The single source of truth for "where is this task". Every skill reads it first and updates it last.

```markdown
---
task: TASK-<ID>
title: <short title>
stage: spec          # spec | plan | coding | review | done
status: active       # active | blocked | done
created: <YYYY-MM-DD HH:MM>
updated: <YYYY-MM-DD HH:MM>
artifacts:
  spec: spec.md       # status: missing | draft | confirmed
  plan: plan.md       # status: missing | draft | approved
  coding: -           # status: missing | in-progress | done
  review: review.md   # status: missing | changes-requested | approved
  debug: debug.md     # status: missing | open-bugs | clear
---

# Task: <title>

## Now
- Stage: <stage> — <one-line of what's happening / what's next>
- Blocked by: <none | what>

## Pipeline Log
- <YYYY-MM-DD HH:MM> spec: confirmed
- <YYYY-MM-DD HH:MM> plan: approved
- <YYYY-MM-DD HH:MM> coding: 3/5 steps done
- <YYYY-MM-DD HH:MM> debug: BUG1 fixed
```

## Shared-state protocol (every task skill follows this)

1. **Hydrate (on start).** Resolve the active `TASK-<ID>` (from the user, the conversation, or the most recently updated `tasks/TASK-*`). Read `task.md` to learn the current stage/status, then read the upstream artifacts you depend on (see "Reads" below). If a required upstream artifact is missing, run its skill first (or ask the user).
2. **Work.** Do the skill's job, grounded in those artifacts. Cross-reference by ID (`R#`, `AC#`, `S#`, `BUG#`) — never invent parallel numbering.
3. **Checkpoint (on end).** Write/update your own artifact, then update `task.md`: bump `updated:`, set `stage`/`status`, update the matching `artifacts:` line, and append a dated **Pipeline Log** entry. Then ask the user before auto-advancing to the next skill.

### Per-skill reads / writes

| Skill   | Reads                                                                 | Writes                                  | Sets in task.md                          |
|---------|-----------------------------------------------------------------------|-----------------------------------------|------------------------------------------|
| `spec`  | the ticket/request; `docs/onboarding/*` if present                    | `task.md` (creates), `spec.md`          | stage=spec, spec=draft→confirmed         |
| `plan`  | `task.md`, `spec.md`, `docs/onboarding/{source-structure,how-to-code}` | `plan.md`                               | stage=plan, plan=draft→approved          |
| `coding`| `task.md`, `plan.md`, `spec.md`, `docs/onboarding/how-to-code`        | code, ticks `S#` in `plan.md`           | stage=coding, coding=in-progress→done    |
| `review`| `task.md`, `spec.md`, `plan.md`, `docs/onboarding/how-to-code`, diff  | `review.md`, ticks `AC#`                | stage=review→done, review=…, status=done |
| `debug` | `task.md`, `spec.md`/`plan.md` as needed, the failing repro           | `debug.md`, regression test             | debug=open-bugs→clear, status=blocked?   |

## ID & status conventions (shared vocabulary)

- **IDs are append-only and stable:** `R#` (requirement), `AC#` (acceptance criterion), `S#` (step), `BUG#`. Never renumber — downstream artifacts reference them. To drop one, strike it through with a timestamp (`~~R2 (removed 2026-06-11 17:12 +07)~~`), don't delete.
- **Checkboxes track progress:** `coding` ticks `S#` in `plan.md`; `review` ticks `AC#` in `spec.md`. An unticked `S#`/`AC#` means not done.
- **Timestamp format:** every `created:` / `updated:`, Change History, and Pipeline Log entry uses **`YYYY-MM-DD HH:MM` with the timezone offset** (e.g. `2026-06-11 17:12 +07`) — date alone is not enough to order changes within a day. Get the real current time (e.g. `date "+%Y-%m-%d %H:%M %Z"`), never guess it.
- **Every file carries `created:`/`updated:` + a Change/Pipeline log** so changes are traceable over time. Edit artifacts in place; never fork a v2 file.
- **Upstream change invalidates downstream:** if `spec.md` changes after `plan.md` exists, the plan (and review) may be stale — note it in the Pipeline Log and revisit.
