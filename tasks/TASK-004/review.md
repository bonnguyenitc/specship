---
task: TASK-004
title: Harden spec-stage requirement clarification
type: review
status: approved
created: 2026-07-12 22:31 +0700
updated: 2026-07-12 22:31 +0700
---

# Review: Harden spec-stage requirement clarification

## Diff summary

3 files:

- `src/pipeline.js` - new `check` rule: confirmed spec with unticked `- [ ] Q# (blocker)` → named violation (reuses `unticked()`; checkbox-line match only, so struck-through and non-blocker Qs are exempt).
- `test/cli.test.js` - conforming fixture gains a ticked blocker + unticked non-blocker Q (proves R4); new test "check flags a confirmed spec that still has open blocker questions" (proves R3, asserts Q1 named and Q2 not).
- `skills/spec/SKILL.md` - §3 gains the six-axis blind-spot hunting list; confirmation gate now spells out blocker-must-be-ticked vs non-blocker-may-stay-open and names `specship check` as the enforcer.

## Gate

- `npm test`: 25 passed (was 24; includes the new blocker-question case). ✅
- Real install `node bin/cli.js init --all --dir "$(mktemp -d)"`: updated `spec/SKILL.md` lands in `.claude`, `.codex`, `.specship` (and the rest via the same copy path). ✅
- `node bin/cli.js check` on this repo: OK - the new rule passes all existing tasks. ✅
- No packaging change (`skills/` and `src/` already ship).

## AC verification

- [x] AC1: `grep -n "blind spot" skills/spec/SKILL.md` → line 42; gate wording present with `specship check` named.
- [x] AC2: new test green - fixture confirmed spec with `- [ ] Q1 (blocker)` exits 1 naming Q1.
- [x] AC3: extended conforming fixture (ticked blocker + open non-blocker) still passes `check`.
- [x] AC4: full gate above - suite green, real install verified, self-check OK.

## Commit draft

```
feat(spec): blind-spot checklist + enforced blocker-question gate

skills/spec §3 gains a six-axis hunting list (permissions, failure
behavior, existing data, concurrency, limits/i18n, operability) so
ambiguity hunting no longer relies on judgment alone. specship check
now fails a confirmed spec.md that still has an unticked blocker Q#,
matching the WORKFLOW.md precondition for plan. Regression tests cover
both the violation and the legal open non-blocker case.
```

## Change History

- 2026-07-12 22:31 +0700 review: gate run, AC1-AC4 verified, approved.
