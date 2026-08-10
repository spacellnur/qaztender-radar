# Add useful advanced tender filters

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds. This plan must be maintained in accordance with `C:\Users\aidar\.codex\PLANS.md`.

## Purpose / Big Picture

Users should be able to narrow the tender feed with the most useful controls from the official lot registry without facing the official portal's full wall of fields. After this change the main search remains compact, while an expandable advanced section supports announcement number, customer or BIN, procurement method, status, a custom amount range, publication dates, submission-end dates, and financial year. Changing a field immediately updates the visible tenders, total amount, and selected tender card, and one reset action restores the full feed.

## Progress

- [x] (2026-08-10 14:42Z) Inspected the existing dashboard, stored tender fields, Goszakup announcement adapter, styles, tests, and hosting configuration.
- [x] (2026-08-10 14:48Z) Implemented advanced filter state, data-derived options, inclusive amount/date/year filtering, active-filter count, and complete reset behavior in `app/TenderDashboard.tsx`.
- [x] (2026-08-10 14:48Z) Added responsive, accessible styling for the expandable filter panel in `app/globals.css`.
- [x] (2026-08-10 14:47Z) Extended rendered HTML coverage; the production build completed, all 4 Node tests passed, and ESLint passed.
- [x] (2026-08-10 14:49Z) Published private Sites version 7 and opened `https://qaztender-radar-demo.carmarew.chatgpt.site` in Codex.

## Surprises & Discoveries

- Observation: The current integration stores official procurement announcements rather than individual lot records.
  Evidence: `app/goszakup.ts` queries `TrdBuy`, and `app/tender-types.ts` has announcement fields but no lot number, procurement-plan number, delivery location, or ENS TRU code.

- Observation: The announcement records already contain enough data for a useful first advanced-search release.
  Evidence: Stored fields include announcement number, customer name and BIN, method, status, total sum, publication time, reception start and end times, region, subject type, and construction flag.

- Observation: The desktop shell does not expose `npm`, although the bundled Node and pnpm runtimes are available.
  Evidence: The first `npm test` attempt reported that `npm` was not recognized. Running the equivalent `pnpm build`, `node --test tests/rendered-html.test.mjs`, and `pnpm lint` with the bundled Node path completed successfully.

## Decision Log

- Decision: Add only filters backed by stored official fields and omit lot-only controls until the lot feed is implemented.
  Rationale: A visible field that can never match current records would mislead users. The chosen controls provide immediate value and remain compatible with a later lot-level data source.
  Date/Author: 2026-08-10 / Codex

- Decision: Keep the existing five high-frequency filters visible and place lower-frequency controls in a native expandable advanced-search section.
  Rationale: This preserves the fast daily workflow while making the official registry's useful precision available on demand. A native expandable section remains keyboard accessible without a custom dialog.
  Date/Author: 2026-08-10 / Codex

- Decision: Perform filtering in the existing client dashboard rather than changing the database query in this milestone.
  Rationale: The dashboard currently receives at most 500 records and already filters them locally. Keeping this release local avoids an unnecessary API route and database migration; server-side filtering can replace it when the feed volume grows.
  Date/Author: 2026-08-10 / Codex

## Outcomes & Retrospective

The dashboard now offers a compact everyday search plus an expandable advanced panel for announcement number, customer or BIN, method, status, custom amount bounds, publication dates, submission-end dates, and financial year. Options come from actual saved records, filters update the result count and total immediately, and a single reset clears every condition. The production build completed, all four application tests passed, and ESLint passed. Private Sites version 7 was published successfully at `https://qaztender-radar-demo.carmarew.chatgpt.site`.

The original purpose was met for announcement-level data without inventing unsupported lot fields. Lot number, procurement-plan number, ENS TRU, delivery location, and protocol dates remain a later milestone that must extend the official feed and stored record shape after API access is available.

## Context and Orientation

This repository is a Russian-language Next-compatible application built with Vinext and hosted by OpenAI Sites. `.openai/hosting.json` identifies the hosted project and its D1 database binding. `app/page.tsx` authenticates the user, reads saved tender announcements, and renders `app/TenderDashboard.tsx`. That client component owns the current search fields and filters the received `TenderRecord[]` in memory. `app/tender-types.ts` defines each stored announcement. `app/goszakup.ts` maps the official Goszakup GraphQL `TrdBuy` announcement response into that type. `app/globals.css` contains the complete visual system. `tests/rendered-html.test.mjs` builds the deployed worker, authenticates a test administrator, and verifies server-rendered dashboard content.

Here, an advanced filter means a lower-frequency search condition hidden inside an expandable section until the user opens it. A financial year is derived from the announcement publication date, falling back to its submission-end date when publication is absent. A date range is inclusive for the selected calendar days in Kazakhstan time: the start is compared from the beginning of the chosen date, and the end includes the entire chosen date.

