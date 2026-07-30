# specship — dev guide

npm package that installs a spec→plan→coding→review skills workflow into
projects (Claude Code, Codex, Cursor, Antigravity). Entry: `bin/cli.js` →
`src/cli.js`; install logic in `src/init.js` + `src/targets.js`; skill sources
in `skills/`; subagent definitions in `agents/` (installed only for targets
declaring `subagents` in `targets.js` — today just Claude Code); per-agent
templates in `.claude/`, `.codex/`, `.cursor/`, `.antigravity/`.

## Verify every change

Always prove a change works before declaring it done:

- `npm test` — zero-dep test suite (`test/pipeline.test.js` + `test/cli.test.js`).
  Fixtures must describe tasks that could actually exist: a `task.md` whose
  `artifacts:` map names a `confirmed` spec needs `spec.md` on disk to match
  (use the `filesFor` helper). Fictional fixtures hid a whole class of bugs
  once — see `tasks/LESSONS.md` L2/L3.
- Real install: `node bin/cli.js init --all --dir "$(mktemp -d)"`, then inspect
  the resulting tree (marker block in CLAUDE.md, skills copied, codex-only
  `openai.yaml` manifest, claude-only `.claude/agents/` subagents and nowhere
  else).
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
