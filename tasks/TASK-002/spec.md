---
task: TASK-002
title: Cross-agent handoff - agent identity in Pipeline Log + handoff contract
type: spec
status: confirmed
created: 2026-07-12 17:29 +0700
updated: 2026-07-13 22:16 +0700
---

# Spec: Cross-agent handoff (multi-agent, area B)

## Goal
Let a task move between different agent CLIs (Claude Code, Codex, Cursor, ...) mid-pipeline: every stage records *which* agent ran it, and WORKFLOW.md states the handoff contract explicitly - artifacts are the only payload, hydrate is the handoff.

## Context (current behavior vs desired)
- `tasks/` state (WORKFLOW.md contract) is already agent-agnostic, but Pipeline Log lines don't say which agent wrote them, and the handoff between platforms is implicit folklore, not contract.
- `src/pipeline.js` validates `task.md` frontmatter but doesn't parse Pipeline Log lines, so a format extension is backward-safe; still needs a regression test.
- Areas A (in-stage subagents) and C (claim/concurrent tasks) were split out of this task per Q1 - see Out of Scope.

## Requirements
- ~~R1 (moved 2026-07-12 17:35 +07 → follow-up task "in-stage subagents": review panel)~~
- ~~R2 (moved 2026-07-12 17:35 +07 → follow-up task "in-stage subagents": coding fan-out protocol)~~
- ~~R3 (moved 2026-07-12 17:35 +07 → follow-up task "in-stage subagents": capability fallback rule)~~
- R4: Pipeline Log lines shall optionally carry the acting agent: `- <ts> <stage> (<agent>): <event>`; `<agent>` is a self-reported free-text label (e.g. `claude-code`, `codex`); lines without `(<agent>)` stay valid (backward compatible).
- R5: WORKFLOW.md shall gain an "Agent handoff" section: a task may switch platforms at any checkpoint; the hydrate protocol is the handoff; no conversation context may be assumed - artifacts are the only payload; each stage skill labels its Pipeline Log lines per R4.
- ~~R6 (moved 2026-07-12 17:35 +07 → follow-up task "claim/concurrent": claimed-by/claimed-at + TTL)~~
- ~~R7 (moved 2026-07-12 17:35 +07 → follow-up task "claim/concurrent": specship check/tasks support)~~
- ~~R8 (moved 2026-07-12 17:35 +07 → follow-up task "claim/concurrent": parallel-task isolation rules)~~

## Acceptance Criteria
- ~~AC1, AC2, AC3 (moved with R1-R3)~~
- [x] AC4 (covers R4, R5): WORKFLOW.md documents the labeled log format + an "Agent handoff" section; stage skills instruct labeling; old-format lines still pass → verify: `npm test` green incl. a pipeline-check fixture task whose log mixes labeled and unlabeled lines.
- ~~AC5, AC6, AC7 (moved with R6-R8)~~
- [x] AC8 (covers R4, R5): real install ships the updated contract → verify: `node bin/cli.js init --all --dir "$(mktemp -d)"`, confirm the installed `WORKFLOW.md` contains the "Agent handoff" section.

## Out of Scope
- Area A - in-stage subagents (review panel opt-in default 1 per Q3, coding fan-out protocol, inline-fallback rule): follow-up task.
- Area C - claim/concurrent tasks (advisory `claimed-by:`/`claimed-at:` + TTL 2h per Q2, `specship check`/`tasks` support, isolation rules): follow-up task, builds on R4's agent labels.
- New platform targets (OpenCode per Q4) and any runtime coordination (daemon, lockfiles).

## Assumptions
- `<agent>` labels are self-reported free text; no registry, no validation beyond format - good enough for traceability, and the claim protocol (follow-up) treats them the same way.
- The label convention lives in WORKFLOW.md (shared) rather than per-platform doc templates, so all 10 targets get it from the same source.

## Edge Cases
- Old tasks with unlabeled Pipeline Log lines must still validate (`specship check`) - format is additive.
- An agent that doesn't know a distinctive label (generic AGENTS.md consumer) → omit the label rather than invent noise.
- Handoff mid-stage (e.g. coding half done): the receiving agent resumes from ticked `S#`s per the existing hydrate protocol - the new section states this explicitly.

## Open Questions
- [x] Q1 (blocker): one task vs split - answered 2026-07-12 17:35 +07: split into 3 tasks; TASK-002 = area B first (defines agent identity the others build on).
- [x] Q2 (blocker): claim mechanism - answered: advisory fields + TTL 2h (recorded for the follow-up claim task).
- [x] Q3: review panel size - answered: default 1, panel opt-in (recorded for the follow-up subagents task).
- [x] Q4: OpenCode target - answered: out of scope.

## Change History
- 2026-07-12 17:29 +0700: Created (draft covered areas A+B+C, R1-R8).
- 2026-07-12 17:35 +0700: Q1-Q4 answered by user. Scope narrowed to area B per Q1: R1-R3, R6-R8 and AC1-AC3, AC5-AC7 struck (moved to follow-up tasks, IDs retired). Title updated; status → confirmed.
