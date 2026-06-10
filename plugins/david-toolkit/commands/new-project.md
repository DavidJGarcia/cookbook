---
description: Bootstrap a new paved-road app — repo, Azure staging+prod hosting, per-project OIDC, rulesets, first deploy — from one conversation. Ends with two live URLs and an idea spec ready for /orc. Use when starting a new project; not for feature work on existing apps.
---

# New Project Bootstrap

You are bootstrapping a new app onto the paved road: a GitHub repo in `DavidJGarcia-apps`, staging + production Azure Web Apps, per-project OIDC deploy identities, branch rulesets, and a proven deploy pipeline. You are **not** designing or building the app itself — the deliverable is working infrastructure plus a seeded idea spec; feature work happens afterwards via `/orc`.

Authoritative context (read before provisioning): the private `DavidJGarcia-apps/platform` repo — `docs/org-context.md` (names, budget, conventions) and `README.md` (workflow contract). This command assumes those exist; if unreachable, stop and say so.

## Phase 1 — Gather and confirm

Ask clarifying questions as **one numbered list directly in chat** (never the interactive question widget). Minimum: project name (lowercase, no underscores — it becomes repo and app names), a one-paragraph description of the idea, and anything that changes infrastructure shape (expected users beyond family? public or private repo? unusual runtime needs?).

Then echo back the full plan: repo `DavidJGarcia-apps/<name>`, web apps `<name>` + `<name>-staging` on the shared `apps-plan` (marginal cost ≈ $0), two app registrations, ruleset, and the proof flow. **Get an explicit confirmation before creating anything** — repos and Azure resources are real even when cheap.

## Phase 2 — Preflight

- `az account show` matches the subscription in org-context; `gh auth status` works and can see `DavidJGarcia-apps`.
- Names are free: `gh repo view DavidJGarcia-apps/<name>` fails, `az webapp show -g apps-rg -n <name>` and `-n <name>-staging` fail. If a piece already exists, this may be a resume — inventory what exists, report it, and continue idempotently (every step below checks before creating).

## Phase 3 — Seed the stub repo (local first)

Create the project directory with the **pipeline-proving stub** — dependency-free, framework-free; the first real build replaces it:

