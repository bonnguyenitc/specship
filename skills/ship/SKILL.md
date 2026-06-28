---
name: ship
description: Take a feature request from idea to reviewed, ready-to-commit code in one run — spec → plan → coding → review (+ debug on defects) — without asking at each stage. Use when given a request like "/ship implement login", "ship this feature", "do the whole flow for X", "làm hết flow cho chức năng X". Orchestrator over the stage skills; never runs explore-source.
---

# Ship

Goal: given a feature request (e.g. `/ship thực hiện chức năng login`), drive the task through the **whole pipeline** in a single run — **spec → plan → coding → review**, attaching `debug` whenever a defect appears — stopping only when genuinely blocked.

`ship` is an **orchestrator, not a stage**: it doesn't replace the stage skills, it invokes them in order and carries the user's consent across the handoffs where each stage would normally stop and ask. Invoking `ship` *is* that consent, granted once for the whole task.

## When to use
- The user hands you a feature request, ticket, or PRD — anything the `spec` skill could consume — and wants it taken all the way to reviewed code.
- Also works mid-pipeline: if the task already has artifacts (a confirmed `spec.md`, an approved `plan.md`), start from the first incomplete stage instead of redoing finished ones.
- Not for codebase exploration: this skill never runs `explore-source`. If `docs/onboarding/*` is missing and the codebase is unfamiliar, tell the user to run it first rather than shipping blind.

## Shared task state
Part of the task pipeline — see `../WORKFLOW.md` for the full contract. Every rule there (artifacts, IDs, preconditions, traces, lessons) applies unchanged; the only thing `ship` overrides is the per-handoff "ask the user" step.
- **Hydrate:** if the request matches an existing task (explicit `TASK-<ID>`, or one in conversation), resume it from its current stage; otherwise the `spec` stage will open a new task. If that named task is shelved (`status: paused`, or found under `tasks/archive/`), un-shelve it first exactly as `resume-task` does (restore the folder and/or flip `paused`→`active`, with the dated log trace) before advancing. Read `tasks/LESSONS.md` if present.
- **Checkpoint:** each stage skill does its own checkpointing. Additionally, log every auto-advance as a dated Pipeline Log line in `task.md`, e.g. `- <YYYY-MM-DD HH:MM +TZ> ship: auto-advanced spec → plan`.

## Method — run the stages
Invoke each stage skill via the Skill tool, in order, starting from the first incomplete stage. Follow its playbook fully — artifacts, templates, gates, traces — **except its "ask the user" points, which `ship` overrides as follows:**

1. **`spec`** — formalize the request into `tasks/TASK-<ID>/spec.md` (opens the task). Resolve what the request and the codebase answer; anything underspecified but non-blocking becomes a stated assumption (a non-blocker `Q#`). Set `status: confirmed` and continue. An open **blocker** `Q#` is a hard stop — blocker questions are the one thing autopilot never answers itself. **Verifiability gate (replaces the skipped human confirmation):** before auto-advancing, every `AC#` must carry a concrete `verify:` check (per the `spec` skill). Autopilot has no human sign-off to lean on here, so this objective check stands in for it — if any `AC#` has no runnable verify, that's a hard stop, not an auto-advance.
2. **`plan`** — produce `plan.md` as the skill specifies. Approval is delegated: set `status: approved` directly (don't use EnterPlanMode) and log it. If planning surfaces something that changes the spec's scope, that's a hard stop, not a silent re-plan. **Verifiability gate:** before auto-advancing to `coding`, every `S#` must list at least one `covers:` ID **and an executable `verify:`** (a runnable command/test, not prose). A step whose check can't be run is a hard stop — autopilot won't hand the coding loop a blurry target.
3. **`coding`** — don't ask TDD vs conventional: apply the skill's own default (whatever the codebase already does). Implement every `S#`, verify, tick.
4. **`debug`** — on a non-obvious failure at any point, invoke `debug`, fix to root cause, then resume the interrupted stage directly — no "resume?" question.
5. **`review`** — full gate + `AC#` verification.
   - `approved` → done.
   - `changes-requested` → loop back to `coding` (or `debug` for a defect) automatically with the Findings as input, then re-run `review`. **Cap: 2 loop-backs.** A third `changes-requested` is a hard stop.

## Hard stops — hand back to the user
Stop, checkpoint, and report (never push through) when:
- A **blocker `Q#`** is open, or a stage reveals the spec's scope is wrong.
- The **verifiability gate fails**: an `AC#` with no runnable `verify:`, or an `S#` with no executable `verify:` — autopilot can't self-confirm an unverifiable criterion, so it hands back instead of advancing blind.
- The next action is **destructive or hard to reverse**: data/schema migrations on real data, deleting things the task didn't create, anything outward-facing.
- The **review loop cap** is hit, or a gate can't be made green.
- As always: **never run `git add` / `commit` / `push`** — `review.md` carries the drafted commit/PR message for the user.

On a hard stop, make sure `task.md` reflects the true stage/status and the Pipeline Log says why autopilot stopped — any stage skill can then resume manually from that state.

## When done
One final report covering the whole run: stages executed, key assumptions made in the spec, `AC#` verification results, gate results, files changed, bugs hit (`BUG#`), deviations from the plan, the drafted commit message from `review.md`, and follow-ups. The task is `done` only when `review` says `approved`.
