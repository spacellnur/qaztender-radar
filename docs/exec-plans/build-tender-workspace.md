# Turn tender discovery into a working participation workspace

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds. This plan must be maintained in accordance with `C:\Users\aidar\.codex\PLANS.md`.

## Purpose / Big Picture

QazTender Radar must progress from a searchable announcement feed into a daily workspace that helps a company decide what to pursue and coordinate participation. The first independently useful milestone lets every signed-in account favorite a tender, assign a participation stage, and reopen the site later without losing that state. Later milestones will add saved searches and alerts, explainable company matching, detailed lots and documents, team tasks, and historical analytics. A user can see the first milestone working by starring a tender, moving it to `Участвуем`, reloading the page, and finding it under the matching workspace tab.

## Progress

- [x] (2026-08-10 15:11Z) Reviewed the competitor analysis, durable project memory, authentication model, D1 access layer, current tender dashboard, migration tooling, tests, and Sites deployment requirements.
- [x] (2026-08-10 15:16Z) Milestone 1: persisted favorites and participation stages per signed-in account, exposed a protected API, and integrated workspace tabs and actions into the dashboard.
- [x] (2026-08-10 15:19Z) Validated Milestone 1 with an inspected additive migration, successful production build, 6 passing application tests, clean lint, and successful private Sites deployment. A real-tender click-through remains unavailable only because the official feed still awaits its API token.
- [x] (2026-08-10 15:31Z) Milestone 2: deployed named saved searches, restore/delete controls, and `off`/`instant`/`daily` notification preferences. Actual Telegram/email delivery remains intentionally deferred until a real feed and delivery channel are connected.
- [x] (2026-08-10 15:29Z) Validated Milestone 2 locally with an inspected additive migration, successful production build, 8 passing application tests, and clean lint.
- [x] (2026-08-10 15:39Z) Milestone 3: deployed specialist-owned profile editing and deterministic region, budget, activity, and license explanations based only on available evidence.
- [x] (2026-08-10 15:37Z) Validated Milestone 3 locally with a successful production build, 10 passing application and matching tests, and clean lint. No schema migration was needed because the existing company profile table already stores all edited fields.
- [ ] Milestone 4: ingest lots, ENS TRU, delivery location, documents, and change history after official API access is available.
- [ ] Milestone 5: add reusable checklists, team assignments, buyer/winner analytics, and grounded document analysis.

## Surprises & Discoveries

- Observation: The app has its own signed session rather than relying solely on Sites identity headers.
  Evidence: `app/auth.ts` issues an HMAC-signed `qaztender_session` cookie for a configured super administrator or a D1-backed tender specialist.

- Observation: The super administrator is not a row in the `users` table and therefore has no `userId` in the session.
  Evidence: `AppSession.userId` is optional, while company onboarding explicitly requires it only for the `tender_specialist` role.

- Observation: D1 already stores structured product data and migrations are packaged during Sites deployment.
  Evidence: `.openai/hosting.json` binds `DB`, `db/schema.ts` defines the schema, and `drizzle/` contains the generated migrations deployed with the Vinext archive.

- Observation: Favorite-only state must preserve stage `none` rather than silently moving a tender into review.
  Evidence: The first database draft lacked `none` in the stored stage enum; the reviewed migration now defaults to `none`, so favorite and stage remain truly independent.

## Decision Log

- Decision: Implement favorites and participation stages before saved searches, notifications, or AI analysis.
  Rationale: This produces useful workflow behavior without the Goszakup token and creates the durable state needed later for reminders, tasks, and win/loss analytics.
  Date/Author: 2026-08-10 / Codex

- Decision: Store both `is_favorite` and `stage` instead of treating favorite as one stage.
  Rationale: A user may favorite a tender while it is also being reviewed, submitted, won, or lost. Independent fields preserve that natural workflow.
  Date/Author: 2026-08-10 / Codex

- Decision: Use a stable string `owner_key` rather than a foreign key to `users`.
  Rationale: Tender specialists can use `user:<id>`, while the configured super administrator can use `admin:<normalized username>` even though that administrator is not stored in D1. Authorization still comes from the signed server session, never from a client-supplied owner key.
  Date/Author: 2026-08-10 / Codex

