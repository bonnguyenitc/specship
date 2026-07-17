---
task: TASK-006
title: External phase orchestration for Codex and Claude Code
type: spec
status: confirmed
created: 2026-07-17 09:42 +07
updated: 2026-07-17 13:52 +07
---

# Spec: External phase orchestration for Codex and Claude Code

## Goal
Extend Specship so App Builder can run one workflow phase at a time with a user-selected Codex CLI or Claude Code model, hand the task to another Agent at the next checkpoint, and determine the next action from durable task artifacts.
Preserve the existing interactive and `ship` workflows for normal Specship users.

## Requirements
- R1: Specship defines an external orchestration mode for exactly `codex` and `claude-code` actors.
  A launch supplies an exact `TASK-<ID>`, one phase from `spec|plan|coding|review|debug`, the canonical actor, and the expected task revision.
  Gemini and every other adapter remain legacy install targets but are not certified external orchestration actors in v1.
- R2: An externally orchestrated stage runs only its assigned phase, hydrates from the named task artifacts, checkpoints its own output, and then stops.
  It never asks the user to advance, invokes a predecessor or successor, calls `ship` or `resume-task`, or depends on prior conversation context.
- R3: The external runner treats the supplied task id as authoritative.
  It validates a safe task basename, folder name, `task.md` frontmatter, and every present artifact `task:` field before mutation.
  A mismatch, collision, missing precondition, or stale expected revision fails closed without allocating another id or overwriting a different task.
- R4: `task.md` gains an additive schema version, monotonically increasing `revision`, machine-readable `next_phase`, and optional `resume_phase`.
  Existing `stage`, `status`, and `artifacts` remain the task-progress source of truth.
  Each checkpoint writes its stage artifact first, writes `task.md` last, and increments `revision` exactly once so consumers can reject stale state.
- R5: Specship defines deterministic external transition gates.
  Confirmed spec advances to plan, approved plan advances to coding, completed coding advances to review, approved review advances to no next phase and marks the task done, and any blocker keeps the current phase as the retry target.
  Terminal exit, free-form completion text, or an Agent stop signal never satisfies a gate by itself.
- R6: Debug and review loop-backs are machine-readable.
  Entering debug records `resume_phase` as coding or review.
  A clear debug checkpoint sets `next_phase` back to that phase and clears `resume_phase`.
  Review changes-requested records `next_phase` as coding or debug according to the finding type.
- R7: `specship inspect TASK-<ID> --json` returns one stable JSON object containing schema version, task id, title, stage, status, nested artifact states, blocked reason, next phase, resume phase, revision, updated timestamp, validity, and issues.
  The command is read-only and never creates a JSON state sidecar.
- R8: `specship check TASK-<ID> --phase <phase> --json` validates the named task, phase preconditions, and checkpoint gate with JSON-only stdout.
  Exit code `0` means the requested gate is valid, `1` means task state or gate invalid, and `2` means invalid input, unsupported actor/schema, or task not found.
  Existing global human-readable `specship check` behavior remains available.
- R9: The task parser reads the nested `artifacts` map, enforces folder/frontmatter identity, derives safe defaults for legacy v1 tasks, and exposes one normalized state model to `inspect`, `check`, and `tasks`.
  Reading a legacy task never rewrites it; the first successful external checkpoint upgrades it in place while preserving all artifacts and Pipeline Log history.
- R10: Specship adds a persisted orchestrated install profile for Codex and Claude Code.
  Claude stage skills installed under this profile use `model: inherit` so the explicit App Builder CLI model remains authoritative.
  Codex manifests and model behavior remain unchanged.
  `update` and `doctor` preserve and validate the selected profile, while normal installs retain the current Claude `opus` and `sonnet` defaults.
- R11: External Pipeline Log entries use only canonical actor labels `codex` and `claude-code`.
  Agent model, routing, session, and attempt history remain owned by App Builder rather than becoming a second routing source inside `task.md`.
- R12: Canonical skills, installer output, CLI help, README, versioning, fixtures, and tests document and enforce the same contract.
  The package remains zero-runtime-dependency, existing targets continue to install in legacy mode, and App Builder consumers refresh generated skill trees only through the Specship installer/update path.

