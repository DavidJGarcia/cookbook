# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is not an app — it's a Claude Code plugin marketplace. No root `package.json`, no build, no tests. Changes ship by being pushed and pulled in by consuming sessions.

## Architecture

Three files wire the toolkit to auto-load in any consuming repo:

- `.claude-plugin/marketplace.json` — declares the `david-cookbook` marketplace, points at `plugins/david-toolkit`.
- `plugins/david-toolkit/` — `plugin.json` + `commands/*.md`. Each command's behavior is entirely its Markdown prose; there's no code behind it.
- `.claude/settings.json` — registers the marketplace (GitHub `DavidJGarcia/cookbook`), enables the plugin, and denies `send_later` so agents can't arm scheduled PR check-ins. App repos created by `/new-project` commit this same snippet, so sessions fetch the plugin from GitHub at startup.

Editing a `commands/*.md` file *is* changing behavior for every session that loads the plugin — but only after it's pushed, since the marketplace is fetched from GitHub.

- `commands/orc.md` — grill-first dev orchestrator (ideation → plan → build → verify → handoff), driven to a mergeable PR.
- `commands/new-project.md` — paved-road app bootstrap (GitHub repo + Azure staging/prod + OIDC + rulesets). Relies on the private `DavidJGarcia-apps/platform` repo for org-specifics; when its inline steps and `platform/README.md` disagree, the README wins.

Not part of the plugin: `templates/AGENTS-house-style.md` and `templates/steward-SKILL.md` (seeds `/new-project` copies — edits only affect future projects), `docs/infra-decisions.md`, and `snippets/gate-auth/` (an Express PIN gate meant to be copied into a project and adapted, not imported).

`.claude/skills/steward/SKILL.md` is this repo's own copy of the steward seed. Cloud agents read that exact path before acting on PR events, so it is what keeps PR watching event-driven here; `permissions.deny` in `.claude/settings.json` is the enforcement half. Keep the two copies in sync — edit `templates/steward-SKILL.md` and copy it over, not the other way round.

## Working here

- Validate JSON after editing the `$schema`-bearing manifests — a malformed file breaks plugin loading for every consumer.
- Keep it generic: org-specific details (resource groups, budgets) live in the private platform repo, not here.
