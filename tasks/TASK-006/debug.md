---
task: TASK-006
title: External phase orchestration for Codex and Claude Code
type: debug
created: 2026-07-17 11:45 +07
updated: 2026-07-17 11:45 +07
---

# Debug Log: TASK-006

All six bugs were found by the TASK-006 review (see `review.md`) and were already
reproduced against the shipped code before any fix. Each was fixed root-cause
first, and each original reproduction was re-run afterwards to prove it is gone —
the regression tests are the formal version of those repros, not a substitute.

A shared theme, worth stating once: **all six survived a green 60-test gate.** The
fixtures asserted that each flow could be *entered* and that malformed input was
rejected, but never that a flow *completes*, and they described tasks that could
not exist on disk. A suite built that way certifies the shape of the code against
itself. That observation is recorded as `L2`/`L3` in `tasks/LESSONS.md`.

## BUG1 — a review loop-back never closes, so no task can ever reach done
- status: fixed
- date: 2026-07-17 11:45 +07
- symptom: once `review: changes-requested` is set, the gate only ever yields `coding` or `debug`. There is no reachable path back to `review`, hence none to `review: approved` → `done`. `inspect` returns `next_phase: null`, `valid: false`, `issues: ["review is changes-requested but next_phase does not classify \`coding\` or \`debug\`"]`; `check --phase review` exits 1. Every phase is refused — the task is unrunnable.
- reproduce: a task with `coding: done`, `review: changes-requested`, `next_phase: review` → `specship inspect --json`. Probed the whole state space: `next_phase: coding` keeps returning `coding` forever; omitting it fails closed; only resetting `review` to `missing` escapes, which no skill describes and which would erase the verdict.
- root cause: `computeNextPhase` (`src/pipeline.js:185-190`) short-circuits on `review === 'changes-requested'` *before* the coding/review gates and accepts only `coding`/`debug` as the classifier. The state model had a way into the loop-back and no way out. This also made the text shipped in the same change false: `debug/SKILL.md` instructs *"set `next_phase:` back to that phase [`coding` or `review`]"* — the exact value the gate rejected — and the `WORKFLOW.md` gate table promised *"debug `clear` → back to `resume_phase`"*.
- fix: `src/pipeline.js` — the classifier also accepts `review`, which is what closes the loop: whoever addresses the findings sets `next_phase: review` at its checkpoint. Guarded so an unlanded fix cannot re-review (`coding` must be `done`), and the unclassified-issue text now names all three targets. Contract text updated to match, since half the defect lived there: `skills/WORKFLOW.md` (the loop-out rule + the defect variant), `skills/review/SKILL.md` (re-review updates `review.md` in place), `skills/coding/SKILL.md` (addressing findings hands back to `review`, not to itself).
- regression test: `test/pipeline.test.js` → "a review loop-back closes: the classifier also names the way back to review" and "the full review → debug → review loop reaches done" — the latter walks review → debug → clear → review → approved → gate `null`, i.e. it asserts the loop *terminates*. The pre-existing "review changes-requested must classify coding or debug" only ever asserted entry.
- related: R5, R6, AC2. Blocks App Builder `TASK-049` R20/AC16 ("return to the interrupted phase"). `resume_phase` is now provably decorative — the gate never reads it (it must be cleared exactly when `debug` clears); see review.md → Follow-ups.

