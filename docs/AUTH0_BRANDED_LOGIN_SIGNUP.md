# Auth0 branded login and signup

Squadpitch continues to delegate passwords, MFA, account recovery, and identity
sessions to Auth0. The application exposes two intentional entry points:

- `/auth/login` opens Auth0 Universal Login in login mode.
- `/auth/signup` validates the local continuation and starts `/auth/login` with
  Auth0's supported `screen_hint=signup` authorization parameter.

Successful signup defaults to `/onboarding`. Pricing CTAs preserve the selected
plan as `/onboarding?selectedPlan=...`; this does not start checkout or require
payment. Existing authenticated users skip the signup prompt and continue
directly. Callback failures return to the public home page with safe,
non-provider-specific copy.

Only root-relative return paths are accepted. Absolute URLs, protocol-relative
URLs, backslashes, and control characters fall back to `/onboarding`.

## Auth0 dashboard changes

In **Auth0 Dashboard > Applications > Applications > Squadpitch**, confirm:

- Application type: **Regular Web Application**
- Allowed Callback URLs:
  `https://app.squadpitch.com/auth/callback`
- Allowed Logout URLs:
  `https://app.squadpitch.com`
- Allowed Web Origins:
  `https://app.squadpitch.com`
- Application Login URI:
  `https://app.squadpitch.com/auth/login`

Keep local development URLs as separate comma-delimited entries only if local
development is actively needed:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000`

In **Authentication > Database**, enable the intended database connection for
the Squadpitch application and ensure **Disable Sign Ups** is off. Configure
password policy, breached-password detection, and MFA in Auth0; Squadpitch
must never receive or store a password.

In **Branding > Universal Login**, use the New Universal Login experience and
set the Squadpitch logo, primary green color, support URL, privacy URL, and
terms URL. Customize both the login and signup prompts. Do not enable a
payment step or Stripe Action in the post-login flow.

## Custom Auth0 domain and DNS

1. In **Branding > Custom Domains**, add `login.squadpitch.com`.
2. Auth0 will display the required CNAME target. At the DNS provider, create
   the `login` CNAME with that exact target. Do not proxy it until Auth0 marks
   verification complete; follow Auth0's displayed proxy guidance afterward.
3. Wait for Auth0 to verify the domain and provision its certificate.
4. Set the web and API `AUTH0_DOMAIN` values to `login.squadpitch.com` without
   a scheme or trailing slash.
5. Ensure the API audience remains the existing
   `https://api.squadpitch.com`; a custom domain does not change the audience.
6. Test login, signup, logout, password reset, email verification, callback
   errors, and an existing session before removing the tenant-domain entries.

Apply server-side settings without committing values:

```powershell
fly secrets set -a squadpitch-web `
  AUTH0_DOMAIN=login.squadpitch.com `
  AUTH0_CLIENT_ID=... AUTH0_CLIENT_SECRET=... AUTH0_SECRET=... `
  AUTH0_AUDIENCE=https://api.squadpitch.com `
  APP_BASE_URL=https://app.squadpitch.com

fly secrets set -a squadpitch-api `
  AUTH0_DOMAIN=login.squadpitch.com `
  AUTH0_AUDIENCE=https://api.squadpitch.com
```

After deployment, verify both:

```text
https://app.squadpitch.com/auth/login?returnTo=%2Fworkspaces
https://app.squadpitch.com/auth/signup?returnTo=%2Fonboarding
```
