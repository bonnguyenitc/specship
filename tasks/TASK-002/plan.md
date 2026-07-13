---
task: TASK-002
title: Cross-agent handoff - agent identity in Pipeline Log + handoff contract
type: plan
status: approved
created: 2026-07-12 19:45 +0700
updated: 2026-07-13 22:16 +0700
---

# Plan: Cross-agent handoff (agent labels + handoff contract)

## Approach
Contract-first, single source of truth: the format change and the handoff rules land once in `skills/WORKFLOW.md`; each skill that writes Pipeline Log lines gets one pointer sentence, never a restated contract (verified: no doc template under `.agents/`, `.cursor/`, `.antigravity/`, `.gemini/` duplicates the log format).
`src/pipeline.js` does not parse Pipeline Log lines, so the additive format cannot break `specship check` - but that safety is proven by a fixture test, not assumed.
No new validation logic in this task (stricter log-line checks belong to the follow-up claim/concurrent task).

## Files to Touch
- `skills/WORKFLOW.md` - extend Pipeline Log format with optional `(<agent>)`; add "Agent handoff" section
- `skills/{spec,plan,coding,review,debug,resume-task,pause-task,archive-task,ship}/SKILL.md` - one checkpoint sentence: label your log lines, per WORKFLOW.md
- `test/cli.test.js` - fixture task whose Pipeline Log mixes labeled and unlabeled lines

## Steps
- [x] S1 — `skills/WORKFLOW.md`: change the Pipeline Log examples/format to `- <ts> <stage> (<agent>): <event>` with `(<agent>)` optional (self-reported free-text label, omit when the platform has no distinctive name); add an **"Agent handoff"** section after "Shared-state protocol" (switch platforms at any checkpoint; hydrate = handoff; artifacts are the only payload; mid-stage handoff resumes from ticked `S#`s) (covers: R4, R5) → verify: `grep -c "Agent handoff" skills/WORKFLOW.md` ≥ 1 && `grep -c "(<agent>)" skills/WORKFLOW.md` ≥ 1
- [x] S2 — add the one-line labeling instruction to the checkpoint block of the 9 log-writing skills (spec, plan, coding, review, debug, resume-task, pause-task, archive-task, ship), each pointing at WORKFLOW.md for the format (covers: R4) → verify: `grep -l "agent label" skills/*/SKILL.md | wc -l` = 9
- [x] S3 — `test/cli.test.js`: extend the conforming-task fixture in `check passes with no tasks/ and with a conforming task` with a Pipeline Log body mixing labeled (`spec (claude-code): confirmed`) and unlabeled (`plan: approved`) lines; assert `check` still reports OK (covers: R4, AC4) → verify: `npm test` green — deviation: also gave `writeTask()` an optional `taskBody` param (default unchanged) so the fixture can carry a Pipeline Log body
- [x] S4 — real-install smoke: fresh dir install ships the new contract to every target (covers: R5, AC8) → verify: `D=$(mktemp -d); node bin/cli.js init --all --dir "$D" && grep -l "Agent handoff" "$D"/.claude/skills/WORKFLOW.md "$D"/.codex/skills/WORKFLOW.md "$D"/.agents/skills/WORKFLOW.md`

## Risks / Open Questions
- Wording drift across the 9 one-liners - mitigated by keeping them a pointer ("label per WORKFLOW.md → Agent handoff"), not a restatement.
- Existing tasks in consumer repos keep unlabeled lines forever - by design (format additive); S3 is the regression proof.
- Stricter Pipeline Log validation in `specship check` deliberately deferred to the claim/concurrent follow-up task.

## Change History
- 2026-07-12 19:45 +0700: Created.
- 2026-07-13 22:13 +0700: Approved by user ("tiếp tục task 002"); no content changes; status → approved.
- 2026-07-13 22:16 +0700: S3 inline deviation noted (writeTask optional taskBody param); S1-S4 all ticked.