- Decision: Store no row when a tender is neither favorite nor in an active stage.
  Rationale: Deleting that empty state keeps the table compact and makes reset behavior unambiguous.
  Date/Author: 2026-08-10 / Codex

- Decision: Prepare alert frequency now, but do not collect delivery addresses or claim that messages are already sent.
  Rationale: Saved searches and `instant` or `daily` preferences are useful durable inputs before the Goszakup feed exists. Email and Telegram destinations should be added only with the actual delivery worker, so the interface remains truthful and stores no unnecessary contact data.
  Date/Author: 2026-08-10 / Codex

- Decision: Use evidence labels rather than a numerical win probability or opaque score.
  Rationale: The current announcement feed can compare a company profile with region, budget, procurement subject, and construction classification, but it does not yet contain full lot requirements or documents. The product may say which known conditions align or conflict and must mark licenses as requiring document review; it must not imply a chance of winning.
  Date/Author: 2026-08-10 / Codex

## Outcomes & Retrospective

Milestone 1 is complete and deployed. The dashboard now has account-specific tabs, favorite actions, stage badges, and a detail-panel stage selector backed by an additive D1 table and protected API. The production build, six application tests, lint, archive validation, database migration, and private production deployment all succeeded. A user can exercise the full persistence round-trip as soon as the official feed contains its first tender; no further code change is required for that scenario.

Milestone 2 is complete and deployed. The dashboard now exposes `Мои поиски`, captures the entire current filter state, restores it in one action, stores an honest future alert frequency, and lets the owner delete the preset. The new API derives ownership from the signed session, and the additive migration creates only `saved_searches` plus its owner/name and owner/update indexes. The production build, eight application tests, lint, archive validation, database migration, and private deployment all succeeded. Telegram/email transport remains a later connection task rather than a hidden or simulated feature.

Milestone 3 is complete and deployed. Tender specialists can reopen their existing onboarding form from `Профиль компании`, edit every saved field, and return to the radar. Tender cards and the selected-tender panel use a pure evidence function to label known alignment, explicit conflicts, and missing information. Tests prove both a supported construction match and a budget conflict, and confirm that license applicability remains unknown instead of being inferred. Build, ten tests, lint, archive validation, and private deployment all succeeded.

## Context and Orientation

This repository is the Russian-language QazTender Radar application built with Vinext and hosted by OpenAI Sites. `app/page.tsx` authenticates the visitor, reads tenders and source status from D1 through `app/db.ts`, and passes them to the client component `app/TenderDashboard.tsx`. `app/auth.ts` owns the signed application session. `db/schema.ts` and `drizzle/*.sql` define persistent D1 tables. API route handlers live below `app/api`. `tests/rendered-html.test.mjs` builds the production worker and exercises authentication and protected routes.

A favorite is a personal bookmark that can coexist with any participation stage. A participation stage records the current business decision: `none`, `reviewing`, `participating`, `submitted`, `won`, `lost`, or `skipped`. A workspace tab filters the existing tender feed using favorite or stage state; it does not create a separate copy of a tender. An owner key is a server-derived identifier for the signed account and must never be accepted from the browser.

## Plan of Work

For Milestone 1, extend `db/schema.ts` with a `tender_workflow` table containing an id, owner key, tender id, favorite flag, stage, creation time, and update time. Add a unique index on owner key plus tender id and an index on owner key plus stage because those are the actual read patterns. Generate and inspect the Drizzle migration.

Add a `sessionOwnerKey` helper to `app/auth.ts`. Extend `app/tender-types.ts` with the allowed stage type and the client-facing workflow entry. In `app/db.ts`, add functions to list one owner's entries and to upsert or delete a single entry after confirming the tender exists. Add `app/api/tender-workflow/route.ts`; GET returns only the current account's state, and PUT validates tender id, favorite, and stage before writing. Anonymous requests receive 403.

Update `app/page.tsx` to load the current owner's workflow alongside tenders and pass it into `TenderDashboard`. Update `app/TenderDashboard.tsx` with optimistic favorite and stage changes, a visible error message if saving fails, tabs for all, favorites, reviewing, participating, submitted, won, and lost, favorite buttons on cards, stage badges, and a stage selector in the detail panel. An optimistic update means the screen changes immediately and reverts if the server rejects the write. The existing search and advanced filters continue to apply inside the selected workspace tab.

