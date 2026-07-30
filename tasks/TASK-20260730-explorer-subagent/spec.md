---
task: TASK-20260730-explorer-subagent
title: Ship a specship-explorer subagent installed for the Claude Code target
type: spec
status: confirmed
created: 2026-07-30 10:03 +07
updated: 2026-07-30 12:54 +07
---

# Spec: Ship a specship-explorer subagent installed for the Claude Code target

## Goal
The workflow contract (`skills/WORKFLOW.md` → In-stage subagents) lets stages delegate wide code exploration, but the skills can only point at generic built-ins (`Explore`, `general-purpose`). Ship a purpose-built `specship-explorer` subagent — tuned for the pipeline's citation rules and able to use the codebase-memory MCP where present — so Claude Code installs get a stronger default explorer while every other target keeps working unchanged.

## Requirements
- R1: The package ships a `specship-explorer` subagent definition in a new top-level `agents/` source dir, in Claude Code project-subagent format (markdown, frontmatter `name` + `description`, body = system prompt). The prompt must mandate: (a) read-only exploration — search/read only, never edit code; (b) prefer the codebase-memory MCP tools (`mcp__codebase-memory__*`, e.g. `search_code`, `get_architecture`) after checking they are available, falling back to `rg`/Grep/Glob when they are not; (c) return structured conclusions with `path` + named-symbol citations, never line numbers and never raw file dumps; (d) never write `tasks/`, tick `S#`/`AC#`, or checkpoint — findings only (the in-stage invariants in `skills/WORKFLOW.md`).
- R2: `specship init` for the **claude** target additionally installs the `agents/` dir to `.claude/agents/` in the consumer project. **No other target receives any subagent file** — the install mechanism must leave every other target's output exactly as it was before this change (precedent: the codex-only `manifest` in `src/targets.js`). Scope note (revised 2026-07-30 12:54 +07): this is a statement about the *install mechanism*, not about the installed bytes as a whole — R4 deliberately edits the **shared** `skills/` tree, which every target installs, so their skill files do change. The two requirements would contradict each other if R2 were read as "nothing any target installs changes".
- R3: `specship uninstall` removes only the specship-installed agent file(s), keeps anything the user added in `.claude/agents/`, and prunes dirs only when empty; `specship doctor` reports a missing or drifted agent file — the same semantics skills already have (`expectedSkillFiles`-style enumeration).
- R4: The five explorer-type delegation sites — `skills/spec/SKILL.md` ("Delegate heavy exploration"), `skills/plan/SKILL.md` ("Delegate wide reads"), `skills/explore-source/SKILL.md` ("Delegate heavy exploration" section + "Searching effectively" bullet), `skills/debug/SKILL.md` (step 2 "Locate") — name `specship-explorer` as the preferred explorer *when installed*, keeping the existing fallback chain intact (built-in `Explore`/`general-purpose` → inline). Affected set derived by repo-wide sweep per lesson L1: `coding`/`review`/`research` delegate other kinds of work (parallel coding / review panel / query fan-out) and stay untouched.
- R5: The npm tarball ships the new `agents/` dir (`package.json` `files`).
- R6: README documents the subagent: what it is, that it installs to `.claude/agents/` for the Claude Code target only, and that other targets are unaffected.

## Acceptance Criteria
- [x] AC1 (covers R1): `agents/specship-explorer.md` exists with valid frontmatter and a prompt carrying all four mandates → verify: read the file; grep it for `mcp__codebase-memory`, the fallback instruction (`rg`/Grep/Glob), the citation rule (path + symbol, no line numbers), and the no-`tasks/`-writes rule.
- [x] AC2 (covers R2): a real install lands the agent for claude only → verify: `node bin/cli.js init --claude --dir "$(mktemp -d)"` produces `.claude/agents/specship-explorer.md` byte-identical to the source; a codex-only install into another temp dir contains no `.claude/agents/`; `init --all` output for non-claude targets shows no agent file.
- [x] AC3 (covers R3): uninstall/doctor treat agent files like skill files → verify: new cases in `test/cli.test.js` — (1) init then uninstall claude removes `specship-explorer.md` but keeps a user-added `.claude/agents/mine.md`; (2) doctor flags the agent file when deleted and when edited; `npm test` green.
- [x] AC4 (covers R4): exactly the five sites reference the new agent, nothing else changed → verify: `grep -rln "specship-explorer" skills/` returns spec, plan, explore-source, debug SKILL.md only; each hit keeps the fallback chain wording; `git diff --stat` shows `skills/coding|review|research/SKILL.md` untouched.
- [x] AC5 (covers R5): the tarball ships the agent → verify: `./publish.sh --dry-run` (or `npm pack --dry-run`) file list includes `agents/specship-explorer.md`.
- [x] AC6 (covers R6): README has the subagent section → verify: read the README diff; it states install path, claude-only scope, and MCP-optional behavior.