## Acceptance Criteria
- [x] AC1 (covers R1, R2, R3): external phase requests accept only Codex or Claude Code, require an exact safe task id and matching revision, run exactly one assigned phase, checkpoint, and stop without invoking another stage -> verify: table-driven CLI and installed-skill contract tests covering both actors, every phase, traversal ids, id mismatch, stale revision, and missing preconditions.
- [x] AC2 (covers R4, R5, R6, R9): schema v2 fixtures produce deterministic revisions and transitions for spec to plan, plan to coding, coding to review, approved review to done, blocked retry, review to coding/debug, debug entry, and debug resume -> verify: `npm test` transition fixtures assert normalized nested artifacts, `next_phase`, `resume_phase`, write ordering, and single revision increments.
- [x] AC3 (covers R7, R9): `inspect` returns the documented JSON shape for active, blocked, paused, done, debug, malformed, and legacy v1 tasks without mutating any file -> verify: CLI tests parse stdout with `JSON.parse`, compare before/after filesystem hashes, and assert stable normalized fields.
- [x] AC4 (covers R5, R8, R9): phase-specific `check` accepts only a valid handoff or completion gate, emits JSON-only stdout, and returns the documented exit codes while legacy global `check` remains human-readable -> verify: CLI tests cover every phase gate, invalid state, missing task, invalid phase, unsupported schema, and the existing global check fixtures.
- [x] AC5 (covers R10): a normal Claude install keeps the current `opus`/`sonnet` mapping, an orchestrated Claude install uses `model: inherit`, Codex output remains unchanged, and `update` plus `doctor` retain the profile -> verify: installer tests run init/update/doctor for both profiles and inspect all five stage skill frontmatters and Codex manifests.
- [x] AC6 (covers R1, R11): external fixtures and Pipeline Log examples accept canonical `codex` and `claude-code` labels only, and contain no Gemini or generic adapter fallback -> verify: actor validation tests and repository-wide external-contract grep checks.
- [x] AC7 (covers R2, R3, R4, R6, R12): freshly installed Codex and Claude skill trees resolve the external orchestration contract, preserve the normal interactive/ship path, and produce byte-consistent generated skills from canonical package sources -> verify: real `init --codex --claude` smoke fixtures, mirror hash assertions, and legacy `ship` regression checks.
- [x] AC8 (covers R7, R8, R10, R12): the release gate passes with updated CLI help, README, version stamp, package contents, and no runtime dependency or generated-copy drift -> verify: `npm test`, `npm pack --dry-run`, real temporary install/update/doctor smoke, `specship inspect TASK-001 --json`, and `specship check TASK-001 --phase spec --json`.

## Out of Scope
- App Builder Task Board UI, database, PTY sessions, worktrees, Agent/model selectors, or routing history; those belong to App Builder `TASK-049`.
- Gemini CLI or any adapter other than Codex CLI and Claude Code as an external orchestration actor in v1.
- Automatic Agent or model ranking and automatic fallback to another Agent or model.
- Parallel phase execution or multiple active writers on one Specship task.
- A JSON state sidecar or replacing Markdown task artifacts with JSON.
- Cloud execution, remote orchestration, automatic commits, merges, pushes, or pull requests.
- Removing existing legacy install targets from Specship.

## Assumptions
- The canonical implementation lives in the Specship package repository `agent-human`; generated copies inside consumer projects are not edited directly.
- App Builder supplies the selected Agent and model when launching a phase and persists routing/session history itself.
- The model id is opaque to Specship; the orchestrated Claude profile only ensures the skill does not override the CLI-selected model.
- App Builder `TASK-049` consumes this contract after TASK-006 is released and installed into the target project.
- Legacy v1 tasks without schema/revision/next-phase fields remain readable and keep their current manual workflow behavior.
- External orchestration is opt-in; normal `init`, interactive stages, and `ship` remain backward compatible.

## Edge Cases
- The supplied task id contains traversal, separators, Unicode confusables, or does not match its folder/frontmatter.
- Two phase Agents start from the same revision and both attempt to checkpoint.
- An Agent crashes after writing its stage artifact but before the final `task.md` checkpoint.
- `task.md` is valid but an artifact is missing, malformed, stale, or names another task.
- Multiple state changes occur within the same timestamp minute.
- A legacy task lacks `artifacts`, contains unknown additive fields, or is already done.
- Review requests changes without classifying whether coding or debug should run next.
- Debug starts without a valid coding/review resume phase or completes while blocker bugs remain open.
- An orchestrated Claude install is updated after the user chose an explicit model in App Builder.
- A non-certified adapter attempts to use the external profile.

## Open Questions
- none.

## Change History
- 2026-07-17 09:42 +07: Created after analyzing Specship v0.1.17 canonical skills, pipeline parser, CLI, installer, target registry, model frontmatter, and App Builder TASK-049 integration needs.
