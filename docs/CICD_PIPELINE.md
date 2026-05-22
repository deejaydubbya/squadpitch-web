# CI/CD Pipeline — squadpitch-web

GitHub Actions handles two responsibilities for this repo:

- **CI** (`.github/workflows/ci.yml`) — runs on every pull request and on
  every push to `main` / `master`. Required PR gate.
- **Deploy** (`.github/workflows/deploy.yml`) — runs only on push to the
  default branch (after CI passes). Deploys to Fly.io.

## Required PR gate

Before a PR can merge, CI must be green. CI runs:

1. `npm ci`
2. `npm run lint` — `next lint` (ESLint config in `.eslintrc.json`)
3. `npm test` — Vitest unit suite
4. `npm run build` — `next build`, which also performs the TypeScript
   typecheck pass. No separate `tsc --noEmit` step is needed.

CI sets the `NEXT_PUBLIC_*` env vars to the same values used in `fly.toml`
so the CI build mirrors production. These are public flags — no secret
material in the build environment.

## Deploy

`deploy.yml` is triggered via `workflow_run` — it fires only **after** the
`CI` workflow completes successfully on a push to `main` / `master`. A
failing CI run never triggers a deploy, so the "don't deploy if tests
fail" gate holds even for direct pushes that bypass branch protection.
The deploy step uses `superfly/flyctl-actions/setup-flyctl@master` and
runs `flyctl deploy --remote-only`, checked out at the exact SHA that CI
validated.

## Playwright e2e — deferred

This repo has Playwright configured (`test:e2e` script) but **it is not
part of the required CI gate** today. Playwright needs a running dev
server + browser install, which adds 2–5 min to every PR and isn't worth
the latency for the early-stage pipeline.

Recommended future setup once the basic pipeline is stable:

- **Required PR checks** (today): lint, vitest, build.
- **Optional / manual workflow**: a separate `e2e.yml` triggered via
  `workflow_dispatch` so a reviewer can run Playwright on demand against
  a PR branch.
- **Later nightly workflow**: scheduled (`on: schedule:`) Playwright run
  against the deployed staging URL — catches regressions that unit tests
  miss without blocking the merge queue.

When you add it, install browsers in the workflow with
`npx playwright install --with-deps chromium` and run
`npx playwright test` against either a fresh `next dev` (slower, more
isolated) or `https://squadpitch-web.fly.dev` (faster, but couples tests
to deploy state).

## Required GitHub repo secrets

| Secret | Source | Purpose |
|---|---|---|
| `FLY_API_TOKEN` | `fly tokens create deploy -a squadpitch-web` | Authenticates `flyctl deploy` |

Set it via `gh secret set FLY_API_TOKEN` or in the GitHub UI under
**Settings → Secrets and variables → Actions**.

## Manual rollbacks

```bash
fly releases -a squadpitch-web
fly deploy --image <prior-image> -a squadpitch-web
```
