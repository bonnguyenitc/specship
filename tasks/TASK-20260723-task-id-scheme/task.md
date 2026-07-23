---
task: TASK-20260723-task-id-scheme
title: Replace sequential task IDs with date+slug to survive concurrent minting
stage: done
status: done
created: 2026-07-23 09:33 +07
updated: 2026-07-23 10:33 +07
artifacts:
  spec: confirmed
  plan: approved
  coding: done
  review: approved
  debug: missing
---

# Task: Replace sequential task IDs with date+slug to survive concurrent minting

## Now
- Stage: done — review approved at 2026-07-23 09:40 +07. 5/5 AC, 6/6 S#, gate green (71 tests, `specship check` OK, install smoke on every target). Commit message drafted in review.md; not committed — the user runs git. Ships to consumers on the next `./publish.sh`.
- Blocked by: none

## Pipeline Log
- 2026-07-23 09:33 +07 spec (claude-code): task opened; user reported duplicate IDs under parallel runs and picked the date+slug scheme. Spec confirmed — no open blockers (the one design decision was answered directly). This task's own id dogfoods the new scheme.
- 2026-07-23 09:35 +07 plan (claude-code): S1–S6 drafted with executable verifies and full R1–R6/AC1–AC5 coverage; approved (delegated — user requested the change end-to-end).
- 2026-07-23 09:35 +07 coding (claude-code): started S1.
- 2026-07-23 09:38 +07 coding (claude-code): S1–S6 done, 6/6. Repo-wide grep in S2 caught one out-of-plan minting site (`skills/debug/SKILL.md` standalone-bug path) — fixed, plan updated. Gate: `npm test` 71 green (16 pipeline + 55 cli), `specship check` OK, `init --all` smoke shows the rule in every installed target and zero sequential-minting wording.
- 2026-07-23 09:40 +07 review (claude-code): approved. Re-ran every AC against its own verify (5/5 ticked), re-read the full diff for cross-file consistency (WORKFLOW/spec/debug rule identical; three lifecycle skills share one resolution semantics). One minor finding — legacy ids left in README orchestration examples and slugify-demo — resolved as deliberate (legacy ids stay valid), noted in Follow-ups. Commit drafted in review.md, not run.
- 2026-07-23 10:33 +07 review (claude-code): independent re-review at user request — 2 adversarial reviewers (contract-consistency / correctness lenses; per L5, the author doesn't judge alone), each finding re-verified by the main thread. 4 minor, 0 blockers, all fixed: restored the un-padding rule pause/archive had regressed vs R4, defined the match relation (exact-first, else unique substring), specified zero-match ("say so and stop") and archived-match outcomes, and de-taught counter minting in the demo walkthrough. Gate re-green: 71 tests, `specship check` OK, install smoke carries the fixes. Approval stands.
