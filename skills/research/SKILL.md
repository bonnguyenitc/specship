---
name: research
description: Research a topic, technology, library, or decision using the strongest search tool available in the session. Use when asked to "research X", "compare X vs Y", "find the best library/tool for X", "what's the latest on X", "how does <external service or API> work", or whenever an answer depends on external facts (versions, APIs, pricing, benchmarks, best practices) that must be current and cited rather than recalled from memory. Prefers specialized MCP search tools over generic web search and always ends by producing a complete, verified, cited research report.
---

# Research

Goal: turn a question into a **current, verified, cited** answer. Model memory
has a training cutoff and no sources — never answer a time-sensitive or
external-fact question from memory alone.

## When to use
- "Research X", "compare X vs Y", "what's the best library for X?".
- Choosing a dependency, API, service, or architecture that external facts decide.
- Anything where "latest", "current", version numbers, pricing, or dates matter.
- A pipeline stage (`spec`, `plan`) hits an open question only the outside world
  can answer.

Not for questions the repo itself answers — use `explore-source` / code search
for those.

## Step 1 — Frame the question

Before any search, pin down (ask the user only if the answer changes the work):
- **Decision:** what will this research be used for? Research feeding "pick a
  library" needs comparison criteria; "how does this API work" needs docs.
- **Freshness:** does it need this week's state (releases, pricing) or stable
  knowledge (algorithms, standards)?
- **Depth:** quick answer, comparison table, or deep report? Match effort to it.

## Step 2 — Pick the strongest search tool available

**Inventory the session's tools first** — list what's actually connected (MCP
servers, built-ins) instead of defaulting to the generic web search. Then pick
the highest rung available on this ladder:

1. **Specialized search MCP** — e.g. Exa, Perplexity, Tavily, Brave/Kagi
   Search, Firecrawl. These return richer, fresher, less SEO-polluted results
   than generic search; if one is connected, it is the default for open-web
   questions.
2. **Domain-specific MCP when the question has a domain** — library/API docs:
   Context7, DeepWiki; repos/issues/PRs: a GitHub MCP; internal knowledge:
   Notion/Confluence/Slack MCPs. A docs tool beats web search for "how do I use
   library X" every time.
3. **Built-in web search + URL fetch** — the fallback when no MCP search is
   connected. Still fine; just expect more noise.
4. **Browser automation** — last resort, only for pages that need JS rendering
   or a login the fetch tools can't handle.

Practicalities:
- If the harness defers/lazy-loads tools, load **everything you expect to
  need in one batch** (search + fetch + docs), not one at a time.
- If **no** search tool is available, say so explicitly and answer from memory
  with a clear caveat: state your knowledge cutoff and mark every claim
  `(unverified — no search tool available)`. Never present memory as research.

## Step 3 — Search wide, then deep

- Run **2–4 query angles**, not one: the direct question, the comparison form
  ("X vs Y"), the problem form ("how to <goal>"), and the authority form
  (`<library> changelog`, `site:docs.<vendor>.com`).
- Query in **English** unless the topic is region-specific — coverage is far
  better. Answer in the user's language.
- For freshness-critical topics, include the current year in at least one query
  and check result dates.
- For a big research task (many subtopics, "deep dive"), **delegate the fan-out
  to subagents** if the agent supports them: one subagent per angle — the
  **`specship-researcher`** agent if your platform can spawn it (ships with
  specship for Claude Code), else any research-capable agent it offers — each returning
  conclusions + source URLs, never raw page dumps. Synthesize and
  verify in the main thread yourself; the report in Step 6 is yours to write,
  not a subagent's. If the platform can't spawn subagents,
  do the same fan-out **inline** in the main thread (`../WORKFLOW.md` →
  In-stage subagents — delegation is an optimization, never a precondition).

## Step 4 — Read primary sources, not snippets

- Fetch and read the pages behind the top results — search snippets truncate
  and mislead. 3–5 good sources beat 20 skimmed ones.
- Prefer **primary sources**: official docs, changelogs/release notes, the
  repo's README/issues, specs, vendor pricing pages — over blog posts and
  aggregator listicles.
- Record for each source: URL, publish/last-updated date, and the exact
  version numbers or figures it states.

## Step 5 — Verify before you conclude

- Every load-bearing claim needs **≥2 independent sources, or 1 primary
  source**. A claim repeated by ten blogs that all cite the same post counts
  as one source.
- Watch for staleness: a 2-year-old "best X" post may predate the current
  major version. When sources conflict, the newer primary source wins — and
  say the conflict existed.
- Anything that fails verification is reported as `(unverified)`, not silently
  dropped or asserted.

## Step 6 — Write the report

Research is not done until it ends in a **complete report** — a standalone
document a reader who wasn't in the chat can rely on. Write it to
`docs/research/<YYYY-MM-DD>-<slug>.md` (date and time from `date`). The one
exception: a trivial single-fact lookup ("what's the latest version of X?")
may deliver the full report structure inline in the chat instead of a file.

```markdown
---
doc: research
question: <the original question, verbatim>
updated: <YYYY-MM-DD HH:MM +TZ>
tools: <search tools actually used>
---

# <Title — the question answered as a statement>

## TL;DR
<the answer + recommendation in 2–4 sentences>

## Scope & decision context
<what was asked, what decision this feeds, what was in/out of scope>

## Method
<query angles run, tools used, why these sources were trusted>

## Findings
### <subtopic or criterion>
<claims in prose, each with an inline citation [n] into Sources>

## Comparison  <!-- only when the question was a comparison -->
| Option | <criterion> | <criterion> | Sources |
|---|---|---|---|

## Recommendation
<what to do and why; the trade-offs accepted; what would change the call>

## Caveats & open questions
- <what's unverified, disputed, or likely to change — and by when>

## Sources
| # | Source | Type (primary/secondary) | Published/updated | URL |
|---|---|---|---|---|
```

- Every claim carries its source; every source carries its date and type.
- Sections that don't apply (e.g. Comparison) are dropped, not left empty —
  but TL;DR, Findings, Caveats, and Sources are always present.
- **In the conversation**, deliver answer-first: the TL;DR, the key findings,
  and the path to the report file — not a paste of the whole report.
- **Never write to `tasks/`** — only pipeline stages do. If a stage requested
  this research, hand back the TL;DR + report path and let that stage record
  what it needs in its own artifact.

## Rules
- No memory-only answers to time-sensitive questions — search or say you can't.
- Prefer the specialized MCP search tool over generic web search when connected.
- Primary sources over commentary; dates and versions quoted exactly.
- State "as of <date>" for anything volatile (pricing, versions, rankings).
- Stop when the decision is answerable — research serves the decision, not the
  other way around.
- Always finish with the complete report (Step 6); an answer without the
  report is an unfinished research task.
