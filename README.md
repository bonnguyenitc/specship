<p align="center">
  <img src="assets/logo-specship-full-bg.png" alt="specship logo" width="132" style="border-radius: 24px;">
</p>

<h1 align="center">specship</h1>

<p align="center">
  A staged <strong>spec → plan → coding → review</strong> workflow for shipping AI-assisted code with durable handoffs.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/specship"><img alt="npm version" src="https://img.shields.io/npm/v/specship?style=flat-square"></a>
  <a href="https://www.npmjs.com/package/specship"><img alt="npm downloads" src="https://img.shields.io/npm/dm/specship?style=flat-square"></a>
  <img alt="node version" src="https://img.shields.io/badge/node-%3E%3D16-222?style=flat-square">
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-222?style=flat-square"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#workflow">Workflow</a> ·
  <a href="#commands">Commands</a> ·
  <a href="#contributing">Contributing</a> ·
  <a href="https://github.com/bonnguyenitc/specship/releases">Changelog</a>
</p>

<p align="center">
  <img src="assets/specship-banner.png" alt="specship — spec → plan → coding → review, then ship" width="100%" style="border-radius: 16px;">
</p>

## Why specship

specship installs a repeatable agent workflow into any project. One command drops
in the skill playbooks and writes the right config file at each AI coding
agent's native location.

| What you get | Why it matters |
| --- | --- |
| **Staged work** | Requirements, plans, code, and review each get their own explicit checkpoint. |
| **Disk-backed state** | Any agent or human can resume from `tasks/TASK-<ID>/` without relying on chat history. |
| **Native agent setup** | Claude Code, Codex, Cursor, and Antigravity receive their files in the paths they already expect. |
| **Reviewable artifacts** | Specs, plans, bug logs, and review notes stay in the repo as durable project context. |

## Quick Start

