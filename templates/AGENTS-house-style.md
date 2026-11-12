# AGENTS.md — <app-name>

<one-paragraph description of what this app does>

- Production: <https://app-production-url>
- Staging: <https://app-staging-url>
- Repo: <org/repo>

## How we work

- When planning or gathering requirements, ask clarifying questions as **one numbered list directly in chat**. The human strongly prefers reading a full list at once — do not use interactive question widgets or polls, and do not drip questions one at a time.
- Once a change works, step back before you open the PR: building it has taught you about the problem, so ask whether there is a simpler or better approach. Is there a more elegant way? Could you make it meaningfully easier to parse and maintain? Less brittle, and more resilient to things failing at the wrong moment? If another approach would be clearly simpler, sturdier, or otherwise better, rework it now, even if that means discarding what you wrote, rather than sending the first working version to review.
- Before you open a PR, review the whole diff as a strict reviewer would, not just your last change. Test every guarantee the change claims against all the various relevant edge cases. Make sure the PR description, specs and docs describe the final code, and that every rename is complete.
- When a reviewer finds a bug, look for the same mistake elsewhere in the diff and fix every instance. Also consider whether you've learned anything that might expose other issues you should go ahead and address. Test and review the fix itself, then answer all open comments in one push rather than one push per comment.
- Verify changes on the **staging deployment**, not just locally. "Works on my machine" is not done; "verified on staging" is.
- **Never merge PRs.** The human merges.
- **Watch PRs by event, never by timer.** Subscribe, then end the turn — events wake the session. Never arm a scheduled check-in to re-poll a PR. Full posture: `.claude/skills/steward/SKILL.md`.
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
