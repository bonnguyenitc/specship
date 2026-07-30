---
task: TASK-20260730-reviewer-subagent
title: Ship a specship-reviewer subagent for the review panel
type: spec
status: confirmed
created: 2026-07-30 10:23 +07
updated: 2026-07-30 12:54 +07
---

# Spec: Ship a specship-reviewer subagent for the review panel

## Goal
`skills/review/SKILL.md` defines an opt-in **review panel** of independent, mutually-blind reviewers, but ships no definition for a panel member — the stage can only point at `/code-review`. Ship a `specship-reviewer` subagent so a panel member is a concrete, lens-parameterized agent, reusing the `agents/` install infrastructure built in TASK-20260730-explorer-subagent.

## Requirements
- R1: `agents/specship-reviewer.md` exists in Claude Code subagent format (frontmatter `name` + `description`, body = system prompt). The prompt must mandate: (a) a **fresh, context-free pass over the working diff** — it assumes no conversation history and is blind to other panel members; (b) an optional **lens** taken from its brief (correctness / security / performance / contract-consistency), defaulting to correctness; (c) findings reported with **severity `blocker` | `minor`**, a `path` + named-symbol reference, and a **concrete failure scenario** (inputs/state → wrong result) — matching the Findings format in `skills/review/SKILL.md`; (d) **verify before reporting** — trace or reproduce the failure, and report "no findings" plainly rather than inventing any; (e) **read-only, no state, no verdict** — never fix code, never write `tasks/`, never tick `AC#`/`S#`, never decide approve/changes-requested (per `skills/WORKFLOW.md` → In-stage subagents).
- R2: The review-panel bullet in `skills/review/SKILL.md` names `specship-reviewer` as the panel member when installed, keeping the existing chain intact: the default is still **one** pass via `/code-review`, a panel is still **opt-in**, and platforms without subagents still do the passes inline.
- R3: Install, uninstall, and doctor cover the new file **generically** — every file in the package's `agents/` dir is installed for targets declaring `subagents` and for no others. No install-code change is expected (the existing `copyDir` / `expectedAgentFiles` walk the dir); the requirement is that this holds and is proven by a test that is not hardcoded to one filename.
- R4: README's subagent paragraph documents both shipped agents (explorer + reviewer) instead of only the explorer.

## Acceptance Criteria
- [x] AC1 (covers R1): the definition carries all five mandates → verify: read `agents/specship-reviewer.md`; grep it for the lens list, `blocker`, `minor`, the no-findings instruction, and the never-write-`tasks/` rule.
- [x] AC2 (covers R2): the review skill prefers the agent without losing the default or the fallback → verify: `grep -n "specship-reviewer" skills/review/SKILL.md` shows it inside the Review-panel bullet, and that bullet still contains "default is one" and the can't-spawn-subagents fallback sentence.
- [x] AC3 (covers R3): both agents install for claude only, driven by the dir contents → verify: a new `test/cli.test.js` case that reads the package `agents/` dir at runtime and asserts every file lands in `.claude/agents/` after `init --all` and nowhere else; `npm test` green.
- [x] AC4 (covers R3): the tarball ships both agent files → verify: `npm pack --dry-run` lists `agents/specship-explorer.md` and `agents/specship-reviewer.md`.
- [x] AC5 (covers R4): README covers both → verify: `grep -n "specship-reviewer" README.md` hits the subagent paragraph.

## Out of Scope
- A `specship-researcher` agent (the `research` skill's query fan-out) — a separate follow-up.
- Changing the review panel's **policy** (default one pass, panel opt-in, main thread owns the verdict) — this task supplies a member, it does not redefine the panel.
- Self-installing specship's own skills/agents into this repo's `.claude/` (a dev-setup gap noted as a follow-up, not part of shipping the agent).

## Assumptions
- The panel member is **one reusable definition invoked N times with different lenses**, not N per-lens agent files — the lens is a brief parameter, so the panel size stays the caller's judgement call.
- `/code-review` stays the default single pass: it is a Claude Code built-in with its own diff-reading harness, and replacing it is a policy change (out of scope).
- No `tools:` or `model:` frontmatter, same reasoning as the explorer: a whitelist would exclude useful MCP tools, and the session model should win.

## Edge Cases
- The reviewer finds nothing → it must say so; a panel member that manufactures a finding to look useful is worse than one that returns empty.
- The brief names no lens → default to correctness rather than asking (a subagent has no user to ask).
- A finding the reviewer cannot substantiate → report as unverified with what is missing, never as a confirmed defect.

## Open Questions
- none

## Change History
- 2026-07-30 10:23 +07: Created and confirmed in one pass — this is the un-deferred Q1 of TASK-20260730-explorer-subagent (scope already settled with the user), the infrastructure it builds on is already shipped, and no open question remained.
- 2026-07-30 12:54 +07: AC1–AC5 ticked after re-running every verify at review. No requirement changed; review findings against the shipped definition (unresolvable `WORKFLOW.md` citation, the Findings-template `path:line` conflict) were fixed in the artifacts themselves, not by amending this spec.
