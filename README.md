# specship

Install a staged **spec → plan → coding → review** (+ `debug`) workflow into any
project, wired for your AI coding agent. One command drops in the skill playbooks
and the right config file at each agent's **native location**.

```bash
npx specship init --claude        # Claude Code
npx specship init --codex          # Codex
npx specship init --cursor         # Cursor
npx specship init --all            # all of the above (+ Antigravity)
```

## What it installs

For each agent, `init` copies the **skills** to that agent's skills folder and
writes/merges its **config pointer** at the correct native path:

| Agent | Skills → | Config →  | Mode |
|-------|----------|-----------|------|
| `--claude` | `.claude/skills/` | `CLAUDE.md` | merge |
| `--codex` | `.codex/skills/` | `AGENTS.md` | merge |
| `--cursor` | `.cursor/skills/` | `.cursor/rules/specship.mdc` | write |
| `--antigravity` | `.agent/skills/` | `GEMINI.md` | merge |

- **merge** = inserts an idempotent `<!-- specship:start -->…<!-- specship:end -->`
  block into your existing file (re-running `init` updates the block, never
  duplicates it). Creates the file if absent.
- **write** = drops a standalone config file (e.g. a Cursor rule).

## Commands

| Command | What it does |
|---------|--------------|
| `init <agents>` | Install the workflow for the given agents (`--claude`, `--codex`, `--cursor`, `--antigravity`, or `--all`) |
| `update` | Refresh skills + config for whatever agents are **already** installed in the project |
| `list` | Show which agents are installed here |

Options: `--dir <path>` (target project, default cwd) · `--force` (overwrite skill
files you've modified — by default they're kept) · `-v, --version` · `-h, --help`.

```bash
npx specship update     # bump installed agents to the latest workflow
npx specship list       # see what's installed
```

## The workflow it installs

```
explore-source ──▶ docs/onboarding/*        (one-time: learn the codebase)
                        │
spec ──▶ plan ──▶ coding ──▶ review ──▶ done
                   ▲           │
                   └─ debug ◀──┘           (attaches whenever a bug appears)
```

Each stage **reads** the previous stage's artifact and **writes** its own, with a
shared task state on disk (`tasks/TASK-<ID>/task.md`) so any agent — or human —
can resume where the last left off. Core ideas:

- **Shared state on disk.** `task.md` is the source of truth for where a task is.
- **Stable, cross-referenced IDs.** `R#` requirement, `AC#` criterion, `S#` step,
  `BUG#`. Never renumbered.
- **Checkboxes = progress.** `coding` ticks `S#`; `review` ticks `AC#`.
- **Timestamped history** (`YYYY-MM-DD HH:MM +TZ`) on every change.
- **Agents assist, the driving thread owns state.** Heavy search or independent
  parallel work can be delegated to subagents, but verification and writing to
  `tasks/` stay with the main thread.

See `skills/WORKFLOW.md` for the full contract and each `skills/<stage>/SKILL.md`
for a stage's playbook.

## After installing

1. Map the codebase once → `/explore-source` (or have the agent follow
   `<skills>/explore-source/SKILL.md`). This writes `docs/onboarding/*`, the
   convention reference every later stage uses. Commit it.
2. Per task: `spec → plan → coding → review` (debug as needed). Open
   `tasks/TASK-<ID>/task.md` anytime to see the stage, status, and pipeline log.

## Package layout (for contributors)

```
skills/                 # canonical skill playbooks (the source of truth, shipped to each agent)
.claude/CLAUDE.md       # pointer template → installed as CLAUDE.md
.codex/AGENTS.md        # pointer template → installed as AGENTS.md
.cursor/WORKFLOW.mdc    # pointer template → installed as .cursor/rules/specship.mdc
.antigravity/GEMINI.md  # pointer template → installed as GEMINI.md
bin/cli.js              # CLI entry
src/                    # CLI logic — targets.js holds the source→dest mapping
examples/slugify-demo/  # a complete worked task (not installed)
```

To add or re-map an agent, edit `src/targets.js` (one entry per agent) and add its
pointer template — no other code changes needed.

## Example

`examples/slugify-demo/` is a complete worked task (a `slugify()` utility) that ran
the full pipeline — including a real bug caught and logged in `debug.md` — with
code and tests. Read its `tasks/TASK-001/*` to see the artifacts in practice.
