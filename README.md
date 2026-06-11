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

## The workflow

```
explore-source ──▶ docs/onboarding/*        (one-time: learn the codebase)
                        │  read by every stage
                        ▼
spec ──▶ plan ──▶ coding ──▶ review ──▶ done
                   ▲           │
                   └─ debug ◀──┘           (attaches whenever a bug appears)
```

Every task lives in its own folder, **`tasks/TASK-<ID>/`**, where the stages
cooperate through shared artifacts on disk:

```
tasks/
├── LESSONS.md       # project-wide process lessons (L#), read by every stage
└── TASK-001/
    ├── task.md      # SHARED STATE — stage, status, pipeline log (source of truth)
    ├── spec.md      # requirements (R#), acceptance criteria (AC#)
    ├── plan.md      # ordered steps (S#), each tracing to R#/AC#
    ├── review.md    # gate results, AC verification, commit/PR draft
    └── debug.md     # chronological bug log (BUG#)
```

Because the state is on disk — not in a chat session — any agent (or human) can
pick up a task exactly where the last one left off.

### Stage by stage

**0. `explore-source` — map the codebase (once per project).**
Produces `docs/onboarding/{source-structure, how-to-code, what-is-stack,
how-to-deploy}.md` — the convention reference every later stage reads. Run it
once when adopting a project, commit the output.

**1. `spec` — pin down *what* before *how*.**
Reads the ticket/PRD/request, extracts the goal, testable requirements (`R#`),
acceptance criteria (`AC#`), scope boundaries, and edge cases. Ambiguities
become open questions (`Q#`) — asked, not silently assumed. Opens the task:
creates `tasks/TASK-<ID>/` with `task.md` + `spec.md`. Done when the spec is
`confirmed`.

**2. `plan` — design the implementation.**
Reads `spec.md` and the onboarding docs, picks the simplest viable approach
(stating tradeoffs if alternatives exist), and breaks the work into ordered
steps (`S#`). Every step declares `covers: R#/AC#` — so each step traces to a
requirement — and a **verify** check (test/command/behavior). Done when the
plan is `approved`.

**3. `coding` — execute the plan, one verifiable step at a time.**
Reads `plan.md` + `spec.md` + `how-to-code.md`. Asks the user TDD or
conventional, then loops per step: implement the minimum, run the step's verify
check, tick `S#` in `plan.md` only when it passes. Surgical changes only —
nothing the plan didn't call for. Truly independent steps (non-overlapping
files) may fan out to parallel subagents, but the main thread integrates,
verifies, and owns the state.

**4. `review` — from "code written" to "ready to ship".**
Reads the diff against `spec.md`/`plan.md`/`how-to-code.md`. Runs the **full
gate** (entire test suite + lint + format + type-check), verifies each `AC#`
and ticks it in `spec.md`, checks style and plan deviations, then writes
`review.md` with a **drafted** commit/PR message — the human runs git
themselves. `approved` ends the task; `changes-requested` loops back to
`coding` with the findings as input.

**`debug` — attaches whenever a defect appears** (during coding, review, or
later). Scientific method: reproduce (ideally as a failing test) → locate →
hypothesize the root cause → minimal fix → verify with the full suite → keep
the regression test. Each investigation is a `BUG#` entry in `debug.md`; the
task is `blocked` while a blocker bug is open.

### Checkpoints — the human stays in the driver's seat

Stages never auto-advance. At the end of each stage the agent updates the
shared state, summarizes, and **asks before moving on** (spec → "plan it?",
plan → "start coding?", coding → "review it?"). Approve and it flows into the
next stage immediately; decline and it stops with everything saved on disk.

### Contract rules (what makes handoffs work)

- **`task.md` is the source of truth.** Every skill reads it first (hydrate)
  and updates it last (checkpoint): stage, status, per-artifact status, and a
  timestamped Pipeline Log line.
- **IDs are stable and append-only.** `R#` requirement, `AC#` criterion, `S#`
  step, `BUG#`. Never renumbered — downstream artifacts reference them; dropped
  items are struck through with a timestamp, not deleted.
- **Checkboxes are progress.** `coding` ticks `S#` in `plan.md`; `review` ticks
  `AC#` in `spec.md`. Unticked = not done.
- **Everything is timestamped** (`YYYY-MM-DD HH:MM +TZ`, taken from `date`,
  never guessed) so changes are traceable and ordered within a day.
- **Edit in place, never fork.** Artifacts evolve via `updated:` + Change
  History lines — no `spec-v2.md`.
- **Upstream change invalidates downstream.** If `spec.md` changes after the
  plan exists, the plan/review may be stale — it's noted in the Pipeline Log
  and revisited.
- **Stage preconditions are enforced.** `plan` requires a `confirmed` spec,
  `coding` an `approved` plan, `review` all `S#` ticked. A skill that finds its
  precondition unmet runs the missing stage (or asks) — it never skips ahead
  silently, and every transition, block, and loop-back leaves a Pipeline Log
  trace.
- **The flow learns from its own mistakes.** When a process error is detected
  (skipped checkpoint, stale artifact, missing trace, guessed timestamp), the
  skill fixes it and appends a lesson (`L#`) to `tasks/LESSONS.md` — which
  every stage reads at hydrate, so the same mistake isn't repeated.

The full contract is in `skills/WORKFLOW.md`; each stage's playbook is in
`skills/<stage>/SKILL.md`.

## What `init` installs

For each agent, `init` copies the **skills** to that agent's skills folder and
writes/merges its **config pointer** at the correct native path:

| Agent | Skills → | Config →  | Mode |
|-------|----------|-----------|------|
| `--claude` | `.claude/skills/` | `CLAUDE.md` | merge |
| `--codex` | `.codex/skills/` | `AGENTS.md` | merge |
| `--cursor` | `.cursor/skills/` | `.cursor/rules/specship.mdc` | write |
| `--antigravity` | `.agent/skills/` | `.agent/rules/specship.md` | write |

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

## After installing

1. Map the codebase once → `/explore-source` (or have the agent follow
   `<skills>/explore-source/SKILL.md`). This writes `docs/onboarding/*`, the
   convention reference every later stage uses. Commit it.
2. Per task: invoke `/spec` with the ticket (or just describe the feature — the
   skills auto-trigger), then approve each checkpoint as the task flows through
   `plan → coding → review`. Open `tasks/TASK-<ID>/task.md` anytime to see the
   stage, status, and pipeline log.

## Example

`examples/slugify-demo/` is a complete worked task (a `slugify()` utility) that
ran the full pipeline — including a real bug caught during coding, root-caused
and logged as `BUG1` in `debug.md`, then verified in review — with code and
tests. Read its `tasks/TASK-001/*` to see every artifact in practice, and
`tasks/LESSONS.md` for real `L#` process lessons recorded against the contract.

## Package layout (for contributors)

```
skills/                 # canonical skill playbooks (the source of truth, shipped to each agent)
.claude/CLAUDE.md       # pointer template → installed as CLAUDE.md
.codex/AGENTS.md        # pointer template → installed as AGENTS.md
.cursor/WORKFLOW.mdc    # pointer template → installed as .cursor/rules/specship.mdc
.antigravity/rules.md   # pointer template → installed as .agent/rules/specship.md
bin/cli.js              # CLI entry
src/                    # CLI logic — targets.js holds the source→dest mapping
examples/slugify-demo/  # a complete worked task (not installed)
```

To add or re-map an agent, edit `src/targets.js` (one entry per agent) and add its
pointer template — no other code changes needed.
