---
name: spec
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
- **Checkpoint:** create/update `task.md` (the shared state file) alongside `spec.md` — set `stage: spec`, `spec` artifact status `draft`→`confirmed`, bump `updated:`, append a Pipeline Log line.
- **Lessons:** read `tasks/LESSONS.md` at hydrate and apply its rules; if you detect a process mistake, fix it and append an `L#` entry there (see `../WORKFLOW.md` → Lessons).

## Method

### 1. Read the source completely
- Read the full spec/ticket and any linked docs, designs, or related issues.
- If the spec references code areas, cross-check against the codebase (use the `explore-source` skill if the project is unfamiliar).

### 2. Extract the essentials
- **Goal / why:** the problem being solved and the user value. One or two sentences.
- **Functional requirements:** concrete, testable "the system shall…" statements.
- **Acceptance criteria:** how we'll know it's done (mirror the spec's, or derive them).
- **Scope boundaries:** what is explicitly *out* of scope.
- **Constraints:** performance, security, compatibility, deadlines, tech stack limits.
- **Edge cases & error states:** empty/invalid input, auth failures, concurrency, limits.
- **Dependencies:** other teams, APIs, data, or tickets this relies on.

### 3. Find the gaps
Actively hunt for ambiguity. For anything underspecified, **don't assume silently** — list it as an open question. If a question blocks understanding, ask the user before continuing.

## Output: treat it as a task and write the spec file
Each spec is a **task**. Create the folder **`tasks/TASK-<ID>/`**, then write two files: the shared state file **`task.md`** (schema in `WORKFLOW.md` — this is the source of truth other skills read) and **`spec.md`** below. This is the shared artifact `plan`, `coding`, and `review` read — use the **exact template below** so other skills can parse and cross-reference it. Then show the user a short summary.

Choosing `TASK-<ID>`:
- If the spec/ticket already has an ID (Jira key, GitHub issue #, etc.), reuse it (e.g. `tasks/TASK-PROJ-123/` or `tasks/TASK-42/`).
- Otherwise use the next sequential number by scanning existing `tasks/TASK-*` folders (`TASK-001`, `TASK-002`, …).

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
- [ ] AC1: <how we'll know it's done>
- [ ] AC2: ...

## Out of Scope
- <what we are explicitly not doing>

## Edge Cases
- <tricky input/state to handle>

## Open Questions
- [ ] Q1 (blocker): <ambiguity that blocks progress>
- [ ] Q2: <nice-to-clarify>

## Change History
- <YYYY-MM-DD HH:MM +TZ>: Created.
```

Keep entries concise and verifiable. State assumptions explicitly. Set `status: confirmed` once open questions are resolved or acknowledged.

### Updating an existing spec
When the spec changes later, **edit `spec.md` in place** — don't start a new file. For every change:
- Bump `updated:` to the current date-time (`YYYY-MM-DD HH:MM` + timezone; get it from `date`, don't guess).
- Append a timestamped line to **Change History** describing what changed and why (e.g. `- 2026-06-11 17:12 +07: Added R3 (rate limiting) per stakeholder request; removed AC2.`).
- Keep existing IDs stable; only append new `R#/AC#/Q#`. If a requirement is dropped, mark it `~~R2 (removed 2026-06-11 17:12 +07)~~` rather than deleting, so `plan`/`review` references don't dangle.
- If acceptance criteria changed, flag downstream `plan.md` / `review.md` as possibly stale.

## Next step
Once the understanding is confirmed (open questions resolved or acknowledged), **ask the user whether they want to move on to planning** — e.g. "Bạn có muốn tôi lên plan triển khai không?".

- If the user agrees, **immediately invoke the `plan` skill** (via the Skill tool) and continue into planning in the same flow — don't make them ask again.
- If the user declines or wants to revise the spec first, stop here.