## BUG2 — a comment inside `artifacts:` silently voids the whole map
- status: fixed
- date: 2026-07-17 11:45 +07
- symptom: a `# comment` or blank line inside the `artifacts:` block drops every entry. A `stage: done` task then reads as `{spec: missing, …}`, `next_phase: "spec"`, `valid: true`, `issues: []`, and `check --phase spec` exits **0** — the orchestrator re-runs spec over finished work. Fails **open**, which R3's fail-closed rule forbids.
- reproduce: `artifacts:` followed by `  # current states` then the five entries → `specship inspect --json` on a task with `stage: done`.
- root cause: `parseFrontmatter` (`src/pipeline.js:47-57`) opened the nested map only if the *immediately* next line matched an indented `key:`. A comment in between left `nest = null`, after which every indented line matched neither branch and hit `continue`. `artifacts` then held `''`, and `loadTask`'s `typeof !== 'object'` guard turned that into `{}` — all defaults, no diagnostic. The parser's own docblock advertises `# comments`.
- fix: `src/pipeline.js` — blank/comment lines are skipped without closing an open map, and the "does a map follow?" lookahead scans past them. Second half of the same fail-open path: a present-but-scalar `artifacts:` is now an issue rather than reading as an empty map. Also stripped a leading BOM, which made the opening fence unrecognisable (same function, same "unparseable input reads as absent input" class).
- regression test: `test/pipeline.test.js` → "comments and blank lines inside a nested map do not void it" (asserts the finished task still gates to `null`, not `spec`), "an artifacts map that is not a map fails closed".
- related: R3, R9, AC2, AC3.

## BUG3 — `check --phase` without a task id exits 0
- status: fixed
- date: 2026-07-17 11:45 +07
- symptom: `specship check --phase review --actor codex --expect-revision 99 --json` in a contract-clean project prints human text and exits **0** — the documented "gate is valid, run the phase" signal — while `--phase`, `--actor` and `--expect-revision 99` are silently discarded. An orchestrator that loses the id gets a green light for an arbitrary phase.
- reproduce: any project with no contract violations; run the command above.
- root cause: `cmdCheck` (`src/cli.js:274`) routed to the phase gate on `opts.positional.length` alone, so a missing/mistyped id fell through to the repo-wide CI gate — a different command with an incompatible meaning for exit 0.
- fix: `src/cli.js` — any task-scoped option (`--phase`/`--actor`/`--expect-revision`) selects the phase gate, and it refuses a missing id with exit 2 and JSON. This also makes `WORKFLOW.md`'s *"`specship check --actor <them>` exits 2"* true; it previously exited 0.
- regression test: `test/cli.test.js` → "a phase check without a task id refuses instead of falling through to the CI gate" — asserts exit 2, asserts the CI-gate text is *absent* (so the fall-through cannot silently return), and covers the documented `--actor` claim.
- related: R8, AC4. Behavior change for `check <stray-word>`: exit 1 → 2 (release note).

## BUG4 — the phase gate never enforced the preconditions the contract promises
- status: fixed
- date: 2026-07-17 11:45 +07
- symptom: a `task.md` claiming `spec: confirmed / plan: approved / coding: done` with **no `spec.md` or `plan.md` on disk** passes the gate: `check TASK-002 --phase review --expect-revision 5` → `ok: true`, exit 0. Global `check` on the same task reports two violations. The two validators disagree, and the one the orchestrator is told to trust is the permissive one.
- reproduce: a task folder containing only `task.md` with that map; compare `check TASK-002 --phase review` against `check`.
- root cause: `checkPhase` (`src/pipeline.js:285-313`) derives everything from `loadTask`, which reads the `artifacts:` map and never touches the artifact files; the precondition checks lived only in `check()`. `WORKFLOW.md` nonetheless states *"confirm … the preconditions in 'Flow integrity' hold … **One command does all of it**"*. The fixtures hid it: every test wrote a map without the files it named, so no test could tell the difference.
- fix: `src/pipeline.js` — new `backingIssues()`, called from `loadTask`: an artifact the map declares must exist; `spec.md`/`plan.md`/`review.md` must carry the status the map claims (their vocabularies already match 1:1); and `coding: done` requires every `S#` in `plan.md` ticked — the Flow-integrity precondition for `review`. Both test helpers (`filesFor`) now write the files a fixture's map implies, so fixtures describe tasks that could actually exist.
- regression test: `test/pipeline.test.js` → "an artifact the map declares must exist on disk and agree with it" (absent file, disagreeing status, unticked `S#`).
- related: R3, R9, AC1 (which explicitly requires "missing preconditions" coverage), AC4.

