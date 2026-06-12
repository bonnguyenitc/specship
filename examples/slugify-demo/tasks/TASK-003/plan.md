---
task: TASK-003
title: custom separator for slugify
type: plan
status: approved
created: 2026-06-12 08:32 +07
updated: 2026-06-12 08:35 +07
---

# Plan: custom separator for slugify

## Approach
Add a `separator: str = "-"` keyword parameter to `slugify()`. The current
implementation already has exactly three places where `-` is a literal: the
`re.sub` replacement, the `str.strip("-")` after building the slug, and the
`str.rstrip("-")` after `max_length` truncation. Replace all three with the
`separator` parameter — default value preserves today's behavior exactly
(R4/AC4), so no other branch is needed. This is the simplest design; no
alternative considered (it's a 1:1 substitution of an existing literal).

## Files to Touch
- `src/slugify.py` — add `separator` parameter, replace the three `-` literals
- `tests/test_slugify.py` — add `TestSlugifySeparator` covering AC1-AC4

## Steps
- [x] S1 — Add failing tests for the `separator` parameter: new
  `TestSlugifySeparator` class in `tests/test_slugify.py` with one test per
  AC1-AC4 (covers: R1, R2, R3, R4, AC1, AC2, AC3, AC4) → verify: `python3 -m
  unittest discover -s tests -t .` fails on the new tests with `TypeError:
  slugify() got an unexpected keyword argument 'separator'` (red, for the
  right reason).
- [x] S2 — Implement the `separator` parameter in `src/slugify.py`: add
  `separator: str = "-"` to the signature, replace the `re.sub` replacement
  string, `str.strip("-")`, and `str.rstrip("-")` literals with `separator`
  (covers: R1, R2, R3, R4) → verify: full suite green (13/13 — 5 TASK-001 + 4
  TASK-002 + 4 TASK-003).

## Risks / Open Questions
- None — this is a narrow, mechanical substitution of an existing literal
  with a parameter; the default preserves all existing behavior (AC4).

## Change History
- 2026-06-12 08:32 +07: Created.