Requires [Node.js](https://nodejs.org) >= 16.

```bash
npx specship init --claude        # Claude Code
npx specship init --codex         # Codex
npx specship init --cursor        # Cursor
npx specship init --all           # all of the above (+ Antigravity)
```

After installing:

1. Map the codebase once with `/explore-source`.
2. Start a task with `/spec <ticket or feature request>`.
3. Approve each checkpoint as the task flows through `plan → coding → review`.

Use `ship` when you want the whole pipeline to run from one request:

```bash
/ship implement login
```

Coming back later or setting work aside? `/resume-task` picks up where you left
off, `/pause-task` shelves a task as `paused`, and `/archive-task` moves a
finished one into `tasks/archive/` — see [Task lifecycle](#task-lifecycle).

## Workflow

```text
explore-source ──▶ docs/onboarding/*        (one-time: learn the codebase)
                        │  read by every stage
                        ▼
spec ──▶ plan ──▶ coding ──▶ review ──▶ done
                   ▲           │
                   └─ debug ◀──┘           (attaches whenever a bug appears)
```

Every task lives in its own folder:

```text
tasks/
├── LESSONS.md       # project-wide process lessons (L#), read by every stage
├── archive/         # shelved tasks (archive-task) — skipped by active scans
│   └── TASK-000/    # a whole task folder moved here intact
└── TASK-001/
    ├── task.md      # SHARED STATE — stage, status, pipeline log
    ├── spec.md      # requirements (R#), acceptance criteria (AC#)
    ├── plan.md      # ordered steps (S#), each tracing to R#/AC#
    ├── review.md    # gate results, AC verification, commit/PR draft
    └── debug.md     # chronological bug log (BUG#)
```

Because state is on disk, not hidden in a chat session, any agent or human can
pick up a task exactly where the last one left off.

### Task lifecycle

A task has two independent axes:

- **`stage`** — *where the work is* in the pipeline: `spec → plan → coding → review → done`.
- **`status`** — *whether it's being worked on*: `active`, `blocked` (stuck on an
  external dependency), `paused` (deliberately shelved), or `done`.

The `status` axis moves like this (the `stage` axis is untouched throughout):

```text
                         pause-task
            ┌──────────────────────────────────▶ paused
  spec ──▶ active ◀──────────────────────────────┘
            │  ▲              resume-task
            │  │
   stage    │  │  dependency appears / clears
   skills   ▼  │
          blocked

  review approved:   active ──▶ done

  archive-task:   any status ─────────────▶  archived  (folder → tasks/archive/)
   active │ blocked │ paused │ done             │
                                                │  resume-task <ID>
                              active  ◀─────────┘  (move folder back + restore status)
```

- `active ↔ blocked` is set by the **stage skills** (a dependency appears /
  clears) — not a lifecycle action.
- `pause-task` / `resume-task` toggle `active ↔ paused`.
- `archive-task` moves **any** status into `archive/`; `resume-task <ID>` moves it
  back and re-activates it.

Three lifecycle skills move a task around the pipeline **without ever changing its
`stage` or artifacts** — they touch only `status` and location, and every
transition leaves a dated Pipeline Log line:

| Skill | Effect | Reverse |
| --- | --- | --- |
| `/resume-task [ID]` | Locate a task, reconstruct its state from disk, report where it stands, and resume the right stage. With no ID it picks the most recently updated **active** task (never an archived or `paused` one). | — (it's the entry point) |
| `/pause-task [ID]` | Mark a task `status: paused` with a reason, leaving it in place. It won't be mistaken for active work or auto-picked. | `/resume-task <ID>` flips it back to `active`. |
| `/archive-task [ID]` | Move a finished or abandoned task's folder into `tasks/archive/`, history intact, so active scans stay clean. Nothing is deleted. | `/resume-task <ID>` finds it in `archive/` and moves it back. |

Pipeline state is always preserved: pausing, archiving, and restoring never change
`stage` or any artifact — resuming continues exactly where the work stopped. A task
that was both paused **and** archived is fully re-activated on resume (moved out of
`archive/` *and* flipped back to `active`).

## Stages

| Stage | Output | Done when |
| --- | --- | --- |
| `explore-source` | `docs/onboarding/{source-structure, how-to-code, what-is-stack, how-to-deploy}.md` | The codebase map exists and can be read by every later stage. |
| `spec` | `tasks/TASK-<ID>/task.md` + `spec.md` | Requirements, acceptance criteria, boundaries, and open questions are `confirmed`. |
| `plan` | `plan.md` | Ordered steps trace back to `R#`/`AC#` and each step has a verify check. |
| `coding` | Code changes + checked-off `S#` items | Each planned step is implemented minimally and verified. |
| `review` | `review.md` | The full gate passes, `AC#` items are verified, and a commit/PR draft is written. |
| `debug` | `debug.md` | A defect is reproduced, fixed minimally, and verified with regression coverage when possible. |
| `ship` | A complete task run | `spec → plan → coding → review` runs end to end, stopping only on blockers. |

`explore-source` and `ship` are not stages either: `explore-source` is a one-time
codebase mapping that every stage reads, and `ship` is an orchestrator that runs
the four stages back to back.

### Lifecycle skills

These manage a task's `status` and location around the pipeline — see
[Task lifecycle](#task-lifecycle) for the full picture. They never change `stage`
or artifacts.

| Skill | Output | Done when |
| --- | --- | --- |
| `resume-task` | Re-entry into an existing task | The task is located (un-shelved first if paused/archived), its state reconstructed from disk and reported, and the correct stage skill resumed. |
| `pause-task` | A task marked `paused` | The task is deliberately shelved with a reason; pipeline stage and artifacts are left intact for later resume. |
| `archive-task` | A task moved to `tasks/archive/` | A finished or abandoned task is moved out of the active set, history preserved; `resume-task` can restore it. |

### Checkpoints

Stages never auto-advance by default. At the end of each stage, the agent
updates shared state, summarizes, and asks before moving on:

```text
spec → "plan it?"
plan → "start coding?"
coding → "review it?"
```

Approving moves the task into the next stage. Declining stops with everything
saved on disk. Invoking `ship` grants that approval up front for one task, then
stops only on blocker questions, destructive actions, or review failures.

## Commands

| Command | What it does |
| --- | --- |
| `init <agents>` | Install the workflow for `--claude`, `--codex`, `--cursor`, `--antigravity`, or `--all`. |
| `update` | Refresh skills and config for whatever agents are already installed in the project. |
| `list` | Show which agents are installed here. |

Options:

| Option | Meaning |
| --- | --- |
| `--dir <path>` | Target project. Defaults to the current working directory. |
| `--force` | Overwrite modified skill files. By default, local edits are kept. |
| `-v`, `--version` | Print the CLI version. |
| `-h`, `--help` | Print help. |

```bash
npx specship update
npx specship list
```

## What `init` Installs

For each agent, `init` copies the skills to that agent's skills folder and
writes or merges its config pointer at the correct native path.

| Agent | Skills | Config | Mode |
| --- | --- | --- | --- |
| `--claude` | `.claude/skills/` | `CLAUDE.md` | merge |
| `--codex` | `.codex/skills/` | `AGENTS.md` | merge |
| `--cursor` | `.cursor/skills/` | `.cursor/rules/specship.mdc` | write |
| `--antigravity` | `.agent/skills/` | `.agent/rules/specship.md` | write |

`merge` inserts an idempotent `<!-- specship:start -->…<!-- specship:end -->`
block into your existing file. Re-running `init` updates that block without
duplicating it, and creates the file if absent.

`write` drops a standalone config file, such as a Cursor rule.

## Contract Rules

- **`task.md` is the source of truth.** Every skill reads it first and updates
  it last with stage, status, artifact status, and a timestamped Pipeline Log
  line.
- **IDs are stable and append-only.** `R#`, `AC#`, `S#`, and `BUG#` are never
  renumbered. Dropped items are struck through with a timestamp, not deleted.
- **Checkboxes are progress.** `coding` ticks `S#` in `plan.md`; `review` ticks
  `AC#` in `spec.md`. Unticked means not done.
- **Everything is timestamped.** Timestamps use `YYYY-MM-DD HH:MM +TZ`, taken
  from `date`, never guessed.
- **Edit in place, never fork.** Artifacts evolve via `updated:` and Change
  History lines. There is no `spec-v2.md`.
- **Upstream changes invalidate downstream work.** If `spec.md` changes after
  the plan exists, the plan or review may be stale and must be revisited.
- **Stage preconditions are enforced.** `plan` requires a `confirmed` spec,
  `coding` requires an `approved` plan, and `review` requires all `S#` items
  ticked.
- **The flow learns from its own mistakes.** Process errors become lessons in
  `tasks/LESSONS.md`, which every stage reads during hydration.
- **Lifecycle changes preserve pipeline state.** `pause-task`, `archive-task`,
  and `resume-task` change only `status`/location, never `stage` or artifacts,
  and each transition logs a dated reason. Un-shelving fully re-activates a task
  (out of `archive/` and back to `active`) before any stage resumes.

The full contract is in [skills/WORKFLOW.md](skills/WORKFLOW.md). Each stage
playbook lives in `skills/<stage>/SKILL.md`.

## Example

[examples/slugify-demo/](examples/slugify-demo/) is a complete worked task for
a `slugify()` utility. It ran the full pipeline, including a real bug caught
during coding, root-caused and logged as `BUG1` in `debug.md`, then verified
in review.

Read `examples/slugify-demo/tasks/TASK-001/*` to see every artifact in
practice, and `examples/slugify-demo/tasks/LESSONS.md` for process lessons
recorded against the contract.

## Package Layout

```text
skills/                 # canonical skill playbooks shipped to each agent
.claude/CLAUDE.md       # pointer template → installed as CLAUDE.md
.codex/AGENTS.md        # pointer template → installed as AGENTS.md
.cursor/WORKFLOW.mdc    # pointer template → installed as .cursor/rules/specship.mdc
.antigravity/rules.md   # pointer template → installed as .agent/rules/specship.md
bin/cli.js              # CLI entry
src/                    # CLI logic; targets.js holds source→dest mappings
examples/slugify-demo/  # complete worked task, not installed
```

To add or re-map an agent, edit `src/targets.js` and add its pointer template.
No other code changes are needed.

## Contributing

Bug reports and pull requests are welcome on
[GitHub](https://github.com/bonnguyenitc/specship/issues).

```bash
git clone https://github.com/bonnguyenitc/specship.git
cd specship
npm test
```

- Keep changes small and focused; `npm test` must pass before and after.
- CLI behavior lives in `src/` ([src/targets.js](src/targets.js) maps each
  agent's source → destination paths).
- Changes to the workflow itself belong in `skills/` — that is what `init`
  ships to user projects.

## Releases

See [GitHub Releases](https://github.com/bonnguyenitc/specship/releases) for
the changelog. specship follows [semver](https://semver.org); until 1.0,
minor versions may include breaking changes.

## License

[MIT](LICENSE) © 2026 Thoai Nguyen
