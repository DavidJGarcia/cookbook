# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This is **not an application** — it's David's public toolkit, distributed as a Claude Code plugin marketplace. The "code" is mostly Markdown command definitions, JSON manifests, and copy-paste reference snippets. There is no root `package.json`, no build step, and no test suite at the repo level. Changes ship by being committed and pulled in by consuming sessions, not compiled.

## Architecture

Three layers, wired together so that opening any consuming repo in Claude Code auto-loads the toolkit:

- **`.claude-plugin/marketplace.json`** declares the `david-cookbook` marketplace and points at the one plugin (`plugins/david-toolkit`, `source: ./plugins/david-toolkit`).
- **`plugins/david-toolkit/`** is the plugin: `.claude-plugin/plugin.json` (manifest) + `commands/*.md` (the two slash commands). Each command's behavior lives entirely in its Markdown file's prose — there is no executable code behind them.
- **`.claude/settings.json`** registers the marketplace (via GitHub `DavidJGarcia/cookbook`) and enables `david-toolkit@david-cookbook`. App repos created by `/new-project` commit this same snippet, so local and cloud sessions fetch the plugin from GitHub at startup and get `/orc` + `/new-project` with no manual install.

Editing a `commands/*.md` file *is* changing product behavior for every session that loads the plugin. Because the marketplace is fetched from GitHub, changes only reach consumers after they're pushed.

### The two commands

- **`commands/orc.md`** — a grill-first development orchestrator (ideation → plan → build → verify → handoff) driven to a mergeable PR. The whole spec is the prose contract: phase gates, sub-agent delegation rules, review passes.
- **`commands/new-project.md`** — paved-road app bootstrap (GitHub repo + Azure staging/prod + per-project OIDC + rulesets + first deploy). It assumes a private `DavidJGarcia-apps/platform` repo exists for org-specific context (resource groups, budget, naming, the reusable `@v1` workflows); the public cookbook stays generic. When this command's inline steps and `platform/README.md` disagree, **the README wins** — say so in edits rather than hardcoding org details here.

### Supporting material (not part of the plugin)

- **`templates/AGENTS-house-style.md`** — the canonical `AGENTS.md` new projects start from. `/new-project` copies it with placeholders filled; edits here only affect *future* projects, not existing ones.
- **`docs/infra-decisions.md`** — how infra choices get made (Azure-default posture, cost/simplicity/maintainability criteria, the non-negotiable that staging never shares production data).
- **`snippets/gate-auth/`** — a single-shared-PIN gate (Express reference: `gate.js`, `pin-pad.js`, `pin-pad.css`). Designed to be **copied into a project and adapted, not imported as a dependency**. The design decisions in its README (constant-time compare, login rate-limit, in-memory sessions, guard covers only `/api/`) are deliberate — preserve them when adapting.

## Working in this repo

- **Validate JSON after editing** `marketplace.json`, `plugin.json`, or `.claude/settings.json` — they carry `$schema` references and a malformed file breaks plugin loading for every consumer.
- Keep this repo **generic and shareable.** Org-specific details (resource group names, budgets, the platform repo's internals) belong in the private platform repo, not here.
- The `snippets/gate-auth/*.js` files are reference code with no local test harness; they're meant to run inside a consuming Express app.