## BUG5 — a legacy v1 task that already shipped gates back to `spec`
- status: fixed
- date: 2026-07-17 11:45 +07
- symptom: a v1 task with `stage: done, status: done` and no `artifacts:` map → `next_phase: "spec"`, `valid: true`, `issues: []`, `check --phase spec --actor codex` exits **0**. The orchestrator re-runs spec over shipped work. Named verbatim in the spec's Edge Cases: *"A legacy task lacks `artifacts` … or is already done."*
- reproduce: `tasks/TASK-009/task.md` with v1 frontmatter and `stage: done` → `specship inspect --json`.
- ruled out: **refusing every `schema < 2` task from orchestration** (exit 2). Implemented first, then reverted: R9 requires *"the first successful external checkpoint upgrades it in place"*, which that fix makes unreachable — no external phase could ever run, so no checkpoint could ever upgrade anything. Rejecting it exposed the real invariant below, which satisfies both halves of R9 instead of trading one for the other.
- root cause: `computeNextPhase` reads only `artifacts`, and a v1 task has no map, so it defaults to all-`missing` — "nothing has been done yet". That default is a *read* convenience being consumed as *fact*, with nothing reconciling it against the task's own `stage`.
- fix: `src/pipeline.js` — the gate may run *ahead* of `stage` (a stage checkpoints before the next starts) and a loop-back/open bug may send it backwards on purpose, but otherwise a gate *behind* `stage` is a contradiction and fails closed. A shipped v1 task (`stage: done`, gate `spec`) is refused; a v1 task still at `stage: spec` stays consistent, so it remains orchestrable and its first checkpoint upgrades it — R9 whole. `skills/WORKFLOW.md` documents both.
- regression test: `test/pipeline.test.js` → "a legacy v1 task that already shipped does not gate back to spec", which also asserts the un-started v1 task stays valid and orchestrable (the R9 upgrade path). The `gates advance deterministically` fixtures now name a `stage` per case — several previously declared `stage: coding` with a `draft` spec, states no checkpoint could produce.
- related: R5, R9, AC2. Spec Edge Case "a legacy task … is already done".

## BUG6 — a corrupt install profile silently downgrades an orchestrated project and deletes the evidence
- status: fixed
- date: 2026-07-17 11:45 +07
- symptom: with `.specship/install.json` corrupt, `specship update` re-pins the Claude stage skills from `model: inherit` back to `model: sonnet`, **deletes the manifest**, prints no warning, exits 0 — and `doctor` then reports *"[profile: interactive] All installed agents are healthy."* Every subsequent orchestrated phase runs with a pinned model that overrides the launcher's explicit choice. Named in the spec's Edge Cases: *"An orchestrated Claude install is updated after the user chose an explicit model in App Builder."*
- reproduce: `init --claude --profile orchestrated` → `echo '{ this is not json' > .specship/install.json` → `update` → inspect line 3 of `.claude/skills/coding/SKILL.md` and the manifest.
- root cause: `readProfile` (`src/install-profile.js:21-28`) caught *everything* and returned `interactive`, so it could not distinguish "absent" (default is correct) from "present but unreadable" (must refuse). `install()` fed that inferred default straight back to `writeProfile`, which unlinks the manifest whenever the profile is the default — so guessing both applied the wrong profile and destroyed the record that another had been chosen. Exactly what the module's own header comment claimed to prevent.
- fix: `src/install-profile.js` — `readProfile` returns `{ profile }` or `{ error }`: absent → default; unreadable, invalid JSON, or an unknown profile name (e.g. written by a newer specship) → an error naming the file. `install`/`update`/`doctor` stop on it, so nothing is rewritten and the manifest survives to be repaired. `doctorTarget`'s default parameter no longer resolves the profile itself — the caller owns that refusal, since auditing against a guessed profile flags every correctly-generated skill as drift.
- regression test: `test/cli.test.js` → "an unreadable install profile refuses rather than silently resetting to interactive" — corrupt manifest and unknown-profile manifest both refuse, the skills stay `inherit`, the manifest survives, and repairing it restores normal operation.
- related: R10, AC5. Breaks App Builder `TASK-049` R18/R22 ("never silently substitutes another model"). Not fixed here: a manifest whose `version` is newer but whose `profile` is known is still accepted — correct today, and a version-compat policy is a spec decision rather than a bug.

