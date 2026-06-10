# AGENTS.md — <app-name>

<one-paragraph description of what this app does>

- Production: <https://app-production-url>
- Staging: <https://app-staging-url>
- Repo: <org/repo>

## How we work

- When planning or gathering requirements, ask clarifying questions as **one numbered list directly in chat**. The human strongly prefers reading a full list at once — do not use interactive question widgets or polls, and do not drip questions one at a time.
- Verify changes on the **staging deployment**, not just locally. "Works on my machine" is not done; "verified on staging" is.
- **Never merge PRs.** The human merges.
- **Never deploy manually.** Staging deploys automatically on PR open/update; production deploys automatically on merge to `main`.

## Conventions

- npm + Node 22 (pinned via `.nvmrc`).
- `npm test` then `npm run build` must produce a self-contained `deploy/` directory: server entry, static assets, and a `package.json` whose `start` script runs the app on `$PORT`.
- `GET /healthz` returns 200, unauthenticated — the deploy pipeline polls it.
- The CI job name is exactly `ci` (branch protection requires that status check).
- The staging URL appears as a sticky PR comment with a screenshot — use it to verify.

## Security

- Anything public-facing must sit behind the PIN gate (`snippets/gate-auth` in the cookbook) or real auth **before its first production deploy of real features**.
- Secrets live in App Settings / environment variables — never in the repo.

## Infra decisions

Before provisioning anything, read the cookbook's `docs/infra-decisions.md` and the private platform repo's org-context doc (resource groups, naming, budget). Document any infra decision and its rationale in this repo's `docs/specs/`.
