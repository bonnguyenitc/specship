---
task: TASK-001
title: slugify(text) utility
type: spec
status: confirmed
created: 2026-06-11 16:40 +07
updated: 2026-06-11 16:40 +07
---

# Spec: slugify(text) utility

## Goal
Provide a `slugify(text)` function that turns any human string into a clean, URL-safe slug, so titles can be used in URLs and filenames.

## Requirements
- R1: Lowercase all letters.
- R2: Replace any run of non-alphanumeric characters (spaces, punctuation, symbols) with a single hyphen.
- R3: Fold accented/Unicode letters to their ASCII base (é → e, ñ → n).
- R4: No leading or trailing hyphens; no doubled hyphens.

## Acceptance Criteria
- [x] AC1: `slugify("Hello World")` == `"hello-world"`
- [x] AC2: `slugify("  Multiple   Spaces  ")` == `"multiple-spaces"`
- [x] AC3: `slugify("Café Crème")` == `"cafe-creme"`
- [x] AC4: `slugify("C++ & Rust!")` == `"c-rust"`
- [x] AC5: `slugify("")` == `""`

## Out of Scope
- Transliterating non-Latin scripts (Cyrillic, CJK) — only accent folding for Latin.
- Max-length truncation.

## Edge Cases
- Empty string and all-symbol input → empty slug.
- Leading/trailing whitespace and symbols.

## Open Questions
- (none — confirmed)

## Change History
- 2026-06-11 16:40 +07: Created and confirmed.
