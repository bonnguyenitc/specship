---
task: TASK-20260723-task-id-scheme
title: Replace sequential task IDs with date+slug to survive concurrent minting
type: spec
status: confirmed
created: 2026-07-23 09:33 +07
updated: 2026-07-23 09:40 +07
---

# Spec: Replace sequential task IDs with date+slug to survive concurrent minting

## Goal
The default `TASK-<ID>` rule is "next sequential number by scanning `tasks/TASK-*`" — two agents starting tasks concurrently scan the same folders and mint the same id (user hit this in practice). Replace the default with a coordination-free scheme, `TASK-<YYYYMMDD>-<slug>`, so ids never need a shared counter.

## Requirements
- R1: The default rule in `skills/WORKFLOW.md` → "Choosing `TASK-<ID>`" becomes: `TASK-<YYYYMMDD>-<slug>` — the date from the real clock (`date +%Y%m%d`, never guessed), the slug a short (2–4 word) kebab-case summary of the task. If the resulting folder already exists in `tasks/` **or** `tasks/archive/`, append a short random suffix (e.g. `-x7`) instead of reusing it. No sequential-counter wording remains.
- R2: The ticket-id rule is unchanged: an existing ticket key still maps to `TASK-PROJ-123` / `TASK-42` and still takes precedence over the generated form.
- R3: `skills/spec/SKILL.md` → "Choosing `TASK-<ID>`" (the minting site) states the same rule as R1+R2 — the two files may not disagree.
- R4: Legacy sequential ids stay valid and resolvable: `TASK_ID_RE` (src/pipeline.js) is untouched; `resume-task`/`pause-task`/`archive-task` keep bare-number normalization (`7`/`007` → existing `TASK-007`) and additionally resolve a slug argument (e.g. `resume-task fix-login`) by unique match against `tasks/TASK-*` and `tasks/archive/TASK-*`; an ambiguous match lists candidates and asks.
- R5: `README.md` shows the new scheme (folder-tree example and any prose describing how ids are chosen).
- R6: `test/pipeline.test.js` locks the new format in as a valid id alongside the legacy ones.

## Acceptance Criteria
- [x] AC1 (covers R1, R3): no skill text still tells an agent to pick "the next sequential number"; WORKFLOW.md and spec/SKILL.md carry the same date+slug rule → verify: `grep -rn "sequential" skills/` is empty of ID-minting rules; read both "Choosing" sections side by side.
- [x] AC2 (covers R2, R4, R6): `npm test` is green with `TASK-20260723-fix-login` added to the valid-ID cases while `TASK-001` / `TASK-PROJ-123` / `TASK-42` remain valid → verify: run `npm test`.
- [x] AC3 (covers R4): the Input sections of `resume-task`, `pause-task`, and `archive-task` each describe both bare-number (legacy) and slug resolution → verify: read the three SKILL.md files.
- [x] AC4 (covers R5): README's tasks/ tree and id prose use the new scheme → verify: read README.md.
- [x] AC5 (covers R1, R3): a real install propagates the new rule → verify: `node bin/cli.js init --all --dir "$(mktemp -d)"`, then grep the installed skills for the date+slug rule and for absent "sequential" wording.

## Out of Scope
- Renaming existing task folders (this repo's `TASK-001`–`TASK-006`, consumers' tasks, `examples/slugify-demo/tasks/TASK-001`) — legacy ids remain valid indefinitely.
- Any change to `TASK_ID_RE` or other `src/` code — the regex already accepts the new format.
- A CLI helper that mints ids (agents follow the rule in prose).
- Publishing a release (`publish.sh`) — separate step the user runs.

## Assumptions
- Slug is English kebab-case chosen by the minting agent from the task title; 2–4 words is guidance, not a validated limit.
- A 2-character random suffix is enough for collisions — same day + same slug is almost always the same task, and the folder-exists check catches the rest.
- Bare-number normalization applies only to all-digit arguments, so it can't collide with slug matching (slugs contain a letter or hyphen).
- This task's own folder uses the new scheme before the docs land — the regex already permits it, and it doubles as the first real example.

## Edge Cases
- Two agents, same day, same slug → the folder-exists check (tasks/ + archive/) forces a random suffix on the second.
- Slug containing digits (`add-v2-api`) — valid; only an *all-digit* argument is treated as a legacy bare number.
- Numeric ticket ids (`TASK-42`): an all-digit argument still tries exact folder match first (legacy behavior, unchanged).

## Open Questions
- none — the one design decision (which scheme) was answered by the user: date + slug, random suffix on collision.

## Change History
- 2026-07-23 09:33 +07: Created; confirmed in the same session (scheme picked by the user, no open blockers).