Update `app/globals.css` so the tabs are horizontally scrollable on small screens, favorite controls are keyboard accessible, and stage controls match the existing visual system. Extend `tests/rendered-html.test.mjs` with dashboard-content assertions and protected API tests. Build, test, lint, deploy privately, and update this living plan.

For Milestone 2, add a `saved_searches` D1 table keyed by a server-derived owner key. Each row stores a short user-visible name, a JSON snapshot of every dashboard filter, an alert frequency of `off`, `instant`, or `daily`, and timestamps. The snapshot includes search text, region, procurement type, budget and deadline presets, construction-only mode, announcement number, customer, method, status, amount range, publication and ending date ranges, financial year, and sort order. Add protected GET, POST, and DELETE behavior in `app/api/saved-searches/route.ts`; ownership always comes from the signed session.

Load saved searches in `app/page.tsx` and add a compact `Мои поиски` panel to `app/TenderDashboard.tsx`. A user can name and save the current filter state, restore it in one click, choose whether future matches should be checked immediately or summarized daily, and delete the preset. The panel must explicitly say that delivery will become active after the official source and notification channel are connected. Extend tests for visibility, anonymous rejection, and invalid frequency validation, then generate the migration, build, test, lint, and deploy.

For Milestone 3, add a parsed `CompanyProfile` model in `app/tender-types.ts` and a `getCompanyProfile` query in `app/db.ts`. Reuse the existing company form for both onboarding and editing by accepting initial values and an editing mode. Add `app/profile/company/page.tsx`, protected so only a tender specialist can edit that specialist's own profile, and link it from the dashboard account area.

Pass the current specialist profile into `app/TenderDashboard.tsx`. For each tender, compare only facts already available: whether the profile includes the tender region, whether the tender budget is within the declared maximum or the maximum is unlimited, and whether the procurement subject or construction classification aligns with a selected business direction. Explicit region or budget conflicts produce `Вне профиля`; two or more supported facts with no conflict produce `Подходит по известным данным`; incomplete evidence produces `Нужно проверить`. The detail panel lists each supporting fact, conflict, and unknown. Licenses are never assumed to satisfy a tender because the source documents are not yet ingested.

Later milestones are intentionally ordered by dependency. Saved searches need the existing filter model; alerts need saved searches plus live synchronization; explainable matching needs editable company profiles and lot requirements; checklists and AI document analysis need official documents; historical analytics need enough awards and contracts to avoid misleading conclusions.

## Concrete Steps

Run all commands from `C:\Users\aidar\Documents\Codex\2026-08-10\sites-plugin-sites-openai-bundled`.

After editing the schema, generate the migration with:

    pnpm db:generate

Inspect the new SQL and confirm it creates only the workflow table and its two intended indexes. Then validate with the bundled Node and pnpm runtimes:

    pnpm build
    node --test tests/rendered-html.test.mjs
    pnpm lint

Expect the production build to complete, every Node test to pass, and ESLint to exit with code zero. Package the exact validated `dist/`, `.openai/hosting.json`, and migrations with the Sites helper, save a new site version from the pushed source commit, deploy it privately, and poll until the deployment succeeds.

## Validation and Acceptance

An authenticated dashboard displays workspace tabs even when there are no tenders. Anonymous GET or PUT requests to `/api/tender-workflow` return 403. An authenticated request with an unsupported stage returns 400 without touching D1. With a real tender present, starring it persists `is_favorite=1`; moving it to `participating` persists that stage without clearing the favorite; resetting both deletes the workflow row. Reloading the dashboard reproduces the saved state from D1.

Selecting `Избранные` shows only favorite tenders while retaining search and amount/date filters. Selecting `Участвуем`, `Подано`, `Выиграли`, or `Проиграли` filters by that stage. Each card has an accessible favorite button. The detail panel has a labelled stage selector and displays save errors without silently lying about persistence. Mobile layouts allow the tabs to scroll horizontally and keep action controls usable.

Automated acceptance requires a clean migration, a successful production build, all tests passing, and a clean lint run. Deployment acceptance requires Sites to return `succeeded` with the existing QazTender Radar production URL.

