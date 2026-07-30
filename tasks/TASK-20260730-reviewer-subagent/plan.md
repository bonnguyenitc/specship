---
task: TASK-20260730-reviewer-subagent
title: Ship a specship-reviewer subagent for the review panel
type: plan
status: approved
created: 2026-07-30 10:23 +07
updated: 2026-07-30 10:26 +07
---

# Plan: Ship a specship-reviewer subagent for the review panel

## Approach
Purely additive on top of TASK-20260730-explorer-subagent's infrastructure: drop a second file into the package's `agents/` dir and the existing `copyDir` (install), `expectedAgentFiles` (uninstall/doctor), and `files: ["agents"]` (packaging) pick it up with **no code change**. The work is therefore: author the definition, wire the review skill's panel bullet, and replace the filename-specific install test with a dir-driven one so this genericity is actually proven (and stays proven for the next agent).

Design of the definition mirrors the explorer's shape — read-only, findings-only, no pipeline state — but with the review panel's contract baked in: mutual blindness, a lens parameter, and the `blocker`/`minor` + failure-scenario format `skills/review/SKILL.md` already expects in its Findings list, so the main thread can paste findings in without translating them.

## Files to Touch
- `agents/specship-reviewer.md` — new: the panel-member definition.
- `skills/review/SKILL.md` — the Review-panel bullet names the agent, default and fallback untouched.
- `test/cli.test.js` — generalize the subagent install test to walk the package `agents/` dir.
- `README.md` — the subagent paragraph covers both agents.

## Steps
- [x] S1 — Author `agents/specship-reviewer.md`: frontmatter (`name: specship-reviewer`, description naming the review-panel use), prompt mandating (a) fresh context-free diff pass, blind to other members; (b) lens from the brief, default correctness; (c) findings as `[blocker|minor]` + `path` (`symbol`) + concrete failure scenario; (d) verify before reporting, say "no findings" plainly; (e) read-only, never write `tasks/`, never tick `AC#`/`S#`, never decide the verdict (covers: R1, AC1) → verify: `grep -qi "blind" agents/specship-reviewer.md && grep -q "blocker" agents/specship-reviewer.md && grep -q "minor" agents/specship-reviewer.md && grep -qi "no findings" agents/specship-reviewer.md && grep -q "tasks/" agents/specship-reviewer.md && grep -qiE "correctness|security|performance" agents/specship-reviewer.md`
- [x] S2 — Wire the panel: in `skills/review/SKILL.md`'s "Review panel (in-stage subagents)" bullet, name `specship-reviewer` as the member to spawn when installed, leaving "the default is one" pass, the opt-in rule, and the can't-spawn-subagents fallback sentence intact (covers: R2, AC2) → verify: `grep -n "specship-reviewer" skills/review/SKILL.md` hits the panel bullet, and that same bullet still greps for `default is one` and `can't spawn subagents`
- [x] S3 — Generalize the install test in `test/cli.test.js`: replace the filename-hardcoded claude-only assertion with one that reads the package `agents/` dir at runtime and asserts (a) every file lands byte-identical in `.claude/agents/` after `init --all`, (b) no other target dir receives any of them, (c) the set is non-empty and includes both shipped agents (covers: R3, AC3) → verify: `npm test` green (75+ cases)
- [x] S4 — README: extend the subagent paragraph to both agents (explorer for wide code search, reviewer as an independent review-panel member), keeping the claude-only + MCP-optional statements (covers: R4, AC5) → verify: `grep -n "specship-reviewer" README.md`
- [x] S5 — Full gate: `npm test`; `init --all` smoke showing both files only under `.claude/agents/`; `npm pack --dry-run` lists both; `node bin/cli.js check --dir .` OK (covers: AC3, AC4; re-runs the AC verifies) → verify: all four commands exit 0 with the expected output

## Risks / Open Questions
- S3 rewrites an existing passing test. It must stay a *stronger* assertion, not a looser one — the codex-manifest-style "installs nowhere else" check has to survive the generalization.
- The review skill's panel bullet is dense and load-bearing (default vs opt-in vs fallback). Re-read the whole bullet after editing, as a non-Claude platform would (per the explorer task's same risk).

## Change History
- 2026-07-30 10:23 +07: Created and approved in one pass — a 5-step additive change on infrastructure already reviewed and shipped in the sibling task; the user asked for the agent directly.
- 2026-07-30 10:26 +07: S1–S5 all ticked, no deviations. S3 confirmed the no-code-change premise: install/uninstall/doctor picked the second agent up untouched, and the test now asserts that genericity from the dir contents.
