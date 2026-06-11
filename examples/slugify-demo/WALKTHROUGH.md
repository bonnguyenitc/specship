# Walkthrough — how the handoffs played out for TASK-001

A simulated session transcript for `tasks/TASK-001/` showing the **handoff
contract** from `skills/WORKFLOW.md` in action: no skill ends silently — each
one finishes its artifact, asks the user, and (on a yes) invokes the next skill
directly. The timestamps match the real Pipeline Log in `tasks/TASK-001/task.md`.

Legend: **U** = user, **A** = agent. Skill activity is marked `[skill]`.

---

## 1. Opening the task — `spec` (16:40)

> **U:** I need a `slugify(text)` utility — lowercase, hyphens, strip accents.
>
> `[spec]` hydrates: no `tasks/TASK-*` exists yet → new `TASK-001`.
> `docs/onboarding/*` is missing, so per the contract it offers the upstream skill first:
>
> **A:** There are no onboarding docs and I haven't read this codebase. Want me
> to run `explore-source` first? It writes `docs/onboarding/*`, which every
> later stage reads as the convention reference.
>
> **U:** No need — the repo is two files, just read it inline.
>
> `[spec]` writes `task.md` + `spec.md` (R1–R4, AC1–AC5), resolves the open
> questions, sets `spec: confirmed`, logs the Pipeline line.

**Handoff #1 — `spec → plan`.** Payload: `spec.md`.

> **A:** Spec is confirmed — 4 requirements, 5 acceptance criteria. Bạn có muốn
> tôi lên plan triển khai không?
>
> **U:** Yes.
>
> `[spec]` invokes the `plan` skill via the Skill tool — the user doesn't ask again.

## 2. Designing — `plan` (16:52)

> `[plan]` hydrates: reads `task.md`, verifies the precondition
> (`spec.md` exists, `status: confirmed`, no blocker Q#), reads `spec.md`.
> Writes `plan.md` — S1–S3, each step `covers:` an R#/AC# from the spec.
> Note: S2's risk line predicts exactly what later becomes BUG1.
>
> **A:** Plan has 3 steps, each traceable to a requirement. *(presents summary)*
>
> **U:** Approved.
>
> `[plan]` sets `plan: approved`, logs the Pipeline line.

**Handoff #2 — `plan → coding`.** Payload: `plan.md` (S# → covers R#/AC#).

> **A:** Bạn có muốn tôi code theo plan này luôn không?
>
> **U:** Yes — TDD.
>
> `[plan]` invokes the `coding` skill.

## 3. Implementing — `coding`, interrupted by a defect (17:00)

> `[coding]` hydrates: reads `task.md`, `plan.md`, `spec.md`. Loops per step:
> red → green → refactor, ticking `S#` in `plan.md` as checks pass.
> S1 ✓. At **S2** the accent test fails non-obviously (NFKD ordering).

**Handoff #3 — `coding → debug` (interrupt).** Payload: the failing repro.

> **A:** S2's verify fails and the cause isn't obvious — switching to `debug`
> to find the root cause; it will record the investigation in the task.
>
> `[debug]` attaches to TASK-001 (the bug is in code this task touched).
> Reproduces with a failing test, locates the root cause (strip-before-NFKD
> ordering), applies the minimal fix, full suite green. Appends **BUG1** to
> `debug.md` (root cause, fix, regression test, `related: S2/AC3`), sets
> `debug: clear`, logs the Pipeline line (17:05).

**Handoff #4 — `debug →` resume the interrupted stage.** Payload: BUG1 entry + regression test.

> **A:** Bug đã fix xong — root cause là thứ tự strip/NFKD, regression test đã
> thêm. Bạn có muốn tôi tiếp tục coding không?
>
> **U:** Yes.
>
> `[debug]` invokes the `coding` skill — it re-hydrates from `task.md` and
> picks up at S2.

## 4. Finishing the implementation — `coding` resumed (17:08)

> `[coding]` finishes S2 (now green thanks to the fix), then S3.
> All 3/3 steps ticked in `plan.md`, sets `coding: done`, logs the Pipeline line.

**Handoff #5 — `coding → review`.** Payload: the code + ticked S# in `plan.md`.

> **A:** 3/3 steps done, suite green. Bạn có muốn tôi review lại và hoàn tất không?
>
> **U:** Yes.
>
> `[coding]` invokes the `review` skill.

## 5. Wrapping up — `review` (17:12)

> `[review]` hydrates: verifies the precondition (all S# ticked), reads
> `spec.md`, `plan.md`, and the diff. Self-reviews, runs the full gate
> (tests/lint), walks AC1–AC5 ticking each in `spec.md`, writes `review.md`
> with the gate results and a drafted commit message. Sets `review: approved`,
> `stage: done`, `status: done`, logs the Pipeline line.

**Final handoff — `review (approved) → done`.** Payload: the commit/PR draft in `review.md`.

> **A:** Review approved — 5/5 AC verified, gate green. Here's the drafted
> commit message from `review.md`; you run git yourself.

---

## The chain at a glance

```
spec ──spec.md──▶ plan ──plan.md──▶ coding ──repro──▶ debug
 ▲                                     ▲                │
 │ (offered explore-source first;      └──BUG1 + test───┘
 │  user declined — tiny repo)
 │
coding ──code + ticked S#──▶ review ──commit draft──▶ user
```

Every arrow above was an explicit ask-then-invoke handoff, and every payload is
a file in `tasks/TASK-001/` — the artifacts, not the conversation, carry the
state between skills. That's why the pipeline survives a fresh session: any
skill can re-hydrate from `task.md` and continue.
