---
task: TASK-003
title: Per-stage model selection via SKILL.md frontmatter
stage: done
status: done
created: 2026-07-12 21:13 +0700
updated: 2026-07-12 21:34 +0700
artifacts:
  spec: confirmed
  plan: approved
  coding: done
  review: approved
  debug: missing
---

# Task: Per-stage model selection via SKILL.md frontmatter

## Now
- Stage: done - review approved, commit draft in review.md (not committed; user commits when ready)
- Blocked by: none

## Pipeline Log
- 2026-07-12 21:13 +0700 spec (claude-code): task opened; requirements resolved via user Q&A (hard-code, fable for spec/plan/review/debug + sonnet for coding); spec confirmed (R1-R5, AC1-AC4)
- 2026-07-12 21:13 +0700 plan (claude-code): plan drafted S1-S4 and approved (ship-style consent from "ok cách 1 nhé")
- 2026-07-12 21:13 +0700 ship: auto-advanced plan → coding
- 2026-07-12 21:16 +0700 coding (claude-code): S1-S4 done - model field in 5 skills, README section, regression test; npm test 24 passed
- 2026-07-12 21:16 +0700 ship: auto-advanced coding → review
- 2026-07-12 21:16 +0700 review (claude-code): gate green (npm test, real init --all, specship check), AC1-AC4 ticked, review approved → done
- 2026-07-12 21:34 +0700 review (claude-code): user changed reasoning-stage model fable → opus; skills/test/README/spec updated, gate re-run green, still done
