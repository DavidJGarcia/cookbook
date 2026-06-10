# cookbook

David's public toolkit: a Claude Code plugin plus the shared patterns and docs that all of his app projects build on. Everything here is generic and shareable — org-specific details (resource groups, budgets, workflow internals) live in the private platform repo.

## The plugin

The `david-toolkit` plugin ships two commands:

- **`/orc`** — grill-first development orchestrator: ideation → plan → build → verify → handoff, driven all the way to a mergeable PR.
- **`/new-project`** — paved-road app bootstrap: takes a name and a one-paragraph idea to a private repo with a deployed pipeline-proving stub, staging/prod CI/CD, and agent-ready docs.

### Install locally

```
/plugin marketplace add DavidJGarcia/cookbook
```

Then enable the `david-toolkit` plugin when prompted (or via `/plugin`).

### How app repos auto-load it

App repos created by `/new-project` commit a `.claude/settings.json` that references this marketplace and enables the plugin, so anyone (or any agent) opening the repo in Claude Code gets `/orc` and `/new-project` automatically — no manual install step.

## Repo map

| Path | What it is |
|---|---|
| `.claude-plugin/marketplace.json` | The `david-cookbook` plugin marketplace manifest. |
| `plugins/david-toolkit/` | The plugin: manifest + `commands/` (`orc.md`, `new-project.md`). |
| `docs/infra-decisions.md` | How infrastructure choices get made per project — posture, criteria, heuristics. |
| `snippets/gate-auth/` | Reusable single-shared-PIN gate (Express reference): server middleware + touch-friendly PIN pad overlay. Copied into projects, not imported. |
| `templates/AGENTS-house-style.md` | The canonical `AGENTS.md` template new projects start from. |
