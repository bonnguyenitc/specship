---
description: Run tests, commit current work, push, and open a PR
---

Commit the current changes, push, and open a pull request.

Pre-computed context:
- Branch: !`git branch --show-current`
- Status: !`git status --short`
- Diff: !`git diff --stat HEAD`

Steps:
1. Run `npm test`. If it fails, stop and report — do not commit broken code.
2. If on `main`, create a descriptive branch first (kebab-case, e.g.
   `fix-merge-idempotency`).
3. Stage and commit with a conventional message (`feat:`, `fix:`, `refactor:`,
   `docs:`, `test:`) describing the why, not just the what.
4. Push with `git push -u origin <branch>`.
5. Open a PR with `gh pr create` — concise summary plus a test plan listing the
   verification you actually ran.
