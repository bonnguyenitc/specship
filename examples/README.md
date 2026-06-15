# Example: slugify-demo

A complete worked task that ran the full **spec → plan → coding → review** pipeline
(with a real bug caught and fixed via `debug`), kept here as a reference for what
the generated artifacts look like in practice. It also includes a second
walkthrough covering the **lifecycle skills** (`pause-task` / `resume-task` /
`archive-task`) on TASK-004. It is **not** installed by `specship init`.

## What to read

```
slugify-demo/
├── WALKTHROUGH.md            # simulated transcript of TASK-001 — every skill→skill handoff, step by step
├── LIFECYCLE-WALKTHROUGH.md  # simulated transcript of TASK-004 — pause → resume → archive
├── tasks/TASK-001/
│   ├── task.md      # shared state — the full pipeline log (spec→plan→debug→coding→review)
│   ├── spec.md      # R1–R4 requirements, AC1–AC5 acceptance criteria (all ticked)
│   ├── plan.md      # S1–S3 steps, each `covers:` an R#/AC#
│   ├── debug.md     # BUG1: accent ordering — root cause + fix, references S2/AC3
│   └── review.md    # gate results, AC verification, commit draft
├── tasks/TASK-002/, tasks/TASK-003/   # follow-up features (max_length, custom separator)
├── tasks/archive/TASK-004/   # word-boundary truncation — paused mid-coding, resumed, then archived
├── src/slugify.py   # the implementation
└── tests/test_slugify.py
```

Start with `WALKTHROUGH.md` for the simulated session — it shows each skill
finishing, asking the user, and invoking the next skill with its artifact as
the handoff payload (including `debug` interrupting `coding` and handing back).
Then read `tasks/TASK-001/task.md` to see how state flows between stages, and
follow the cross-references (`R#` / `AC#` / `S#` / `BUG#`) between the files —
notably how `plan.md` predicted the exact risk that later became `BUG1`.

Then read `LIFECYCLE-WALKTHROUGH.md` for the **lifecycle skills**: TASK-004 is
paused mid-`coding`, resumed two days later in a fresh session (state rebuilt
entirely from disk, no rework), and finally archived once done. It shows how
`pause-task` / `resume-task` / `archive-task` change only a task's status or
location — never its `stage` or artifacts. The end state lives in
`tasks/archive/TASK-004/`.

## Run the demo's tests

```bash
cd slugify-demo
python3 -m unittest discover -s tests -t .
```
