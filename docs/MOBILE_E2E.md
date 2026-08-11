# Mobile E2E regression suite

The suite uses the repository's existing Playwright configuration and runs the
app's production standalone build at a 390×844 representative phone viewport.

## Always-running coverage

`e2e/mobile-readiness.spec.ts` runs without credentials and verifies public
mobile rendering, overflow, touch sizing, PWA metadata, and authorization
gating across the launch viewport matrix.

## Authenticated coverage

`e2e/mobile-authenticated.spec.ts` covers onboarding, bottom navigation, Home,
Quick Create, Posts/agenda, the desktop-recommended notice, More navigation,
workspace switching, Inbox list/thread/back, notifications, and safe empty
states.

It intentionally has no mock-auth bypass. Supply:

- `SQUADPITCH_E2E_STORAGE_STATE`: path to a Playwright storage-state JSON file
  created by completing the real Auth0 login flow against the same local/test
  origin;
- `SQUADPITCH_E2E_WORKSPACE_ID`: an isolated workspace owned by that test user.

Store state files under `playwright/.auth/`; that directory is gitignored. Never
commit session cookies or use a production customer workspace. The suite is
read-only and does not send provider replies, approve content, schedule posts,
or modify billing. Those mutations require seeded disposable records and an
isolated non-production API before they can be safely automated.

## Local execution

```powershell
npx playwright install chromium
$env:SQUADPITCH_E2E_STORAGE_STATE='playwright/.auth/mobile.json'
$env:SQUADPITCH_E2E_WORKSPACE_ID='isolated-test-workspace-id'
npm run test:e2e:mobile
```

Without both variables, public mobile tests run and authenticated tests report
as skipped with the missing-fixture reason.

## CI execution

Provision the storage state as an encrypted CI artifact or generate it during a
secure setup job using the isolated test identity. Export both variables, then
run `npm run test:e2e:mobile`. Do not print the state file. Treat authenticated
skips as a CI configuration failure once the fixture is provisioned.

Failures retain Playwright's screenshot and first-retry trace artifacts. Test
names identify the workflow, and overflow assertions include measured document
and body values.
