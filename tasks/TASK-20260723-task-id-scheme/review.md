---
task: TASK-20260723-task-id-scheme
title: Replace sequential task IDs with date+slug to survive concurrent minting
type: review
status: approved
created: 2026-07-23 09:40 +07
updated: 2026-07-23 10:33 +07
---

# Review: Replace sequential task IDs with date+slug to survive concurrent minting

## Gate Results
- Tests: pass — `npm test` 71 green (16 pipeline + 55 cli); the valid-ID case now locks in `TASK-20260723-fix-login` and the `-x7` suffix form alongside the legacy ids.
- `specship check`: OK over `tasks/` — including this task's own new-format folder, which is itself the first live proof the toolchain accepts the scheme.
- Real install: `node bin/cli.js init --all --dir "$(mktemp -d)"` exit 0; every installed target carries the new rule (`YYYYMMDD` in WORKFLOW.md + spec/SKILL.md, slug resolution in all three lifecycle skills) and zero sequential-minting wording.

## Acceptance Criteria
- [x] AC1 — verified: `grep -rn "sequential" skills/` leaves only two hits in `coding/SKILL.md` about coding steps *sequentially* (unrelated to ids); WORKFLOW.md and spec/SKILL.md state the identical rule (ticket id first → date+slug → suffix on collision → legacy ids stay valid). The grep also caught a third minting site the plan had missed — `debug/SKILL.md`'s standalone-bug path — now pointing at the WORKFLOW.md rule.
- [x] AC2 — verified: `npm test` green with the new-format ids added and `TASK-001`/`TASK-PROJ-123`/`TASK-42` still in the valid list.
- [x] AC3 — verified: `resume-task`, `pause-task`, `archive-task` Input sections all describe full-id / bare-all-digit (legacy) / slug-fragment resolution with the same semantics (unique match over `tasks/` + `archive/`, ambiguity → list and ask).
- [x] AC4 — verified: README tree + new id paragraph use the scheme; `grep -n "sequential" README.md` empty.
- [x] AC5 — verified: install smoke as in Gate Results.

## Findings
- [x] [self][minor] README's external-orchestration examples (`inspect TASK-001`) and `examples/slugify-demo/tasks/TASK-001` still show legacy ids — deliberate: legacy ids remain valid (spec Out of Scope), and the demo is a committed artifact. Kept as-is; see Follow-ups.
- [x] [code-review][minor] The new Input wording in `pause-task`/`archive-task` regressed R4's bare-number promise: "matches a legacy numeric folder as written" dropped the un-padding rule, so a literal read sends `pause-task 7` to nonexistent `TASK-7` (resume-task kept the rule; the two skills diverged), ref `skills/pause-task/SKILL.md:22`, `skills/archive-task/SKILL.md:23` — fixed: all three skills now carry the identical "`7` and `007` both resolve to `TASK-007`" rule.
- [x] [code-review][minor] Slug/ticket resolution said "unique match" without defining the relation (exact vs substring), so `PROJ-123` alongside `TASK-PROJ-1234` forced a needless disambiguation ask, ref all three lifecycle Input lines — fixed: exact folder-name match wins, else unique substring match.
- [x] [code-review][minor] Zero-match and archived-match outcomes were unspecified for `pause-task`/`archive-task`: a no-match slug argument could fall through the locate chain and pause/archive the most-recently-updated task instead (silent wrong-task mutation), and a match under `tasks/archive/` led into steps that assume `tasks/` — fixed: none → say so and stop (never auto-pick); an archived match → report shelved, suggest `resume-task` (pause) / nothing to do (archive).
- [x] [code-review][minor] `examples/slugify-demo/WALKTHROUGH.md:16` demonstrated the retired counter-minting procedure ("no `tasks/TASK-*` exists yet → new `TASK-001`") in a doc claiming to show the WORKFLOW.md contract in action — fixed: the line now mints without counter logic and marks `TASK-001` as grandfathered. (Not shipped to npm — `examples/` is absent from package.json `files` — repo-reader drift only.)

## Commit / PR Draft
```
feat: replace sequential task IDs with date+slug scheme

Sequential ids (TASK-001) collide when several agents mint tasks
concurrently - each scans tasks/TASK-* and picks the same next number.
The default is now coordination-free: TASK-<YYYYMMDD>-<slug> (real
clock + short kebab slug), with a short random suffix when the folder
already exists in tasks/ or tasks/archive/. Ticket ids (TASK-PROJ-123)
still take precedence, and legacy numeric ids stay valid: TASK_ID_RE
is untouched, and the lifecycle skills resolve slug arguments by
unique match while keeping bare-number matching for old folders.
```

## Follow-ups
- Optional docs pass: refresh README's orchestration examples and `examples/slugify-demo` to a new-format id for consistency — cosmetic only, both remain valid.
- Release: the change ships to consumers on the next `./publish.sh` (user-run).

## Change History
- 2026-07-23 09:40 +07: Reviewed — approved. Gate green, 5/5 AC, 6/6 S#, one minor finding resolved as deliberate.
- 2026-07-23 10:33 +07: Independent re-review (user-requested) — panel of 2 adversarial reviewers (contract-consistency / correctness-and-compat lenses), findings deduped and each re-verified by the main thread against the actual text before recording. 4 minor findings, 0 blockers; all 4 fixed in-session and re-verified (71 tests green, `specship check` OK, install smoke shows the corrected wording in all three lifecycle skills). Approval stands.
