---
task: TASK-20260730-researcher-subagent
title: Ship a specship-researcher subagent for the research fan-out
type: plan
status: approved
created: 2026-07-30 10:53 +07
updated: 2026-07-30 10:56 +07
---

# Plan: Ship a specship-researcher subagent for the research fan-out

## Approach
Same additive shape as the reviewer task, now proven generic: drop a third file into `agents/` and install/uninstall/doctor/packaging pick it up with no code change. Work is the definition, the `research` skill's fan-out bullet, one line in the shipped-set test assertion, and a README table row.

The definition's content is dictated by `skills/research/SKILL.md`: it is the *worker* for one angle of Step 3, so it inherits Step 2's tool ladder, Step 4's primary-source rule, and Step 5's verification bar — but explicitly **not** Step 6 (writing the report), which stays the main thread's job. That split is the one thing a generic subagent gets wrong: it would happily write `docs/research/` itself and skip recording source dates.

## Files to Touch
- `agents/specship-researcher.md` — new: the per-angle research worker.
- `skills/research/SKILL.md` — Step 3 fan-out bullet names the agent.
- `test/cli.test.js` — add the file to the shipped-set assertion (install coverage is already dir-driven).
- `README.md` — third row in the subagent table.

## Steps
- [x] S1 — Author `agents/specship-researcher.md`: frontmatter (`name`, description naming the per-angle research use), prompt mandating one angle from the brief; the tool ladder (specialized search MCP → domain MCP → built-in search+fetch → browser last) loaded in one batch; no memory-only answers (`(unverified — no search tool available)`); primary sources fetched not snippets, recording URL + publish/updated date + exact versions; the ≥2-independent-or-1-primary bar with conflicts reported and failures returned `(unverified)`; conclusions + source list, never page dumps; writes nothing — not `tasks/`, not `docs/research/` (covers: R1, AC1) → verify: `grep -qi "one angle" agents/specship-researcher.md && grep -qi "MCP" agents/specship-researcher.md && grep -qi "browser" agents/specship-researcher.md && grep -q "unverified" agents/specship-researcher.md && grep -qi "primary" agents/specship-researcher.md && grep -qi "publish" agents/specship-researcher.md && grep -q "docs/research/" agents/specship-researcher.md && grep -q "tasks/" agents/specship-researcher.md`
- [x] S2 — Wire the fan-out: in `skills/research/SKILL.md` Step 3, name `specship-researcher` as the per-angle subagent when installed, leaving the "big research task" condition and the inline fallback sentence intact (covers: R2, AC2) → verify: `grep -n "specship-researcher" skills/research/SKILL.md` hits the fan-out bullet, and the same bullet still greps for `big research task` and `can't spawn subagents`
- [x] S3 — Add `specship-researcher.md` to the shipped-set list in `test/cli.test.js`'s dir-driven subagent test (install/stray-file coverage needs no change — it iterates the dir) (covers: R3, AC3) → verify: `npm test` green
- [x] S4 — README: third row in the subagent table (used by `research`, one invocation per query angle, cited conclusions with source dates) (covers: R3, AC4) → verify: `grep -n "specship-researcher" README.md`
- [x] S5 — Full gate: `npm test`; `init --all` smoke showing all three agents only under `.claude/agents/`; `npm pack --dry-run` lists all three; `node bin/cli.js check --dir .` OK (covers: AC3; re-runs the AC verifies) → verify: all four commands exit 0 with the expected output

## Risks / Open Questions
- The definition must not silently duplicate the `research` skill's report template — the worker returns findings, the main thread writes the report. Overreach here would produce two competing report writers.
- Step 3's bullet is prose across several lines; re-read the whole bullet after editing so the fan-out condition and the fallback still read correctly for a non-Claude platform.

## Change History
- 2026-07-30 10:53 +07: Created and approved in one pass — a 5-step additive change on infrastructure already shipped and reviewed twice; the user approved building this agent directly.
- 2026-07-30 10:56 +07: S1–S5 all ticked, no deviations. The generic-install premise held for the second time: only the shipped-set assertion needed a name added, install/uninstall/doctor coverage came from the dir walk.
