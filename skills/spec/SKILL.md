---
name: spec
model: opus
description: Read and fully understand a spec, ticket, PRD, or feature request before any planning or coding. Use when given requirements to implement, when asked to "understand this spec", "what does this ticket mean", or as the first step of a feature. Extracts goals, requirements, acceptance criteria, edge cases, and open questions. First stage of the spec → plan → coding workflow.
---

# Spec

Goal: turn a spec into a precise, shared understanding **before** designing or coding. Most implementation bugs are misunderstood requirements — catch them here.

## When to use
- You're handed a ticket / PRD / feature request to build.
- Requirements are ambiguous and you need to pin them down before acting.
- First stage of the workflow: **spec → plan → coding → review** (+ `debug`).

## Shared task state
Part of the task pipeline — see `../WORKFLOW.md` for the full contract. This skill **opens the task**.
- **Hydrate:** if continuing an existing task, read `tasks/TASK-<ID>/task.md` + `spec.md`; otherwise pick a new `TASK-<ID>` and create the folder. Read `docs/onboarding/*` if present; if those docs are missing and the codebase is unfamiliar, offer to run `explore-source` first — its output is the convention reference for every later stage.
- **Checkpoint:** create/update `task.md` (the shared state file) alongside `spec.md` — set `stage: spec`, `spec` artifact status `draft`→`confirmed`, bump `updated:`, append a Pipeline Log line carrying your agent label (format: `../WORKFLOW.md` → Agent handoff).
- **Git:** opening a new task also opens its branch — `git checkout -b task/TASK-<ID>`, cut from the default branch with a clean working tree (dirty with changes that aren't this task's → stop and ask). Each checkpoint here ends with a commit of `spec.md` + `task.md` (`TASK-<ID> spec: <event>`), staging exactly those files. See `../WORKFLOW.md` → Git flow.
- **Blocked?** If the spec can't be confirmed because a **blocker `Q#`** is waiting on the user or an external answer, set `status: blocked`, note it in the **Now** block's `Blocked by:` line, and log it; flip back to `active` once it's answered. `blocked` is involuntary — to set the task aside by choice, use `pause-task`. See `../WORKFLOW.md` → Status values.
- **Lessons:** read `tasks/LESSONS.md` at hydrate and apply its rules; if you detect a process mistake, fix it and append an `L#` entry there (see `../WORKFLOW.md` → Lessons).

## Method

### 1. Read the source completely
- Read the full spec/ticket and any linked docs, designs, or related issues.
- **Ground it in the actual code, not memory.** If the spec references code areas, open them: verify the named files/functions/flags exist, and record the **current behavior vs. desired behavior** delta — requirements stated against imagined code are the top source of misunderstood specs. Use the `explore-source` skill if the project is unfamiliar.
- **Delegate heavy exploration to a subagent.** When grounding the spec means sweeping a large or unfamiliar codebase (broad "where is X handled?" questions, many candidate files), spawn the built-in **Explore** agent with a focused brief and ask for structured conclusions, not file dumps - it keeps this thread's context clean for the spec itself. Verify any path or symbol an agent reports before citing it in `spec.md`. For a small, known area, just read inline — and if your platform can't spawn subagents at all, do the exploration inline too (`../WORKFLOW.md` → In-stage subagents: delegation is an optimization, never a precondition).

