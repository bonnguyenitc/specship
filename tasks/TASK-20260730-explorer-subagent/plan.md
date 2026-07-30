---
task: TASK-20260730-explorer-subagent
title: Ship a specship-explorer subagent installed for the Claude Code target
type: plan
status: approved
created: 2026-07-30 10:10 +07
updated: 2026-07-30 10:12 +07
---

# Plan: Ship a specship-explorer subagent installed for the Claude Code target

## Approach
Mirror the codex-only `manifest` precedent, one level up: a new package-root source dir `agents/` holds project-level subagent definitions, and a per-target field says where (and whether) they install. Only `claude` gets the field — every other target's `initTarget` output is untouched by construction, which is exactly how `openai.yaml` already stays codex-only.

Key decisions:
- **Field name `subagents`** (value = dest dir, e.g. `'.claude/agents'`) — not `agents`, to avoid colliding mentally with the existing `agents` *target* and the per-skill vendor `agents/` dirs. Source is fixed at package-root `agents/` (like `manifest` fixes `skills/<skill>/agents/`).
- **Reuse the existing primitives**: `copyDir` for install (keeps `--force`/skip semantics and dry-run for free), a small `expectedAgentFiles(t)` alongside `expectedSkillFiles(t)` so uninstall (remove only ours, prune empty dirs) and doctor (missing/drift) get the same semantics as skills without new machinery. Agent files always render `passthrough` — no `model:` frontmatter, so the orchestrated renderer is irrelevant to them.
- **Agent definition is prompt-enforced read-only**: frontmatter carries `name` + `description` only (no `tools:` whitelist — it would exclude `mcp__codebase-memory__*` where present; no `model:` — inherits the session). The body mandates: check for codebase-memory MCP availability → use it, else `rg`/Grep/Glob; conclusions with `path` + named-symbol citations (no line numbers, no file dumps); never write `tasks/` or tick IDs.
- **Skill text stays platform-neutral**: the five delegation sites gain "prefer the `specship-explorer` agent if installed (Claude Code: `.claude/agents/`)" ahead of the existing built-in-`Explore` → inline chain, so non-Claude platforms read the same text and take the unchanged fallback path.

Rejected alternative: shipping the definition inside the skills tree as a vendor file (`skills/<skill>/agents/claude.md`) — a subagent is project-level, not per-skill; it would install N copies and break the `.claude/agents/` discovery location.

## Files to Touch
- `agents/specship-explorer.md` — new: the subagent definition (frontmatter + prompt).
- `src/targets.js` — `subagents: '.claude/agents'` on the claude entry + header comment explaining the field.
- `src/init.js` — install (`initTarget`), uninstall (`uninstallTarget`), audit (`doctorTarget`) + `expectedAgentFiles` helper.
- `test/cli.test.js` — new cases: claude-only install, keep/--force, uninstall keeps user agents, doctor flags missing/drift, update restores.
- `skills/spec/SKILL.md`, `skills/plan/SKILL.md`, `skills/explore-source/SKILL.md`, `skills/debug/SKILL.md` — the five explorer-delegation sites name `specship-explorer` first, fallback chain kept.
- `package.json` — add `"agents"` to `files`.
- `README.md` — "What `init` Installs" + "Package Layout" mention the subagent (claude-only, MCP-optional).

