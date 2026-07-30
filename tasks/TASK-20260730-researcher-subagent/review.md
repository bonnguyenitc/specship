---
task: TASK-20260730-researcher-subagent
title: Ship a specship-researcher subagent for the research fan-out
type: review
status: approved
created: 2026-07-30 12:54 +07
updated: 2026-07-30 12:54 +07
---

# Review: Ship a specship-researcher subagent for the research fan-out

Reviewed as part of one working diff covering three sibling tasks. Shared gate results, the commit draft and cross-cutting findings live in `../TASK-20260730-explorer-subagent/review.md`; this file records this task's scope (`agents/specship-researcher.md`, the Step 3 fan-out bullet, the shipped-set assertion, the README row).

## Gate Results
- Tests: **pass** — 76 green (16 pipeline + 60 cli). Full gate output in the sibling review.
- Contract gate: `specship check` → OK.
- The task's central premise — that a third agent needs **no install-code change** — held: only a name in the shipped-set assertion had to move, because install/uninstall/doctor coverage comes from walking the dir. Verified by adding a nested probe file mid-review and watching it install, uninstall and doctor untouched.

## Acceptance Criteria
- [x] AC1 — verified: all seven mandates greppable in `agents/specship-researcher.md` — one angle from the brief, the four-rung tool ladder loaded in one batch, no memory-passed-off-as-research, primary sources with URL + publish date + exact figures, the ≥2-independent-or-1-primary bar with conflicts reported, conclusions not page dumps, and writes nothing (neither `tasks/` nor `docs/research/`).
- [x] AC2 — verified: `specship-researcher` sits in the Step 3 fan-out bullet, which still carries the "big research task" condition and the can't-spawn-subagents inline fallback. Checked on the whitespace-normalised bullet after a single-line grep gave a false negative (see L7).
- [x] AC3 — verified: `npm test` green with the researcher in the shipped-set assertion; `npm pack --dry-run` lists all three `agents/*.md`.
- [x] AC4 — verified: README's subagent table documents the researcher.

## Findings
<!-- source: code-review | panel:<lens> (independent member) | self (task-grounded); severity: blocker | minor | unverified -->
- [x] [panel:contract-consistency][minor] The definition's absolute "**Never answer from memory**" contradicted its own next sentence *and* was stricter than the skill it serves — `agents/specship-researcher.md` (`Pick the strongest tool available`) vs `skills/research/SKILL.md` (Step 2)
    failure: telling the agent to "mark every claim `(unverified — no search tool available)`" presupposes claims the bolded rule just forbade. A researcher spawned in a session with no search tool reads the absolute rule as binding and returns an empty angle, so the main thread — which per Step 3 expects conclusions per angle — loses that angle entirely, instead of the caveated content Step 2 explicitly prescribes ("say so explicitly and **answer from memory with a clear caveat**"). Fixed to "**Never present memory as research**", which is the skill's own closing sentence, plus an instruction to state the knowledge cutoff.
- [x] [self][minor] The Step 6 ownership split needed stating on the skill side too, not only in the agent — `skills/research/SKILL.md` (Step 3 fan-out bullet)
    failure: the agent is told it writes no report, but a main thread reading only the skill could still hand a subagent the "write the report" job, producing two competing report writers for `docs/research/`. Addressed during coding (S2) by adding "the report in Step 6 is yours to write, not a subagent's" to the bullet; re-verified at review.
- [x] [self][no finding] The definition does **not** cite `WORKFLOW.md`, so the unresolvable-citation blocker that hit the other two agents does not apply here — one reviewer's claim that "all three" were affected was imprecise, and was corrected by direct verification (`grep -n "WORKFLOW.md" agents/*.md` matches only explorer and reviewer).

## Commit / PR Draft
Shared with the sibling tasks — see `../TASK-20260730-explorer-subagent/review.md`, including the **`git add agents/`** warning without which the commit ships a package referencing a directory that isn't in the tree.

## Follow-ups
- Shared follow-ups (the `tools:` allowlist question, adapters for Gemini CLI / Copilot subagent formats, ENOENT diagnosability, the dry-run assertion, and this repo not installing its own skills) are listed once in the sibling review.
- The researcher is the natural tool for the *first* shared follow-up above: the `tools:` decision needs Claude Code's subagent tool-inheritance semantics verified against primary docs, which is exactly this agent's job.

## Change History
- 2026-07-30 12:54 +07: Reviewed. 2 minors in this task's scope, both addressed; one reviewer claim disproved by direct verification and recorded as such. Gate re-run green. Approved.
