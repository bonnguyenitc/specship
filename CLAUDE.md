# specship — dev guide

npm package that installs a spec→plan→coding→review skills workflow into
projects (Claude Code, Codex, Cursor, Antigravity). Entry: `bin/cli.js` →
`src/cli.js`; install logic in `src/init.js` + `src/targets.js`; skill sources
in `skills/`; per-agent templates in `.claude/`, `.codex/`, `.cursor/`,
`.antigravity/`.

## Verify every change

Always prove a change works before declaring it done:

- `npm test` — zero-dep test suite (`test/cli.test.js`).
- Real install: `node bin/cli.js init --all --dir "$(mktemp -d)"`, then inspect
  the resulting tree (marker block in CLAUDE.md, skills copied, codex-only
  `openai.yaml` manifest).
- Anything touching packaging or `publish.sh`: `./publish.sh --dry-run`.

## Learnings

When Claude makes a mistake in this repo, don't just correct it in chat — add
the lesson here as a bullet so it never repeats.

- `.claude/CLAUDE.md` is not only this repo's project instructions: it is the
  template `specship init` merges into consumers' CLAUDE.md. Edits there ship
  to users — dev-only guidance belongs in this file (root CLAUDE.md).
- package.json `files` must list `.claude/CLAUDE.md` (the template), not the
  whole `.claude/` dir, so local dev config (`settings.json`, `commands/`)
  never ships in the npm tarball.
