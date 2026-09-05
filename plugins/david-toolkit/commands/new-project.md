---
description: Bootstrap a new paved-road app — repo, Azure staging+prod hosting, per-project OIDC, rulesets, first deploy — from one conversation. Ends with two live URLs and an idea spec ready for /orc. Use when starting a new project; not for feature work on existing apps.
---

# New Project Bootstrap

You are bootstrapping a new app onto the paved road: a GitHub repo in `DavidJGarcia-apps`, staging + production Azure Web Apps, per-project OIDC deploy identities, branch rulesets, and a proven deploy pipeline. You are **not** designing or building the app itself — the deliverable is working infrastructure plus a seeded idea spec; feature work happens afterwards via `/orc`.

Authoritative context (read before provisioning): the private `DavidJGarcia-apps/platform` repo — `docs/org-context.md` (names, budget, conventions) and `README.md` (workflow contract). This command assumes those exist; if unreachable, stop and say so.

## Phase 1 — Gather and confirm

Ask clarifying questions as **one numbered list directly in chat** (never the interactive question widget). Minimum: project name (lowercase, no underscores — it becomes repo and app names), a one-paragraph description of the idea, the runtime (**Node**, the default, or **Python**; both ride the same workflows via the `runtime` input), and anything that changes infrastructure shape (expected users beyond family? public or private repo? unusual runtime needs?).

Then echo back the full plan: repo `DavidJGarcia-apps/<name>`, web apps `<name>` + `<name>-staging` on the shared `apps-plan` (marginal cost ≈ $0), two app registrations, ruleset, and the proof flow. **Get an explicit confirmation before creating anything** — repos and Azure resources are real even when cheap.

## Phase 2 — Preflight

- `az account show` matches the subscription in org-context; `gh auth status` works and can see `DavidJGarcia-apps`.
- The workflows the callers will pin actually resolve: `gh api repos/DavidJGarcia-apps/platform/git/ref/tags/v1` succeeds. If it 404s, stop — the platform repo's `v1` tag is missing and every caller workflow would fail at dispatch.
- Names are free: `gh repo view DavidJGarcia-apps/<name>` fails, `az webapp show -g apps-rg -n <name>` and `-n <name>-staging` fail. If a piece already exists, this may be a resume — inventory what exists, report it, and continue idempotently (every step below checks before creating).

## Phase 3 — Seed the stub repo (local first)

Create the project directory with the **pipeline-proving stub** — dependency-free, framework-free; the first real build replaces it:

