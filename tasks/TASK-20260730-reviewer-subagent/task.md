---
task: TASK-20260730-reviewer-subagent
title: Ship a specship-reviewer subagent for the review panel
stage: done
status: done
created: 2026-07-30 10:23 +07
updated: 2026-07-30 12:54 +07
artifacts:
  spec: confirmed
  plan: approved
  coding: done
  review: approved
  debug: missing
---

# Task: Ship a specship-reviewer subagent for the review panel

## Now
- Stage: done — review approved at 2026-07-30 12:54 +07. 5/5 AC, 5/5 S#, gate green (76 tests). Commit drafted in the sibling task's `review.md` (one commit covers all three); **not committed** — it needs an explicit `git add agents/`.
- Blocked by: none

## Pipeline Log
- 2026-07-30 10:23 +07 spec (claude-code): task opened at user request ("làm thêm reviewer agent"), un-deferring Q1 of TASK-20260730-explorer-subagent. Grounded in skills/review/SKILL.md (review-panel bullet, Findings format, blocker/minor severity) and the now-existing agents/ infrastructure (src/targets.js `subagents`, src/init.js copy/uninstall/doctor, package.json files). Confirmed in one pass — scope was already settled with the user and no question remained.
- 2026-07-30 10:23 +07 plan (claude-code): S1–S5 drafted and approved in one pass (additive change on already-shipped infrastructure; user asked for the agent directly).
- 2026-07-30 10:26 +07 coding (claude-code): S1–S5 done, 5/5, no deviations. The no-code-change premise held: install/uninstall/doctor picked up the second agent file untouched. S3 replaced the filename-hardcoded install test with a dir-driven one that also proves subagents land nowhere but `.claude/agents/`. Gate: npm test 75 green (16 pipeline + 59 cli), `init --all` installs both agents under `.claude/agents/` only, `npm pack --dry-run` ships both, `specship check` OK.
- 2026-07-30 12:54 +07 review (claude-code): approved. Reviewed inside the joint 3-task review (see the explorer task's review.md for the shared gate and commit draft). This task's scope: 1 blocker + 3 minors, all fixed — the `path:line` demand in the review.md/debug.md Findings templates conflicted with the agents' "never cite line numbers" rule (fabricated-citation risk), the Findings legend gained `panel:<lens>` + `unverified`, the install test now walks `agents/` recursively (its comment had overclaimed), and the README's "Both" lead-in over a 3-row table was corrected. The review itself was run with 2 independent reviewers briefed from this very definition — they found both blockers the main thread missed, dogfooding it and L5 at once.
