---
task: TASK-006
title: External phase orchestration for Codex and Claude Code
type: plan
status: approved
created: 2026-07-17 09:47 +07
updated: 2026-07-17 10:01 +07
---

# Plan: External phase orchestration for Codex and Claude Code

## Approach
Keep Markdown/YAML task artifacts as the only durable workflow state and extend the existing zero-dependency parser into one normalized task-state model.
Add read-only `inspect` and phase-specific `check` commands over that model instead of adding a daemon or JSON state sidecar.

Define external orchestration as an opt-in skill contract: App Builder supplies the exact task, phase, actor, and expected revision; the assigned Agent runs one phase, checkpoints, and stops.
The existing interactive stages and `ship` remain unchanged.

Persist install profile metadata in `.specship/install.json` rather than inferring it from mutable generated skill files.
The orchestrated profile rewrites only installed Claude stage model frontmatter to `inherit`; canonical skills keep their normal `opus`/`sonnet` defaults and Codex output remains byte-equivalent.

## Files to Touch
- `src/pipeline.js` - parse nested task frontmatter, normalize legacy/v2 state, validate identity, and compute phase gates.
- `src/cli.js` - add `inspect`, task-scoped/phase-scoped `check`, JSON output, exit codes, and profile options.
- `src/init.js` - install, update, doctor, and uninstall with persisted profile-aware output.
- `src/targets.js` - declare which targets support external orchestration and their canonical actor ids.
- `src/install-profile.js` - new zero-dependency profile manifest reader/writer and validation helpers.
- `skills/WORKFLOW.md` - define schema v2, revision/checkpoint rules, exact task identity, and external one-phase behavior.
- `skills/{spec,plan,coding,review,debug}/SKILL.md` - apply phase-only hydrate/checkpoint/stop behavior in external mode.
- `skills/{ship,resume-task}/SKILL.md` - explicitly keep these entry points out of external phase execution.
- `test/pipeline.test.js` - new normalized-state and transition fixture coverage.
- `test/cli.test.js` - CLI, installation profile, generated-skill, compatibility, and smoke coverage.
- `package.json` - run both zero-dependency test files and bump the release version after compatibility is green.
- `README.md` - document the external contract, JSON commands, actors, install profile, model inheritance, and migration behavior.

## Steps
- [x] S1 - Build the normalized task-state core with safe task ids, one-level nested frontmatter, v1 defaults, schema v2 fields, identity checks, revision checks, deterministic phase gates, and debug/review loop transitions. (covers: R3, R4, R5, R6, R9, AC2) -> verify: `node test/pipeline.test.js`
- [x] S2 - Add read-only `inspect TASK-ID --json` and task/phase-scoped `check TASK-ID --phase PHASE --json` over the normalized state model, including JSON-only output and exit codes while preserving global human `check`. (covers: R7, R8, R9, AC3, AC4) -> verify: `node test/cli.test.js`
- [x] S3 - Update the canonical workflow and stage skills with the external request envelope, Codex/Claude actor allowlist, exact-id and expected-revision checks, one-phase-only execution, task.md-last checkpointing, blocked behavior, canonical actor logging, and debug/review handoffs. (covers: R1, R2, R3, R4, R5, R6, R11, AC1, AC2, AC6) -> verify: `node test/cli.test.js`
- [x] S4 - Add the persisted `orchestrated` install profile, restrict it to Codex and Claude targets, transform installed Claude stage models to `inherit`, keep Codex output unchanged, and make update/doctor/uninstall profile-aware without mutating canonical skill defaults. (covers: R1, R10, R12, AC5, AC6) -> verify: `node test/cli.test.js`
- [x] S5 - Extend real temporary-install fixtures to prove Codex/Claude external skills resolve correctly, normal installs retain Claude model defaults, legacy targets and v1 tasks remain compatible, `ship` remains interactive-profile autopilot, and generated files come only from canonical package sources. (covers: R1, R2, R10, R11, R12, AC5, AC6, AC7) -> verify: `npm test`
- [x] S6 - Document the public contract and migration path, update CLI help and examples, bump Specship from `0.1.17` to `0.2.0`, and run the package/release dry-run gate without publishing, committing, tagging, or pushing. (covers: R12, AC8) -> verify: `npm pack --dry-run`

## Risks / Open Questions
- The existing CLI parser treats every non-option as invalid, so positional task ids must be added without changing current agent-flag parsing.
- Claude profile transformation must happen only in generated output; modifying canonical stage frontmatter would regress normal installs.
- Expected revision and task.md-last checkpointing detect stale writers but cannot provide a filesystem lock; App Builder must still enforce one active phase writer.
- Skill behavior is instruction-driven, so automated tests can prove contract text and state/CLI behavior, while review still needs one real Codex and one real Claude phase handoff smoke run.
- No open blocker questions.

## Change History
- 2026-07-17 09:47 +07: Created from confirmed TASK-006 spec after inspecting the parser, CLI, installer, targets, tests, stage skills, and Claude model override behavior.
- 2026-07-17 10:01 +07: Approved by the user with no changes to S1-S6; coding proceeds TDD (user-selected approach).
- 2026-07-17 10:19 +07: S1-S6 implemented as planned, no structural deviation. Two additions the plan did not name, both inside their step's scope: `--actor` validation on `check` (S3, R1/R8 - the envelope needs the actor to be rejectable, not just documented) and `modelFrontmatter` on the target registry (S4, so the Claude model transform is gated on a declared capability rather than a hardcoded target name).