## BUG7 — the BUG2 fix made every task-reading command hang forever on an unterminated fence
- status: fixed
- date: 2026-07-17 13:52 +07
- symptom: `check`, `inspect`, `tasks` and `check --phase` all spin forever — no output, no exit — on a `task.md` whose frontmatter opens with `---` and never closes. **A regression introduced by the BUG2 fix**, found by an independent reviewer of that fix, not by me: the pre-fix code returned `null` and `check` reported `task.md frontmatter missing or unterminated` with exit 1.
- reproduce: `printf -- '---\ntask: TASK-001\nstage: spec\n' > tasks/TASK-001/task.md`, then any of the four commands. Confirmed against `git stash` that the same input exits 1 on the pre-fix tree.
- root cause: `noise(undefined)` returned `true` — I wrote "past the end of the array" as a kind of noise. The map-open lookahead `while (noise(lines[next])) next++` then had no terminator: once `next` passed the end, every read was `undefined` → noise → `true`, forever. Worse, that lookahead ran *unconditionally*, before the `clean(m[2]) === ''` short-circuit, so it fired on every ordinary `key: value` line rather than only on map-openers.
- fix: `src/pipeline.js` — `noise` returns `false` for `undefined`: the end of the file is the end, not noise. The `continue` guard only ever passes in-bounds lines and the lookahead already falls back to `lines[next] || ''`, so nothing else moves.
- regression test: `test/cli.test.js` → "an unterminated frontmatter fence is reported, not hung on" — drives all four commands through `execFileSync` with a `timeout`, so a reintroduced loop fails the test in seconds instead of wedging the suite, and asserts the violation is actually reported.
- related: R9, AC3. This is precisely the crash the contract calls recoverable — *"a crash after the artifact but before `task.md` leaves the task simply not-yet-advanced (safe to retry)"* — so the half-written file it anticipates was the one input that could take down CI and any orchestrator polling the gate. `L5`.

## BUG8 — the BUG4 backing check passed any artifact that declared no status at all
- status: fixed
- date: 2026-07-17 13:52 +07
- symptom: a `task.md` claiming `artifacts.spec: confirmed` alongside a `spec.md` containing only prose (no frontmatter) passes the phase gate — `ok: true`, exit 0 — while the CI gate on the same task reports `spec.md frontmatter missing or unterminated`, exit 1. With frontmatter but no `status:` key, *both* gates pass. Found by the same independent review.
- reproduce: `spec.md` = `just some prose, no frontmatter at all`; `check TASK-001 --phase plan --json` vs `check`.
- root cause: the guard read `a.fm && a.fm.status && a.fm.status !== artifacts[name]` — only a *present, differing* status was caught, so "nothing to compare" silently meant "agrees". The likeliest malformed artifact was the one case the check waved through, which reopened exactly the two-validators-disagree split BUG4 existed to close.
- fix: `src/pipeline.js` — an artifact whose file declares no status fails: the contract requires the file to *carry* the status the map claims, and absence is not agreement.
- regression test: `test/cli.test.js` → "an artifact file that declares no status does not satisfy the map" (no frontmatter, and frontmatter without `status:`).
- related: R3, R9, AC1, AC4. Same root cause family as BUG4.

## Sweep — same class, checked
The root cause behind BUG1/BUG3/BUG4 is one pattern: **skill text and code asserting different things, each reviewed on its own**. Swept every external-contract claim in `skills/WORKFLOW.md` against the CLI:
- *"One command does all of it"* (preconditions) → was false → BUG4.
- *"`specship check --actor <them>` exits 2"* → was exit 0 → fixed by BUG3.
- *"debug `clear` → back to `resume_phase`"* → was rejected by the gate → BUG1.
- *"the first external checkpoint upgrades it in place"* → would have been made unreachable by the first BUG5 fix → reverted.
- exit codes 0/1/2, `inspect` read-only, one-phase-only, `ship`/`resume-task` excluded → verified true, now covered by "a fresh Codex/Claude install resolves the external contract end-to-end".
