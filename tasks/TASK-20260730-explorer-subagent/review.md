---
task: TASK-20260730-explorer-subagent
title: Ship a specship-explorer subagent installed for the Claude Code target
type: review
status: approved
created: 2026-07-30 12:54 +07
updated: 2026-07-30 12:54 +07
---

# Review: Ship a specship-explorer subagent installed for the Claude Code target

Reviewed together with its two siblings (`TASK-20260730-reviewer-subagent`, `TASK-20260730-researcher-subagent`) — one working diff, three specs. Findings are recorded against the task that owns the affected file; cross-references are noted.

## Gate Results
- Tests: **pass** — `npm test` 76 green (16 `test/pipeline.test.js` + 60 `test/cli.test.js`), including 5 new subagent cases. Re-run after every fix below.
- Lint / format / type-check: **not defined by the project** (zero-dep; `package.json` `scripts` has only `test`). Substituted `node --check` on all three changed JS files — all parse.
- Contract gate: `specship check` → `OK - tasks/ conforms to the workflow contract`.
- Packaging: `npm pack --dry-run` lists all three `agents/*.md`. `./publish.sh --dry-run` runs the suite green then halts at "0.2.4 already on npm" — expected pre-release state, not a defect (see `plan.md` S6 deviation).
- Real install: `init --claude` lands the agent byte-identical; `init --all` lands the three agents under `.claude/agents/` and nowhere else; `init --codex` creates no `.claude`.

## Acceptance Criteria
- [x] AC1 — verified: all four mandates greppable in `agents/specship-explorer.md` (MCP preference, `rg`/Grep/Glob fallback, "Never cite line numbers", no `tasks/` writes).
- [x] AC2 — verified: `cmp` of source vs installed file passes; a `--codex --gemini --cursor --windsurf` install produces no `.claude` at all.
- [x] AC3 — verified: uninstall keeps a user-added `.claude/agents/mine.md` while removing ours; doctor exits 1 with `missing agent file(s)` when deleted and `agent file(s) differ` when edited; `update` heals both.
- [x] AC4 — verified **with a documented caveat**: `specship-explorer` appears in exactly `skills/{spec,plan,explore-source,debug}/SKILL.md`. The second half of the AC's verify (`git diff --name-only skills/coding skills/review skills/research` is empty) **no longer holds**: `review/SKILL.md` and `research/SKILL.md` are modified by the two sibling tasks that ran after this one (traced to their own S2 steps). `skills/coding/SKILL.md` is untouched. The AC's *intent* — this change touches only explorer sites — holds; the command was written assuming a working tree containing this task alone.
- [x] AC5 — verified: `npm pack --dry-run` includes `agents/specship-explorer.md`.
- [x] AC6 — verified: README states the install path, the claude-only scope, and the MCP-optional behaviour (paragraph rewritten during review — see F2).

## Findings
<!-- source: code-review | panel:<lens> (independent member) | self (task-grounded); severity: blocker | minor | unverified -->
<!-- checkbox = addressed -->
- [x] [panel:correctness][blocker] `agents/` is **untracked in git**, so a `git commit -am` would ship `src/` + `package.json` referencing a directory absent from the tree, and nothing in the suite can detect it — `agents/` (whole dir)
    failure: verified — `git ls-files agents/` is empty and the dir is not gitignored. The reviewer reconstructed a fresh clone (`git archive HEAD` + the working-tree files) and the suite dies on the first test with `ENOENT: scandir '<pkg>/agents'` at `copyDir` ← `initTarget`. CI, a teammate's clone, and `npm i github:…` all break. **Addressed by the Commit draft below**, which stages the new paths explicitly — this is not fixable in code, so the deliverable is the correct command.
- [x] [panel:contract-consistency][blocker] README asserted "none has a native subagent format" about the other nine targets — factually false and never verified — `README.md` (`What \`init\` Installs`)
    failure: a Gemini CLI or Copilot user reads it and concludes their platform can't host these helpers, so they never port the definitions; a contributor reads it as the design rationale and never adds the targets. **Verified against primary docs**: Gemini CLI reads project subagents from `.gemini/agents/*.md` (YAML frontmatter + markdown body, `tools:` mandatory), Copilot from `.github/agents/*.agent.md`. Fixed: the README now says specship ships no adapter for those formats yet, names them, and the same false claim was struck from this spec's Out of Scope.
