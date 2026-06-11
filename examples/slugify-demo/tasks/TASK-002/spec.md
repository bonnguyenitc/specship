---
task: TASK-002
title: max_length truncation for slugify
type: spec
status: confirmed
created: 2026-06-12 00:25 +07
updated: 2026-06-12 00:27 +07
---

# Spec: max_length truncation for slugify

## Goal
Let callers cap the slug length (e.g. for URL or filename limits) via an optional `max_length` parameter, without breaking existing callers. Deferred follow-up from TASK-001.

## Requirements
- R1: `slugify(text, max_length=None)` — optional int parameter, default `None`.
- R2: When `max_length` is set, the returned slug is at most `max_length` characters.
- R3: A truncated slug never ends with a hyphen.
- R4: When `max_length` is `None`, behavior is identical to today (TASK-001 contract).

## Acceptance Criteria
- [x] AC1: `slugify("Hello World")` == `"hello-world"` (no `max_length` — unchanged)
- [x] AC2: `slugify("The Quick Brown Fox", max_length=9)` == `"the-quick"`
- [x] AC3: `slugify("Hello World", max_length=6)` == `"hello"` (cut lands on a hyphen — stripped)
- [x] AC4: `slugify("Café", max_length=10)` == `"cafe"` (shorter than the cap — unchanged)

## Out of Scope
- Word-boundary truncation (never cutting mid-word) — hard cut + hyphen strip is enough for now.
- Validating `max_length` (negative/zero) — caller's responsibility.

## Edge Cases
- Cut position landing exactly on a hyphen → strip it (AC3).
- Slug already shorter than `max_length` → returned untouched (AC4).

## Open Questions
- (none — confirmed)

## Change History
- 2026-06-12 00:25 +07: Created from TASK-001 review follow-up; confirmed.
