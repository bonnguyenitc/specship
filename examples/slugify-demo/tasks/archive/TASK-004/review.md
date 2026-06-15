---
task: TASK-004
title: word-boundary truncation for slugify
type: review
status: approved
created: 2026-06-15 10:22 +07
updated: 2026-06-15 10:22 +07
---

# Review: word-boundary truncation for slugify

## Gate Results
- Tests: 17/17 pass (`python3 -m unittest discover -s tests -t .`) — 4 new + 13 prior regressions (5 TASK-001 + 4 TASK-002 + 4 TASK-003).
- Lint / format / type-check: n/a (no toolchain configured in this project, same as TASK-001–003).

## Acceptance Criteria
- [x] AC1 — verified (`word_boundary=True` drops the partial `brown`)
- [x] AC2 — verified (default `word_boundary=False` → unchanged hard cut)
- [x] AC3 — verified (oversized first word → hard-cut fallback, never empty)
- [x] AC4 — verified (word boundaries use the configured separator, not `-`)

## Findings
- Diff is surgical: the `word_boundary` param + `_truncate_on_word` helper from
  S2 and the `TestSlugifyWordBoundary` class from S1; no unrelated edits.
  `src/slugify.py:5`.
- The helper reuses the existing hard-cut expression as its fallback (R3), so
  there's no second definition of the truncation rule to drift.
- Note: this task spent ~2 days `paused` between S1 and S2 (see task.md Pipeline
  Log). Resume picked up at S2 with no rework — the red tests from S1 were still
  the only failures, confirming the on-disk state survived the gap.

## Commit / PR Draft
```
feat(slugify): opt-in word-boundary truncation

slugify(text, max_length=N, word_boundary=True) trims back to the last
whole word that fits instead of a hard character cut; falls back to a hard
cut when a single word exceeds max_length. Default False keeps TASK-002
behavior. Covers TASK-004 (R1-R4, AC1-AC4).
```

## Follow-ups
- Ellipsis / keyword-preserving truncation remain out of scope (per spec.md Out of Scope).

## Change History
- 2026-06-15 10:22 +07: Reviewed and approved.
