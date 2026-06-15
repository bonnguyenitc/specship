---
task: TASK-004
title: word-boundary truncation for slugify
type: plan
status: approved
created: 2026-06-13 09:12 +07
updated: 2026-06-15 10:15 +07
---

# Plan: word-boundary truncation for slugify

## Approach
Add a `word_boundary: bool = False` keyword parameter. The truncation block in
`slugify()` already branches on `max_length is not None`; inside it, switch on
`word_boundary`: default path keeps today's `slug[:max_length].rstrip(separator)`
hard cut, the new path delegates to a small helper that accumulates whole
separator-delimited tokens while they fit. The helper falls back to the hard cut
when even the first token is too long (R3), so it never returns empty when the
input wasn't. Keeping the hard cut as the helper's fallback means there's a
single source of truth for "too long to fit a word". TDD, tests first.

## Files to Touch
- `tests/test_slugify.py` — new `TestSlugifyWordBoundary` class, one test per AC.
- `src/slugify.py` — add the `word_boundary` param + `_truncate_on_word` helper.

## Steps
- [x] S1 — Add failing tests for AC1–AC4 in a new `TestSlugifyWordBoundary` class
  (covers: AC1, AC2, AC3, AC4) → verify: new word-boundary tests fail with
  `TypeError: slugify() got an unexpected keyword argument 'word_boundary'`
  (red, for the right reason); AC2 (default hard cut) already green.
- [x] S2 — Add `word_boundary=False` param + `_truncate_on_word` helper in
  `src/slugify.py` (covers: R1, R2, R3, R4) → verify: full suite green
  (17/17 — 5 TASK-001 + 4 TASK-002 + 4 TASK-003 + 4 TASK-004).

## Risks / Open Questions
- Additive change with a `False` default, so TASK-002 hard-cut behavior (R1/AC2)
  is protected by the existing tests. The only real decision — oversized first
  word — was settled as Q1 in the spec (hard-cut fallback).

## Change History
- 2026-06-13 09:12 +07: Created and approved.
- 2026-06-15 10:15 +07: S2 ticked after resume; both steps done.
