# Infra decisions

How infrastructure choices get made for projects built on this cookbook's paved road.

## Who decides, and when

Infrastructure choices are made **per project, at build time, by whoever is building** — human or agent. There is no template that pre-picks a database or a cache for you. The paved road standardizes *how apps deploy and present themselves*, not *what they're made of*.

## Default posture

The stack runs on Azure. All else being equal, **prefer Azure services**: lower operational surface, one bill, one identity model. But "all else being equal" is doing real work in that sentence — genuinely consider alternatives, inside or outside Azure, when they fit the problem better. The deciding criteria are always:

1. **Cost** — these are small apps; recurring spend must be justified.
2. **Simplicity** — fewer moving parts beats theoretically better architecture.
3. **Maintainability by a solo dev + agents** — if an agent can't operate it from a CLI and a doc, it's a liability.

## Non-negotiable

**Staging environments get separate data from production. Always.** A staging deploy must never be able to read or write production data, whatever the storage choice.

## Before provisioning anything

Consult the private platform repo's org-context doc for:

- The established resource groups and App Service plans (new resources go in the established resource group — don't create new ones).
- Naming conventions.
- The monthly budget envelope — verify the cost impact of anything new against it.

## Decision heuristics

These are questions to weigh, not recipes. The answer depends on the project.

- **Tiny relational or local data?** Is SQLite on the App Service `/home` filesystem enough? It's acceptable for single-instance apps — zero cost, zero ops. Does the app need to scale past one instance? Then it isn't.
- **Key-value or simple entities?** Would Azure Table Storage do? It costs pennies and needs no server. Is the query model (partition key + row key) actually enough for this data?
- **Real relational needs with growth ahead?** Is it time for managed Postgres? It's the right call when the data model is genuinely relational and the app will live a while — but it's the most expensive option here, so make sure the need is real.
- **Secrets?** Are App Settings (environment variables) enough? They usually are. Does this secret need rotation, sharing across apps, or audit? Then Key Vault earns its place.

## Document the decision

Whatever you choose, **document the decision and its rationale in the project's `docs/specs/`** — what was picked, what was considered, and why. The next agent (or future you) should not have to re-derive it.
