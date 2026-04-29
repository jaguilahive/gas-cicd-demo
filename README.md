# GAS CI/CD Demo

A reference CI/CD pipeline for Google Apps Script using GitHub Actions and [clasp](https://github.com/google/clasp).

See [`PLAN.md`](./PLAN.md) for the architecture rationale, branching model, and limitations.

## What's in here

```
.
├── .github/workflows/
│   ├── ci.yml                   # Lint + test on PRs and develop pushes
│   ├── deploy-staging.yml       # develop → staging GAS project
│   ├── deploy-prod.yml          # release tag → production GAS project
│   └── rollback-prod.yml        # manual: point prod at a prior version
├── src/
│   ├── appsscript.json          # GAS manifest
│   ├── Code.js                  # Web app entry points (doGet, server endpoints)
│   ├── Utils.js                 # Pure logic — fully unit-testable
│   ├── Triggers.js              # One-time installer for time-based triggers
│   └── index.html               # Web app UI (uses google.script.run)
├── tests/
│   ├── setup.js                 # Mocks GAS service globals for Jest
│   ├── Utils.test.js            # 15+ tests covering branches, validation, sanitization
│   └── Code.test.js             # Tests endpoints with mocked HtmlService
├── .clasp.json.example          # Real .clasp.json is gitignored, written by CI
├── .claspignore
├── .eslintrc.json
├── jest.config.js
├── package.json
├── PLAN.md
└── README.md
```

## One-time setup

### 1. Fork and clone

```bash
git clone <your-fork-url>
cd gas-cicd-demo
npm ci
```

### 2. Create two GAS script projects

In a browser, log in as the Google account that will own the deployments and create two new standalone Apps Script projects:

- **Staging**: name it something like `MyApp [Staging]`. Note its script ID from the URL: `https://script.google.com/.../d/<SCRIPT_ID>/edit`.
- **Production**: name it `MyApp [Production]`. Note its script ID.

### 3. Get clasp credentials

On your local machine:

```bash
npx clasp login
```

This opens a browser, you authorize, and clasp writes `~/.clasprc.json`. That file is what CI needs.

```bash
cat ~/.clasprc.json
```

Copy the entire output — you'll paste it into a GitHub secret.

### 4. Add GitHub secrets

In your repo → **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|--------|-------|
| `CLASPRC_JSON` | The full contents of `~/.clasprc.json` from step 3 |
| `SCRIPT_ID_STAGING` | The staging script ID from step 2 |
| `SCRIPT_ID_PROD` | The production script ID from step 2 |
| `DEPLOYMENT_ID_PROD` | (added after first prod deploy — see step 6) |

### 5. Add GitHub environments (recommended)

In **Settings → Environments**:

- Create `staging` (no protections needed).
- Create `production` and add yourself as a required reviewer. This makes prod deploys pause for an explicit approval click.

### 6. First production deploy and capturing the deployment ID

Push code to `develop` → staging deploys automatically.

For the first production deploy:

1. Merge `develop` into `main` and create a GitHub Release (e.g. tag `v1.0.0`).
2. The `deploy-prod.yml` workflow runs, and because `DEPLOYMENT_ID_PROD` isn't set yet, it creates a *new* deployment instead of updating one.
3. Check the workflow logs — clasp prints something like `Created deployment AKfycby...XYZ`.
4. Copy that deployment ID and add it as `DEPLOYMENT_ID_PROD`.

From then on, every production deploy updates that same deployment, keeping the web app URL stable.

### 7. Install triggers (one-time per environment)

Triggers don't deploy via clasp — they're project state. After the first deploy to each environment:

1. Open the GAS project in the browser (`npx clasp open` from a configured local clone, or paste the script ID into a GAS URL).
2. Run the `installTriggers` function manually from the editor.
3. Re-run it any time the trigger configuration in `Triggers.js` changes.

## Day-to-day workflow

```bash
# Start a feature
git checkout -b feature/my-thing develop

# ... write code, write tests ...

npm run lint
npm test

git push origin feature/my-thing
# Open PR targeting develop → CI runs lint + tests
# Merge → deploy-staging.yml fires → staging GAS project updated

# When ready to ship
git checkout main
git merge develop
git push origin main
# In GitHub UI: create a Release with tag like v1.2.0
# → deploy-prod.yml fires → production GAS project updated
```

## Local development

```bash
# Lint
npm run lint
npm run lint:fix

# Tests
npm test
npm run test:watch
npm run test:coverage

# Push to a personal staging project (skip the CI flow for fast iteration)
cp .clasp.json.example .clasp.json
# edit .clasp.json with your personal staging script ID
npx clasp push -f
npx clasp open
```

## Rollback

If a prod deploy goes bad:

1. Go to **Actions → Rollback Production → Run workflow**.
2. Enter the version number you want to roll back to (find it in the run summary of an earlier `deploy-prod.yml` run, or via `npx clasp versions` against your prod project).
3. Provide a reason (logged for audit).
4. Approve the production environment gate.

Because the deployment ID is stable, the web app URL doesn't change — users see the rolled-back code immediately.

## Troubleshooting

**`Could not refresh access token`** — your stored refresh token has been revoked. Re-run `clasp login` locally and update the `CLASPRC_JSON` secret.

**`User has not enabled the Apps Script API`** — visit https://script.google.com/home/usersettings and toggle the API on for the deploying account.

**Tests pass locally but lint fails in CI** — make sure you committed any new top-level functions referenced cross-file as `globals` entries in `.eslintrc.json`.

**Web app URL changed after deploy** — `DEPLOYMENT_ID_PROD` isn't set or is wrong. The workflow fell through to creating a new deployment. Capture the new ID from the run logs and update the secret.
