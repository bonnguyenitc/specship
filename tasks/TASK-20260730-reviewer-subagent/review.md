---
task: TASK-20260730-reviewer-subagent
title: Ship a specship-reviewer subagent for the review panel
type: review
status: approved
created: 2026-07-30 12:54 +07
updated: 2026-07-30 12:54 +07
---

# Review: Ship a specship-reviewer subagent for the review panel

Reviewed as part of one working diff covering three sibling tasks. Shared gate results and cross-cutting findings live in `../TASK-20260730-explorer-subagent/review.md`; this file records what belongs to this task's scope (`agents/specship-reviewer.md`, the review-panel bullet, the dir-driven install test, the README row).

The review dogfooded this very definition: the two independent reviewers were briefed from `agents/specship-reviewer.md` (lens parameter, blind-to-each-other rule, `[blocker]/[minor]` + failure-scenario format). They found two blockers the main thread had missed — evidence the definition produces useful output, and a live demonstration of lesson L5.

## Gate Results
- Tests: **pass** — 76 green (16 pipeline + 60 cli). See the sibling review for the full gate, packaging and install-smoke output.
- Contract gate: `specship check` → OK.

## Acceptance Criteria
- [x] AC1 — verified: `agents/specship-reviewer.md` carries all five mandates — blind to other members, lens from the brief (default correctness), `blocker`/`minor` + mandatory failure scenario, verify-before-reporting with a plain "no findings", and read-only/no-state/no-verdict.
- [x] AC2 — verified: `specship-reviewer` sits inside the Review-panel bullet, and that same bullet still carries "default is one", "opt-in", "can't spawn subagents" (inline fallback), and "owns the final verdict" — checked by extracting the single bullet, not the whole file.
- [x] AC3 — verified: the dir-driven test asserts every file under the package `agents/` dir installs byte-identical to `.claude/agents/` after `init --all` and appears nowhere else in the tree. Strengthened during review (see findings): it now walks recursively, matching what `copyDir` and `expectedAgentFiles` actually do.
- [x] AC4 — verified: `npm pack --dry-run` lists both agent files (all three, now).
- [x] AC5 — verified: README documents the reviewer in the subagent table.

## Findings
<!-- source: code-review | panel:<lens> (independent member) | self (task-grounded); severity: blocker | minor | unverified -->
- [x] [panel:contract-consistency][blocker] The two artifact templates a panel member's findings get written into demanded `path:line` citations, which the agent definitions forbid — `skills/review/SKILL.md` (`Output: write the review to the task folder`, Findings template) and `skills/debug/SKILL.md` (`debug.md` template, `root cause:`)
    failure: a main thread receives `[blocker] … — src/init.js (initTarget)` from `specship-reviewer`, then has to fill a template literally specifying ``ref `path:line` ``; to satisfy it, it attaches a line number the subagent never reported and nobody checked — a fabricated citation entering a durable artifact, exactly what the contract's "a cited path must exist" invariant exists to prevent. `explore-source/SKILL.md` already stated the opposite doctrine, so this diff turned a latent inconsistency into an active conflict inside one shipped tree. Fixed: both templates now ask for `path` (`symbol`) and say why not a line number; verified no `path:line` remains anywhere under `skills/` or `agents/`.
- [x] [panel:contract-consistency][minor] The Findings legend had no source tag for a panel member and no slot for the `unverified` verdict the agent is told to return — `skills/review/SKILL.md` (`Output: write the review to the task folder`)
    failure: a member returns "`unverified` — could not confirm the null path reaches this branch". With only `blocker`/`minor` available, promoting it wrongly holds approval (the gate refuses `approved` while an unaddressed blocker stands) while dropping it violates "never drop it silently" — and either way it gets stamped `[code-review]`, misattributing it to a pass that never ran. Fixed: the legend now defines `panel:<lens>` as a source and `unverified` as a severity, with instructions for handling it. This review.md uses both.
- [x] [panel:correctness][minor] The install test was data-driven only at depth 1, contradicting its own comment — `test/cli.test.js` (`every packaged subagent installs for claude only`)
    failure: `fs.readdirSync(src).filter(…)` is non-recursive while `copyDir`, `expectedAgentFiles` and `doctorTarget` all recurse, so `agents/shared/foo.md` would install, uninstall and be doctored while every assertion in the test silently skipped it — under a comment promising "a new subagent file must install without this test being touched". Fixed with a `filesUnder()` helper used for both the byte-identity loop and the stray-file walk; confirmed by adding a nested probe file and watching the new assertion cover it.
- [x] [panel:contract-consistency][minor] The README lead-in said "**Both** are read-only helpers" above a three-row table — `README.md` (`What \`init\` Installs`)
    failure: a user counts two, skims the table, and never registers that `specship-researcher` exists; anyone auditing "what did specship put in my repo?" finds a third file the sentence didn't mention. Introduced when the researcher row was added without updating the lead-in. Fixed, and reworded so it no longer overclaims enforcement (see the sibling review's unverified `tools:` finding).

## Commit / PR Draft
Shared with the sibling tasks — the single commit message and the **`git add agents/`** warning are in `../TASK-20260730-explorer-subagent/review.md`.

## Follow-ups
- The panel's *policy* stayed out of scope by design (one independent pass by default; a panel only when asked for or warranted). This review ran a 2-member panel on the diff's own merits — a large, contract-touching change — which is exactly the judgement call the bullet describes.
- Shared follow-ups (the `tools:` question, other platforms' subagent formats, ENOENT diagnosability, the dry-run assertion) are listed once in the sibling review.

## Change History
- 2026-07-30 12:54 +07: Reviewed. 1 blocker + 3 minors in this task's scope, all addressed and re-verified; gate re-run green afterwards. Approved.
