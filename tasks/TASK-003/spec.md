---
status: confirmed
created: 2026-07-12 21:13 +0700
updated: 2026-07-12 21:34 +0700
---

# Spec: Per-stage model selection via SKILL.md frontmatter

## Goal

Each pipeline stage skill declares its own `model:` in SKILL.md frontmatter so Claude Code runs each phase on the model best suited to it.
Reasoning-heavy stages get a stronger model; the coding stage gets a faster/cheaper one.
Other agents (Codex, Cursor, Gemini, Antigravity, adapters) ignore the field - it ships as a progressive enhancement.

## Requirements

- R1: `skills/spec/SKILL.md`, `skills/plan/SKILL.md`, `skills/review/SKILL.md`, `skills/debug/SKILL.md` declare `model: opus` in frontmatter.
- R2: `skills/coding/SKILL.md` declares `model: sonnet` in frontmatter.
- R3: All other skills (`ship`, `explore-source`, `pause-task`, `resume-task`, `archive-task`) get no `model:` field - they inherit the session model.
- R4: README documents the per-stage model defaults: honored by Claude Code only, ignored by other agents, and how consumers change the mapping after `init` (edit the installed SKILL.md frontmatter).
- R5: A regression test asserts the installed skills carry the expected model mapping (and that non-stage skills carry none).

## Acceptance criteria

- [x] AC1 (covers R1, R2, R3): `grep -r "^model:" skills/*/SKILL.md` shows exactly `opus` for spec/plan/review/debug, `sonnet` for coding, and no `model:` line in any other skill.
- [x] AC2 (covers R5): `npm test` passes, including the new model-mapping assertion.
- [x] AC3 (covers R1, R2, R3): a real install (`node bin/cli.js init --all --dir "$(mktemp -d)"`) copies the skills with the `model:` field intact to every target, and the codex-only `openai.yaml` manifest behavior is unchanged.
- [x] AC4 (covers R4): README contains a section explaining the per-stage model defaults and how to customize them.

## Decisions (from user Q&A)

- Q1: hard-code defaults in shipped skills vs document-only? → hard-code ("Hard-code, mapping khác").
- Q2: mapping? → `fable` for spec/plan/review/debug, `sonnet` for coding, inherit for the rest.
- Q2 revised (2026-07-12 21:34 +0700): user changed the reasoning-stage model from `fable` to `opus`.
- Model aliases (not pinned IDs) are used so the field tracks the newest model of each tier.

## Out of scope

- Per-target transforms (e.g. stripping the field for non-Claude installs) - the field ships verbatim everywhere.
- CLI flags to configure the mapping at `init` time.
- Equivalent model selection for Codex/Cursor/Antigravity (no native mechanism exists).

## Change History

- 2026-07-12 21:13 +0700 spec: drafted and confirmed (decisions taken from user's answers in conversation; ship-style consent given with "ok cách 1 nhé")
- 2026-07-12 21:34 +0700 spec: R1/AC1 changed fable → opus per user request ("thay fable bằng opus")
