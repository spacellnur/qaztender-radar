# Prepare the live Goszakup tender integration

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds. This plan is maintained in accordance with `C:\Users\aidar\Documents\Codex\PLANS.md`.

## Purpose / Big Picture

QazTender Radar must stop presenting demonstration tenders and become ready for official Kazakhstan procurement data. After this change, an authenticated administrator will see an honest “waiting for API token” state, useful filters for real records, and a manual synchronization control. Once the operator issues the token, the only required configuration will be saving it as the server-only `GOSZAKUP_API_TOKEN` secret and starting the first synchronization; no source-code edit should be necessary.

## Progress

- [x] (2026-08-10 11:15Z) Read the repository rules, the Sites capability guidance, the current dashboard, database schema, authentication flow, and official Goszakup V3 GraphQL schema.
- [x] (2026-08-10 11:26Z) Added durable tender and synchronization tables with query-driven indexes and generated `drizzle/0001_fluffy_joseph.sql`.
- [x] (2026-08-10 11:26Z) Added the server-only Goszakup V3 client, normalization boundary, D1 persistence helpers, authenticated read endpoint, and chief-administrator-only synchronization endpoint.
- [x] (2026-08-10 11:26Z) Replaced demonstration records with database-backed tenders and clear waiting, ready-to-sync, ready, and error states.
- [x] (2026-08-10 11:26Z) Added filters for text, every Kazakhstan region, subject, budget, construction work, and deadline while preserving responsive behavior.
- [x] (2026-08-10 11:26Z) Extended tests for the token-missing state and synchronization authorization; lint, production build, and all four worker tests pass.
- [ ] Publish the validated private site and record the outcome.

## Surprises & Discoveries

- Observation: The existing dashboard embeds five demonstration tenders directly in `app/TenderDashboard.tsx`, while the application already has D1 persistence for users and company profiles.
  Evidence: `db/schema.ts` contains only `users` and `company_profiles`; `app/TenderDashboard.tsx` declares a static `tenders` array.

- Observation: The official V3 GraphQL schema exposes announcements through `TrdBuy` with pagination by `after`, a maximum page size of 200, KATO delivery-place codes, budget, dates, subject type, construction flag, and nested lots.
  Evidence: The official schema at `https://ows.goszakup.gov.kz/help/v3/schema/` documents `TrdBuy(filter, limit, after)` and the scalar fields used by this plan.

- Observation: An overlapping draft adapter appeared during implementation and used a direct legacy-style endpoint plus demonstration fallback.
  Evidence: The draft `app/tender-feed.ts` contained five fabricated records and `/trd-buy`; it was reconciled into a compatibility export with no demonstration data, while its plan was marked superseded.

## Decision Log

- Decision: Store the API token only in the hosted server environment under `GOSZAKUP_API_TOKEN` and never return it from a route or render it into HTML.
  Rationale: The token authorizes access to the official service and must not be exposed to browsers, logs, screenshots, or the repository.
  Date/Author: 2026-08-10 / Codex

- Decision: Synchronize announcements into D1 instead of querying Goszakup directly from every page load.
  Rationale: Durable local records make filters fast, preserve service availability during upstream interruptions, and avoid sending the secret token to the browser.
  Date/Author: 2026-08-10 / Codex

- Decision: Use only documented V3 scalar fields in the first query and translate method/subject identifiers locally until reference dictionaries are synchronized in a later milestone.
  Rationale: This minimizes schema risk and makes the first token-backed request independently verifiable.
  Date/Author: 2026-08-10 / Codex

- Decision: Do not fabricate suitability scores while no real record or complete matching evidence exists.
  Rationale: The page should clearly distinguish verified procurement fields from later recommendation logic.
  Date/Author: 2026-08-10 / Codex

## Outcomes & Retrospective

The implementation is complete and locally validated. The dashboard now contains no demonstration procurement claims, displays a truthful waiting state, offers useful filters before data arrives, and stores future official records durably. The server-only client uses the documented GraphQL V3 schema and Bearer authorization; the token is the sole missing configuration. Four worker tests pass, lint reports no errors, and the production build succeeds. Private publication remains as the final milestone.

## Context and Orientation

This repository is a Vinext application deployed as a Cloudflare-compatible worker. `app/page.tsx` authenticates the visitor and renders the home page. `app/TenderDashboard.tsx` owns browser-side filters and currently contains demonstration data. `app/auth.ts` signs application sessions. `app/db.ts` is the small D1 access layer, while `db/schema.ts` defines the SQLite-compatible schema and `drizzle/` stores generated migrations. `worker/index.ts` copies hosted environment bindings into a server-only runtime object before Vinext handles each request. `.openai/hosting.json` declares the existing D1 binding as `DB`.

