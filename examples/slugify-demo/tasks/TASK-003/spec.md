---
task: TASK-003
title: custom separator for slugify
type: spec
status: confirmed
created: 2026-06-12 08:31 +07
updated: 2026-06-12 08:31 +07
---

# Spec: custom separator for slugify

## Goal
Let callers choose the join/strip character instead of the hardcoded `-`
(e.g. `_`), for contexts where hyphens aren't the right fit (Python
identifiers, env-var-style keys, etc.).

## Requirements
- R1: `slugify(text, separator=...)` accepts an optional `separator`
  parameter; default is `"-"` (current behavior unchanged).
- R2: runs of non-alphanumeric characters are collapsed to a single instance
  of `separator`.
- R3: leading/trailing `separator` characters are stripped from the result.
- R4: `max_length` truncation (TASK-002) strips trailing `separator`
  characters after truncating, using the configured separator (not a
  hardcoded `-`).

## Acceptance Criteria
- [x] AC1: `slugify("Hello World", separator="_")` == `"hello_world"`
- [x] AC2: `slugify("  Multiple   Spaces  ", separator="_")` == `"multiple_spaces"`
- [x] AC3: `slugify("The Quick Brown Fox", max_length=9, separator="_")` == `"the_quick"` (no trailing `_`)
- [x] AC4: default behavior unchanged: `slugify("Hello World")` == `"hello-world"`

## Out of Scope
- Multi-character separators (e.g. `"--"`) — `separator` is a single
  character, matching the current `-` semantics.
- `allow_unicode` / preserving non-ASCII letters — separate feature.

## Edge Cases
- Empty string input with a custom separator → still `""`.
- `separator` used as `re.sub` replacement and as `str.strip()`/`str.rstrip()`
  argument — both treat a single ordinary punctuation character safely; no
  regex-pattern escaping needed since `separator` never appears in the
  *pattern*, only in the replacement/strip sets.

## Open Questions
- [x] Q1: should `separator` be validated as exactly one character? →
  Assumption (non-blocker): no explicit validation — multi-character or
  unusual separators (e.g. backslash) are out of scope/undefined behavior,
  consistent with "no error handling for impossible scenarios".

## Change History
- 2026-06-12 08:31 +07: Created.
