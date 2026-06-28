---
name: explore-source
description: Explore and explain an unfamiliar codebase for onboarding. Use when a developer joins a project, when asked to "understand the codebase", "explain the architecture", "how does this project work", "where is X handled", or before making changes in code you haven't seen yet. Produces a structured map of stack, architecture, entry points, conventions, and how to run/test.
---

# Explore Source

Goal: turn an unfamiliar repo into a clear mental model fast. Read before you change.

## When to use
- A new dev is onboarding and needs the lay of the land.
- You're asked "how does this work?", "where is X?", "explain the architecture".
- You're about to modify code in an area you haven't read yet.

## Delegate heavy exploration to a subagent
For anything beyond a tiny repo, **don't read the whole codebase in the main thread** — it floods the context. Spawn the built-in **Explore** agent (or `general-purpose` for multi-step research) to do the wide fan-out reads and return only conclusions, keeping this thread clean.

- **When:** a large/unfamiliar repo, or a broad question ("where is X handled across the codebase?", "what are all the entry points?").
- **How:** run the steps below as a brief for the agent. Give it a focused goal and ask for a **structured result**, not file dumps — e.g. "List every top-level dir with its role and the key entry file (path + entry symbol)" or "Find where auth is enforced; return the call chain."
- **Parallelize** independent sweeps (structure, entry points, conventions) as separate agent runs when it speeds things up.
- **Then** synthesize the agents' findings into the onboarding docs yourself. You own the writing and the verification — spot-check anything an agent claims before citing it.
- For a small repo, just do it inline; spawning an agent isn't worth the cold-start cost.

## Method

Work top-down: stack → structure → entry points → data flow → conventions. Don't read every file; read enough to build an accurate map, then verify the gaps.

### 1. Identify the stack & how to run it
Read manifests and docs first — they encode the intended setup.
- Manifests: `package.json`, `pyproject.toml`/`requirements.txt`, `go.mod`, `Cargo.toml`, `pom.xml`, `Gemfile`.
- Docs: `README.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `docs/`.
- Ops: `Dockerfile`, `docker-compose.yml`, `Makefile`, `.env.example`, CI files (`.github/workflows/`).
- Extract: language + version, framework, package manager, **the exact commands to install / run / test / lint**.

```bash
ls -la
find . -maxdepth 2 \( -name "package.json" -o -name "*.toml" -o -name "Makefile" \) -not -path "*/node_modules/*"
```

### 2. Map the structure
- Get the directory tree (skip `node_modules`, `.git`, `dist`, `vendor`, `target`).
- Name the role of each top-level dir (e.g. `src/`, `api/`, `web/`, `migrations/`, `tests/`).

```bash
ls -la ; tree -L 2 2>/dev/null || find . -maxdepth 2 -type d -not -path "*/node_modules/*"
```

### 3. Find entry points & wiring
- App entry: `main.*`, `index.*`, `app.*`, `server.*`, `cmd/`, the `scripts`/`bin` in the manifest.
- Routing/config: route definitions, DI/container setup, config loading, env var usage.
- Trace one real request/flow end-to-end (entry → handler → service → data layer) to see how layers connect.

### 4. Read the conventions
- Lint/format config (`.eslintrc`, `ruff`, `.prettierrc`, `.editorconfig`).
- Naming, folder, and test patterns — copy them, don't invent new ones.
- Git workflow: branch naming, commit/PR conventions if documented.

### 5. Locate the data & external edges
- Models/schema, migrations, ORM usage.
- External integrations: DB, cache, queues, third-party APIs, auth.

## Searching effectively
- Use `grep`/`rg <pattern>` to find where a concept lives; for broad multi-location sweeps across naming conventions, spawn the **Explore** agent and ask only for conclusions.
- To answer "where is X handled?", grep the user-facing string or endpoint, then follow the call chain.

## Output: write the onboarding docs

This skill produces **four Markdown files** in `docs/onboarding/`. Create the directory if missing, and overwrite existing files (they are regenerated docs). Use the **exact templates below** — fixed frontmatter and headings — so the docs stay consistent across regenerations and other skills (`spec`, `plan`, `coding`) can rely on their structure.

Rules for all four files:
- Every claim must come from files you actually read — cite sources as `path/to/file.ext`, plus a named anchor (`function`/`class`/config key) when pointing inside a file. **Never cite line numbers** — they drift as soon as the code changes. Never invent paths.
- Set `updated:` in the frontmatter to the current date-time (`YYYY-MM-DD HH:MM +TZ`, from `date` — don't guess).
- Keep every template heading, in order. If a section has nothing, write `_None found._` instead of deleting it.
- Mark anything you couldn't confirm with `(unverified)` rather than guessing.

### `docs/onboarding/what-is-stack.md`
The tech overview: what the project is, what it's built with, and how a request moves through it.

```markdown
---
doc: what-is-stack
updated: <YYYY-MM-DD HH:MM +TZ>
---