- [x] [panel:correctness+contract-consistency][minor] Both agent definitions cited the contract as bare `` `WORKFLOW.md` ``, which does not resolve from where they install — `agents/specship-explorer.md` (`Hard rules`), `agents/specship-reviewer.md` (`Hard rules`)
    failure: agents land in `.claude/agents/` while the contract lands at `.claude/skills/WORKFLOW.md`. A subagent following the citation finds nothing — in a file that itself rules "Every path you cite must exist". Found independently by both reviewers. Fixed to `../skills/WORKFLOW.md`, verified to resolve in a real install. (One reviewer said all three files were affected; verified — the researcher never cited it.)
- [x] [panel:contract-consistency][minor] `"if installed"` is a filesystem predicate, not a capability one, and two of the seven mentions also dropped the Claude-only qualifier — `skills/debug/SKILL.md` (`Method` step 2), `skills/explore-source/SKILL.md` (`Searching effectively`)
    failure: in an `--all` install `.claude/agents/` exists on disk, so a Codex or Cursor agent evaluates "if installed" as true, tries to spawn an agent type its platform never heard of, and burns a turn before falling back. Fixed: all seven mentions now read "if your platform can spawn it", matching the contract's own "delegate **if you can**".
- [x] [panel:correctness][minor] Nothing enforced the "agent files pin no model" invariant that two new code comments rely on to justify skipping the profile renderer — `src/init.js` (`initTarget` agents block, `doctorTarget` agents block)
    failure: a future `agents/*.md` carrying `model: opus` would be installed verbatim under `--profile orchestrated`, silently re-pinning the model that profile exists to unpin (the BUG6 class), while doctor reports healthy. Fixed: added `no packaged subagent pins a model` to `test/cli.test.js`; confirmed it fails when a probe file with `model:` is added.
- [x] [panel:contract-consistency][minor] The Commands table described `update`/`uninstall`/`doctor` as acting on skills and config only — `README.md` (`Commands`)
    failure: a user who edited `.claude/agents/specship-reviewer.md` gets an undocumented non-zero `doctor`; a user running `uninstall` is not told files under `.claude/agents/` are removed, nor that their own survive. Fixed: all three rows now name subagents and state the keep-your-own-files guarantee.
- [x] [self][minor] Spec R2 ("every other target's installed output stays byte-for-byte unchanged") contradicted R4, which edits the **shared** `skills/` tree that every target installs — `tasks/TASK-20260730-explorer-subagent/spec.md` (`Requirements`)
    failure: read literally, AC2 could never pass and the spec is self-refuting; read loosely, a reviewer waves it through. Independently flagged by the correctness reviewer as a product call it couldn't adjudicate. Fixed: R2 is now scoped to the install mechanism, with the tension spelled out.
- [x] [self][minor] Root `CLAUDE.md` (dev guide) mapped the repo's source dirs but omitted the new `agents/`, and its "Real install" checklist didn't mention subagents — `CLAUDE.md` (header, `Verify every change`)
    failure: the next contributor reads the entry-point map, doesn't know `agents/` ships, and a packaging change silently drops it. Fixed both lines.
