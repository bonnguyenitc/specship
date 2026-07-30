---
task: TASK-20260730-researcher-subagent
title: Ship a specship-researcher subagent for the research fan-out
stage: done
status: done
created: 2026-07-30 10:53 +07
updated: 2026-07-30 12:54 +07
artifacts:
  spec: confirmed
  plan: approved
  coding: done
  review: approved
  debug: missing
---

# Task: Ship a specship-researcher subagent for the research fan-out

## Now
- Stage: done — review approved at 2026-07-30 12:54 +07. 4/4 AC, 5/5 S#, gate green (76 tests). Commit drafted in the explorer task's `review.md` (one commit covers all three); **not committed** — it needs an explicit `git add agents/`.
- Blocked by: none

## Pipeline Log
- 2026-07-30 10:53 +07 spec (claude-code): task opened at user request ("ok nhé" to building the researcher). Scope came from a repo-wide delegation sweep: after explorer and reviewer, `skills/research/SKILL.md` Step 3 is the last subagent site worth a definition; `coding`'s parallel fan-out was assessed and deliberately left out (defaults to sequential, brief carries the task-specific part). Confirmed in one pass — no open question.
- 2026-07-30 10:53 +07 plan (claude-code): S1–S5 drafted and approved in one pass (additive change on infrastructure shipped in the two sibling tasks).
- 2026-07-30 10:56 +07 coding (claude-code): S1–S5 done, 5/5, no deviations. Definition inherits the research skill's Steps 2/4/5 (tool ladder, primary sources, verification bar) but explicitly not Step 6 — the report stays the main thread's, which the skill's fan-out bullet now states too. Gate: npm test 75 green (16 pipeline + 59 cli), `init --all` smoke shows three agents under `.claude/agents/` and none elsewhere, `npm pack --dry-run` ships all three, `specship check` OK.
- 2026-07-30 12:54 +07 review (claude-code): approved. Reviewed inside the joint 3-task review (shared gate and commit draft in the explorer task's review.md). This task's scope: 2 minors, both fixed — the definition's absolute "never answer from memory" contradicted its own next sentence and was stricter than `research/SKILL.md` Step 2 (which prescribes a caveated memory answer when no search tool exists), now "never present memory as research"; and the Step 6 report-ownership split is stated on the skill side too. One reviewer claim ("all three agents cite WORKFLOW.md") was disproved by direct verification — this definition never cited it. The no-code-change premise held: only a name in the shipped-set assertion moved.