“Synchronization” means one authenticated server request to the official Goszakup GraphQL endpoint followed by safe insert-or-update operations in D1. “Normalization” means converting official field names and formats into the stable tender shape used by this application. KATO is Kazakhstan’s administrative-territorial code; the first two digits identify the region and are sufficient for the region filter used here.

## Plan of Work

Extend `db/schema.ts` with `tenders` and `tender_sync_runs`. Add indexes matching the page queries: region plus closing date, closing date alone, budget, and last upstream update. Generate and inspect a Drizzle migration so an existing deployed database upgrades without losing users or profiles.

Create `app/goszakup.ts` for the official endpoint, Bearer authorization, documented GraphQL query, response validation, KATO-to-region normalization, and safe error messages. Extend `app/db.ts` with tender upsert, listing, sync-run, and profile-reading functions. Create `app/api/tenders/sync/route.ts`; it must require a valid `super_admin` session, return a configuration-required response when the secret is missing, invoke the shared synchronization function when present, and never include the token in any response.

Change `app/page.tsx` to read real tenders and source status from D1. Replace `app/TenderDashboard.tsx` with a dashboard that accepts records as props, contains no demonstration array, and provides text, region, subject, budget, construction-only, deadline, and sort controls. When there are no records, show whether the token is still pending, a first synchronization is required, or a synchronization failed. Only the chief administrator should see the synchronization button.

Update tests to provide a small in-memory D1-compatible stub for read queries, verify the waiting state, verify that anonymous synchronization is rejected, and verify that a configured-token path can be tested with a stubbed upstream response if practical. Run the generated migration check, production build, test suite, and lint before publishing.

## Concrete Steps

Work from `C:\Users\aidar\Documents\Codex\2026-08-10\sites-plugin-sites-openai-bundled`. Edit the schema and server modules, then run `pnpm db:generate` and inspect the new SQL under `drizzle/`. Run `pnpm build`, `pnpm test`, and `pnpm lint`. A successful build must produce `dist/server/index.js`; the tests must report zero failures. Package and publish the exact validated source through the existing private Sites project.

When a real token arrives, save it as the hosted secret named `GOSZAKUP_API_TOKEN`. Do not write it to `.env.example`, Git, an ExecPlan, or chat. Sign in as the chief administrator, press “Синхронизировать”, and expect the page to report the number of received and saved records. Refreshing the page must then show only records read from D1.

## Validation and Acceptance

Without a token, the authenticated home page must display “Ожидается API-токен”, zero tenders, enabled filters, and no demonstration procurement claims. An anonymous POST to `/api/tenders/sync` must return HTTP 403. A chief-administrator POST without the secret must return HTTP 503 with a concise configuration-required message. After a test upstream response is normalized and stored, the page must display its announcement number, title, buyer, budget, region, subject type, closing date, official-source link, and source update status. Filtering must change the visible count without network access. Repeating a synchronization with the same external IDs must update rows rather than duplicate them.

## Idempotence and Recovery

Both schema creation and tender synchronization are additive and repeatable. Official IDs are unique, so repeated imports use upserts. A failed upstream request records a failed run but does not delete previously saved tenders. If a migration or deployment fails, the prior site version and its existing D1 data remain intact; correct the source and retry. Removing the token disables new synchronization but does not expose or erase stored records.

## Artifacts and Notes

The official V3 endpoint is `https://ows.goszakup.gov.kz/v3/graphql`. Requests use JSON and `Authorization: Bearer <token>`. The first query uses `TrdBuy` with at most 200 records and these documented fields: `id`, `numberAnno`, `nameRu`, `totalSum`, `refTradeMethodsId`, `refSubjectTypeId`, `customerBin`, `customerNameRu`, `refBuyStatusId`, `startDate`, `endDate`, `publishDate`, `isConstructionWork`, `lastUpdateDate`, `kato`, `systemId`, and `indexDate`.

## Interfaces and Dependencies

`app/goszakup.ts` must export a normalized `TenderRecord`, `isGoszakupConfigured()`, and `synchronizeGoszakupTenders()`. The client reads `GOSZAKUP_API_TOKEN` only through the server runtime object. `app/db.ts` must export `listTenders()`, `getTenderSourceStatus()`, `upsertTenders(records)`, and sync-run helpers. `app/TenderDashboard.tsx` must receive `tenders`, `sourceStatus`, `username`, and `role` as props and must not import or contain credentials. No new runtime package is required.

Revision note (2026-08-10): Created the self-contained implementation plan after inspecting the existing authenticated dashboard, D1 architecture, Sites rules, and official Goszakup V3 schema. The plan makes the token the final missing configuration rather than a prerequisite for product work.

Revision note (2026-08-10 11:26Z): Recorded the completed D1 schema, migration, official V3 adapter, protected synchronization endpoints, factual dashboard, filters, removal of the overlapping demo fallback, and successful lint/build/test evidence. Publication remains.
