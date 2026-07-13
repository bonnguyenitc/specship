---
status: approved
created: 2026-07-12 21:16 +0700
updated: 2026-07-12 21:34 +0700
---

# Review: Per-stage model selection via SKILL.md frontmatter

## Diff summary

7 files, +27 lines, no deletions:

- `skills/{spec,plan,review,debug}/SKILL.md` - `model: opus` added to frontmatter (line 3, after `name:`).
- `skills/coding/SKILL.md` - `model: sonnet` added the same way.
- `README.md` - new "Per-stage models (Claude Code)" subsection under Stages.
- `test/cli.test.js` - new test "stage skills ship the per-stage model mapping".

## Gate

- `npm test`: 24 passed (includes the new model-mapping test). ✅
- Real install `node bin/cli.js init --all --dir "$(mktemp -d)"`: `model:` field lands intact in every target's skills tree (.claude, .codex, .cursor, .agent, .specship); codex-only `openai.yaml` manifest unchanged. ✅
- `specship check`: OK. ✅
- `publish.sh` untouched (no packaging change - `skills/` already ships).

## AC verification

- [x] AC1: `grep -rn "^model:" skills/` shows exactly opus×4 (spec/plan/review/debug) + sonnet×1 (coding); no other skill has the field.
- [x] AC2: `npm test` green including the new assertion (also asserts ship/explore-source/lifecycle skills carry no `model:`).
- [x] AC3: verified on a real `init --all` (see Gate); manifest behavior unchanged.
- [x] AC4: README documents defaults, Claude Code-only honor, per-project customization, and the `update`/`--force` restore caveat.

## Commit draft

```
feat(skills): per-stage model selection via SKILL.md frontmatter

Reasoning-heavy stages (spec, plan, review, debug) declare model: opus;
coding declares model: sonnet; other skills inherit the session model.
Claude Code honors the field per invocation; other agents ignore it.
Documented in README; regression test asserts the shipped mapping.
```

## Change History

- 2026-07-12 21:16 +0700 review: gate run, AC1-AC4 verified, approved
- 2026-07-12 21:34 +0700 review: reasoning-stage model changed fable → opus per user; gate re-run (24 passed, real init --all re-verified), still approved
