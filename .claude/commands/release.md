---
description: Release specship to npm via publish.sh (dry-run first)
argument-hint: patch|minor|major|x.y.z
---

Release specship (`$ARGUMENTS`, e.g. `patch`).

1. Preconditions: working tree clean (`git status`), on `main`, `npm test`
   passes.
2. Dry run first: `./publish.sh $ARGUMENTS --dry-run` and review the packed
   file list — it must contain `bin/`, `src/`, `skills/`, the per-agent doc
   templates (`.claude/CLAUDE.md`, `.codex/AGENTS.md`, `.cursor/WORKFLOW.mdc`,
   `.antigravity/rules.md`) and README, and must NOT contain `.claude/settings.json`,
   `.claude/commands/`, `tasks/`, or test scratch files.
3. Show me the dry-run output and stop for confirmation — the real publish
   (`./publish.sh $ARGUMENTS`) prompts for confirmation and may need an npm OTP,
   so I run that step.
