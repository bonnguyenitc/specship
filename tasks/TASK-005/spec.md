---
task: TASK-005
title: In-stage subagents - review panel, coding fan-out, capability fallback
type: spec
status: confirmed
created: 2026-07-13 22:24 +0700
updated: 2026-07-13 22:44 +0700
---

# Spec: In-stage subagents (area A)

## Goal
Let a single stage safely use **in-stage subagents** — parallel helpers within one
stage on one platform — to go wider or get independent eyes, without ever making the
deliverable depend on them. Formalizes a review panel, the coding fan-out protocol,
and a capability-fallback rule so agents that can't spawn subagents still do the full
work inline. This is the "orchestrator within a stage" axis; it is orthogonal to
cross-agent handoff (TASK-002, which moves a task *between* platforms/stages).

## Context (current behavior vs desired)
- `spec`, `plan`, `explore-source`, `research` already delegate wide reads to the
  built-in Explore / general-purpose agent, and each already says "verify any path a
  subagent reports". `coding` has a "Parallelizing independent steps" fan-out section.
- Gaps: (1) `review` only delegates to a single `/code-review` pass — no notion of an
  independent **review panel**; (2) there is no explicit **capability-fallback** rule,
  so a platform that can't spawn subagents (varies across Codex/Cursor/Gemini) has no
  stated instruction to do the work inline instead of skipping it; (3) the subagent
  invariants (main thread owns state + verifies every claim; agents assist, don't
  decide) are folklore scattered across skills, not one shared doctrine.
- `src/pipeline.js` / `specship check` are unaffected — this is a skills-doctrine
  change (markdown playbooks), same shape as TASK-002.

## Requirements
- R1: The `review` skill shall support a **review panel** — one or more *independent,
  fresh-context* reviewers whose findings merge into `review.md`. Default is **1** (the
  current single `/code-review` pass); a panel of >1 is **opt-in** (the user asks, or a
  high-risk / large diff warrants it). Panel members are blind to each other; the main
  thread dedups/merges findings and owns the final verdict.
- R2: The `coding` skill's **fan-out protocol** shall be stated as the shared in-stage
  pattern: eligible only for genuinely independent `S#` steps with non-overlapping
  files; each agent gets a tight brief (its `S#`, the files it owns, `how-to-code.md`);
  worktree isolation when files may still collide; the **main thread integrates, runs
  the full gate, ticks `S#`, and updates `task.md`** — agents implement, it verifies.
- R3: A **capability-fallback rule** shall hold for every stage that delegates: if the
  platform can't spawn in-stage subagents, the agent does the *same work inline in the
  main thread* — delegation is an optimization, never a precondition, and the
  deliverable is never skipped or degraded because subagents are unavailable.
- R4: `WORKFLOW.md` shall gain one **"In-stage subagents"** doctrine section stating the
  invariants (main thread owns state and verifies every agent claim before trusting it;
  agents assist, never decide; fallback inline per R3; distinct from cross-agent
  handoff). Each delegating stage skill points at it rather than restating the contract.

## Acceptance Criteria
- [x] AC1 (covers R1, R4): `review/SKILL.md` documents the panel (default 1, opt-in >1,
  independent + merged, main thread owns the verdict) and points at the WORKFLOW
  doctrine → verify: `grep -i "panel" skills/review/SKILL.md` shows default-1/opt-in
  wording, and `grep -c "In-stage subagents" skills/WORKFLOW.md` ≥ 1.
- [x] AC2 (covers R2, R4): `coding/SKILL.md` fan-out keeps eligibility + worktree +
  main-thread-owns-gate and references the shared doctrine → verify:
  `grep -i "fan out\|worktree\|In-stage subagents" skills/coding/SKILL.md` present.
- [x] AC3 (covers R3, R4): the capability-fallback rule is in `WORKFLOW.md` and every
  delegating skill (spec, plan, coding, review, debug, explore-source, research)
  carries/points at the "inline if unavailable" fallback → verify:
  `grep -l "In-stage subagents" skills/{spec,plan,coding,review,debug,explore-source,research}/SKILL.md | wc -l` = 7 and the rule text is in `WORKFLOW.md`.
- [x] AC4 (covers R1-R4): a real install ships the updated doctrine to every target and
  nothing regresses → verify: `node bin/cli.js init --all --dir "$(mktemp -d)"` then
  grep the "In-stage subagents" section in installed `WORKFLOW.md`; `npm test` green and
  `node bin/cli.js check` OK.

## Out of Scope
- Cross-agent handoff (TASK-002 - done): different axis (between platforms, not within a stage).
- Area C - claim/concurrent tasks (advisory `claimed-by`/`claimed-at` + TTL): separate follow-up.
- Any runtime orchestrator: no new CLI command, no daemon, no specship-provided agent runtime. "Subagent" means the platform's own native mechanism.
- Automatic panel-sizing heuristics beyond "opt-in, and high-risk/large diff warrants more".

## Assumptions
- Skills-doctrine change only (markdown under `skills/`), no `src/` changes — matches the repo's nature and the TASK-002 pattern.
- Review panel default 1 / opt-in more — carried over from the original TASK-002 Q3 answer.
- Each platform uses its own subagent mechanism (Claude Code Task/Explore agents; others inline); specship documents the doctrine, it doesn't ship an orchestrator.
- (Q1 resolved 2026-07-13 22:26 +07) `spec`/`plan` keep their existing delegation prose; they only gain the R3 fallback pointer — no rewrite.
- (Q2 resolved 2026-07-13 22:26 +07) The review panel has no numeric size trigger; it stays "opt-in; high-risk / large diff warrants more" and the reviewer judges.

## Edge Cases
- Platform with no subagent support → inline fallback (R3); deliverable unchanged.
- Panel members returning conflicting findings → main thread dedups/merges and owns the final verdict (R1).
- Fan-out agents touching overlapping files → worktree isolation, or keep the steps sequential (R2).
- A subagent returning a confident-but-wrong path/finding → main thread verifies before trusting (already the spec/explore-source rule; the doctrine makes it universal).

## Open Questions
- [x] Q1: Should `spec`/`plan` (which already delegate wide reads) be rewritten, or only gain the fallback pointer? — resolved 2026-07-13 22:26 +07: only add the R3 fallback pointer, leave existing delegation prose intact.
- [x] Q2: Does the review panel need a concrete default size trigger (e.g. "diff > N files → suggest 2")? — resolved 2026-07-13 22:26 +07: no numeric trigger; keep it "opt-in, high-risk/large diff warrants more".

## Change History
- 2026-07-13 22:24 +0700: Created.
- 2026-07-13 22:26 +0700: Q1/Q2 resolved by user (both to proposed defaults), folded into Assumptions; status → confirmed. User chose ship (autopilot) for the rest.
- 2026-07-13 22:43 +0700: Review finding folded into AC3 — expanded the delegator inventory from five to seven skills (`debug` and `research` added) and strengthened verification to require the doctrine pointer.
