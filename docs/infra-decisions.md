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

## Lessons paid for once

Recorded so the next project does not pay again. Each of these cost real downtime or hours.

- **Never change a startup command ahead of the code that satisfies it.** The web app restarts into the new command immediately; if the deployed build cannot satisfy it, the site is down until the next deploy or restart. Deploy the code, then set the command.
- **Prefix app settings and env names with the project.** The reusable staging workflow exports its own env on the CI runner (screenshot storage and friends). An app whose tests read a generic name such as `STORAGE_ACCOUNT` finds the runner's value and tries to reach Azure from CI. `PROJECTINDEX_…` / `INDEX_…` style names cannot collide.
- **Separate data per environment by identity, not by naming.** One storage account per environment, each web app's managed identity granted data roles on its own account only. Staging then cannot touch production data even by mistake.
- **App Service authentication (Entra) for anything a person signs into.** With "allow unauthenticated" on, webhooks keep working and the app checks the principal headers on the pages that need a person. Trust those headers only when the platform reports `WEBSITE_AUTH_ENABLED`; without the auth layer in front, anyone can send them.
- **Azure Table rows have limits.** 64 KiB per string property, 1 MiB per entity. Anything derived from user input that lands in a row must be clipped, and the write path must degrade rather than fail (a capture that is stored but unlisted is the worst outcome).
- **Foundry deployment capacity is the rate limit.** For Anthropic models, 1 unit = 1 request and 1,000 tokens per minute; a deployment created at capacity 1 stalls every second call for a minute. Set capacity to the subscription quota for the model. Anthropic deployments also need `properties.modelProviderData` (industry, organization, country) and API version `2025-10-01-preview` or later; the az CLI's `deployment create` cannot pass it, so use `az rest`.
- **Federated credentials: create both subject forms.** The org presents ID-stamped OIDC subjects; classic-only credentials fail the first deploy (`AADSTS700213`). Details in the platform org-context doc.
- **Gate every push on the real exit code.** `python -m unittest … | tail -1 && git commit` commits on a failing suite because the pipeline's status is `tail`'s. Capture the status first (`; rc=$?`) or use `set -o pipefail`.