- `server.js` — `node:http` server: `GET /` returns a small HTML page ("<name> — paved road stub" + the idea's one-liner), `GET /healthz` returns `200` JSON `{"status":"ok"}`. Listens on `process.env.PORT || 3000`.
- `build.mjs` — `node:fs`: recreate `deploy/`, copy `server.js` in, write `deploy/package.json` `{name, "scripts": {"start": "node server.js"}}`.
- `package.json` — `{"name": "<name>", "private": true, "engines": {"node": ">=22"}, "scripts": {"test": "node --test", "build": "node build.mjs"}}`.
- `test/healthz.test.js` — `node:test`: start the server on an ephemeral port, assert `/healthz` → 200 and `/` → 200.
- `.nvmrc` → `22`. `.gitignore` → `node_modules/`, `deploy/`, `.env`.
- `.github/workflows/staging.yml` and `production.yml` — thin callers exactly per `platform/README.md` (staging: `pull_request` types `[opened, synchronize, reopened, closed]`, concurrency `staging-${{ github.event.pull_request.number }}` cancel-in-progress, job id `ci`, `uses: DavidJGarcia-apps/platform/.github/workflows/staging.yml@v1` with `app: <name>` and the documented `permissions`; production: `push` to `main`, concurrency `production` no-cancel, job id `ci`, `uses: .../production.yml@v1`).
- `AGENTS.md` — from cookbook `templates/AGENTS-house-style.md`, placeholders filled (name, both URLs).
- `CLAUDE.md` — first line `@AGENTS.md`, nothing else needed.
- `.claude/settings.json` (committed) — registers the cookbook marketplace and enables `david-toolkit`, so cloud agents load orc/new-project automatically:
  ```json
  {
    "extraKnownMarketplaces": {
      "david-cookbook": { "source": { "source": "github", "repo": "DavidJGarcia/cookbook" } }
    },
    "enabledPlugins": { "david-toolkit@david-cookbook": true }
  }
  ```
- `docs/specs/idea.md` — the idea paragraph verbatim, plus "Bootstrap date, stub status, next step: run `/orc` for the first feature."
- `provision.json` — see Phase 7; start it now and append as you create things.

Run `npm test` and `npm run build` locally; both must pass before anything is provisioned.

## Phase 4 — Azure resources

All in `apps-rg`, South Central US, on `apps-plan` (per org-context; if org-context names differ, org-context wins):

1. `az webapp create -g apps-rg -p apps-plan -n <name> --runtime "NODE:22-lts"` and the same for `<name>-staging`. (`az webapp show` first — skip if present.)
2. For both apps: `az webapp config set --always-on true` and `az webapp config appsettings set --settings SCM_DO_BUILD_DURING_DEPLOYMENT=false` (we deploy prebuilt, self-contained zips).

## Phase 5 — Identity (per-project OIDC, two principals)

For each of `staging` and `prod`:

1. `az ad app create --display-name <name>-<env>-deployer` → record `appId`; `az ad sp create --id <appId>` (idempotent: 'already exists' is fine) → record SP object id.
2. Federated credential (`az ad app federated-credential create --id <appId>`): issuer `https://token.actions.githubusercontent.com`, audiences `["api://AzureADTokenExchange"]`, subject:
   - staging: `repo:DavidJGarcia-apps/<name>:pull_request`
   - prod: `repo:DavidJGarcia-apps/<name>:ref:refs/heads/main`
3. RBAC (`az role assignment create --assignee-object-id <sp> --assignee-principal-type ServicePrincipal`):
   - staging deployer → `Website Contributor` scoped to the **staging web app resource id only**, plus `Storage Blob Data Contributor` scoped to the `staging-shots` container of `davidjgarciaci` (resource id `.../storageAccounts/davidjgarciaci/blobServices/default/containers/staging-shots`).
   - prod deployer → `Website Contributor` scoped to the **production web app resource id only**.

Never assign subscription- or RG-level roles. Role assignments can take ~1–2 min to propagate; if the first deploy 403s, wait and retry before debugging.

## Phase 6 — GitHub repo and wiring

1. `gh repo create DavidJGarcia-apps/<name> --private` (public only if the human said so), push the stub as `main`. **Push before any ruleset exists** — the initial push must not be blocked.
2. Repo variables (`gh variable set ... -R DavidJGarcia-apps/<name>`): `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` (values from org-context), `AZURE_STAGING_CLIENT_ID`, `AZURE_PROD_CLIENT_ID` (the two appIds).
3. Read-only workflow permissions: `gh api -X PUT repos/DavidJGarcia-apps/<name>/actions/permissions/workflow -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false`.
4. The initial push fires the production workflow. Watch it (`gh run watch` or poll `gh run list`); when green, verify `https://<name>.azurewebsites.net/healthz` returns 200.
5. Open the proof PR: branch, trivial visible change (e.g. stub page subtitle), push, `gh pr create`. Wait for the staging run; verify the sticky comment appears with the staging URL and screenshot, and `https://<name>-staging.azurewebsites.net/healthz` returns 200.
6. **Observe the real check name** — `gh pr checks` on the proof PR (reusable-workflow checks render as `caller-job / callee-job`; don't guess it). Then create the full ruleset (`gh api -X POST repos/DavidJGarcia-apps/<name>/rulesets`): target `~DEFAULT_BRANCH`, active; rules: `pull_request` (0 required approvals, no stale-dismiss — solo dev; PRs required), `required_status_checks` with the observed context, `non_fast_forward` (block force-push), and `copilot_code_review` (`review_on_push: true, review_draft_pull_requests: false`).
7. Merge the proof PR once its checks are green. **Bootstrap exception:** this auto-generated proof PR is the one PR the agent merges itself — every later PR is merged by the human. Confirm the merge triggers the production deploy and the PR-close event resets staging; verify prod `/healthz` once more.

## Phase 7 — Manifest, then report

`provision.json` (committed) records everything for trivial retirement: repo full name; web app names + resource ids; app registration appIds + SP object ids; role assignment ids; ruleset id; variables set; created timestamp. Retiring the project = delete the two web apps, the two app registrations (role assignments die with them), and archive/delete the repo.

Final report to the human, in chat: the two URLs, repo link, proof-PR link (showing comment + screenshot), what the ruleset now enforces, and the pointer: "stub is meant to be replaced — run `/orc` with `docs/specs/idea.md` to build the first feature."

## Failure semantics

Idempotent and resumable: re-running after any partial failure must inventory existing pieces (Phase 2 preflight) and continue, never duplicate, never delete. If a step fails three different ways, stop and report exactly what exists so far (from provision.json) and what's blocking — the human should never be left with untracked half-provisioned resources.
