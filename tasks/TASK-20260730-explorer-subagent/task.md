---
task: TASK-20260730-explorer-subagent
title: Ship a specship-explorer subagent installed for the Claude Code target
stage: done
status: done
created: 2026-07-30 10:03 +07
updated: 2026-07-30 12:54 +07
artifacts:
  spec: confirmed
  plan: approved
  coding: done
  review: approved
  debug: missing
---

# Task: Ship a specship-explorer subagent installed for the Claude Code target

## Now
- Stage: done — review approved at 2026-07-30 12:54 +07. 6/6 AC, 6/6 S#, gate green (76 tests, install smoke, `specship check` OK). Commit message drafted in `review.md`, **not committed** — it carries a required `git add agents/` step, since `git commit -am` would ship a package referencing an untracked dir.
- Blocked by: none

## Pipeline Log
- 2026-07-30 10:03 +07 spec (claude-code): task opened from user request ("tạo thêm agent phục vụ specship, explorer dùng codebase MCP để search code"). Grounded in targets.js / init.js / WORKFLOW.md / skills; delegation sites swept repo-wide per L1 (5 explorer-type sites in spec/plan/explore-source/debug; coding/review/research delegate other work — untouched). Spec drafted with Q1–Q2 proposed defaults.
- 2026-07-30 10:08 +07 spec (claude-code): confirmed — user accepted both defaults (Q1: defer specship-reviewer to a follow-up task; Q2: keep the namespaced `specship-explorer`). Advancing to plan per user approval.
- 2026-07-30 10:10 +07 plan (claude-code): S1–S6 drafted after grounding in cli.js (per-target flags exist, no CLI change needed), test/cli.test.js (helpers + codex-manifest precedent tests), README structure. Coverage swept both ways: every R1–R6/AC1–AC6 appears in a step's covers:. Draft — awaiting approval.
- 2026-07-30 10:12 +07 plan (claude-code): approved by the user without changes.
- 2026-07-30 10:12 +07 coding (claude-code): started S1 (conventional approach — matches plan structure; user chose "code luôn").
- 2026-07-30 10:18 +07 coding (claude-code): S1–S6 done, 6/6. Gate: npm test 75 green (16 pipeline + 59 cli, incl. 4 new agent cases), `init --all` smoke lands the agent only under `.claude/agents/`, `npm pack --dry-run` ships `agents/specship-explorer.md`, `specship check` OK. One deviation logged on S6 (publish.sh dry-run halts at version-already-published — pre-release state, packaging verified via npm pack). Process slip recorded as L6 (guessed timestamp, corrected).
- 2026-07-30 12:54 +07 review (claude-code): approved. Two independent reviewers (correctness lens on the install code, contract-consistency lens on the shipped prose — per L5 the author doesn't judge alone) plus task-grounded checks here. 2 blockers + 9 minors; every claim re-verified before acting, including two external-product claims checked against primary docs. 8 fixed in-review (false README/spec claim about other platforms' subagent formats, unresolvable `../skills/WORKFLOW.md` citation, "if installed" → capability check across all 7 mentions, a `model:`-pinning guard test, README Commands rows, root CLAUDE.md map, R2/R4 spec contradiction), 3 to Follow-ups. Blocker 1 (`agents/` untracked) is addressed by the commit draft, not by code. Gate re-green after fixes: 76 tests, `specship check` OK. Lessons L7–L9 recorded.
