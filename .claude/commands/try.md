---
description: Install specship into a scratch dir and verify the result end-to-end
argument-hint: [--claude|--codex|--cursor|--antigravity|--all]
---

Verify the CLI end-to-end with a real install (flags: `$ARGUMENTS`, default `--all`).

1. Create a scratch dir and install:
   `d=$(mktemp -d) && node bin/cli.js init ${ARGUMENTS:---all} --dir "$d" && echo "$d"`
2. Inspect the tree (`find "$d" -type f`) and check:
   - skills landed at each agent's native path (`.claude/skills`, `.codex/skills`,
     `.cursor/skills`, `.agent/skills`)
   - the doc merged/wrote correctly (marker block `<!-- specship:start -->`
     appears exactly once in CLAUDE.md / AGENTS.md)
   - `openai.yaml` manifests exist under `.codex/skills/*/agents/` only
3. Re-run the same init command and confirm it is idempotent (still one marker
   block, user-modified files kept).
4. Report what you verified and anything that looks wrong.
