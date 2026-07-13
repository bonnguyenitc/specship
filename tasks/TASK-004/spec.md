---
task: TASK-004
title: Harden spec-stage requirement clarification
type: spec
status: confirmed
created: 2026-07-12 22:26 +0700
updated: 2026-07-12 22:26 +0700
---

# Spec: Harden spec-stage requirement clarification

## Goal
The spec stage relies purely on model judgment to hunt ambiguity, and `specship check` accepts a confirmed spec that still has open blocker questions.
Give the skill a blind-spot checklist and make the blocker rule machine-enforced, so under-clarified requirements are caught before plan/coding.

## Requirements
- R1: `skills/spec/SKILL.md` §3 ("Find the gaps") gains a compact blind-spot checklist of axes tickets routinely leave unstated (permissions, failure/partial-failure behavior, existing data & backward compat, concurrency/idempotency, limits/i18n/timezones, observability & rollout), framed as a hunting list - not sections to fill.
- R2: The confirmation gate in `skills/spec/SKILL.md` states explicitly that blocker `Q#`s must be ticked (resolved) before `status: confirmed`, and that `specship check` enforces this.
- R3: `specship check` reports a violation when a `spec.md` with `status: confirmed` contains an unticked `- [ ] Q# (blocker)` line, naming the offending `Q#`s.
- R4: Non-blocker unticked `Q#`s and struck-through (`~~Q#~~`) lines do not trigger the R3 violation (acknowledged open questions stay legal).

## Acceptance Criteria
- [x] AC1 (covers R1, R2): the checklist and the tightened gate wording exist in the skill → verify: `grep -n "blind spot" skills/spec/SKILL.md` and `grep -n "blocker" skills/spec/SKILL.md` show the new lines
- [x] AC2 (covers R3): a fixture task with a confirmed spec carrying `- [ ] Q1 (blocker)` makes `check` exit 1 naming Q1 → verify: `npm test` (new case)
- [x] AC3 (covers R4): a conforming fixture with a ticked blocker Q and an unticked non-blocker Q still passes `check` → verify: `npm test` (extended conforming case)
- [x] AC4 (covers R1-R4): full gate - suite green and a real install ships the updated skill → verify: `npm test` && `node bin/cli.js init --all --dir "$(mktemp -d)"` then grep the installed `spec/SKILL.md`

## Out of Scope
- Validating plan.md frontmatter fields/sections (the TASK-003 format drift) - separate task if wanted.
- Stricter Pipeline Log validation.
- Interview/questioning UX changes beyond the checklist (e.g. mandatory question rounds).

## Assumptions
- Both improvements land together (checklist + enforcement) - the user's "hãy làm tốt hơn" accepted the two weak points as proposed.
- Checklist axes are the ones proposed in conversation; consumers can edit their installed copy.
- Referencing `specship check` inside the skill is acceptable - consumers installed it via specship and README already suggests it as a CI gate.

## Edge Cases
- Removed questions are struck through per WORKFLOW.md (`~~Q2 (removed …)~~`); the checkbox regex must not match them.
- Blocker marker spacing may vary (`Q1 (blocker)` vs `Q1  (blocker)`); match with flexible whitespace.

## Open Questions
- none

## Change History
- 2026-07-12 22:26 +0700: Created; confirmed (delegated approval - direct user instruction to improve).
