---
task: TASK-001
title: CLI lifecycle tooling - check, tasks, doctor, uninstall, dry-run, interactive init
type: debug
status: clear
created: 2026-07-07 22:15 +0700
updated: 2026-07-07 22:15 +0700
---

# Debug log: CLI lifecycle tooling

## BUG1 - uninstall deletes user-added skills next to specship's (fixed)

- Found: 2026-07-07 22:15 +0700, review stage (code-review pass on the S3 diff).
- Repro: `init --claude`, add `.claude/skills/my-own-skill/SKILL.md`, `uninstall --claude` → the user's skill is gone.
- Cause: `uninstallTarget` used `fs.rmSync(skillsDest, { recursive: true })`, but agents' skills folders (`.claude/skills/` etc.) legitimately hold user-authored skills alongside specship's tree.
- Fix: remove only the files specship installs (`expectedSkillFiles(t)`), then prune directories that became empty. Same selective logic the doctor audit uses.
- Regression test: `uninstall removes only specship-installed skill files` in `test/cli.test.js`.

## Change History
- 2026-07-07 22:15 +0700: Created with BUG1 (fixed same session).
