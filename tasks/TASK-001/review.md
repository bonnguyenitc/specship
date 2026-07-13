---
task: TASK-001
title: CLI lifecycle tooling - check, tasks, doctor, uninstall, dry-run, interactive init
type: review
status: approved
created: 2026-07-07 22:16 +0700
updated: 2026-07-07 22:16 +0700
---

# Review: CLI lifecycle tooling

## Gate Results
- Tests: pass - 23/23 (`npm test`), including new cases for check/tasks/doctor/uninstall/dry-run/stamp/AGENTS.md convergence and the BUG1 regression.
- Real install: `init --all` into a temp dir → doctor healthy, one AGENTS.md block, version stamp present.
- Packaging: `npm pack --dry-run` ships only template files from dot-dirs (38 files, no `.codex/`); `./publish.sh --dry-run` reaches the version gate (0.1.16 already published - bump on release, expected).
- Self-check: `node bin/cli.js check` on this repo's own `tasks/` passes.
- Interactive init: driven through a pty (`script`), selection `1` installed Claude Code correctly; non-TTY path covered by test.
- Lint/format/type-check: none defined for this repo (zero-dep, no configs) - not run.

## Acceptance Criteria
- [x] AC1 - check fails on violations with named findings, passes on conforming/no tasks (tests)
- [x] AC2 - tasks lists active, hides archive (test)
- [x] AC3 - version stamp + doctor drift/stale detection (tests)
- [x] AC4 - pre-existing copilot-instructions.md no longer claimed; update leaves it byte-identical (test)
- [x] AC5 - uninstall strips block, keeps user content, shared skills survive until last adapter (tests)
- [x] AC6 - dry-run writes/removes nothing (test)
- [x] AC7 - bare init non-TTY errors unchanged (test); TTY prompt verified via pty run
- [x] AC8 - codex/agents converge on identical AGENTS.md regardless of order (test)
- [x] AC9 - npm pack ships template files only (inspected pack output)

## Findings
- [x] [code-review][blocker] uninstall `rmSync` deleted user-authored skills living next to specship's in the agent's skills folder → BUG1 in debug.md; fixed to remove only `expectedSkillFiles` + prune empty dirs; regression test added, ref `src/init.js:152`
- [x] [code-review][minor] doctor crashed if a merge block lost its end marker (detect sees start marker, `match()[0]` on null) → guarded, reports "block corrupted", ref `src/init.js:216`
- [x] [self][minor] new prose used em dashes, violating the user's global CLAUDE.md rule → swept to plain dashes in new code/artifacts, ref `src/cli.js`, `src/pipeline.js`, `tasks/TASK-001/*`

## Commit / PR Draft
```
feat(cli): lifecycle tooling - check, tasks, doctor, uninstall, dry-run, interactive init

- specship check: validate tasks/ against the workflow contract (CI gate, exit 1)
- specship tasks: show active pipeline tasks (archive hidden)
- specship doctor: audit installs (skill drift, config integrity, version stamps)
- specship uninstall: remove an agent cleanly; shared skills/blocks kept while in use;
  only specship-installed files are deleted (user-authored skills survive)
- --dry-run for init/update/uninstall; bare `init` on a TTY picks agents interactively
- merge blocks now stamped with the installing version
- fix: detectInstalled requires specship's marker, so pre-existing CLAUDE.md/
  copilot-instructions.md etc. are never claimed or overwritten by update
- fix: codex and agents share one AGENTS.md template - install order no longer
  changes the result; .codex/AGENTS.md removed
- fix: package.json files lists template files, not whole dot-dirs
```

## Follow-ups
- Interactive init has no automated test (needs a pty); revisit if it grows logic.
- `list` still shows `config:<path>` for files that exist without being specship's (cosmetic).
- Legacy AGENTS.md installs converge to the unified template on next `update` (content changes once).

## Change History
- 2026-07-07 22:16 +0700: Reviewed; BUG1 found by the independent code-review pass, fixed, re-gated; approved.
