---
task: TASK-20260730-researcher-subagent
title: Ship a specship-researcher subagent for the research fan-out
type: spec
status: confirmed
created: 2026-07-30 10:53 +07
updated: 2026-07-30 12:54 +07
---

# Spec: Ship a specship-researcher subagent for the research fan-out

## Goal
`skills/research/SKILL.md` tells the stage to "delegate the fan-out to subagents — one subagent per angle", but ships no definition, so each angle runs on a generic agent that knows none of the skill's source discipline (≥2 independent sources or 1 primary, publish dates and exact versions recorded, primary over commentary, conclusions not page dumps). Ship a `specship-researcher` subagent that carries those rules, completing the third and last helper role in the pipeline (explorer = find in-repo, reviewer = judge a diff, researcher = establish external fact).

## Requirements
- R1: `agents/specship-researcher.md` exists in Claude Code subagent format (frontmatter `name` + `description`, body = system prompt). The prompt must mandate: (a) it researches **one query angle** given in its brief, not the whole question; (b) the **tool ladder** from the skill — specialized search MCP → domain-specific MCP (docs/repo/internal) → built-in web search + fetch → browser automation last — loading deferred tools in **one batch**; (c) **no memory-only answers**: with no search tool available it says so and marks every claim `(unverified — no search tool available)` rather than presenting recall as research; (d) **read primary sources**, fetching pages rather than trusting snippets, and record per source the URL, publish/last-updated date, and exact versions/figures stated; (e) the verification bar — a load-bearing claim needs **≥2 independent sources or 1 primary source**, ten blogs citing one post count as one, the newer primary source wins a conflict **and the conflict is reported**, anything failing verification is returned `(unverified)` not dropped; (f) return **conclusions + a source list, never raw page dumps**; (g) **write nothing** — not `tasks/`, not `docs/research/`: the main thread synthesizes and owns the report.
- R2: The fan-out bullet in `skills/research/SKILL.md` names `specship-researcher` as the per-angle subagent when installed, keeping the existing conditions intact: fan-out is for big/deep research only, and a platform that can't spawn subagents does the same fan-out inline.
- R3: README's subagent table documents the third agent, and the test that proves subagents install claude-only asserts this one ships too.

## Acceptance Criteria
- [x] AC1 (covers R1): the definition carries all seven mandates → verify: read `agents/specship-researcher.md`; grep it for the tool-ladder terms (MCP, web search, browser), `unverified`, the ≥2-independent-sources bar, "publish"/date recording, the no-page-dumps rule, and the never-write rule naming both `tasks/` and `docs/research/`.
- [x] AC2 (covers R2): the research skill prefers the agent without losing its conditions → verify: `grep -n "specship-researcher" skills/research/SKILL.md` hits the Step 3 fan-out bullet, and that bullet still contains "big research task" and the can't-spawn-subagents inline fallback.
- [x] AC3 (covers R3): all three agents install for claude only and ship in the tarball → verify: `npm test` green with `specship-researcher.md` added to the shipped-set assertion in `test/cli.test.js`; `npm pack --dry-run` lists all three `agents/*.md`.
- [x] AC4 (covers R3): README covers the researcher → verify: `grep -n "specship-researcher" README.md` hits the subagent table.

## Out of Scope
- Changing the `research` skill's own method (tool ladder, report template, `docs/research/` location) — this task supplies a fan-out worker, it does not redefine research.
- Any install-code change: `agents/` is already generic (proven by the dir-driven test in TASK-20260730-reviewer-subagent).
- A fourth agent role. Per the delegation sweep, the only remaining subagent site is `coding`'s parallel-step fan-out, deliberately left alone: that skill defaults to sequential work and the brief already carries the task-specific part.

## Assumptions
- One reusable definition invoked once per angle, with the angle in the brief — same shape as the reviewer's lens, so the number of angles stays the caller's judgement.
- The agent may fetch and read external pages but writes no files, so the "read-only" rule is about the repo, not about network reads.

## Edge Cases
- No search tool connected in the session → say so explicitly and mark claims `(unverified — no search tool available)`; never silently answer from memory.
- Sources conflict → report the conflict alongside the newer primary source's answer, rather than silently picking one.
- The angle returns nothing useful → say so plainly; an empty angle is a real result, and inventing sources is the worst possible failure for a research helper.

## Open Questions
- none

## Change History
- 2026-07-30 10:53 +07: Created and confirmed in one pass — the user approved building this agent directly, the infrastructure and the two sibling agents are already shipped, and the delegation sweep left no open scope question.
- 2026-07-30 12:54 +07: AC1–AC4 ticked after re-running every verify at review. R1(c) reworded in the shipped definition — "never answer from memory" was stricter than `research/SKILL.md` Step 2, which prescribes a caveated memory answer when no search tool exists; the mandate is now "never present memory as research", matching the skill.
