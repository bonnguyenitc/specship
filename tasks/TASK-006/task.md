---
task: TASK-006
title: External phase orchestration for Codex and Claude Code
stage: done
status: done
created: 2026-07-17 09:42 +07
updated: 2026-07-17 13:52 +07
artifacts:
  spec: confirmed
  plan: approved
  coding: done
  review: approved
  debug: clear
---

# Task: External phase orchestration for Codex and Claude Code

## Now
- Stage: done - review approved at 2026-07-17 13:52 +07. All 8 AC ticked, all 6 S# ticked, 8 blockers fixed and re-verified (BUG1-BUG8), 7 minor deferred to review.md → Follow-ups. Gate: 71 tests green, pack + publish dry-run clean at v0.2.0, install/update/doctor smoke green on both profiles. Commit message drafted in review.md; not committed - the user runs git.
- Blocked by: none.
- Next: publishing v0.2.0 unblocks App Builder `TASK-049`, which needs this installed into its project via the Specship installer.

## Pipeline Log
- 2026-07-17 09:42 +07 spec (codex): analyzed the canonical Specship package, CLI parser, installer, skill handoffs, task schema, and Claude per-stage model behavior.
- 2026-07-17 09:42 +07 spec (codex): confirmed R1-R12 and AC1-AC8 for external orchestration limited to Codex CLI and Claude Code.
- 2026-07-17 09:47 +07 plan (codex): drafted S1-S6 with executable checks and complete R1-R12/AC1-AC8 coverage; waiting for approval.
- 2026-07-17 10:01 +07 plan (claude-code): user approved S1-S6 unchanged; plan.md set to approved.
- 2026-07-17 10:01 +07 coding (claude-code): started S1 (normalized task-state core) with TDD.
- 2026-07-17 10:19 +07 coding (claude-code): S1-S6 done, 6/6 steps. Fixed a bug found while coding: `init <other-agent>` silently reset a persisted orchestrated profile (install() read a missing --profile as "user chose interactive"); the profile is now a project setting that only an explicit --profile switches. Also hardened value-taking flags (`--actor --json` swallowed the next flag). Gate: 60 tests green, `npm pack --dry-run` + `./publish.sh --dry-run` clean at v0.2.0, real install/update/doctor smoke green on both profiles.
- 2026-07-17 11:28 +07 review (claude-code): changes-requested. Panel of 3 independent reviewers (correctness/security/contract lenses) + a task-grounded pass; every finding reproduced by the main thread before recording. 6 blockers / 12 minor in review.md; `next_phase: debug`. Gate re-verified green (60 tests = 9+51, pack dry-run clean, zero deps, v0.2.0) and the test diff is clean (nothing skipped or weakened). AC6 met and ticked; AC1-AC5, AC7, AC8 not met. Headline: the review loop-back never closes - once `review: changes-requested` is set the gate only ever yields `coding`/`debug`, so no task can reach `done`, and `debug/SKILL.md` instructs the one thing the gate rejects. This task is now itself sitting in that deadlocked state.
- 2026-07-17 11:45 +07 debug (claude-code): BUG1-BUG6 fixed root-cause first; every original repro re-run and gone. BUG1 needed the contract text fixed too (the gate rejected what debug/SKILL.md instructed), so WORKFLOW.md's gate table, review/SKILL.md and coding/SKILL.md now describe a loop that closes. BUG5's first fix (refuse schema v1 for orchestration) was reverted - it contradicted R9's "the first external checkpoint upgrades it in place"; replaced with a stage-vs-gate consistency rule that satisfies both halves of R9. Both test helpers now write the artifact files a fixture's map implies - the fictional fixtures were what let BUG4 ship. Gate: 68 tests green (was 60; +8 close the loops the old suite only opened), pack + publish dry-run clean, install/doctor smoke green on both profiles. `next_phase: review` - this task now runs through the exact loop it just repaired.
- 2026-07-17 13:52 +07 review (claude-code): approved. Re-ran the full gate, re-ran all six original repros (gone), re-verified every AC against its own `verify:`, and put the fix diff in front of a fresh independent reviewer - which found two blockers *in the fixes*: an infinite loop I introduced in the BUG2 parser fix (every task-reading command hung on an unterminated fence - the exact half-written file the contract calls "safe to retry"), and a false negative in the BUG4 backing check (an artifact declaring no status satisfied any claim). Both fixed, re-verified, recorded as BUG7/BUG8 + L5. Also retracted a wrong first-pass follow-up: `resume_phase` is load-bearing, not decorative (L4) - kept and locked with a test. Docs corrected where false. Final: 71 tests green, 8/8 AC, 6/6 S#, 7 minor deferred. v0.2.0 ready; commit drafted in review.md, not run.
