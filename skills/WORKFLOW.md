# Task Workflow — Shared State Contract

All task skills (`spec`, `plan`, `coding`, `review`, `debug`) cooperate on one task by reading and writing **shared artifacts** in a single folder. This file is the canonical contract every skill follows so handoffs are seamless. `explore-source` is separate — it produces project-wide docs in `docs/onboarding/` that the task skills consume as the convention reference. `research` is likewise standalone — it answers external-fact questions with the strongest search tool available and finishes with a complete cited report in `docs/research/`; it never writes to `tasks/` (a stage that requested it records what it needs in its own artifact).

## Pipeline

```
explore-source ──▶ docs/onboarding/{source-structure, how-to-code, what-is-stack, how-to-deploy}.md
                         │ (convention reference, read by every task skill)
                         ▼
spec ──▶ plan ──▶ coding ──▶ review ──▶ done
                    ▲           │
                    └─ debug ◀──┘   (debug attaches to the task whenever a defect appears)
```

Each arrow is a checkpoint **and a handoff**: no skill ends silently. On finishing, every skill (1) names its successor and asks the user, and (2) if the user agrees, **invokes that skill directly** (via the Skill tool) so the flow continues without the user re-asking. The successor always consumes the predecessor's artifact — that artifact, not the conversation, is the handoff payload.

**Autopilot:** the `ship` skill is an orchestrator, not a stage — given a feature request it runs `spec → plan → coding → review` (+ `debug`) in one run, carrying the user's consent for every handoff above. Stages invoked under `ship` skip their "ask the user" step and auto-advance (each auto-advance still gets a Pipeline Log line); every other rule in this contract applies unchanged. `ship` never runs `explore-source`.

**Re-entry & lifecycle:** three non-stage skills manage a task's working lifecycle around the pipeline. `resume-task` locates an in-progress (or paused) task, reconstructs its state, reports where it stands, and resumes the correct stage skill (the interactive counterpart to `ship`). `pause-task` deliberately sets a task aside (`status: paused`). `archive-task` shelves a task out of the active set by moving its folder into `tasks/archive/`. `resume-task` writes to `tasks/` only to un-shelve the task it's resuming or repair a missing trace; `pause-task`/`archive-task` mutate `task.md`/the folder as their job — see "Task lifecycle".

