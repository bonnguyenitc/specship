# Example: slugify-demo

A complete worked task that ran the full **spec → plan → coding → review** pipeline
(with a real bug caught and fixed via `debug`), kept here as a reference for what
the generated artifacts look like in practice. It is **not** installed by
`specship init`.

## What to read

```
slugify-demo/
├── tasks/TASK-001/
│   ├── task.md      # shared state — the full pipeline log (spec→plan→debug→coding→review)
│   ├── spec.md      # R1–R4 requirements, AC1–AC5 acceptance criteria (all ticked)
│   ├── plan.md      # S1–S3 steps, each `covers:` an R#/AC#
│   ├── debug.md     # BUG1: accent ordering — root cause + fix, references S2/AC3
│   └── review.md    # gate results, AC verification, commit draft
├── src/slugify.py   # the implementation
└── tests/test_slugify.py
```

Start with `tasks/TASK-001/task.md` to see how state flows between stages, then
follow the cross-references (`R#` / `AC#` / `S#` / `BUG#`) between the files —
notably how `plan.md` predicted the exact risk that later became `BUG1`.

## Run the demo's tests

```bash
cd slugify-demo
python3 -m unittest discover -s tests -t .
```