# What Is the Stack

## Overview
<1–3 sentences: what this project is and does>

## Stack
| Layer | Choice | Version | Source |
|---|---|---|---|
| Language | <TypeScript> | <5.x> | `package.json` (`devDependencies.typescript`) |
| Framework | | | |
| Package manager | | | |
| Runtime / infra | | | |

## Architecture
<the layers and how they connect — 3–6 bullets>

### A typical flow
<one real request/flow traced end-to-end, `path` (`symbol`) at each hop>
1. <entry> — `path` (`symbol`)
2. <handler> — `path` (`symbol`)
3. <service / data layer> — `path` (`symbol`)

## External Dependencies
| Dependency | Kind | Used for | Where wired |
|---|---|---|---|
| <Postgres> | DB | <persistence> | `path` (`symbol`) |

## Open Questions
- <anything unverified or ambiguous>
```

### `docs/onboarding/source-structure.md`
The folder map — so a new dev knows where things live.

```markdown
---
doc: source-structure
updated: <YYYY-MM-DD HH:MM +TZ>
---

# Source Structure

## Directory Tree
<tree, 2–3 levels deep; skip `node_modules`, `.git`, `dist`, `vendor`, `target`>

## Folder Roles
| Path | Role | What belongs here |
|---|---|---|
| `src/` | <role> | <kind of code> |

## Entry Points
| Entry | File | Triggered by |
|---|---|---|
| <web server> | `src/index.ts` | `npm start` |

## Special Conventions
- `<folder>/` — <naming/ordering rule that applies inside it>
```

### `docs/onboarding/how-to-code.md`
The day-to-day dev guide. It must answer three questions concretely: **where to put code, how to write it cleanly, and which rules to follow.** Conventions are learned from the actual code, not generic advice — each one needs a real example (`path` + named symbol). When the repo's own conventions are unclear, say so and recommend a sensible default rather than inventing a rule — but always prefer matching existing code over imposing a new style.

```markdown
---
doc: how-to-code
updated: <YYYY-MM-DD HH:MM +TZ>
---

# How to Code Here

## Local Setup
<prerequisites, then exact commands verified from manifests>
1. <install deps> — `<command>`
2. <.env setup> — `<command / file to copy>`
3. <start services> — `<command>`

## Daily Commands
| Action | Command | Notes |
|---|---|---|
| Run | | |
| Test | | |
| Lint | | |
| Format | | |

## Where to Put Code
| Task | Location | Copy the pattern from |
|---|---|---|
| New feature | `<folder>` | `path` (`symbol`) |
| API endpoint | | |
| Model / schema | | |
| Shared util | | |
| Test | | |

## Code Style & Conventions
### Formatting
<indent, quotes, semicolons, line length — from `.prettierrc` / `.editorconfig` / formatter config; if none, infer from the code and mark `(unverified)`>

### Naming
<files, functions, variables, components — with a real example `path` (`symbol`)>

### Module size & responsibility
<single responsibility, when/where to split>

### Layer separation
<e.g. don't call the DB from a controller — go through a service>

### Errors, logging, typing
<the patterns the codebase already uses, `path` (`symbol`)>

### Imports & path aliases
<ordering, aliases like `@/`>

## Enforced Rules
| Rule | Config | Check command | Enforcement |
|---|---|---|---|
| <lint> | `.eslintrc` | `npm run lint` | <CI / pre-commit / convention> |

## Git Workflow
- Branch naming: <pattern, or _Not documented._>
- Commits / PRs: <convention, or _Not documented._>
- Review process: <if documented>
```

### `docs/onboarding/how-to-deploy.md`
The release path.

```markdown
---
doc: how-to-deploy
updated: <YYYY-MM-DD HH:MM +TZ>
---

# How to Deploy

## Environments
| Env | Where it runs | How it differs |
|---|---|---|
| dev | | |
| prod | | |

## Build & Deploy Pipeline
<steps from CI/Docker/Makefile, each citing its source>
1. <step> — `.github/workflows/<file>` (`<job/step name>`)

## Required Env Vars / Secrets
Names only — **never values**.
| Name | Used by | Required in |
|---|---|---|
| `DATABASE_URL` | `path` (`symbol`) | all envs |

## Rollback / On-call
- <if documented; else _Not documented._>
```

After writing, give the user a short summary of what each file covers and list any **open questions** — undocumented or ambiguous areas worth confirming with the team.

## Next step
These four docs are the convention reference every task skill hydrates from (`spec`, `plan`, `coding`, `review` all read `docs/onboarding/*`). Once they're written, **ask the user whether there's a feature/ticket to start** — e.g. "Bạn có muốn bắt đầu một task với /spec không?".

- If yes, **immediately invoke the `spec` skill** (via the Skill tool) — it opens `tasks/TASK-<ID>/` and builds on these docs.
- If not, stop here — the docs stand alone as onboarding material.
