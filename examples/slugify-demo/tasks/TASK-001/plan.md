---
task: TASK-001
title: slugify(text) utility
type: plan
status: approved
created: 2026-06-11 16:52 +07
updated: 2026-06-11 16:52 +07
---

# Plan: slugify(text) utility

## Approach
Single pure function in `src/slugify.py`, standard library only (`re` + `unicodedata`) — no dependency needed. Order matters: fold Unicode → lowercase → replace non-alphanumeric runs with hyphen → strip edge hyphens. Tests in `tests/test_slugify.py` using stdlib `unittest`.

## Files to Touch
- `src/slugify.py` — the `slugify` function.
- `tests/test_slugify.py` — acceptance tests, one per AC.

## Steps
- [x] S1 — Implement core: lowercase + replace `[^a-z0-9]+` with `-` + strip edges (covers: R1, R2, R4, AC1, AC2, AC4, AC5) → verify: tests AC1/AC2/AC4/AC5 pass.
- [x] S2 — Add Unicode accent folding via `unicodedata.normalize("NFKD")` + drop combining marks, before lowercasing (covers: R3, AC3) → verify: test AC3 passes. (BUG1 hit here — ordering; see debug.md.)
- [x] S3 — Write `tests/test_slugify.py` covering AC1–AC5 → verify: `python3 -m unittest` green.

## Risks / Open Questions
- NFKD ordering vs. the regex: folding must happen before the alphanumeric filter, else accented letters get stripped to hyphens. (This is exactly where a bug could slip in.)

## Change History
- 2026-06-11 16:52 +07: Created and approved.