- [ ] [panel:contract-consistency][unverified] "Read-only" is a prompt-level promise: with no `tools:` in frontmatter, a Claude Code subagent may inherit the full toolset including Write/Edit — `agents/specship-explorer.md`, `agents/specship-reviewer.md` (frontmatter vs `Hard rules`)
    failure: an explorer could "helpfully" rewrite a stale `docs/onboarding/` file, breaking "the main thread owns the state" with only prose in the way. The reviewer marked its own claim unverified (it could not exercise Claude Code's agent loader). **Not fixed** — a `tools:` allowlist is exactly what this spec's Assumptions rejected (it would exclude `mcp__codebase-memory__*`), and Gemini's format *requires* one, so the right answer differs per platform. Mitigated now: the README no longer claims the helpers cannot write, only that they are instructed not to. Carried to Follow-ups.
- [ ] [panel:correctness][minor] A missing package-root `agents/` produces a raw `ENOENT` stack trace instead of a diagnosable error — `src/init.js` (`initTarget`)
    failure: reproduced by deleting `agents/` from a copy of the package. `skills/` has the identical exposure, so this matches existing style rather than regressing it, and the release path is safe today (`npm pack` includes all three files). Follow-up.
- [ ] [self][minor] `uninstall --dry-run` is not asserted to leave agent files in place — `test/cli.test.js` (`--dry-run writes nothing`)
    failure: the existing case asserts skills and config survive a dry-run uninstall but says nothing about `.claude/agents/`. The code path is guarded by `if (!dry)` and was manually verified, but a regression there would pass CI. Follow-up (one added assertion).

## Commit / PR Draft

**Stage the new paths explicitly — `git commit -am` would omit `agents/` and ship a broken package (blocker above).**

```sh
git add agents/ src/ test/ skills/ README.md CLAUDE.md package.json tasks/
git status --short   # confirm agents/specship-{explorer,reviewer,researcher}.md are staged
```

```
feat: ship explorer, reviewer and researcher subagents for the pipeline

The workflow contract has always allowed stages to delegate to in-stage
subagents, but the skills could only point at generic built-ins. Ship three
purpose-built definitions in a new package-root `agents/` dir, installed to
`.claude/agents/` for the Claude Code target only:

- specship-explorer   — wide code search for spec/plan/explore-source/debug.
                        Prefers the codebase-memory MCP when the project has
                        that server, falls back to rg/Grep/Glob when it does
                        not, so it works either way.
- specship-reviewer   — an independent, context-free pass over the diff; one
                        member of the opt-in review panel, invoked per lens.
- specship-researcher — one query angle of a research task, carrying the
                        research skill's source-verification discipline.

All three are instructed to return findings only: never write tasks/, never
tick S#/AC#, never decide a verdict. The main thread stays the only writer.

Install-side, `targets.js` gains a `subagents` field carried only by the
claude target, so no other target's install mechanism is touched — the same
shape as the codex-only openai.yaml manifest. uninstall removes only the
files specship installed and prunes empty dirs; doctor reports missing and
drifted agent files; adding a fourth definition needs no code change.

Also: the delegation paragraphs in six skills now name the agents behind a
capability check ("if your platform can spawn it") so the nine non-Claude
targets keep their existing fallback path, and the review/debug artifact
templates no longer ask for `path:line` citations that the agents are
forbidden to produce.
```

## Follow-ups
- **`tools:` allowlist for the read-only agents** — decide whether to constrain Write/Edit at the frontmatter level. Needs the Claude Code subagent tool-inheritance semantics verified first, and any answer must not exclude optional MCP search tools. Unverified finding above.
- **Adapters for other platforms' subagent formats** — Gemini CLI (`.gemini/agents/*.md`, `tools:` mandatory) and GitHub Copilot (`.github/agents/*.agent.md`, 30k char prompt cap) both host project subagents. Adding `subagents` for those targets is a small `targets.js` change plus per-platform frontmatter. Own task.
- **`agents/` missing → diagnosable error** instead of a raw ENOENT (applies equally to `skills/`).
- **Assert `uninstall --dry-run` preserves agent files** (one line in the existing dry-run case).
- **`coding`'s parallel-step fan-out has no purpose-built agent** — deliberately left alone: the skill defaults to sequential work and the brief carries the task-specific part. Revisit only if parallel coding gets real use.
- **This repo doesn't install its own skills/agents** — `/spec`, `/review` and the three agents are unavailable here (no `.claude/skills/`, no `.claude/agents/`); this whole pipeline was run by following the playbooks manually. `node bin/cli.js init --claude --dir .` would fix it but adds ~15 files to git — the user's call.

## Change History
- 2026-07-30 12:54 +07: Reviewed. Two independent reviewers (correctness on the install code, contract-consistency on the shipped prose) plus task-grounded checks in the main thread. 2 blockers + 9 minors raised; every claim re-verified before acting, including two external-product claims checked against primary docs. 8 addressed in-review, 3 carried to Follow-ups (one unverified, two non-blocking). Approved.
