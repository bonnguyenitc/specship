---
task: TASK-001
title: CLI lifecycle tooling - check, tasks, doctor, uninstall, dry-run, interactive init
type: spec
status: confirmed
created: 2026-07-07 22:04 +0700
updated: 2026-07-07 22:16 +0700
---

# Spec: CLI lifecycle tooling

## Goal
specship today stops at install time (init/update/list).
Add the lifecycle tooling around it: verify the workflow artifacts in CI, see pipeline state, audit/repair installs, uninstall cleanly, preview changes, and lower first-run friction.
Also fix the three defects found in review (detection false positives, AGENTS.md block clobbering, package.json files globs).

## Requirements
- R1: `specship check` validates `tasks/` pipeline artifacts against the WORKFLOW.md contract and exits non-zero on violations, so it can gate CI.
  Checks: task.md exists with valid frontmatter (task/stage/status/created/updated), stage preconditions (stage plan+ needs spec.md confirmed; coding+ needs plan.md approved; done needs review.md approved and all AC#/S# ticked), downstream IDs reference existing upstream IDs (plan `covers:` R#/AC# exist in spec.md), and timestamps match `YYYY-MM-DD HH:MM +TZ`.
  `tasks/archive/` is skipped. No `tasks/` dir or no tasks = pass (nothing to check).
- R2: `specship tasks` lists active tasks (skipping `tasks/archive/`): ID, title, stage, status, updated. Paused tasks are shown marked; exit code stays 0.
- R3: merge-installed config blocks carry a version stamp (`<!-- specship:vX.Y.Z -->` inside the marker block), and `specship doctor` audits installed agents: skills files drifted from the package, config marker/file missing, stale version stamp. Non-zero exit when problems found; suggests `update`/`init --force`.
- R4: `detectInstalled` requires specship's own fingerprint: for merge targets the dest file must contain the specship marker; for write targets the dest file must exist (it is specship-named). Fixes: pre-existing `.github/copilot-instructions.md` + `init --windsurf` must NOT mark Copilot installed, and `update` must not touch that file.
- R5: `specship uninstall <agent-flags|--all>` removes an agent's install: deletes its skills dir and removes its config (merge: strip the marker block, delete the file if empty; write: delete the file). Shared resources (`.specship/skills`, a shared merge dest like `AGENTS.md`) are only removed when no other installed agent still uses them.
- R6: `--dry-run` on init, update, and uninstall prints what would be written/removed without touching the filesystem.
- R7: `specship init` with no agent flags on a TTY prompts interactively (numbered list, comma-separated choice) instead of failing; non-TTY keeps the current error.
- R8: `codex` and `agents` no longer clobber each other in `AGENTS.md`: both point at one shared template whose content covers both installs (fallback path order `.codex/skills` → `.agents/skills`), so merge order no longer changes the outcome. `.codex/AGENTS.md` is removed.
- R9: package.json `files` lists template files, not whole dot-dirs (`.gemini/GEMINI.md`, `.agents/AGENTS.md`, `.cursor/WORKFLOW.mdc`, `.antigravity/rules.md`, `.windsurf/rules/specship.md`, `.clinerules/specship.md`, `.roo/rules/specship.md`), so local dev config can never ship.

## Acceptance Criteria
- [x] AC1 (covers R1): `check` fails (exit 1, named violations) on a task folder with stage `coding` but spec.md `status: draft`, and passes on a contract-conforming task and on a project without `tasks/` → verify: node test cases in `test/cli.test.js` running the CLI against fixture task folders.
- [x] AC2 (covers R2): `tasks` prints one line per active task with stage/status and skips `tasks/archive/` → verify: test creates two tasks (one archived) and asserts output.
- [x] AC3 (covers R3): after `init --claude`, CLAUDE.md block contains `specship:v` + current version; corrupting a skill file then running `doctor` exits 1 and names the drifted file; clean install passes → verify: test cases.
- [x] AC4 (covers R4): repo with pre-existing `.github/copilot-instructions.md`, then `init --windsurf`: `list` shows Copilot not installed and `update` leaves the file byte-identical → verify: test case reproducing the review finding.
- [x] AC5 (covers R5): `init --claude` then `uninstall --claude` removes `.claude/skills` and the CLAUDE.md marker block but keeps user content; `init --windsurf --cline` then `uninstall --windsurf` keeps `.specship/skills` (cline still uses it), then `uninstall --cline` removes it → verify: test cases.
- [x] AC6 (covers R6): `init --claude --dry-run` on an empty dir creates no files and prints the planned actions; same for uninstall → verify: test case asserting empty dir after run.
- [x] AC7 (covers R7): `init` with no flags and no TTY still errors with the agent list (unchanged behavior) → verify: existing/updated test; interactive path is a thin readline wrapper over the same install call, verified by running the CLI manually.
- [x] AC8 (covers R8): `init --codex` then `init --agents` (and the reverse) produce identical AGENTS.md content mentioning both `.codex/skills` and `.agents/skills`, one marker block → verify: test case.
- [x] AC9 (covers R9): `npm pack --dry-run` file list contains the template files and nothing else from the dot-dirs → verify: run `npm pack --dry-run` and inspect.

## Out of Scope
- Custom/third-party skill sources, plugin system, template engine.
- `check` validating markdown prose quality or R#→test traceability inside the consumer codebase.
- Interactive prompts anywhere except bare `init`.
- Auto-migrating existing consumer installs' AGENTS.md content (next `update`/`init` run converges them naturally).

## Assumptions
- Zero-dependency constraint stays: only Node built-ins (`fs`, `path`, `readline`).
- Version stamp lives inside the merge block (comment line after the start marker), so the existing marker regex keeps matching old installs - backward compatible.
- Write-target version tracking is byte-comparison against the packaged template (no stamp), since stamping would break the "user-modified" comparison in `writeDoc`.
- `check`/`tasks`/`doctor` operate on `--dir` like the existing commands.
- New CLI verbs (`check`, `tasks`, `doctor`, `uninstall`) don't collide with agent flag parsing since agents are flags, not positionals.

## Edge Cases
- `tasks/` exists but is empty, or contains non-task files (LESSONS.md, archive/) → `check`/`tasks` ignore them.
- task.md with unparseable frontmatter → a `check` violation, not a crash.
- Uninstalling an agent that isn't installed → per-agent "not installed" notice, exit 0.
- Uninstall of a merge target whose dest file contains only the specship block → file deleted; with user content → only block removed.
- `doctor` on a project with nothing installed → "nothing installed", exit 0.
- AGENTS.md legacy installs (old codex-only block content) → next merge replaces the block with the unified content (same markers).

## Open Questions
- none (running under ship - defaults above chosen and recorded as Assumptions)

## Change History
- 2026-07-07 22:04 +0700: Created.
- 2026-07-07 22:16 +0700: review - ticked AC1-AC9; every verify: check ran green (see review.md Gate Results).