## Steps
- [x] S1 — Author `agents/specship-explorer.md`: frontmatter (`name: specship-explorer`, delegation-triggering `description`), prompt mandating (a) read-only search/read, (b) probe codebase-memory MCP first (`mcp__codebase-memory__search_code`, `get_architecture`, …) and fall back to `rg`/Grep/Glob without erroring when absent, (c) structured findings with `path` + named-symbol citations — no line numbers, no file dumps, (d) never write `tasks/`, tick `S#`/`AC#`, or checkpoint (covers: R1, AC1) → verify: `grep -c "mcp__codebase-memory" agents/specship-explorer.md && grep -qE "rg|Grep" agents/specship-explorer.md && grep -qi "never.*(write|edit)" agents/specship-explorer.md && grep -qi "line number" agents/specship-explorer.md`
- [x] S2 — Wire install: `subagents: '.claude/agents'` in `src/targets.js` (claude only, + header comment); in `initTarget`, when `t.subagents`, `copyDir(PKG_ROOT/agents → <dir>/t.subagents)` with an output line (`agents  → .claude/agents/ (N written)`); add `expectedAgentFiles(t)` and extend `uninstallTarget` (remove only specship's agent files, prune empty dirs, keep-if-shared guard like skills) and `doctorTarget` (missing/drift over agent files, passthrough render) (covers: R2, R3, AC2) → verify: `d=$(mktemp -d) && node bin/cli.js init --claude --dir "$d" && cmp agents/specship-explorer.md "$d/.claude/agents/specship-explorer.md" && d2=$(mktemp -d) && node bin/cli.js init --codex --dir "$d2" && [ ! -e "$d2/.claude/agents" ]`
- [x] S3 — Tests in `test/cli.test.js` (existing helpers `tmp`/`af`/`read`): (1) `init --claude` lands `.claude/agents/specship-explorer.md`, `init --all` lands it nowhere else; (2) user-modified agent file kept without `--force`, overwritten with it; (3) `uninstall --claude` removes ours, keeps a user-added `.claude/agents/mine.md`; (4) `doctor` flags the agent file deleted and edited, `update` restores it (covers: R2, R3, AC3) → verify: `npm test` green including the new cases
- [x] S4 — Update the five delegation sites — `skills/spec/SKILL.md` ("Delegate heavy exploration"), `skills/plan/SKILL.md` ("Delegate wide reads"), `skills/explore-source/SKILL.md` (section 
"Delegate heavy exploration" + "Searching effectively" bullet), `skills/debug/SKILL.md` (step 2 "Locate") — to prefer `specship-explorer` when installed, keeping built-in `Explore`/`general-purpose` → inline as the fallback chain (covers: R4, AC4) → verify: `grep -rln "specship-explorer" skills/ | sort` prints exactly the four SKILL.md paths, and `git diff --name-only skills/coding skills/review skills/research` is empty
- [x] S5 — Packaging + docs: add `"agents"` to `package.json` `files`; document the subagent in README ("What `init` Installs" row + "Package Layout" entry: claude-only, `.claude/agents/`, codebase-memory MCP optional) (covers: R5, R6, AC5, AC6) → verify: `npm pack --dry-run 2>&1 | grep "agents/specship-explorer.md"` and `grep -n "specship-explorer" README.md`
- [x] S6 — Full gate: `npm test`; real-install smoke `node bin/cli.js init --all --dir "$(mktemp -d)"` and inspect the tree (agent file only under `.claude/agents/`); `./publish.sh --dry-run`; `node bin/cli.js check --dir .` still OK (covers: AC2, AC5; re-runs all AC verifies) → verify: all four commands exit 0 with expected output
  - Deviation (2026-07-30 10:18 +07): `./publish.sh --dry-run` runs the full suite green (16+59) then halts at "0.2.4 already on npm" — by design, since the current version is already released and a dry-run without a bump can't pass that check; `patch --dry-run` would really mutate package.json's version, which belongs to the release flow, not this task. Packaging itself is verified: `npm pack --dry-run` lists `agents/specship-explorer.md` (AC5).

## Risks / Open Questions
- Skill-text edits (S4) change installed bytes for **all 10 targets** — doctor drift tests compare against packaged sources so they stay green, but the wording must keep the capability-fallback doctrine intact for non-Claude platforms (re-read each edited paragraph as a non-Claude agent would).
- `uninstallTarget`'s shared-path guard: no other target shares `.claude/agents` today, so the guard is future-proofing — keep it one line, don't build machinery.
- If Claude Code's subagent frontmatter contract changes (e.g. `tools:` default semantics), the no-whitelist assumption should be revisited — noted in the agent file as a comment-free design choice documented in README instead.

## Change History
- 2026-07-30 10:10 +07: Created.
- 2026-07-30 10:12 +07: Approved by the user without changes.
- 2026-07-30 10:18 +07: S6 deviation noted — publish.sh dry-run halts at the version-already-published check (pre-release state, not a defect of this change); packaging verified via `npm pack --dry-run` instead. S1–S6 all ticked.