## Plan of Work

In `app/TenderDashboard.tsx`, add state for announcement number, customer, method, status, minimum and maximum amount, publication date range, submission-end date range, and financial year. Derive method, status, and year option lists from the actual records so the interface never offers impossible values. Normalize text using the Russian locale, convert numeric input safely, and convert date inputs to inclusive timestamps. Extend the existing `visibleTenders` pipeline with every new condition. Show an active advanced-filter count in the expandable summary, place labels above every field, and add a clear reset button that covers both basic and advanced fields.

In `app/globals.css`, add a bordered advanced panel that visually belongs to the current filter row, uses a responsive multi-column grid on large screens, and collapses to one column on phones. Inputs must retain visible labels and focus outlines. The summary and reset action must work with keyboard and touch input.

In `tests/rendered-html.test.mjs`, verify that an authenticated administrator receives the advanced-search summary and representative controls. Then run `npm test`, which performs the production build before the Node tests, and run `npm run lint` because the dashboard receives substantial client-state changes. After validation, follow the Sites hosting workflow and publish the same project.

## Concrete Steps

Run all commands from `C:\Users\aidar\Documents\Codex\2026-08-10\sites-plugin-sites-openai-bundled`.

Edit the dashboard and styles with repository-safe patches. In an environment with npm available, run:

    npm test

In the Codex desktop shell used for this implementation, the equivalent validated sequence was `pnpm build` followed by `node --test tests/rendered-html.test.mjs`, because npm was unavailable. Expect the production build to complete and all four Node tests to pass. Then run:

    npm run lint

Expect ESLint to exit successfully. If either command reports an actual source error, correct it and rerun the failed command. Once both pass, publish with the Sites hosting workflow and verify that the deployed URL remains the QazTender Radar project.

## Validation and Acceptance

After signing in, the user still sees the fast filters for search, region, procurement subject, budget, deadline, and construction work. Opening `Расширенный поиск` reveals fields for announcement number, customer/BIN, procurement method, status, amount from/to, publication dates, submission-end dates, and financial year. Every field has a visible label. Entering an invalid amount does not crash the page. Entering a minimum greater than a tender's amount excludes it; using matching method or status retains it. Date endpoints include the selected whole day. The advanced-search summary shows how many advanced conditions are active. Resetting filters clears both sections and returns the full tender feed. On a narrow viewport the fields form a readable single column without horizontal scrolling.

Automated acceptance requires `npm test` and `npm run lint` to exit with code zero. The authenticated-dashboard test must assert the presence of `Расширенный поиск`, `Номер объявления`, and `Заказчик или БИН` in rendered HTML.

## Idempotence and Recovery

The changes are source-only and do not alter the database, migrations, stored tenders, authentication, or credentials. Rebuilding and redeploying are safe to repeat. If implementation must be abandoned, revert only the new advanced-filter edits and this plan; no data rollback is required. Git commits are not authorized, so progress checkpoints in this document replace commits.

## Artifacts and Notes

The source screenshot from the user shows the official `Реестр лотов` search form with many fields. This implementation deliberately translates the subset supported by `TrdBuy` announcement data rather than visually cloning that portal. Lot number, procurement-plan number, ENS TRU, delivery location, result-protocol dates, and lot-specific acceptance dates remain future work because they require a lot-level source and additional stored columns.

Validation evidence:

    Build complete. Run `vinext start` to start the production server.
    tests 4
    pass 4
    fail 0
    eslint exited with code 0

Deployment evidence:

    Sites version: 7
    Deployment status: succeeded
    URL: https://qaztender-radar-demo.carmarew.chatgpt.site

## Interfaces and Dependencies

No new library or external service is required. `TenderDashboard` continues to accept the existing `TenderRecord[]` and `TenderSourceStatus` props. New helper functions inside `app/TenderDashboard.tsx` must safely convert optional numeric input and inclusive date input without throwing. No public API, database schema, or Goszakup request changes are part of this milestone.

Revision note (2026-08-10 14:42Z): Created the initial self-contained plan after inspecting the official-filter screenshot and the repository's actual announcement data model. The plan limits the first release to filters that can produce truthful results before the Goszakup token and lot feed are available.

Revision note (2026-08-10 14:48Z): Updated progress after completing the dashboard, styling, and rendered-HTML test edits. Validation and deployment remain.

Revision note (2026-08-10 14:47Z): Recorded successful build, four passing application tests, successful lint, and the environment-specific pnpm validation route. Publication remains.

Revision note (2026-08-10 14:49Z): Finalized the living plan after private Sites version 7 deployed successfully. Added the observable outcome, validation evidence, deployed URL, and the intentionally deferred lot-level fields.
