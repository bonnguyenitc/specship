---
task: TASK-20260723-task-id-scheme
title: Replace sequential task IDs with date+slug to survive concurrent minting
type: plan
status: approved
created: 2026-07-23 09:35 +07
updated: 2026-07-23 09:38 +07
---

# Plan: Replace sequential task IDs with date+slug to survive concurrent minting

## Approach
Prose-only contract change: the ID rule lives in skill text, and `TASK_ID_RE` already accepts the new shape, so no `src/` change is needed. Rewrite the two "Choosing `TASK-<ID>`" sections (WORKFLOW.md is the contract, spec/SKILL.md is the minting site) with the same three-line rule: ticket id first, else `TASK-<YYYYMMDD>-<slug>`, folder-exists → random suffix. Extend — never replace — the id-argument normalization in the three lifecycle skills so legacy numeric ids keep resolving while slug arguments start working. Lock the new format into the valid-ID test cases so a future regex "cleanup" can't break it.

## Files to Touch
- `skills/WORKFLOW.md` — rewrite "Choosing `TASK-<ID>`"; new-format id in the archive example line.
- `skills/spec/SKILL.md` — same rule in its "Choosing `TASK-<ID>`" list.
- `skills/debug/SKILL.md` — standalone-bug path minted ids "(sequential or from a ticket id)"; point it at the WORKFLOW.md rule instead.
- `skills/resume-task/SKILL.md` — Input normalization + locate step: add slug resolution, keep bare-number for legacy folders.
- `skills/pause-task/SKILL.md` — Input line: same extension.
- `skills/archive-task/SKILL.md` — Input line: same extension.
- `README.md` — tasks/ tree example + id prose.
- `test/pipeline.test.js` — add the new-format id to the valid cases.

## Steps
- [x] S1 — Rewrite `skills/WORKFLOW.md` → "Choosing `TASK-<ID>`" to the date+slug rule (ticket id unchanged and first; date from `date +%Y%m%d`; 2–4-word kebab slug; collision against `tasks/` **and** `tasks/archive/` → short random suffix; legacy sequential ids stay valid) and update the `TASK-012` example to a new-format id (covers: R1, R2, AC1) → verify: `grep -n "sequential" skills/WORKFLOW.md` empty; `grep -n "YYYYMMDD" skills/WORKFLOW.md` hits the section.
- [x] S2 — Mirror the same rule in `skills/spec/SKILL.md` → "Choosing `TASK-<ID>`" (covers: R3, AC1) → verify: `grep -rn "sequential" skills/` returns nothing; `grep -c "YYYYMMDD" skills/spec/SKILL.md` ≥ 1.
- [x] S3 — Extend the Input/locate rules of `skills/resume-task/SKILL.md`, `skills/pause-task/SKILL.md`, `skills/archive-task/SKILL.md`: bare all-digit argument keeps legacy folder matching; a slug argument resolves by unique match over `tasks/TASK-*` + `tasks/archive/TASK-*`, ambiguity lists candidates (covers: R4, AC3) → verify: `grep -ln "slug" skills/resume-task/SKILL.md skills/pause-task/SKILL.md skills/archive-task/SKILL.md` lists all three.
- [x] S4 — Update `README.md` tasks/ tree + id prose to the new scheme (covers: R5, AC4) → verify: `grep -n "YYYYMMDD\|20260723" README.md` hits the tree/prose; no README text says ids are sequential.
- [x] S5 — Add `TASK-20260723-fix-login` to the valid-ID cases in `test/pipeline.test.js` (covers: R6, AC2) → verify: `npm test` green.
- [x] S6 — Real-install smoke: `node bin/cli.js init --all --dir "$(mktemp -d)"`, grep installed skills for the new rule and for absence of sequential wording (covers: R1, R3, AC5) → verify: grep output as stated in AC5.

## Risks / Open Questions
- Skill text is read by agents as instructions (see LESSONS L3/L4): the three lifecycle skills must stay mutually consistent with WORKFLOW.md wording, or an agent following one file contradicts another — S6's install grep is the cross-file check.
- none else.

## Change History
- 2026-07-23 09:35 +07: Created; approved (delegated — user requested the change end-to-end).
- 2026-07-23 09:36 +07: Added `skills/debug/SKILL.md` to Files to Touch — S2's repo-wide grep caught its standalone-bug path still minting sequential ids; folded the fix into S2's scope.
