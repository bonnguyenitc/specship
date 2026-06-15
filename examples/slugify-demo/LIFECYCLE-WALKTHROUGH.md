# Lifecycle Walkthrough — pause → resume → archive on TASK-004

A simulated session showing the three **lifecycle skills** (`pause-task`,
`resume-task`, `archive-task`) in action — the counterpart to `WALKTHROUGH.md`,
which covers the pipeline stages. Where the pipeline skills *produce* artifacts,
the lifecycle skills only change a task's **status or location** and log why;
they never touch `stage` or `artifacts:`. The whole point: state lives on disk
in `tasks/TASK-004/`, so a task can be set aside and picked up across a multi-day
gap with zero rework.

The timestamps match the Pipeline Log in `tasks/archive/TASK-004/task.md`. (The
folder ends under `archive/` because the session finishes by archiving it — the
last step below.)

Legend: **U** = user, **A** = agent. Skill activity is marked `[skill]`.

---

## 0. Where the task already was (recap)

TASK-004 ("word-boundary truncation for slugify") had run the normal pipeline up
to the middle of `coding`: `spec: confirmed` → `plan: approved` → `coding` with
**S1 done** (tests written, red for the right reason) and **S2 not started**.
That's the live state when the user decides to step away.

```
spec ✓ ── plan ✓ ── coding ◑ (S1 ✓, S2 ░)   ← live, mid-stage
```

## 1. Setting it aside — `pause-task` (2026-06-13 09:25)

> **U:** Có hotfix gấp phải làm trước. Tạm dừng task này giúp tôi.
>
> `[pause-task]` locates the current task (most-recently-`updated:` under
> `tasks/TASK-*`) → TASK-004. Checks it's pausable (`status: active` ✓). It needs
> a reason and the user gave one, so it doesn't ask again.
>
> `[pause-task]` writes `task.md`: `status: paused` (leaving `stage: coding` and
> every `artifacts:` value **untouched**), bumps `updated:`, notes the pause in
> the **Now** block, and appends the Pipeline Log line:
> `- 2026-06-13 09:25 +07 paused: shelving to ship an unrelated hotfix...`.
>
> **A:** Đã pause **TASK-004** ở stage `coding` (S1 xong, S2 chưa). Lý do đã
> ghi lại. Khi nào quay lại chạy `/resume-task 004` là về đúng chỗ này. Nó sẽ
> không bị nhầm là task đang active nữa.

**Why `paused`, not `blocked`:** this was a *deliberate* choice to set the work
down, not the task getting stuck on an external dependency. `blocked` is what a
stage skill sets when it *can't* proceed; `paused` is the user choosing to.

## 2. Two days later — `resume-task` (2026-06-15 10:00)

A fresh session. The chat has none of the earlier context — everything has to be
rebuilt from disk.

> **U:** /resume-task 004
>
> `[resume-task]` normalizes `004` → folder `TASK-004`. Finds it in
> `tasks/TASK-004/` with `status: paused`.
>
> **Un-shelve first:** flips `status: paused → active`, bumps `updated:`, appends
> `- 2026-06-15 10:00 +07 resumed from pause`. `stage` and `artifacts:` are left
> exactly as they were.
>
> **Reconstruct state:** reads `task.md` (frontmatter, **Now**, Pipeline Log) +
> the artifacts. Cross-checks recorded state against disk: `plan.md` shows S1
> ticked / S2 open, and the suite still has exactly the S1 red tests failing —
> the on-disk state and the code agree, no repair needed.

**Status read (step 3 of the skill) — the agent reports before doing anything:**

> **A:**
> - **Task:** TASK-004 — word-boundary truncation. Stage `coding`, status `active` (just un-paused).
> - **Done:** spec confirmed, plan approved, S1 ✓ (tests red as designed).
> - **Blocking:** none — Q1 was resolved in the spec before the pause.
> - **Next:** resume `coding` at **S2** (implement `word_boundary` + helper).
>
> Tiếp tục với `coding` từ S2 chứ?
>
> **U:** Yes.
>
> `[resume-task]` invokes the `coding` skill via the Skill tool — it re-hydrates
> from `task.md` and picks up at S2. `resume-task` produces no artifact of its
> own; the stage skill owns the work from here.

**Handoff — `resume-task → coding`.** Payload: `task.md` + the resume point (S2).

## 3. Finishing the work — `coding` resumed, then `review` (10:15 → 10:22)

> `[coding]` implements `word_boundary` + `_truncate_on_word`, ticks **S2** in
> `plan.md`, full suite **17/17** green, sets `coding: done`, logs the line.
> Then the normal per-stage checkpoint:
>
> **A:** 2/2 steps done, suite green. Review lại để hoàn tất chứ?
>
> **U:** Yes.
>
> `[coding]` invokes `review` → gate 17/17, AC 4/4 ticked, `review: approved`,
> `stage: done`, `status: done`. (Same pipeline contract as the other tasks —
> see `WALKTHROUGH.md`.)

At this point TASK-004 is **done** and still sitting in the active set
(`tasks/TASK-004/`).

## 4. Clearing it off the active list — `archive-task` (10:30)

> **U:** Task này xong rồi, dọn nó khỏi danh sách active giúp tôi.
>
> `[archive-task]` locates TASK-004. It's `status: done`, so archiving is the
> right move (it confirms once — moving a folder is worth a beat).
>
> **Log before moving:** bumps `updated:`, appends
> `- 2026-06-15 10:30 +07 archived: done, off the active list...`. `stage` and
> `artifacts:` untouched — archiving changes *location*, not pipeline state.
>
> **Move:** `tasks/TASK-004/` → `tasks/archive/TASK-004/`, whole folder intact
> (spec/plan/review/task all come along). No `git mv`/commit unless asked.
>
> **A:** Đã archive **TASK-004** → `tasks/archive/TASK-004/`. Không còn xuất hiện
> trong scan "current task"; không xóa gì cả. Cần lại thì `/resume-task 004` sẽ
> kéo nó ra khỏi archive.

**`pause` vs `archive`:** pause keeps the folder *in place* and only flips status
(for work you'll return to soon); archive *moves* the folder out (for finished or
abandoned work). Both are reversible by `resume-task`, and both leave the
pipeline state frozen exactly as-is.

---

## The lifecycle at a glance

```
                pause-task                 resume-task                    archive-task
coding ◑  ───set aside (status)──▶  paused  ───un-shelve + report──▶  coding ▶ review ▶ done  ───move folder──▶  archive/
(S1✓ S2░)                          (frozen)        (resume @ S2)         (S2✓, 17/17, AC 4/4)                  tasks/archive/TASK-004/
   │                                                    ▲                                                            │
   └──────────── stage & artifacts: never touched by any of the three ───────────────────────────────────────────┘
                                                        │
                                  /resume-task 004 also restores from archive/ (reverse of the last arrow)
```

Every transition above changed only a **status** (`pause`/`resume`) or a
**location** (`archive`/`restore`) plus a dated log line — never the `stage` or
the artifacts. That separation is what let the task survive a two-day gap *and* a
fresh session with no chat context and resume at S2 with zero rework: the
pipeline state is on disk, and the lifecycle skills are careful never to disturb
it.
