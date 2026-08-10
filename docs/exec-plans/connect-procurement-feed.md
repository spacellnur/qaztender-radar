# Connect the tender feed to the official procurement service

This draft was superseded on 2026-08-10 by `docs/exec-plans/prepare-live-tender-integration.md`. It must not be used for implementation because its direct-request and demonstration-fallback design was replaced by durable D1 synchronization and a truthful token-waiting state.

This ExecPlan is a living document and follows `C:\Users\aidar\.codex\PLANS.md`. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must remain current.

## Purpose / Big Picture

The tender radar will be ready to replace its demonstration cards with current announcements from the Kazakhstan public-procurement service. A signed-in specialist will continue to use the same search, region, category, and sort controls. Until the deployment owner adds the official access token, the interface remains usable with clearly labelled demonstration records; after the token is configured, the server fetches and normalizes official announcements without exposing that token to a browser.

## Progress

- [x] (2026-08-10 11:20Z) Confirmed the dashboard, company onboarding, authentication, and D1 profile storage already exist.
- [x] (2026-08-10 11:25Z) Confirmed the official service accepts a Bearer token and exposes the announcements registry at `/trd-buy`.
- [x] (2026-08-10 11:35Z) Added the token-aware server adapter and authenticated browser endpoint.
- [x] (2026-08-10 11:35Z) Connected the dashboard to the adapter while retaining the existing filters and safe demonstration fallback.
- [x] (2026-08-10 11:36Z) Built the application and passed all four rendered-worker tests.

## Surprises & Discoveries

- Observation: The current dashboard has functional client-side filters but its five records are embedded in the component.
  Evidence: `app/TenderDashboard.tsx` defines the records and filters them with browser state.

## Decision Log

- Decision: Keep the token only in a server runtime secret named `GOSZAKUP_API_TOKEN`.
  Rationale: The procurement service requires a Bearer token; browser delivery would disclose it to every signed-in user.
  Date/Author: 2026-08-10 / Codex

- Decision: Preserve demonstration records as an explicit fallback when the token has not been configured or the upstream service is temporarily unavailable.
  Rationale: This leaves the current working dashboard demonstrable while making the token the only required production credential.
  Date/Author: 2026-08-10 / Codex

## Outcomes & Retrospective

The mechanism and main page are complete and validated. The dashboard now has one operational prerequisite: add `GOSZAKUP_API_TOKEN` as a deployment secret. Without it, the user sees the existing clearly labelled demo feed; with it, the server requests official announcements and keeps the token private.

## Context and Orientation

This is a vinext application deployed as a Cloudflare-compatible Worker. `app/page.tsx` protects the main page, `app/TenderDashboard.tsx` renders its filters, `app/db.ts` reads company profiles from D1, and `worker/index.ts` passes deployment secrets to server code. An adapter is a small server-only module that translates the official service response into the dashboard's stable tender shape. The official service documents `GET https://ows.goszakup.gov.kz/trd-buy` with an `Authorization: Bearer <token>` header; its response has an `items` array with announcement number, Russian name, publication dates, end date, total amount, method code, and organizer BIN.

## Plan of Work

Create a server-only tender-feed module that returns either official normalized records or the current explicitly marked demonstration records. It will fetch the announcement registry with a short timeout, never serialize the token, and map missing upstream fields to safe display values. Add an authenticated `/api/tenders` route. Extend the dashboard props and browser state so that it starts with demonstration records and replaces them only when the endpoint reports a live feed. The existing local controls will filter either source unchanged. Update runtime environment types and automated worker checks for unauthenticated endpoint protection and the no-token fallback.

## Concrete Steps

Work from `C:\Users\aidar\Documents\Codex\2026-08-10\sites-plugin-sites-openai-bundled`. Add `app/tender-feed.ts` and `app/api/tenders/route.ts`; update `app/TenderDashboard.tsx`, `app/auth.ts`, `worker/index.ts`, and `tests/rendered-html.test.mjs`. Run `pnpm run build` and `node --test tests/rendered-html.test.mjs` from the repository root.

## Validation and Acceptance

With no token, an authenticated dashboard continues to show the demonstration-data label and its search and filters work. The tender endpoint rejects anonymous access. With a valid token installed as a deployment secret, the endpoint returns normalized official announcements and the page displays the live-data label without ever rendering the token. The build and rendered-worker tests complete successfully.

## Idempotence and Recovery

The token is read-only configuration and no migration is needed. If the official service is unavailable, the adapter returns the existing demonstration feed rather than failing the dashboard. Removing the secret returns the application to that safe fallback.

## Artifacts and Notes

The official documentation requires a Bearer authorization header and describes the announcements registry response. The adapter intentionally fetches only the initial page; pagination and periodic synchronization are future work once operational usage is confirmed.

## Interfaces and Dependencies

`app/tender-feed.ts` will export `loadTenderFeed(): Promise<TenderFeed>` and `TenderRecord`. `TenderFeed` has `source`, `notice`, and `tenders`. `app/api/tenders/route.ts` returns this object only to a valid signed-in session. `GOSZAKUP_API_TOKEN` is optional at build time and required only to activate live records.

Revision note (2026-08-10): Created after confirming that authentication, company profiles, and the filter UI are complete; the official API token is the final required operational input.

Revision note (2026-08-10 11:36Z): Added the official registry adapter, protected endpoint, live/demo UI state, and endpoint protection test; production build and all rendered-worker tests passed.
