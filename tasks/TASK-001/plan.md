---
task: TASK-001
title: CLI lifecycle tooling - check, tasks, doctor, uninstall, dry-run, interactive init
type: plan
status: approved
created: 2026-07-07 22:06 +0700
updated: 2026-07-07 22:12 +0700
---

# Plan: CLI lifecycle tooling

## Approach
Keep the zero-dep, small-module shape: install-side logic stays in `src/init.js`/`src/targets.js`; the tasks-side commands get one new module `src/pipeline.js` (frontmatter parsing + `check` + `tasks` reporting) since they share the task.md parser; `doctor` and `uninstall` live in `src/init.js` next to the install logic they mirror.
`--dry-run` threads a `dry` flag through the existing copy/merge/write helpers (they already centralize every filesystem write).
Fingerprint detection = merge targets require the marker in dest; write targets keep the existence check (their filenames are specship-owned).
R8 unifies codex/agents on the existing `.agents/AGENTS.md` fallback template (extended with codex's auto-advance line); `.codex/AGENTS.md` is deleted.
Alternative considered for R8 - per-target markers - rejected: it duplicates the workflow block for AGENTS.md readers and breaks idempotent updates of legacy installs.

## Files to Touch
- `src/targets.js` - codex doc.src → `.agents/AGENTS.md`
- `src/init.js` - dry-run plumbing, version stamp in mergeDoc, fingerprint detectInstalled, uninstallTarget, doctor
- `src/pipeline.js` - new: frontmatter/ID parsing, `check`, `tasks`
- `src/cli.js` - new verbs (check, tasks, doctor, uninstall), `--dry-run`, interactive bare init, help text
- `.agents/AGENTS.md` - absorb codex specifics; `.codex/AGENTS.md` deleted
- `package.json` - files: template files instead of dot-dirs
- `test/cli.test.js` - new cases AC1–AC8
- `README.md` - document new commands and flags

## Steps
- [x] S1 - Fix detection + AGENTS.md unification: fingerprint `detectInstalled`, codex→shared template, delete `.codex/AGENTS.md`, package.json files entries (covers: R4, R8, R9, AC4, AC8, AC9) → verify: new test cases (copilot false-positive repro, codex/agents order-independence) + `npm test` + `npm pack --dry-run | grep -c '\.codex'` = 0
- [x] S2 - Version stamp in mergeDoc + `--dry-run` plumbing through copyFile/copyDir/mergeDoc/writeDoc/initTarget and cli parse (covers: R3(stamp), R6, AC3(stamp), AC6) → verify: tests - CLAUDE.md contains `specship:v0.1.16` after init; dry-run leaves dir empty
- [x] S3 - `uninstall` (init.js uninstallTarget + cli verb, shared-resource guard, dry-run aware) (covers: R5, AC5) → verify: tests - claude uninstall strips block keeps user text; windsurf/cline shared skills survival
- [x] S4 - `doctor` (drift scan vs packaged skills, config marker/template check, version stamp vs package version, exit code) (covers: R3, AC3) → verify: tests - clean install passes, corrupted skill file → exit 1 naming the file
- [x] S5 - `src/pipeline.js` + `check` verb (frontmatter parse, stage preconditions, ID cross-refs, timestamp format, archive skip) (covers: R1, AC1) → verify: tests - violating fixture exits 1 with named violations; conforming fixture + no-tasks dir exit 0
- [x] S6 - `tasks` verb (list active tasks, mark paused, skip archive) (covers: R2, AC2) → verify: test - two tasks, one archived → one listed
- [x] S7 - Interactive bare `init` (TTY: readline numbered prompt → same install path; non-TTY: current error) + help/README updates (covers: R7, AC7) → verify: `npm test` (non-TTY error case) + manual `node bin/cli.js init` in a TTY
- [x] S8 - Full gate: `npm test`, real install `node bin/cli.js init --all --dir "$(mktemp -d)"`, `npm pack --dry-run`, self-check `node bin/cli.js check` on this repo's tasks/ (covers: all) → verify: all commands exit 0

## Risks / Open Questions
- `check` parses markdown the stages write; keep rules structural (frontmatter, checkboxes, IDs) so prose variation doesn't false-positive.
- Interactive init can't be covered by the zero-dep test runner (no TTY); mitigated by keeping it a thin wrapper and verifying manually (AC7).
- Legacy codex installs get the unified AGENTS.md on next update - content changes but markers match (accepted, noted in spec).

## Change History
- 2026-07-07 22:06 +0700: Created; approved under ship (delegated approval).
