---
task: TASK-005
title: In-stage subagents - review panel, coding fan-out, capability fallback
type: review
status: approved
created: 2026-07-13 22:32 +0700
updated: 2026-07-13 22:48 +0700
---

# Review: In-stage subagents (area A)

## Gate Results
- Tests: `npm test` — 25 passed (no test changes this task; regression proof only).
- `node bin/cli.js check` — OK, tasks/ conforms to the contract.
- Real install: `init --all` — "In-stage subagents" section present in `.claude`, `.codex`, `.agents` WORKFLOW.md.
- Review verdict: approved after the S6 review loop; all R3/R4 coverage findings are fixed.

## Acceptance Criteria
- [x] AC1 (R1, R4) — review panel documented in `review/SKILL.md` (default 1, opt-in >1, blind members, main thread merges + owns verdict) pointing at the doctrine; "In-stage subagents" section in WORKFLOW.md. Verified: grep OK.
- [x] AC2 (R2, R4) — `coding/SKILL.md` fan-out keeps eligibility + worktree + main-thread-owns-gate and references the doctrine. Verified: grep OK.
- [x] AC3 (R3, R4) — all seven delegating skills point to the doctrine and carry the inline fallback; `review` covers the default correctness pass and additional passes. Verified: seven-skill pointer check OK.
- [x] AC4 (R1-R4) — real install ships the doctrine to all three shared-skill targets; `npm test` 25/25 and `specship check` green.

## Findings
<!-- Review panel: default 1 (per R1). This is a doc-only diff to skill playbooks (no runtime surface) — a fresh /code-review pass has little to bite on, so a single self-review of the additive prose was the appropriate pass. -->
- First pass (22:32): no blocker or minor findings. Change is additive markdown; no test assertions weakened, no code touched.
- Re-review pass (22:37, user-requested — fresh targeted read of the landed prose):
- [x] [self][minor] `explore-source/SKILL.md` — its only "inline" was size-based ("small repo"), so AC3's grep passed on a weak proxy while the capability-fallback (R3) wasn't explicitly stated there, unlike the other 4 skills → fixed: added the capability-fallback sentence + doctrine pointer, ref `skills/explore-source/SKILL.md:22`.
- [x] [self][minor] `WORKFLOW.md` doctrine intro said "`review` runs an independent panel", overstating the default (R1: default is one pass, panel >1 is opt-in) → fixed: "can run an opt-in panel of independent reviewers (default: one pass)".
- [x] [self][blocker] R3/R4 say the fallback applies to every delegating stage/skill, but S4/AC3 enumerate only five. `debug` delegates deep searches at `skills/debug/SKILL.md:31`, and `research` delegates large fan-outs at `skills/research/SKILL.md:66`, yet neither carries or points to the inline capability fallback. Fixed in S6: both skills now carry the pointer, and AC3 verifies all seven delegators.
- [x] [self][blocker] The local fallback in `skills/review/SKILL.md:38` said to do only the "extra pass(es)" inline. Fixed in S6: it now covers the default correctness pass and any additional passes.
- Panel pass 3 (22:48, claude-code, user-requested — independent verification of the Codex S6 loop):
- [x] [claude-code][verified] Codex's S6 claims re-verified independently: 7/7 delegator pointers present, S6 verify verbatim OK, `npm test` 25/25, `specship check` OK, install smoke ships `debug`/`research` pointers to targets.
- [x] [claude-code][minor] Doctrine intro list in `WORKFLOW.md` still named only 5 delegators while the official inventory after S6 is 7 — a doctrine reader wouldn't see `debug`/`research` → fixed: list now includes `debug` (deep investigations) and `research` (query-angle fan-out); install re-smoke OK.

## Coverage check
- R1 → S2 (review panel). R2 → S3 (coding fan-out ref). R3/R4 → S1 + S4 + S6; all seven actual delegators now carry the doctrine pointer. ✓
- Reverse: every changed implementation line traces to S6 or the original S1-S4 scope; the strengthened AC3 check verifies the complete delegator inventory rather than only the word "inline". ✓
- Axes stay distinct: S1 explicitly contrasts in-stage subagents (within a stage) vs Agent handoff (between platforms), so the two TASK-002/TASK-005 doctrines don't blur.

## Commit / PR Draft
```
feat(skills): in-stage subagent doctrine — review panel, coding fan-out, capability fallback

Adds an "In-stage subagents" doctrine to WORKFLOW.md: the main thread owns tasks/
state and verifies every agent claim; subagents assist, never decide; and a
capability-fallback rule — if a platform can't spawn subagents, the stage does the
same work inline, never skipping the deliverable. review/SKILL.md gains an opt-in
review panel (default 1 independent pass); coding/SKILL.md's fan-out references the
doctrine; spec/plan/coding/review/debug/explore-source/research each carry the
inline fallback.

Doc-only (no src/ changes). Closes TASK-005 (R1-R4; AC1-AC4). Follow-up to TASK-002.
```

## Follow-ups
- Area C — claim/concurrent tasks (advisory `claimed-by`/`claimed-at` + TTL) remains the last split-out follow-up; it builds on TASK-002's agent labels.

## Change History
- 2026-07-13 22:32 +0700: Reviewed — gate green, AC1-AC4 verified, approved (ship autopilot).
- 2026-07-13 22:37 +0700: Re-reviewed on user request — 2 minor findings (explore-source capability fallback missing; doctrine intro overstated panel default), both fixed and re-verified (npm test 25, specship check OK, install re-smoke OK). Still approved.
- 2026-07-13 22:41 +0700: Re-reviewed by Codex — full gate green, but two blocker coverage gaps found in R3/R4; status changed to changes-requested and AC3/AC4 reopened.
- 2026-07-13 22:44 +0700: S6 re-reviewed — both blocker findings fixed; AC1-AC4, full gate, and real-install smoke green; approved.
- 2026-07-13 22:48 +0700: Panel pass 3 (claude-code) — independently re-verified the Codex S6 loop (all claims hold); 1 minor found & fixed (doctrine intro list now names all 7 delegators). Gate re-run green. Still approved.
