---
task: TASK-004
title: word-boundary truncation for slugify
type: spec
status: confirmed
created: 2026-06-13 09:00 +07
updated: 2026-06-13 09:05 +07
---

# Spec: word-boundary truncation for slugify

## Goal
Let callers opt into truncation that never cuts a word in half. Today
`max_length` (TASK-002) does a hard character cut, which can leave an ugly
partial word (`"the-quick-br"`). With `word_boundary=True`, the slug is trimmed
back to the last whole word that fits. Direct follow-up flagged in TASK-002 and
TASK-003 reviews ("word-boundary truncation if hard cuts prove too ugly").

## Requirements
- R1: `slugify(text, ..., word_boundary=False)` — optional bool, default `False`
  (hard-cut behavior of TASK-002 unchanged).
- R2: when `word_boundary=True` and `max_length` is set, the slug contains only
  whole words (separator-delimited tokens) and is at most `max_length` chars.
- R3: when a single leading word alone exceeds `max_length`, fall back to a hard
  cut (TASK-002 behavior) rather than returning an empty slug.
- R4: `word_boundary` composes with `separator` (TASK-003) — word boundaries are
  the configured separator, not a hardcoded `-`.

## Acceptance Criteria
- [x] AC1: `slugify("The Quick Brown Fox", max_length=12, word_boundary=True)` == `"the-quick"` (drops the partial `brown`)
- [x] AC2: `slugify("The Quick Brown Fox", max_length=12)` == `"the-quick-br"` (default hard cut — unchanged)
- [x] AC3: `slugify("Supercalifragilistic", max_length=8, word_boundary=True)` == `"supercal"` (oversized first word → hard-cut fallback, R3)
- [x] AC4: `slugify("The Quick Brown Fox", max_length=12, separator="_", word_boundary=True)` == `"the_quick"` (composes with separator, R4)

## Out of Scope
- Truncating with an ellipsis or "…" marker — slug stays purely alphanumeric + separator.
- Smart word ranking / keyword preservation — first-fit from the left is enough.

## Edge Cases
- First word longer than `max_length` → hard-cut fallback (AC3), never empty when input wasn't.
- `word_boundary=True` with `max_length=None` → no truncation at all (the flag is inert without a cap).

## Open Questions
- [x] Q1: when the first word alone exceeds `max_length`, return empty or hard-cut? →
  Resolved: **hard-cut fallback** (R3/AC3) — an oversized-but-present slug beats
  an empty one for URL/filename use.

## Change History
- 2026-06-13 09:00 +07: Created from TASK-002/TASK-003 review follow-up.
- 2026-06-13 09:05 +07: Q1 resolved (hard-cut fallback); confirmed.