## Out of Scope
- A `specship-reviewer` or `specship-researcher` agent (see Q1 — proposed as follow-up tasks).
- Subagent mechanisms for any non-Claude target. ~~(none has a project-subagent file format to install into today)~~ — **struck 2026-07-30 12:54 +07: that claim was false and unverified.** Gemini CLI reads project subagents from `.gemini/agents/*.md` and GitHub Copilot from `.github/agents/*.agent.md`, both markdown + YAML frontmatter. The scope decision stands (specship ships no adapter for those formats yet); only the stated reason was wrong. Follow-up task proposed.
- Changes to the `skills/WORKFLOW.md` contract — the in-stage invariants already cover custom helpers; this task only implements them.
- Any orchestrated-profile behavior change (`install-profile.js` renderer untouched; see Assumptions on `model:`).

## Assumptions
- The consumer may not have the codebase-memory MCP server — it is the developer's personal setup, not a specship dependency. The agent must complete its job via `rg`/Grep/Glob without it; MCP is an upgrade, never a precondition (mirrors the WORKFLOW.md capability-fallback doctrine).
- Agent frontmatter omits `tools:`: a whitelist would silently exclude `mcp__codebase-memory__*` on machines that do have it; read-only behavior is enforced by the prompt instead. **Caveat added 2026-07-30 12:54 +07:** an independent reviewer flagged (as `unverified`) that a Claude Code subagent omitting `tools:` may inherit the full toolset including Write/Edit, which would make "read-only" a promise rather than a constraint. The trade-off is real and unresolved — see Follow-ups in `review.md`; the README no longer claims the helpers *cannot* write, only that they are instructed not to.
- Agent frontmatter omits `model:`: inherits the session model, so the orchestrated profile's model-neutralizing renderer needs no extension.
- The `skills/` tree stays shared across all 10 targets, so R4's wording is platform-neutral ("if the `specship-explorer` agent is installed — Claude Code…"); non-Claude platforms read the same text and simply take the existing fallback path.
- Source dir is `agents/` at the package root — a distinct namespace from the per-skill vendor dirs (`skills/<skill>/agents/`) and the `.agents/` install target; the exact field name in `targets.js` is a plan-stage decision.

## Edge Cases
- Consumer already has a (possibly modified) `.claude/agents/specship-explorer.md` → keep it unless `--force`, count as skipped — same `copyFile` semantics as skills; doctor then reports drift.
- `.claude/agents/` holds user-authored agents at uninstall time → only the specship file is removed; the dir is pruned only if it became empty.
- Existing older installs: `specship doctor` reports the agent file as missing and `specship update` adds it (no change to the `detectInstalled` fingerprint).
- No codebase-memory MCP available at runtime → the agent proceeds directly to `rg`/Grep/Glob; it must not error out or stall probing for the server.

## Open Questions
- [x] Q1: Ship a `specship-reviewer` (review-panel member) in this task too? — **answered 2026-07-30 10:08 +07: defer** (user confirmed); reviewer stays a follow-up task, already listed in Out of Scope.
- [x] Q2: Agent name `specship-explorer` vs plain `explorer`? — **answered 2026-07-30 10:08 +07: `specship-explorer`** (user confirmed the proposed default); name already carried by R1.

## Change History
- 2026-07-30 10:03 +07: Created.
- 2026-07-30 10:08 +07: Q1 (defer reviewer) and Q2 (name `specship-explorer`) confirmed by the user; both answers were the proposed defaults already folded into R1/Out of Scope. Status → confirmed.
- 2026-07-30 12:54 +07: Review found two spec defects, both fixed here (no requirement changed, only wording that was wrong): R2's "byte-for-byte unchanged" contradicted R4's edits to the shared `skills/` tree, so R2 is now scoped to the install mechanism; and the Out of Scope claim that no other target has a subagent format was false — struck, with the verified formats named. Added a caveat to the `tools:` assumption. AC1–AC6 all ticked after re-running every verify.