- `server.js` — `node:http` server: `GET /` returns a small HTML page ("<name> — paved road stub" + the idea's one-liner), `GET /healthz` returns `200` JSON `{"status":"ok"}`. Listens on `process.env.PORT || 3000`.
- `build.mjs` — `node:fs`: recreate `deploy/`, copy `server.js` in, write `deploy/package.json` `{name, "scripts": {"start": "node server.js"}}`.
- `package.json` — `{"name": "<name>", "private": true, "engines": {"node": ">=22"}, "scripts": {"test": "node --test", "build": "node build.mjs"}}`.
- `test/healthz.test.js` — `node:test`: start the server on an ephemeral port, assert `/healthz` → 200 and `/` → 200.
- `.nvmrc` → `22`. `.gitignore` → `node_modules/`, `deploy/`, `.env`.
- `.github/workflows/staging.yml` and `production.yml` — thin callers exactly per `platform/README.md` (staging: `pull_request` types `[opened, synchronize, reopened, closed]`, concurrency group `staging` — one constant group per repo so concurrent PRs serialize against the single staging app — with cancel-in-progress, job id `ci`, `uses: DavidJGarcia-apps/platform/.github/workflows/staging.yml@v1` with `app: <name>` and the documented `permissions`; production: `push` to `main`, concurrency `production` no-cancel, job id `ci`, `uses: .../production.yml@v1`). If this text and `platform/README.md` ever disagree, the README wins.
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

Run `npm install` (generates `package-lock.json` — **commit it**; the reusable workflows run `npm ci`, which fails without a lockfile even for zero-dependency projects), then `npm test` and `npm run build`; all must pass before anything is provisioned.

### Python variant

When the runtime is Python, the stub is the same shape in Python and there is no `package.json` at all:

- `app.py` — stdlib WSGI callable `app`: `GET /` returns the small HTML page, `GET /healthz` returns `200` JSON `{"status":"ok"}`; `python app.py` serves it with `wsgiref` on `$PORT` (default 8000).
- `build.py` — recreate `deploy/`, copy `app.py` (and any package) in, copy `requirements.txt` in.
- `requirements.txt` — `gunicorn>=23,<24` and nothing else; the App Service build installs it on deploy.
- `test/test_healthz.py` — `unittest`: call the WSGI app in-process, assert `/healthz` → 200 and `/` → 200.
- `.python-version` → `3.12` (the runner image's `python3` and the web app runtime must both match it). `.gitignore` → `deploy/`, `__pycache__/`, `.venv/`, `.env`.
- The thin callers pass `runtime: python` alongside `app: <name>`.

Run `python3 -m unittest discover -s test` and `python3 build.py`; both must pass before anything is provisioned. Keep app settings and env names project-prefixed (`<NAME>_STORAGE_ACCOUNT`, not `STORAGE_ACCOUNT`): the reusable workflow exports its own env on the runner and an app's tests will read it.

## Phase 4 — Azure resources

All in `apps-rg`, South Central US, on `apps-plan` (per org-context; if org-context names differ, org-context wins):

1. `az webapp create -g apps-rg -p apps-plan -n <name> --runtime "NODE:22-lts"` (Python: `--runtime "PYTHON:3.12"`) and the same for `<name>-staging`. (`az webapp show` first — skip if present.)
2. For both apps: `az webapp config set --always-on true`, `az webapp update --set httpsOnly=true` (auth cookies must never travel over plain HTTP), and `az webapp config appsettings set --settings SCM_DO_BUILD_DURING_DEPLOYMENT=false NODE_ENV=production` (prebuilt self-contained zips; NODE_ENV so libraries that key on it behave as production). Python instead: `SCM_DO_BUILD_DURING_DEPLOYMENT=true` (the App Service build installs `requirements.txt` into `antenv` on deploy) and no `NODE_ENV`.
3. Python only, and only **after** the first successful production deploy in Phase 6: set the startup command `command -v gunicorn >/dev/null && exec gunicorn --bind=0.0.0.0:8000 --worker-class gthread --workers 1 --threads 8 --timeout 600 app:app || exec python app.py` on both apps (`az webapp config set --startup-file`). A startup command applied ahead of the code that satisfies it takes the site down until the next restart (learned on project-index, 2026-09-04).
4. Durable data, when the idea needs it: one storage account per environment (`<name>storage`, `<name>staging`; Standard LRS, public blob access off, TLS 1.2), a system-assigned identity on each web app (`az webapp identity assign`), and *Storage Blob Data Contributor* + *Storage Table Data Contributor* for each identity **on its own account only**. Record the decision in the project's `docs/specs/` per the cookbook's `docs/infra-decisions.md`.

## Phase 5 — Identity (per-project OIDC, two principals)

For each of `staging` and `prod`:

1. `az ad app create --display-name <name>-<env>-deployer` → record `appId`; `az ad sp create --id <appId>` (idempotent: 'already exists' is fine) → record SP object id.
2. Federated credentials (`az ad app federated-credential create --id <appId>`), **two per app**: issuer `https://token.actions.githubusercontent.com`, audiences `["api://AzureADTokenExchange"]`, one credential with the classic subject and one with the ID-stamped subject the org actually presents (formats and ids in `platform/docs/org-context.md`; the repo id comes from `gh api repos/DavidJGarcia-apps/<name> --jq .id` after Phase 6 step 1, so create the ID-stamped pair then):
   - staging: `repo:DavidJGarcia-apps/<name>:pull_request` and `repo:DavidJGarcia-apps@<org-id>/<name>@<repo-id>:pull_request`
   - prod: `repo:DavidJGarcia-apps/<name>:ref:refs/heads/main` and `repo:DavidJGarcia-apps@<org-id>/<name>@<repo-id>:ref:refs/heads/main`
   Classic-only credentials fail the first deploy with `AADSTS700213`.
3. RBAC (`az role assignment create --assignee-object-id <sp> --assignee-principal-type ServicePrincipal`):
   - staging deployer → `Website Contributor` scoped to the **staging web app resource id only**, plus `Storage Blob Data Contributor` scoped to the CI screenshots container — account and container names come from `platform/docs/org-context.md` ("CI screenshots" entry), never from this file.
   - prod deployer → `Website Contributor` scoped to the **production web app resource id only**.

Never assign subscription- or RG-level roles. Role assignments can take ~1–2 min to propagate; if the first deploy 403s, wait and retry before debugging.

**Windows/git-bash gotcha:** `--scope "/subscriptions/..."` gets mangled by MSYS path conversion into a `C:/Program Files/Git/...` path, and `az` fails with `MissingSubscription`. Prefix the command with `MSYS_NO_PATHCONV=1` (or run via PowerShell) for every `az` call that takes a `--scope`.

## Phase 6 — GitHub repo and wiring

1. `gh repo create DavidJGarcia-apps/<name> --private` (public only if the human said so) — **created empty; do not push yet.**
2. Repo variables FIRST (`gh variable set ... -R DavidJGarcia-apps/<name>`): `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` (values from org-context), `AZURE_STAGING_CLIENT_ID`, `AZURE_PROD_CLIENT_ID` (the two appIds). The first push triggers the production workflow immediately, and the `vars` context is snapshotted at dispatch — variables set after the push lose the race and the first deploy fails with an empty client-id.
3. Read-only workflow permissions: `gh api -X PUT repos/DavidJGarcia-apps/<name>/actions/permissions/workflow -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false`.
4. Now push the stub as `main` (**before any ruleset exists** — the initial push must not be blocked). The push fires the production workflow. Watch it (`gh run watch` or poll `gh run list`); when green, verify `https://<name>.azurewebsites.net/healthz` returns 200. If it failed on Azure login despite the variables being set, it's likely RBAC propagation — wait a minute and `gh run rerun` rather than re-provisioning.
5. Open the proof PR: branch, trivial visible change (e.g. stub page subtitle), push, `gh pr create`. Wait for the staging run; verify the sticky comment appears with the staging URL and screenshot, and `https://<name>-staging.azurewebsites.net/healthz` returns 200.
6. **Observe the real check name** — `gh pr checks` on the proof PR (reusable-workflow checks render as `caller-job / callee-job`; don't guess it). Then create the full ruleset (`gh api -X POST repos/DavidJGarcia-apps/<name>/rulesets`): target `~DEFAULT_BRANCH`, active; rules: `pull_request` (0 required approvals, no stale-dismiss — solo dev; PRs required), `required_status_checks` with the observed context, `non_fast_forward` (block force-push), and `copilot_code_review` (`review_on_push: true, review_draft_pull_requests: false`).
7. Merge the proof PR once its checks are green. **Bootstrap exception:** this auto-generated proof PR is the one PR the agent merges itself — every later PR is merged by the human. Confirm the merge triggers the production deploy and the PR-close event resets staging; verify prod `/healthz` once more.

## Phase 7 — Manifest, then report

`provision.json` (committed) records everything for trivial retirement: repo full name; web app names + resource ids; app registration appIds + SP object ids; role assignment ids; ruleset id; variables set; created timestamp. Retiring the project = delete the two web apps, the two app registrations (role assignments die with them), and archive/delete the repo.

Final report to the human, in chat: the two URLs, repo link, proof-PR link (showing comment + screenshot), what the ruleset now enforces, and the pointer: "stub is meant to be replaced — run `/orc` with `docs/specs/idea.md` to build the first feature."

## Failure semantics

Idempotent and resumable: re-running after any partial failure must inventory existing pieces (Phase 2 preflight) and continue, never duplicate, never delete. If a step fails three different ways, stop and report exactly what exists so far (from provision.json) and what's blocking — the human should never be left with untracked half-provisioned resources.