Milestone 2 acceptance is observable without live tenders: an authenticated user can set filters, save them under a name, change the alert frequency, reload, restore the filters, and delete the preset. Another account cannot read, edit, or delete that row because every query includes its server-derived owner key. Anonymous requests return 403, malformed names or alert frequencies return 400, and the UI never says that Telegram or email delivery is active.

Milestone 3 acceptance is observable by signing in as a tender specialist, opening `Профиль компании`, changing a region or maximum budget, saving, and returning to the radar. Tender cards and the detail panel then explain changed matches using only the saved profile and official announcement fields. The super administrator cannot edit a specialist's company profile, anonymous visitors cannot use the profile API, and no label claims that a license is valid for a tender without document evidence.

## Idempotence and Recovery

The migration is additive and does not modify existing users, profiles, tenders, or synchronization history. Reapplying product actions is safe because writes use a unique owner-and-tender key with an upsert. Setting favorite false and stage `none` repeatedly is safe because it deletes an optional row. If deployment fails after source push, fix the source, rebuild, create a new commit and site version, and deploy that version; never reuse an archive from a different commit. No credentials, tokens, or personal content belong in the plan or source.

## Artifacts and Notes

Competitor research showed that tender products become valuable when they connect discovery with a decision workflow. This milestone intentionally implements the smallest durable version of that pattern. It does not add fake win probabilities, automated submission, document generation, or alerts before live data exists.

## Interfaces and Dependencies

No new runtime library is needed. D1 remains the durable store and the existing signed cookie remains the authentication authority.

In `app/tender-types.ts`, define:

    export type TenderStage = "none" | "reviewing" | "participating" | "submitted" | "won" | "lost" | "skipped";

    export type TenderWorkflowEntry = {
      tenderId: string;
      isFavorite: boolean;
      stage: TenderStage;
      updatedAt: number;
    };

In `app/auth.ts`, define `sessionOwnerKey(session: AppSession): string`. In `app/db.ts`, define `listTenderWorkflow(ownerKey: string): Promise<TenderWorkflowEntry[]>` and `saveTenderWorkflow(ownerKey: string, tenderId: string, isFavorite: boolean, stage: TenderStage): Promise<TenderWorkflowEntry | null>`. A null result after validation means the empty state was deleted.

`PUT /api/tender-workflow` accepts only:

    { "tenderId": "official external id", "isFavorite": true, "stage": "reviewing" }

It returns the saved entry, or `null` after deletion. It derives ownership from the signed session and never accepts `ownerKey` in the request.

Revision note (2026-08-10 15:11Z): Created the long-lived implementation plan from the competitor analysis and repository inspection. Defined the full product sequence and made favorites plus participation stages the first independently testable milestone.

Revision note (2026-08-10 15:16Z): Recorded the completed local implementation, the independent favorite/stage correction, the generated migration, and successful build, test, and lint evidence. Deployment remains the only unfinished part of Milestone 1.

Revision note (2026-08-10 15:19Z): Closed Milestone 1 after successful private production deployment. Noted that the only deferred manual scenario requires a real tender from the still-pending official API feed.

Revision note (2026-08-10 15:24Z): Started Milestone 2. Defined the saved-filter snapshot, account ownership, honest pre-delivery alert preferences, API behavior, interface, and acceptance criteria.

Revision note (2026-08-10 15:29Z): Recorded the completed local Milestone 2 implementation, inspected migration, and successful build, eight-test, and lint evidence. Deployment is the remaining checkpoint.

Revision note (2026-08-10 15:31Z): Closed Milestone 2 after successful private deployment and clarified that only real message delivery remains dependent on the official feed and channel integration.

Revision note (2026-08-10 15:36Z): Started Milestone 3. Defined editable specialist-owned profiles and evidence-based region, budget, activity, and license explanations without win probabilities.

Revision note (2026-08-10 15:37Z): Recorded the completed local Milestone 3 implementation, the reuse of the existing profile schema, and successful build, ten-test, and lint evidence. Deployment is the remaining checkpoint.

Revision note (2026-08-10 15:39Z): Closed Milestone 3 after successful private deployment. The remaining roadmap now consists of official lot/document ingestion and later team/analytics/document-assistance work.
