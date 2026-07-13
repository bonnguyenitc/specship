---
status: approved
created: 2026-07-12 21:13 +0700
updated: 2026-07-12 21:16 +0700
---

# Plan: Per-stage model selection via SKILL.md frontmatter

Skills are copied verbatim to every target's `skillsDest` (`src/targets.js`), so editing the sources in `skills/` is the whole mechanism - no installer change needed.
The `model:` field goes right after `name:` in each frontmatter.

## Steps

- [x] S1 — Add `model: fable` to the frontmatter of `skills/{spec,plan,review,debug}/SKILL.md` and `model: sonnet` to `skills/coding/SKILL.md`; leave every other skill untouched (covers: R1, R2, R3) → verify: `grep -rn "^model:" skills/`
- [x] S2 — Document the defaults in README (new subsection under "Stages"): which stage gets which model, Claude Code-only honor, other agents ignore the field, customize by editing the installed SKILL.md (covers: R4) → verify: read the section
- [x] S3 — Add a regression test to `test/cli.test.js`: after `init --claude`, installed spec/coding SKILL.md match `^model: fable$` / `^model: sonnet$` and `ship/SKILL.md` has no `model:` line (covers: R5) → verify: `npm test`
- [x] S4 — Full verification: `npm test` green + real install `node bin/cli.js init --all --dir "$(mktemp -d)"`, inspect that the field lands in every target's skills tree and codex still gets its `openai.yaml` (covers: AC1, AC2, AC3) → verify: command output

## Change History

- 2026-07-12 21:13 +0700 plan: drafted and approved (ship-style consent carried from spec)
