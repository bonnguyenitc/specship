---
task: TASK-005
title: In-stage subagents - review panel, coding fan-out, capability fallback
type: plan
status: approved
created: 2026-07-13 22:27 +0700
updated: 2026-07-13 22:44 +0700
---

# Plan: In-stage subagents (area A)

## Approach
Contract-first, one source of truth — same shape as TASK-002. The invariants land once
in a new **"In-stage subagents"** doctrine section in `skills/WORKFLOW.md`; each
delegating stage skill gets a short pointer, never a restated contract. The `review`
panel and `coding` fan-out are described in their own skills but defer the invariants
(main thread owns state + verifies; fallback inline) to the doctrine. No `src/` changes:
`specship check` doesn't parse skill prose, so this can't break the pipeline — proven by
re-running the gate, not assumed. Per Q1, `spec`/`plan` keep their delegation prose and
only gain the fallback pointer; per Q2, the panel has no numeric size trigger.

## Files to Touch
- `skills/WORKFLOW.md` — add the "In-stage subagents" doctrine (invariants + capability-fallback rule)
- `skills/review/SKILL.md` — review panel (default 1, opt-in >1, independent + merged), pointing at the doctrine
- `skills/coding/SKILL.md` — fan-out section references the shared doctrine
- `skills/{spec,plan,coding,review,debug,explore-source,research}/SKILL.md` — each carries the "inline if unavailable" fallback pointer
- no test/code changes expected; S5 is the regression proof

## Steps
- [x] S1 — `skills/WORKFLOW.md`: add an **"In-stage subagents"** section (after "Agent handoff") stating the invariants — the main thread owns `tasks/` state and **verifies every agent claim** before trusting it; subagents assist, never decide; the **capability-fallback rule** (if the platform can't spawn subagents, do the same work *inline* in the main thread — delegation is an optimization, never a precondition); and that this is distinct from cross-agent handoff (within one stage/platform, not between). (covers: R3, R4) → verify: `test "$(rtk proxy grep -c 'In-stage subagents' skills/WORKFLOW.md)" -ge 1 && rtk proxy grep -iq 'inline' skills/WORKFLOW.md && echo OK`
- [x] S2 — `skills/review/SKILL.md`: in section 1a, document the **review panel** — default **1** independent `/code-review` pass; a panel of >1 is **opt-in** (user asks, or high-risk / large diff warrants it, no numeric trigger per Q2); members are blind to each other; the main thread dedups/merges findings and owns the verdict — pointing at the WORKFLOW doctrine. (covers: R1, R4) → verify: `rtk proxy grep -iq 'panel' skills/review/SKILL.md && rtk proxy grep -iq 'opt-in\|default' skills/review/SKILL.md && echo OK`
- [x] S3 — `skills/coding/SKILL.md`: the "Parallelizing independent steps" fan-out section keeps eligibility + worktree + main-thread-owns-gate and adds a reference to the shared **In-stage subagents** doctrine. (covers: R2, R4) → verify: `rtk proxy grep -iq 'In-stage subagents' skills/coding/SKILL.md && rtk proxy grep -iq 'worktree' skills/coding/SKILL.md && echo OK`
- [x] S4 — fallback pointer in the 5 delegating skills: ensure `spec`, `plan`, `coding`, `review`, `explore-source` each state the "if subagents aren't available, do it **inline** in the main thread" fallback (add the pointer where missing; spec/explore-source already say "inline"). (covers: R3) → verify: `test "$(rtk proxy grep -l 'inline' skills/spec/SKILL.md skills/plan/SKILL.md skills/coding/SKILL.md skills/review/SKILL.md skills/explore-source/SKILL.md | wc -l | tr -d ' ')" -eq 5 && echo OK`
- [x] S5 — real-install smoke + full gate: fresh install ships the doctrine to every target and nothing regresses. (covers: R1-R4, AC4) → verify: `D=$(mktemp -d); node bin/cli.js init --all --dir "$D" >/dev/null && rtk proxy grep -lq 'In-stage subagents' "$D"/.claude/skills/WORKFLOW.md "$D"/.codex/skills/WORKFLOW.md "$D"/.agents/skills/WORKFLOW.md && npm test >/dev/null 2>&1 && node bin/cli.js check | rtk proxy grep -q OK && echo OK`
- [x] S6 — review loop: add the capability-fallback pointer to `debug` and `research`, and make `review`'s inline fallback cover the default correctness pass plus any additional passes. (covers: R3, R4, AC3, AC4) → verify: `test "$(rtk proxy grep -l 'In-stage subagents' skills/spec/SKILL.md skills/plan/SKILL.md skills/coding/SKILL.md skills/review/SKILL.md skills/debug/SKILL.md skills/explore-source/SKILL.md skills/research/SKILL.md | wc -l | tr -d ' ')" -eq 7 && rtk proxy grep -iq 'default correctness pass.*additional pass' skills/review/SKILL.md && echo OK`

## Risks / Open Questions
- Wording drift across the fallback pointers — mitigated by keeping each a one-line pointer to the doctrine, not a restatement (same tactic as TASK-002's agent-label pointers).
- The two axes (in-stage subagents vs cross-agent handoff) could blur — S1 explicitly contrasts them so readers don't conflate.
- No numeric panel trigger (Q2) means panel sizing is judgment — acceptable; a brittle threshold was explicitly rejected.

## Change History
- 2026-07-13 22:27 +0700: Created and approved (ship autopilot; delegated approval).
- 2026-07-13 22:31 +0700: S1-S5 implemented and verified; all steps ticked. Deviation: S4 also added an explicit capability-fallback pointer to `spec` (its existing "inline" was size-based, not capability) — within S4's intent, keeps R3 faithful.
- 2026-07-13 22:43 +0700: Review loop approved by user; added S6 to cover the missing `debug`/`research` pointers and the default review-pass fallback.
