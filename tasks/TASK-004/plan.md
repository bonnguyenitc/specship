---
task: TASK-004
title: Harden spec-stage requirement clarification
type: plan
status: approved
created: 2026-07-12 22:26 +0700
updated: 2026-07-12 22:26 +0700
---

# Plan: Harden spec-stage requirement clarification

## Approach
Two independent, additive edits - no installer change needed since `skills/` is copied verbatim to every target.
The `check` rule goes next to the existing stage-precondition checks in `src/pipeline.js` and reuses the `unticked()` helper; it fires on `status: confirmed` regardless of stage, matching WORKFLOW.md's "confirmed (no open blocker Q#)" precondition.
Tests extend the two existing `check` fixtures instead of adding new test files.

## Files to Touch
- `src/pipeline.js` - confirmed-spec-with-open-blocker violation
- `test/cli.test.js` - extend conforming + violating check fixtures
- `skills/spec/SKILL.md` - blind-spot checklist in §3, tightened confirmation gate

## Steps
- [x] S1 — `src/pipeline.js`: after the stage preconditions, flag `spec.fm.status === 'confirmed'` with unticked `- [ ] Q# (blocker)` lines; extend `test/cli.test.js` - conforming fixture gains a ticked blocker + unticked non-blocker Q (still OK), violating test gains a task whose confirmed spec has `- [ ] Q1 (blocker)` (covers: R3, R4, AC2, AC3) → verify: `npm test`
- [x] S2 — `skills/spec/SKILL.md`: add the blind-spot checklist to §3 and the blocker-must-be-ticked + `specship check` enforcement wording to the confirmation gate (covers: R1, R2, AC1) → verify: `grep -n "blind spot" skills/spec/SKILL.md && grep -n "specship check" skills/spec/SKILL.md`
- [x] S3 — full gate: `npm test`, real install `node bin/cli.js init --all --dir "$(mktemp -d)"` + grep installed skill, `node bin/cli.js check` on this repo (covers: AC4) → verify: all exit 0

## Risks / Open Questions
- Regex false-positives on prose containing `(blocker)` - mitigated: rule only matches checkbox lines `- [ ] Q#`.

## Change History
- 2026-07-12 22:26 +0700: Created; approved (delegated).
