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
- **How:** run the steps below as a brief for the agent. Give it a focused goal and ask for a **structured result**, not file dumps — e.g. "List every top-level dir with its role and the key entry file (`path:line`)" or "Find where auth is enforced; return the call chain."
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
rtk find "package.json" ; rtk find "*.toml" ; rtk find "Makefile"
```

### 2. Map the structure
- Get the directory tree (skip `node_modules`, `.git`, `dist`, `vendor`, `target`).
- Name the role of each top-level dir (e.g. `src/`, `api/`, `web/`, `migrations/`, `tests/`).

```bash
rtk ls .
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
- Use `rtk grep <pattern>` to find where a concept lives; for broad multi-location sweeps across naming conventions, spawn the **Explore** agent and ask only for conclusions.
- To answer "where is X handled?", grep the user-facing string or endpoint, then follow the call chain.

## Output: write the onboarding docs

This skill produces **four Markdown files** in `docs/onboarding/`. Create the directory if missing, and overwrite existing files (they are regenerated docs). Every claim must come from files you actually read — cite sources as `path/to/file.ext:line` and flag anything you couldn't verify rather than guessing.

### `docs/onboarding/what-is-stack.md`
The tech overview.
- Language(s) + version, framework(s), package manager.
- Architecture: the layers and how a typical flow moves through them (entry → handler → service → data), with key files as `path:line`.
- External dependencies: DB, cache, queues, third-party APIs, auth.

### `docs/onboarding/source-structure.md`
The folder map — so a new dev knows where things live.
- Directory tree of the repo (skip `node_modules`, `.git`, `dist`, `vendor`, `target`).
- For each significant folder: its role/responsibility and what kind of code belongs there.
- Note entry-point files and any folders with special conventions (e.g. `migrations/`, `config/`, `tests/`).

### `docs/onboarding/how-to-code.md`
The day-to-day dev guide. It must answer three questions concretely: **where to put code, how to write it cleanly, and which rules to follow.**

- **Local setup:** prerequisites, install deps, `.env` setup, start services — **exact commands** verified from manifests.
- **Run / test / lint commands.**
- **Where to code (placement):** for each common task (new feature, API endpoint, model, util, test), say exactly which folder/file it belongs in. Derive this from `source-structure.md` and real examples in the repo — point to an existing file to copy the pattern from (`path:line`).
- **How to write clean code here:** the project's conventions, learned from the actual code, not generic advice —
  - Naming (files, functions, variables, components) with a real example.
  - Module/file size & responsibility (single responsibility, where to split).
  - How layers stay separated (e.g. don't call the DB from a controller — go through a service).
  - Error handling, logging, and typing patterns the codebase already uses.
  - Imports ordering / path aliases.
- **Rules to follow (enforced):** lint/format config (`.eslintrc`, `ruff`, `.prettierrc`, `.editorconfig`) and the commands that check them; pre-commit hooks / CI gates; test coverage expectations. State which rules are auto-enforced vs. convention.
- **Git workflow:** branch naming, commit/PR conventions, review process (if documented).

When the repo's own conventions are unclear, say so and recommend a sensible default rather than inventing a rule — but always prefer matching existing code over imposing a new style.

### `docs/onboarding/how-to-deploy.md`
The release path.
- Environments (dev / staging / prod) and how they differ.
- Build & deploy steps; CI/CD pipeline (from `.github/workflows/`, `Dockerfile`, `Makefile`, etc.).
- Required env vars / secrets (names only — never values).
- Rollback / on-call notes if documented.

After writing, give the user a short summary of what each file covers and list any **open questions** — undocumented or ambiguous areas worth confirming with the team.
