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

### In Claude Code on the web

Cloud (web) sessions read the same committed `.claude/settings.json` and install the plugin at session start by fetching the marketplace from GitHub. Two things to know:

- This repo now commits its own `.claude/settings.json`, so web sessions opened on the cookbook itself also get `/orc` and `/new-project`.
- Because the plugin is fetched from GitHub, the environment's [network policy](https://code.claude.com/docs/en/claude-code-on-the-web) must allow GitHub. The default **Trusted** policy does; **None** blocks the fetch, and **Custom** must allowlist `github.com`.

## No timed check-ins

Agents here watch pull requests **by event, not by timer**. They subscribe to PR activity and end the turn; CI failures, review comments, and merge-conflict notices wake the session on their own. Arming a scheduled self check-in to re-poll a PR spends a full context window per tick to usually find nothing changed, multiplied by every open PR.

Two layers enforce this, and both ship into every project `/new-project` creates:

- **`permissions.deny` on `send_later`** in the committed `.claude/settings.json` — removes the means. The cloud harness only asks for a check-in *if the tool is available*, so denying it settles the matter rather than arguing with it.
- **`.claude/skills/steward/SKILL.md`** — supplies the intent, and is the path cloud agents read before acting on PR events. It also covers the mechanisms a deny rule can't name (`create_trigger` Routines, `/loop`, foreground `sleep`).

The trade: webhook delivery isn't guaranteed, so a PR that goes red between events may sit until someone pokes it. That's accepted here — the steward skill tells agents to say so rather than quietly arm a timer.

To apply this to a repo that predates the change, copy both files in from this repo.

## Repo map

| Path | What it is |
|---|---|
| `.claude/settings.json` | Registers the `david-cookbook` marketplace and enables `david-toolkit`, so sessions on this repo (local or web) auto-load `/orc` and `/new-project`. Also denies `send_later`, so agents can't arm scheduled PR check-ins. |
| `.claude/skills/steward/SKILL.md` | PR-watching posture for agents on this repo: subscribe and act on events, never arm a timed check-in. Cloud agents read this path before handling PR events. Copy of `templates/steward-SKILL.md`. |
| `.claude-plugin/marketplace.json` | The `david-cookbook` plugin marketplace manifest. |
| `plugins/david-toolkit/` | The plugin: manifest + `commands/` (`orc.md`, `new-project.md`). |
| `docs/infra-decisions.md` | How infrastructure choices get made per project — posture, criteria, heuristics. |
| `snippets/gate-auth/` | Reusable single-shared-PIN gate (Express reference): server middleware + touch-friendly PIN pad overlay. Copied into projects, not imported. |
| `templates/AGENTS-house-style.md` | The canonical `AGENTS.md` template new projects start from. |
| `templates/steward-SKILL.md` | Seed copied to each new project's `.claude/skills/steward/SKILL.md` by `/new-project`. |
