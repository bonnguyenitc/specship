---
task: TASK-003
title: custom separator for slugify
type: review
status: approved
created: 2026-06-12 08:36 +07
updated: 2026-06-12 08:36 +07
---

# Review: custom separator for slugify

## Gate Results
- Tests: 13/13 pass (`python3 -m unittest discover -s tests -t .`) — 4 new + 9 prior regressions (5 TASK-001 + 4 TASK-002).
- Lint / format / type-check: n/a (no toolchain configured in this project, same as TASK-001/TASK-002).

## Acceptance Criteria
- [x] AC1 — verified (`separator="_"` joins words with `_`)
- [x] AC2 — verified (runs of separators collapse to one `_`)
- [x] AC3 — verified (`max_length` truncation strips trailing `_`, not `-`)
- [x] AC4 — verified (no `separator` arg → identical to pre-TASK-003 output)

## Findings
- Diff is surgical: exactly the 3 hardcoded `-` literals from S2 became
  `separator`, plus the new `TestSlugifySeparator` class from S1. No
  unrelated edits. `src/slugify.py:5`.
- Confirmed the spec's edge-case note: `separator` is only used as a
  `re.sub` replacement and as a `str.strip`/`str.rstrip` char-set argument —
  never as a regex *pattern* — so no `re.escape` handling was needed even
  for punctuation separators.

## Commit / PR Draft
```
feat(slugify): support custom separator character

slugify(text, separator="-") lets callers join/strip with any single
character (e.g. "_") instead of the hardcoded hyphen; default "-" keeps
existing behavior. Covers TASK-003 (R1-R4, AC1-AC4).
```

## Follow-ups
- Multi-character separators and `allow_unicode` remain out of scope (per spec.md Out of Scope).

## Change History
- 2026-06-12 08:36 +07: Reviewed and approved.
