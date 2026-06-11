# Lessons — process mistakes and the rules that prevent them

- L1 — 2026-06-12 00:22 +07 [TASK-001, review] mistake: `task.md` frontmatter `artifacts:` listed filenames with the status in a comment, breaking machine-readability → rule: artifact values carry the status itself (`spec: confirmed`), filenames are fixed by the layout.
- L2 — 2026-06-12 00:22 +07 [TASK-001, coding/review] mistake: ticking `S#`/`AC#` checkboxes without bumping the file's `updated:`, so timestamps no longer ordered the changes → rule: every checkbox tick bumps `updated:` (no Change History line — the Pipeline Log records progress).
- L3 — 2026-06-12 00:22 +07 [TASK-001, debug] mistake: `debug.md` was created without a `created:` field → rule: every artifact carries both `created:` and `updated:` from the moment it's written.
