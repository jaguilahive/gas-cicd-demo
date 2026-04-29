# CI/CD Pipeline Plan — Google Apps Script + GitHub

## 1. Problem statement

Editing scripts directly in the Apps Script web IDE doesn't scale. There's no review gate, no enforced test step, no audit trail tying production code to a specific commit, and no clean rollback. For workloads like a TAR validation web app, an SBIR ETL, or a Tidbits dashboard, those gaps translate into real risk: a Friday "small fix" can quietly break a production trigger and there's no way to bisect what changed.

This pipeline gives us:

- **Single source of truth.** GitHub holds the canonical code; the GAS project is a deployment target, not the master copy.
- **Automated quality gates.** Every PR runs lint + unit tests before it can merge.
- **Two-environment promotion.** `develop` auto-deploys to a staging GAS project; tagged releases on `main` deploy to production.
- **Versioned deployments.** Every prod deploy creates an immutable `clasp version` snapshot tied to the git tag, so rollback is one command.
- **Auditability.** GitHub Actions logs every deploy with commit SHA and actor.

## 2. Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   Developer     │         │   GitHub         │         │   GitHub         │
│   workstation   │ ──push──│   Repository     │──event──│   Actions        │
│   (clasp)       │         │   (main/develop) │         │   (workflows)    │
└─────────────────┘         └──────────────────┘         └────────┬─────────┘
                                                                  │
                                                                  │ clasp push + deploy
                                                                  ▼
                                              ┌───────────────────┴───────────────────┐
                                              ▼                                       ▼
                                     ┌────────────────┐                      ┌────────────────┐
                                     │ GAS Project:   │                      │ GAS Project:   │
                                     │   STAGING      │                      │   PRODUCTION   │
                                     │ (script_id_a)  │                      │ (script_id_b)  │
                                     └────────────────┘                      └────────────────┘
```

Two distinct GAS script projects — one staging, one production — keep blast radius contained. They live under the same Google account so a single set of OAuth credentials covers both.

## 3. Branching and promotion model

| Branch / event              | Trigger             | Pipeline                      | Target                |
|-----------------------------|---------------------|-------------------------------|-----------------------|
| `feature/*`                 | PR opened           | Lint + test                   | none                  |
| `develop`                   | push (post-merge)   | Lint + test + deploy          | Staging GAS project   |
| `main`                      | push (post-merge)   | Lint + test (no deploy)       | none                  |
| GitHub Release on `main`    | release published   | Lint + test + version + deploy| Production GAS project|

Merging to `main` does **not** auto-deploy. Production ships only via a tagged release, forcing a deliberate "ship it" step rather than continuous prod deploys.

## 4. Quality gates

- **ESLint** — `eslint-config-standard` plus `eslint-plugin-googleappsscript` (the latter declares GAS service globals so they don't trip `no-undef`).
- **Jest** — unit tests against pure-JS modules. GAS service calls (SpreadsheetApp, DriveApp, HtmlService, etc.) are mocked via a global setup file.
- **Manifest validation** — `appsscript.json` must parse as JSON and contain a recognized `runtimeVersion`.
- **Format check** (optional) — Prettier in `--check` mode.

What's *not* covered: end-to-end tests against actual Google services. Two paths forward when that matters:

1. `clasp run` from CI to invoke specific functions on staging and assert against Stackdriver logs.
2. [GasT](https://github.com/huan/gast) running inside the GAS project for in-runtime integration tests, kicked off via webhook post-deploy.

For most realistic workloads (data transforms, web app endpoints, schedule triggers), unit-level mocking + a manual smoke test on staging is the right cost/value point.

## 5. Secrets and authentication

Clasp authenticates to Google with an OAuth refresh token stored in `~/.clasprc.json`. The CI flow:

1. Run `clasp login` once on a developer machine.
2. Copy the contents of `~/.clasprc.json` into a GitHub Actions secret named `CLASPRC_JSON`.
3. Each deploy workflow writes that secret back to `~/.clasprc.json` before running clasp commands.
4. Clasp transparently mints a fresh access token from the refresh token on every run.

Secrets used by the workflows:

| Secret name           | Purpose                                  |
|-----------------------|------------------------------------------|
| `CLASPRC_JSON`        | clasp OAuth credentials                  |
| `SCRIPT_ID_STAGING`   | staging GAS script ID                    |
| `SCRIPT_ID_PROD`      | production GAS script ID                 |
| `DEPLOYMENT_ID_PROD`  | stable prod deployment ID (URL)          |

The production workflow targets a GitHub **environment** named `production` with required reviewers configured, adding a human approval gate before any prod deploy executes.

**Caveats to know:**

- The OAuth client used by clasp is shared globally; rare rate-limit hiccups are normal.
- Google can revoke refresh tokens. When it happens: re-run `clasp login` locally and update the secret. (Symptom: clasp errors with `Could not refresh access token`.)
- For an org-grade setup, register your own OAuth client (Google Cloud Console → OAuth consent + credentials) and use `clasp login --creds creds.json` to bypass the shared-client limits.

## 6. Versioning and rollback

Apps Script's deploy model has two concepts:

- A **version** is an immutable snapshot of the code at a point in time.
- A **deployment** is a named pointer (URL) that targets a specific version.

The production workflow:

1. `clasp push -f` — upload source.
2. `clasp version "<release-tag>"` — snapshot it. Returns a version number.
3. `clasp deploy -i $DEPLOYMENT_ID_PROD -V <versionNumber> -d "<release-tag>"` — point the stable deployment at the new version.

**Rollback** = re-run step 3 with the previous version number. The deployment ID is stable, so the web app URL never changes — users don't need anything updated. Capture the deployment ID once after first deploy and store it as `DEPLOYMENT_ID_PROD`.

## 7. Limitations to be honest about

- **Triggers don't deploy via clasp.** Time-based and event triggers are state on the GAS project, not source. Standard pattern: a `Triggers.js` module with an `installTriggers()` function a developer runs once from the GAS UI after the first deploy. The demo includes this.
- **Bound scripts** (attached to a Sheet/Doc) need `--parentId` on initial `clasp create`. After that, `clasp push` works normally.
- **Library dependencies** in `appsscript.json` need their library script IDs to differ if the libraries themselves are environment-split. Worth keeping the manifest under env-aware templating if you go that route.
- **Web app `executeAs` and `access` settings** are in the manifest and ship with the deploy. Be intentional — flipping `executeAs: USER_DEPLOYING` to `USER_ACCESSING` changes the security posture.
- **Service accounts** don't really work for user-bound GAS deploys. The shared-OAuth-client + refresh-token model is the practical pattern.

## 8. Future enhancements

- **Per-PR preview deploys** — ephemeral script project per PR, deploy, post the web app URL as a PR comment, tear down on close.
- **GasT integration tests** triggered post-deploy on staging.
- **semantic-release** to auto-version, generate changelogs, and create GitHub releases from conventional commits.
- **Drift detection** — scheduled job runs `clasp pull` on staging and fails if the remote diverges from the repo (catches manual edits in the GAS UI).
