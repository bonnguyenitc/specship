---
task: TASK-002
title: max_length truncation for slugify
type: plan
status: approved
created: 2026-06-12 00:25 +07
updated: 2026-06-12 00:26 +07
---

# Plan: max_length truncation for slugify

## Approach
Extend the existing pure function in place: build the full slug exactly as today, then if `max_length` is set, slice to `max_length` and `rstrip("-")` so a cut landing on (or creating) a trailing hyphen is cleaned. Simplest design that satisfies R1–R4; word-boundary truncation was considered and explicitly left out of scope in the spec. TDD: tests first (codebase already has a pervasive test suite).

## Files to Touch
- `tests/test_slugify.py` — four new tests, one per AC.
- `src/slugify.py` — add the `max_length` parameter + truncation.

## Steps
- [x] S1 — Add tests for AC1–AC4 to `tests/test_slugify.py` (covers: AC1, AC2, AC3, AC4) → verify: new tests fail (red) for the right reason, AC1 still green.
- [x] S2 — Add `max_length=None` param and slice+`rstrip("-")` to `src/slugify.py` (covers: R1, R2, R3, R4) → verify: full suite green (`python3 -m unittest discover -s tests`).

## Risks / Open Questions
- None significant — change is additive with a `None` default, so TASK-001 behavior (R4) is protected by the existing 5 tests.

## Change History
- 2026-06-12 00:25 +07: Created and approved.