### 2. Extract the essentials
- **Goal / why:** the problem being solved and the user value. One or two sentences.
- **Functional requirements:** concrete, testable "the system shall…" statements.
- **Acceptance criteria:** how we'll know it's done (mirror the spec's, or derive them). **Each `AC#` must be verifiable** — name the concrete check that proves it: a test, a command to run, or a specific observable behavior. An AC nobody can mechanically check is the weakest signal in the whole pipeline; if you can't state its check, it's still an open question, not an acceptance criterion. **Each `AC#` also names the `R#`(s) it covers, and every `R#` must be covered by at least one `AC#`** — an uncovered requirement is unverifiable by definition; either add an AC for it or question whether it's a real requirement.
- **Scope boundaries:** what is explicitly *out* of scope.
- **Constraints:** performance, security, compatibility, deadlines, tech stack limits.
- **Edge cases & error states:** empty/invalid input, auth failures, concurrency, limits.
- **Dependencies:** other teams, APIs, data, or tickets this relies on.

### 3. Find the gaps
Actively hunt for ambiguity. For anything underspecified, **don't assume silently** — list it as an open question, and **give every `Q#` a proposed answer** (your best default + one line of why) so the user can confirm with a yes instead of designing the answer themselves. When you must ask, **batch all blocker `Q#`s into one message** — don't drip questions across turns. A resolved question whose answer you chose yourself becomes an entry in **Assumptions**, not silence.

**Sweep the classic blind spots** — axes tickets routinely leave unstated. For each one that applies, the spec must answer it, or it becomes a `Q#` or an Assumption; skip the ones that clearly don't apply (this is a hunting list, not sections to fill):
- **Permissions:** who is allowed to do this, and what do other roles/users see?
- **Failure behavior:** invalid input, partial failure, timeouts — what does the user see, and what state is left behind?
- **Existing data:** does anything already stored need migrating, and must old records keep working (backward compat)?
- **Concurrency & retries:** duplicate submits, two writers, idempotency of the operation.
- **Limits & i18n:** size/rate caps, long strings, non-ASCII input, timezones.
- **Operability:** how failures surface (logs/metrics), and whether the change can roll out and back safely.

### 4. Right-size it
Scale the spec to the task. A small, well-understood change gets a small spec — a couple of `R#`/`AC#` and empty sections marked `- none` — not padded prose. Never invent requirements, edge cases, or questions to fill the template; an inflated spec buries the real signal and costs every later stage.

## Output: treat it as a task and write the spec file
Each spec is a **task**. Create the folder **`tasks/TASK-<ID>/`**, then write two files: the shared state file **`task.md`** (schema in `WORKFLOW.md` — this is the source of truth other skills read) and **`spec.md`** below. This is the shared artifact `plan`, `coding`, and `review` read — use the **exact template below** so other skills can parse and cross-reference it. Then show the user a short summary.

Choosing `TASK-<ID>`:
- If the spec/ticket already has an ID (Jira key, GitHub issue #, etc.), reuse it (e.g. `tasks/TASK-PROJ-123/` or `tasks/TASK-42/`).
- Otherwise generate **`TASK-<YYYYMMDD>-<slug>`**: the date from the real clock (`date +%Y%m%d`, never guessed) plus a short (2–4 word) kebab-case slug of the task (e.g. `TASK-20260723-fix-login`). Never derive the id from a counter — counters collide when several tasks start concurrently.
- If that folder already exists in `tasks/` or `tasks/archive/`, append a short random suffix (`TASK-20260723-fix-login-x7`) — never write into an existing folder. Older numeric ids (`TASK-001`) stay valid; never rename existing folders.

Rules for the IDs inside the file: requirements are `R1, R2, …`; acceptance criteria `AC1, AC2, …`; open questions `Q1, Q2, …`. Never renumber existing IDs (later stages reference them) — only append.

```markdown
---
task: TASK-<ID>
title: <short title>
type: spec
status: draft        # draft | confirmed
created: <YYYY-MM-DD HH:MM +TZ>
updated: <YYYY-MM-DD HH:MM +TZ>
---

# Spec: <title>

## Goal
<the problem + user value, 1–2 sentences>

## Requirements
- R1: <concrete, testable requirement>
- R2: ...

## Acceptance Criteria
<!-- each AC names the R# it covers, states what's true when done AND how to verify it (test / command / observable behavior); every R# appears in at least one AC -->
- [ ] AC1 (covers R1): <observable outcome> → verify: <test to write / command to run / behavior to observe>
- [ ] AC2 (covers R2): ...

## Out of Scope
- <what we are explicitly not doing>

## Assumptions
<!-- choices made without an explicit answer in the ticket — visible so the user can veto them -->
- <assumption + one-line rationale>

## Edge Cases
- <tricky input/state to handle>

## Open Questions
<!-- every Q carries a proposed default so the user can just confirm -->
- [ ] Q1 (blocker): <ambiguity that blocks progress> — proposed: <best default + why>
- [ ] Q2: <nice-to-clarify> — proposed: <best default + why>

## Change History
- <YYYY-MM-DD HH:MM +TZ>: Created.
```

Keep entries concise and verifiable. State assumptions in **Assumptions**, never silently. Set `status: confirmed` only once open questions are resolved or acknowledged, **every `AC#` carries a concrete `verify:` check, and every `R#` is covered by at least one `AC#`** — that `verify:` is the handoff payload `plan` turns into step checks and `review` ticks against, so an AC without one (or an R# no AC covers) cannot be confirmed. "Resolved or acknowledged" is not symmetric: a **blocker `Q#` must be ticked** with its answer folded into `R#`/`AC#`/Assumptions before confirming, while a non-blocker may stay open if acknowledged — `specship check` fails a confirmed spec that still has an unticked blocker.

### Updating an existing spec
When the spec changes later, **edit `spec.md` in place** — don't start a new file. For every change:
- Bump `updated:` to the current date-time (`YYYY-MM-DD HH:MM` + timezone; get it from `date`, don't guess).
- Append a timestamped line to **Change History** describing what changed and why (e.g. `- 2026-06-11 17:12 +07: Added R3 (rate limiting) per stakeholder request; removed AC2.`).
- Keep existing IDs stable; only append new `R#/AC#/Q#`. If a requirement is dropped, mark it `~~R2 (removed 2026-06-11 17:12 +07)~~` rather than deleting, so `plan`/`review` references don't dangle.
- If acceptance criteria changed, flag downstream `plan.md` / `review.md` as possibly stale.

## External phase execution
If an orchestrator launched you for the **`spec` phase only** (`../WORKFLOW.md` → External phase execution), the rules there override the handoff below. In short: confirm the envelope with `specship check TASK-<ID> --phase spec --actor <codex|claude-code> --expect-revision <n> --json` (exit 0 or stop), work from the named task's artifacts alone, write `spec.md`, then checkpoint `task.md` **last** with `revision` +1 and **stop**. Don't ask about planning, don't invoke `plan`, don't call `ship` — skip "Next step" entirely and let the orchestrator decide.

## Next step
Once the understanding is confirmed (open questions resolved or acknowledged), **ask the user whether they want to move on to planning** — e.g. "Bạn có muốn tôi lên plan triển khai không?".

- If the user agrees, **immediately invoke the `plan` skill** (via the Skill tool) and continue into planning in the same flow — don't make them ask again.
- If the user declines or wants to revise the spec first, stop here.
- Under `ship` (autopilot), skip the question and invoke `plan` directly — unless a blocker `Q#` is open, which always stops for the user.