| Finishing skill | Suggests next | Handoff payload |
|---|---|---|
| `explore-source` | `spec` (start a task) | `docs/onboarding/*` |
| `spec` | `plan` | `spec.md` (R#/AC#) |
| `plan` | `coding` | `plan.md` (S# → covers R#/AC#) |
| `coding` | `review` | code + ticked `S#` in `plan.md` |
| `review` (approved) | — done | commit/PR draft in `review.md` |
| `review` (changes-requested) | `coding` (or `debug` for a defect) | Findings in `review.md` |
| `debug` | the stage it interrupted (or `review` if standalone) | `BUG#` in `debug.md` + regression test |

## Task folder layout

```
tasks/
├── LESSONS.md       # project-wide process lessons (L#) — read by every skill (see "Lessons")
├── archive/         # shelved tasks (see "Task lifecycle") — skipped by active scans
│   └── TASK-<ID>/   # a whole task folder moved here intact, history preserved
└── TASK-<ID>/
    ├── task.md      # SHARED STATE — index + state machine for the whole task (source of truth)
    ├── spec.md      # spec skill   — requirements (R#), acceptance criteria (AC#)
    ├── plan.md      # plan skill   — steps (S#), each covers: R#/AC#
    ├── review.md    # review skill — gate results, AC verification, commit/PR draft
    └── debug.md     # debug skill  — chronological bug log (BUG#)
```

### Choosing `TASK-<ID>`
Reuse an existing ticket id (Jira/GitHub issue) → `TASK-PROJ-123`; otherwise the next sequential number by scanning **both** `tasks/TASK-*` **and** `tasks/archive/TASK-*` (archived ids are retired, never reused) → `TASK-001`.

## The shared state file — `task.md`

The single source of truth for "where is this task". Every skill reads it first and updates it last.

```markdown
---
task: TASK-<ID>
title: <short title>
stage: spec          # spec | plan | coding | review | done
status: active       # active | blocked | paused | done
created: <YYYY-MM-DD HH:MM +TZ>
updated: <YYYY-MM-DD HH:MM +TZ>
artifacts:           # value = that artifact's current status (filenames are fixed by the layout)
  spec: draft        # missing | draft | confirmed
  plan: missing      # missing | draft | approved
  coding: missing    # missing | in-progress | done
  review: missing    # missing | changes-requested | approved
  debug: missing     # missing | open-bugs | clear
---

# Task: <title>

## Now
- Stage: <stage> — <one-line of what's happening / what's next>
- Blocked by: <none | what>

## Pipeline Log
- <YYYY-MM-DD HH:MM +TZ> spec (claude-code): confirmed
- <YYYY-MM-DD HH:MM +TZ> plan (codex): approved
- <YYYY-MM-DD HH:MM +TZ> coding: 3/5 steps done
- <YYYY-MM-DD HH:MM +TZ> debug (claude-code): BUG1 fixed
```

Pipeline Log line format: `- <ts> <stage> (<agent>): <event>` — the `(<agent>)` label names the acting agent and is **optional**; unlabeled lines stay valid (see "Agent handoff").

## Task lifecycle (around the pipeline)

A task's pipeline `stage` (spec…done) is *where the work is*; its `status` and location are *whether it's being worked on*.

### Status values — what each means and who sets it

The four `status` values are mutually exclusive. `active` and `blocked` are set by the **stage skills** as work proceeds; `paused` and the archived location are set by the **lifecycle skills**:

| Status | Meaning | Set by | Left by |
|---|---|---|---|
| `active` | Being worked on now — the normal state while a stage runs. | `spec` on task creation; any stage or lifecycle skill that (re)starts work | moves to `blocked`/`paused`/`done`, or stays `active` across stage transitions |
| `blocked` | **Involuntarily** stuck — work *cannot* proceed until something outside the stage's control clears: an open **blocker `Q#`** in `spec.md`, an open **blocker `BUG#`** in `debug.md`, or an external dependency (API, data, another team). Not a choice. | the stage skill that hits the block (`debug` sets it for an open blocker `BUG#`; `spec`/`plan`/`coding`/`review` set it for an unresolved blocker `Q#` or external dependency) | back to `active` by the stage skill once the blocker clears, then the stage resumes |
| `paused` | **Deliberately** shelved to resume later — a choice, not a block. | `pause-task` | `resume-task` flips it back to `active` and continues the stage where it stopped |
| `done` | Finished — `review` approved, all `AC#`/`S#` ticked, gate green. | `review` on approval (also sets `stage: done`) | `archive-task` to move it off the active list |

**`blocked` vs `paused`** is the key distinction: `blocked` is *involuntary* (something is in the way and is recorded in `Blocked by:` / the open `Q#`/`BUG#`); `paused` is a *deliberate* shelving with a reason. Never use `blocked` to set work aside by choice — that's `pause-task`.

**Setting / clearing `blocked` (every stage skill follows this):** when a stage can't move forward because of an open blocker `Q#`, an open blocker `BUG#`, or an external dependency, set `status: blocked`, write what's blocking it in the **Now** block's `Blocked by:` line, bump `updated:`, and append a dated Pipeline Log line (e.g. `- <ts> blocked: waiting on payments API access`). When the blocker clears, flip back to `active`, update `Blocked by: none`, log it, and resume the stage.

### Shelving — `paused` and `archived`

Two lifecycle skills manage *whether* a task is in the active set, without touching pipeline progress:

| State | What it means | How it's set | How it's left |
|---|---|---|---|
| `status: paused` | Started, then **deliberately shelved** — work could resume any time. Distinct from `blocked` (stuck on an external dependency, not a choice). | `pause-task` | `resume-task` flips it back to `active` and continues the stage where it stopped |
| **archived** (in `tasks/archive/<ID>/`) | Shelved out of the active set — the folder is moved aside, history intact. Typically a `done` task, or one abandoned. | `archive-task` | `resume-task <ID>` finds it in `archive/`, moves it back, and resumes |

Rules:
- **Pipeline state is preserved.** Pausing or archiving never changes `stage` or any `artifacts:` value — only `status`/location. Resuming picks up exactly where the work stopped.
- **Every transition leaves a trace.** Each pause/archive/restore bumps `updated:` and appends a dated Pipeline Log line stating the reason (e.g. `- <ts> paused: waiting on design`, `- <ts> archived: superseded by TASK-012`, `- <ts> restored from archive`).
- **Active scans skip the shelved.** When any skill auto-resolves "the most recently updated task" (`resume-task` with no id, a `ship`/stage hydrate, or `pause-task`/`archive-task` with no id), it ignores `tasks/archive/*` and does **not** auto-pick a `status: paused` task — those are acted on only when named explicitly.
- **Un-shelving fully re-activates.** Whoever brings a shelved task back (`resume-task`, or `ship`/a stage resuming a named one) must leave it `active`/`blocked` — never resume a task still labelled `paused`. A task that was both paused *and* archived needs both undone: move it out of `archive/` **and** flip `status` back.
- **Lifecycle skills may write `tasks/`.** Unlike `resume-task` (read-only bar trace repair), `pause-task` and `archive-task` legitimately mutate `task.md` / move the folder — that *is* their job.

## Shared-state protocol (every task skill follows this)

1. **Hydrate (on start).** Resolve the active `TASK-<ID>` (from the user, the conversation, or the most recently updated `tasks/TASK-*`). Read `task.md` to learn the current stage/status, then read the upstream artifacts you depend on (see "Reads" below) and `tasks/LESSONS.md` if present (apply its rules). **Verify your stage preconditions** (see "Flow integrity") — if an upstream artifact is missing or not in the required status, run its skill first (or ask the user); never proceed silently.
2. **Work.** Do the skill's job, grounded in those artifacts. Cross-reference by ID (`R#`, `AC#`, `S#`, `BUG#`) — never invent parallel numbering.
3. **Checkpoint (on end).** Write/update your own artifact, then update `task.md`: bump `updated:`, set `stage`/`status`, update the matching `artifacts:` line, and append a dated **Pipeline Log** entry. If you detected a process mistake this stage, record it per "Lessons" below. Then ask the user before auto-advancing to the next skill.

### Per-skill reads / writes

| Skill   | Reads                                                                 | Writes                                  | Sets in task.md                          |
|---------|-----------------------------------------------------------------------|-----------------------------------------|------------------------------------------|
| `spec`  | the ticket/request; `docs/onboarding/*` if present                    | `task.md` (creates), `spec.md`          | stage=spec, spec=draft→confirmed         |
| `plan`  | `task.md`, `spec.md`, `docs/onboarding/{source-structure,how-to-code}` | `plan.md`                               | stage=plan, plan=draft→approved          |
| `coding`| `task.md`, `plan.md`, `spec.md`, `docs/onboarding/{how-to-code,source-structure}` | code, ticks `S#` in `plan.md`           | stage=coding, coding=in-progress→done    |
| `review`| `task.md`, `spec.md`, `plan.md`, `docs/onboarding/{how-to-code,source-structure}`, diff | `review.md`, ticks `AC#`                | stage=review→done, review=…, status=done |
| `debug` | `task.md`, `spec.md`/`plan.md` as needed, the failing repro           | `debug.md`, regression test             | debug=open-bugs→clear, status=blocked?   |

## Agent handoff — a task can switch platforms mid-pipeline

The `tasks/` contract is agent-agnostic: a task may move between agent platforms (Claude Code, Codex, Cursor, Antigravity, …) at **any checkpoint**, and the receiving agent needs nothing beyond the task folder.

- **Hydrate is the handoff.** The receiving agent runs the normal hydrate step — read `task.md`, then the upstream artifacts it depends on. That is the *only* payload: **no conversation context may be assumed** to carry across a handoff. Anything the next stage needs must already live in the artifacts (that's what the checkpoint rules guarantee).
- **Label your Pipeline Log lines with the acting agent.** Each line may name who ran it: `- <ts> <stage> (<agent>): <event>`. The `<agent>` label is **self-reported free text** (`claude-code`, `codex`, `cursor`, …) — no registry, no validation. If your platform has no distinctive name, **omit the label** rather than invent noise; unlabeled lines stay valid. The format is additive, so tasks written before this convention never need rewriting.
- **Mid-stage handoff resumes from the artifacts' own progress markers.** Coding half-done → the next agent resumes from the ticked `S#`s in `plan.md`; a spec with open blocker `Q#`s, or a review loop-back, states what's pending in its artifact. This is exactly what the hydrate protocol already prescribes — a handoff adds no new ceremony.

## External phase execution — one phase, launched from outside

Everything above describes the **interactive** flow: a stage finishes, asks the user, and invokes its successor. An **external orchestrator** (a tool that owns its own task board) instead runs **one phase at a time**: it launches an agent for a single phase, that agent checkpoints and stops, and the orchestrator decides what runs next by reading the task artifacts. This mode is **opt-in** — nothing here changes the interactive flow or `ship`.

**The request envelope.** A launch supplies four things, and the stage must not infer any of them from conversation context:

| Field | Value |
|---|---|
| task | an exact `TASK-<ID>` — ASCII, no separators, matching its folder and frontmatter |
| phase | exactly one of `spec` \| `plan` \| `coding` \| `review` \| `debug` |
| actor | `codex` or `claude-code` — the only certified external actors in v1 |
| expected revision | the `revision:` the orchestrator last saw; a mismatch means the task moved on |

Other install targets (Gemini CLI, Cursor, Antigravity, Copilot, Windsurf, Cline, Roo) remain fully supported for the interactive workflow, but are **not** certified to run an external phase in v1 — `specship check --actor <them>` exits 2.

**A stage in external mode runs exactly one phase, then stops.** It hydrates from the named task's artifacts, does its own job, checkpoints, and ends. It must **not**: ask the user to advance, invoke a predecessor or successor skill, call `ship` or `resume-task`, or assume any prior conversation. The orchestrator — not the stage — decides the next launch.

**Validate before mutating (fail closed).** Before writing anything, confirm the task id is safe, the folder / `task.md` `task:` / every artifact's `task:` all agree, the preconditions in "Flow integrity" hold, and the revision still matches. If any fails, **stop and report** — never allocate another id, never write to a different task, never guess. One command does all of it:

```sh
specship check TASK-<ID> --phase <phase> --actor <codex|claude-code> --expect-revision <n> --json
# exit 0 = the gate is valid, run the phase
# exit 1 = task state or gate invalid  (read .issues)
# exit 2 = bad input, unsupported actor/schema, or no such task
specship inspect TASK-<ID> --json      # read-only normalized state; never writes
```

**Checkpoint order is part of the contract:** write your **stage artifact first**, then **`task.md` last**, incrementing `revision` by **exactly one**. `task.md` is the commit point — a crash after the artifact but before `task.md` leaves the task simply not-yet-advanced (safe to retry), never forward-dated onto work that did not land. Two agents starting from the same revision cannot both checkpoint: the second one's `--expect-revision` no longer matches. This detects a stale writer; it is **not** a lock — the orchestrator must still run one phase writer at a time.

**Blocked works the same as always** (see "Status values"): set `status: blocked`, fill `Blocked by:`, log it, and stop. The gate then keeps the *current* phase as the retry target — a blocker never advances the task.

### `task.md` schema v2 — additive fields

v2 adds four fields. `stage`, `status` and `artifacts:` remain the task-progress **source of truth**; the new fields make the transition machine-readable:

```yaml
schema: 2            # absent → v1 (legacy); read with safe defaults, never rewritten on read
revision: 7          # monotonic, +1 per checkpoint; v1 defaults to 0
next_phase: coding   # the phase to run next; null/absent when nothing is left
resume_phase: coding # only while debug is open: the phase debug interrupted (coding|review)
```

The gates below are **derived from the artifact states**, so `next_phase` may only ever *agree* with them — `specship check` rejects a contradiction. Its one load-bearing job is classifying the review loop-back, which artifact state alone cannot express.

**The rows are ordered, and the first match wins** — they overlap, so reading them as independent rules gives the wrong answer:

| # | State | `next_phase` |
|---|---|---|
| 1 | debug `open-bugs` | `debug` (and `resume_phase` **must** name `coding` or `review`) |
| 2 | spec not `confirmed` | `spec` |
| 3 | spec `confirmed`, plan not `approved` | `plan` |
| 4 | review `changes-requested` | the review **must** classify the loop-back: `coding` (ordinary work), `debug` (a defect), or `review` once the fix has landed — see below |
| 5 | plan `approved`, coding not `done` | `coding` |
| 6 | coding `done`, review not `approved` | `review` |
| 7 | review `approved` | *none* — the task is done |
| — | any blocker | unchanged — the current phase stays the retry target |

**A `changes-requested` review must be told when it is satisfied.** Row 4 outranks rows 5–7, so while the verdict stands the gate answers only what `next_phase` classifies. That includes the way *out*: whoever addresses the findings sets `next_phase: review` at its checkpoint, and the gate then re-runs review (it refuses while `coding` is not `done` — unlanded work is not a fix). Without that, `changes-requested` would be terminal: the gate could only ever return `coding`/`debug`, so the task could never be approved and never reach `done`.

For a defect this is the same loop with `debug` in the middle: review classifies `debug` → debug opens with `resume_phase: review` → debug clears, sets `next_phase: review`, and clears `resume_phase` → review re-runs.

A terminal exit code, free-form "done" text, or an agent stop signal **never** satisfies a gate by itself; only the artifact state does.

**The map must be backed by what is on disk.** `artifacts:` is the gate's only input, so `specship check` also verifies that every artifact it declares exists, that `spec.md`/`plan.md`/`review.md` carry the status the map claims, and that `coding: done` has every `S#` in `plan.md` ticked. A `task.md` promising an `approved` plan that was never written fails the gate — this is the "Flow integrity" precondition the one command enforces.

**`stage` and the map may not contradict each other.** The gate may run *ahead* of `stage` (a stage checkpoints its artifact before the next one starts), and a loop-back or an open bug sends it backwards on purpose. But a gate otherwise *behind* `stage` — `stage: done` with a `spec` gate — means the map is wrong, and it fails the gate rather than re-running finished work.

**Legacy v1 tasks stay readable.** No `schema:`/`revision:`/`artifacts:` → schema 1, revision 0, all artifacts `missing`. Reading never rewrites them, and one still at `stage: spec` is consistent with those defaults, so it can be picked up externally and its first checkpoint upgrades the file in place, preserving every artifact and the whole Pipeline Log. A v1 task that has *progressed* past spec contradicts the all-`missing` defaults (previous rule) and must be run interactively until a checkpoint gives it a real map.

**Pipeline Log labels stay canonical.** External entries use the actor id verbatim — `codex` or `claude-code` — and nothing else:

```markdown
- 2026-07-17 09:42 +07 coding (claude-code): S3 done, checkpointed at revision 8
```

The model, routing, session and attempt history belong to the orchestrator, **not** to `task.md`. Don't turn the log into a second routing source.

## In-stage subagents — parallel helpers within one stage

A stage may spawn **in-stage subagents** — parallel helpers running *within one stage on one platform* — to go wider or get independent eyes: `explore-source`/`spec`/`plan` fan out wide reads, `coding` parallelizes independent steps, `review` can run an opt-in panel of independent reviewers (default: one pass), `debug` delegates deep/noisy investigations, and `research` fans out query angles. This is a *different axis* from Agent handoff above: handoff moves a task **between** platforms/stages; in-stage subagents are transient helpers **inside** a single stage that leave no pipeline state of their own. Whichever platform runs the stage, these invariants hold:

- **The main thread owns the state.** Only the stage's main thread writes `tasks/`, ticks `S#`/`AC#`, and runs the gate. Subagents produce input — findings, draft code, read summaries — they never checkpoint the task or decide its outcome. Agents assist; the main thread decides.
- **Verify every agent claim before trusting it.** A subagent's confident-but-wrong path, symbol, or finding becomes a "verified" fact the moment you act on it. Spot-check anything an agent reports (a cited path must exist, a claimed bug must reproduce) before it enters an artifact or the verdict.
- **Capability fallback — delegation is an optimization, never a precondition.** Platforms differ in whether (and how) they can spawn subagents. If in-stage subagents aren't available, the stage does the *same work inline in the main thread* — the deliverable is never skipped, narrowed, or degraded because parallel helpers were unavailable. Every "delegate to a subagent" instruction in a skill is shorthand for "delegate **if you can**, else do it inline."

## Flow integrity — no silent shortcuts, no missing traces

**Stage preconditions.** Each skill verifies these at hydrate; if unmet, run the missing skill (or ask the user) — never skip ahead silently:

| Skill    | Requires before starting                                            |
|----------|----------------------------------------------------------------------|
| `plan`   | `spec.md` exists with `status: confirmed` (no open blocker `Q#`)     |
| `coding` | `plan.md` exists with `status: approved`                             |
| `review` | all `S#` in `plan.md` ticked (or deviations noted inline)            |
| `debug`  | a concrete failing reproduction, attached to its owning `TASK-<ID>`  |

**Every state change leaves a trace.** A change nobody can reconstruct later is a contract violation:

- Stage transitions, blocks, loop-backs (`review → coding`, `coding → debug`) → a dated **Pipeline Log** line in `task.md`.
- Content changes in an artifact → bump `updated:` + a dated **Change History** line in that artifact.
- Checkbox ticks → bump `updated:` only (the Pipeline Log already records progress).
- Skipping a gate (tests not run, AC not verified) must be stated in the artifact — never implied as done.

If you find a missing trace (yours or a previous stage's), repair it first — backfill the log line, marked as backfilled — then record a lesson.

## Lessons — the flow learns from its own mistakes

When the **flow itself** errs — a stage run out of order, a skipped checkpoint, a stale downstream artifact not flagged, invented/renumbered IDs, a guessed timestamp, a missing trace — the skill that detects it must, in this order:

1. **Fix the violation** (restore the state/trace so the contract holds again).
2. **Append a lesson** to **`tasks/LESSONS.md`** (create it if missing). Project-wide, append-only; `L#` IDs are never renumbered:

```markdown
# Lessons — process mistakes and the rules that prevent them

- L1 — <YYYY-MM-DD HH:MM +TZ> [TASK-<ID>, <stage>] mistake: <what went wrong> → rule: <one imperative sentence to follow next time>
```

3. Every skill **reads `tasks/LESSONS.md` at hydrate** and applies its rules — that's what makes a lesson learned instead of merely logged.

Scope: lessons are for **process/flow mistakes** only. Code defects belong in the task's `debug.md` as `BUG#`; if a lesson reveals a gap in this contract itself, propose an edit to this file to the user.

## ID & status conventions (shared vocabulary)

- **IDs are append-only and stable:** `R#` (requirement), `AC#` (acceptance criterion), `S#` (step), `BUG#`, `L#` (lesson). Never renumber — downstream artifacts reference them. To drop one, strike it through with a timestamp (`~~R2 (removed 2026-06-11 17:12 +07)~~`), don't delete.
- **Checkboxes track progress:** `coding` ticks `S#` in `plan.md`; `review` ticks `AC#` in `spec.md`. An unticked `S#`/`AC#` means not done. Ticking a checkbox is progress-tracking, not a content change: bump the file's `updated:` but **don't** add a Change History line — the Pipeline Log in `task.md` already records it.
- **Timestamp format:** every `created:` / `updated:`, Change History, and Pipeline Log entry uses **`YYYY-MM-DD HH:MM` with the timezone offset** (e.g. `2026-06-11 17:12 +07`) — date alone is not enough to order changes within a day. Get the real current time (e.g. `date "+%Y-%m-%d %H:%M %Z"`), never guess it.
- **Every file carries `created:`/`updated:` + a Change/Pipeline log** so changes are traceable over time. Edit artifacts in place; never fork a v2 file.
- **Upstream change invalidates downstream:** if `spec.md` changes after `plan.md` exists, the plan (and review) may be stale — note it in the Pipeline Log and revisit.
