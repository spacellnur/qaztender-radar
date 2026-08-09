# Add secure administrator authentication

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds. This plan follows `C:\Users\aidar\.codex\PLANS.md`.

## Purpose / Big Picture

After this change, the tender dashboard is no longer visible until a user signs in. The initial account is the site owner and receives the role “Главный администратор”. A human can verify the behavior by opening the site, seeing the login screen, entering the configured credentials, reaching the dashboard, and signing out. The design reserves stable role identifiers for future tender specialists and guests.

## Progress

- [x] (2026-08-10 03:10Z) Inspected the vinext worker, dashboard, tests, and Sites runtime guidance.
- [x] (2026-08-10 03:19Z) Implemented the credential verifier, signed session, login/logout routes, and protected page.
- [x] (2026-08-10 03:19Z) Added the login interface and authenticated account controls.
- [x] (2026-08-10 03:24Z) Built and tested unauthorized, invalid-login, valid-login, and logout behavior.
- [x] (2026-08-10 03:28Z) Stored credentials as deployment secrets and published the validated private version.

## Surprises & Discoveries

- Observation: The deployed site already has owner-only Sites access, but the requested product login is a separate application-level gate.
  Evidence: `.openai/hosting.json` identifies an existing private Sites project while the current `app/page.tsx` renders without checking a product session.

## Decision Log

- Decision: Keep the first administrator in runtime secrets and encode the authorization role in the signed session.
  Rationale: One requested account does not yet justify a user database. The password remains outside source control, while the role-shaped session can later be backed by a database without changing the dashboard contract.
  Date/Author: 2026-08-10 / Codex

- Decision: Use PBKDF2-SHA-256 for password verification and HMAC-SHA-256 for session signing through the Web Crypto API.
  Rationale: These primitives are available in Cloudflare Workers and Node, require no additional dependency, and permit constant-time comparison of derived bytes.
  Date/Author: 2026-08-10 / Codex

## Outcomes & Retrospective

The authentication milestone is complete. Anonymous visitors now reach the Russian login screen, the configured owner account receives the “Главный администратор” role, authenticated sessions open the tender dashboard, and logout revokes browser access. The credential verifier stores no plaintext password, and the production runtime received only secret environment entries. Version 2 was deployed privately at `https://qaztender-radar-demo.carmarew.chatgpt.site`. Future tender-specialist and guest accounts remain intentionally deferred until their permissions and storage model are defined.

## Context and Orientation

This repository is a vinext application deployed as a Cloudflare-compatible Worker. `worker/index.ts` receives runtime bindings and delegates requests to the vinext router. `app/page.tsx` renders the tender dashboard, while `app/TenderDashboard.tsx` owns its browser interactions. New route handlers under `app/api/auth/` will create and clear the application session. A session is a short signed value stored in a browser cookie; signing lets the server detect tampering without storing session state.

## Plan of Work

Create a server-only authentication module that reads the configured administrator username, PBKDF2 password hash, and session signing secret from runtime bindings. Add login, logout, and session API routes. Protect the home page on the server and redirect anonymous visitors to a dedicated login page. Update the dashboard account area to display the administrator role and provide logout. Keep the plaintext password out of every tracked file and add only placeholder environment documentation.

## Concrete Steps

Work from `C:\Users\aidar\Documents\Codex\2026-08-10\sites-plugin-sites-openai-bundled`. Add the authentication module and route handlers, then update the page, dashboard, stylesheet, worker binding types, and rendered-worker tests. Run `pnpm run build`, followed by `node --test tests/rendered-html.test.mjs`, using the bundled Node runtime on `PATH`. Generate the password hash and session key locally, store them through the Sites environment-variable interface as secrets, save a new source version, and deploy it privately.

## Validation and Acceptance

An anonymous request to `/` must redirect to `/login`. The login page must render in Russian and must not reveal whether the username or password was wrong. An invalid credential pair must return HTTP 401 without setting a session. A valid pair must set a Secure, HttpOnly, SameSite=Lax cookie and permit the dashboard to render with the “Главный администратор” role. Logout must clear the cookie, after which `/` redirects again. The production build and all rendered-worker tests must pass.

## Idempotence and Recovery

Builds, tests, and secret updates are repeatable. No plaintext credential is written to disk. A failed deployment leaves the previous private version active. Rotating either the password hash or session secret is safe; rotating the session secret immediately invalidates existing sessions.

## Artifacts and Notes

ESLint completed without errors. The production build generated the protected page, login page, and three authentication API routes. The rendered-worker suite reported three tests passed and zero failed, covering anonymous redirect, invalid credentials, authenticated dashboard rendering, secure cookie attributes, and logout. Sites version 2 deployed successfully with environment revision 1. Secret values and password-derived material are not copied into this document.

## Interfaces and Dependencies

`app/auth.ts` defines `AppRole`, `AppSession`, `verifyCredentials(username, password)`, `createSession(username, role)`, `readSessionFromRequest(request)`, and cookie helpers. `app/api/auth/login/route.ts` accepts JSON `{ username, password }`. `app/api/auth/logout/route.ts` clears the cookie. `app/api/auth/session/route.ts` returns the current authenticated identity. No new runtime package is required.

Revision note (2026-08-10): Created the plan after inspecting the existing private dashboard and selecting a secret-backed initial administrator that can evolve into database-backed roles.

Revision note (2026-08-10 03:24Z): Updated implementation progress, local validation evidence, and the remaining deployment step after completing the authenticated flow.

Revision note (2026-08-10 03:28Z): Marked the plan complete and recorded the private version 2 deployment after production reported success with the configured secret revision.
