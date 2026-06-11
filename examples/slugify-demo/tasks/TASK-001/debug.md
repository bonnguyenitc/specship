---
task: TASK-001
title: slugify(text) utility
type: debug
created: 2026-06-11 17:00 +07
updated: 2026-06-11 17:05 +07
---

# Debug Log: TASK-001

## BUG1 — accents become hyphens instead of folding to ASCII
- status: fixed
- date: 2026-06-11 17:05 +07
- symptom: `slugify("Café Crème")` returns `"caf-cr-me"`, expected `"cafe-creme"` (test AC3 fails).
- reproduce: `python3 -m unittest tests.test_slugify.TestSlugify.test_ac3_accents`
- root cause: ordering. In `src/slugify.py` the `re.sub(r"[^a-z0-9]+", "-")` filter runs **before** the NFKD accent folding, so `é`/`è` are still non-ASCII at filter time and get replaced by hyphens. Folding afterwards has nothing left to fold.
- fix: move the NFKD normalize + combining-mark strip to the **top** of the function, before lowercasing and the regex filter, so accents are reduced to ASCII first.
- regression test: `tests/test_slugify.py::test_ac3_accents` (already covers it).
- related: R3, AC3, plan step S2. Matches the risk flagged in `plan.md`.
