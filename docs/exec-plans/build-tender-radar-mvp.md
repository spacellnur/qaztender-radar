# Build the first QazTender Radar dashboard

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds. This plan follows `C:\Users\aidar\.codex\PLANS.md`.

## Purpose / Big Picture

The first version will let a construction-company owner open a private web dashboard and immediately see a short, ranked list of promising Kazakhstan public-procurement opportunities instead of manually reading hundreds of announcements. Because the company profile and official API token will arrive later, this milestone uses clearly labeled demonstration records and a replaceable scoring model. A human can verify the result by opening the dashboard, filtering tenders, searching by title or buyer, and reading plain-language reasons and risks behind every score.

## Progress

- [x] (2026-08-09 21:32Z) Confirmed the official Kazakhstan procurement API path and identified the company information that will be supplied later.
- [x] (2026-08-09 21:32Z) Prepared the Sites starter, installed dependencies, and started the local preview.
- [x] (2026-08-09 21:42Z) Replaced the starter with the responsive Russian-language tender dashboard and five demonstration scoring records.
- [x] (2026-08-09 21:42Z) Added working search, region, category, and sorting interactions with accessible controls and an empty state.
- [x] (2026-08-09 21:44Z) Replaced starter metadata and tests, removed disposable preview code and dependency, then completed the production build and rendered HTML test.
- [ ] Create the site-specific social preview image, publish the validated version privately, and record the deployed result (completed: generated and integrated `public/og.png`; remaining: create the source commit required by Sites and publish after the user authorizes commits).

## Surprises & Discoveries

- Observation: The official Sites initializer could not run because Windows Subsystem for Linux is absent and the current generated folder already contains planning artifacts.
  Evidence: `wsl.exe` reported that no Linux distribution is installed; the initializer itself rejects nonempty targets other than a small allowlist. The same official starter files were copied without deleting the existing plans.

- Observation: The starter's Unix-style inline environment-variable syntax does not execute in Windows PowerShell.
  Evidence: the initial `pnpm run dev` returned that `WRANGLER_LOG_PATH` was not recognized as a command. The scripts were made cross-platform while the variable is supplied by the host when needed.

- Observation: pnpm package links inside the workspace require host-level execution under the managed Windows sandbox.
  Evidence: sandboxed Node returned `EPERM` when reading a vinext entry point under `node_modules/.pnpm`; approved host execution built and tested the application successfully.

- Observation: The generated workspace had no Git repository after the Unix-only initializer could not run.
  Evidence: `git rev-parse --show-toplevel` returned `fatal: not a git repository`. Sites publishing requires a source commit, while global agent instructions prohibit creating commits without user authorization.

## Decision Log

- Decision: Build an internal single-company dashboard first, using realistic but explicitly marked demonstration data.
  Rationale: The user wants implementation to begin before providing the company profile. A replaceable mock-data boundary creates an observable product now without pretending that suitability scores are authoritative.
  Date/Author: 2026-08-09 / Codex

- Decision: Make every recommendation explainable with fit reasons, risk flags, and a score breakdown.
  Rationale: A construction tender cannot be safely recommended as a black-box number; users need to understand licensing, geography, schedule, experience, and financial assumptions.
  Date/Author: 2026-08-09 / Codex

- Decision: Keep this milestone read-only and avoid accounts, live API access, or persistent company data.
  Rationale: Those capabilities require credentials and company-specific requirements that are intentionally deferred. The deployed prototype remains safe to demonstrate and can be extended without discarding its interface.
  Date/Author: 2026-08-09 / Codex

## Outcomes & Retrospective

The local product milestone is complete. The dashboard presents five ranked demonstration tenders, calculates the visible result count and budget, filters by text, region, and work category, sorts by score, budget, or urgency, and explains the selected tender through score components, strengths, and risks. The starter was removed, product metadata and a bespoke social card were added, the production build completed, and the rendered HTML test passed 1 of 1. Private publishing remains pending solely because it requires a Git commit and the user has not yet authorized commits.

## Context and Orientation

This repository is a vinext application, which means it uses familiar Next.js-style files but builds to a Cloudflare Worker-compatible deployment. `app/page.tsx` is the home page, `app/layout.tsx` defines global metadata and the HTML shell, and `app/globals.css` provides the complete visual system. A client component will hold only temporary interface state for search and filters. Demonstration tender records will live in that component until an official data adapter replaces them. `.openai/hosting.json` controls Sites deployment and currently contains no project identifier.

The score is a zero-to-one-hundred suitability estimate, not a promise of winning or profit. It combines hard eligibility assumptions and softer commercial signals. Records that later fail a mandatory license or experience condition must be excluded rather than rescued by a high score elsewhere.

## Plan of Work

Replace `app/page.tsx` with the product page and create `app/TenderDashboard.tsx` as an interactive client component. Define typed demonstration tenders with scores, regions, categories, deadlines, budgets, reasons, and risks. Implement filtering and sorting entirely in the browser so every control works in the deployed prototype. Rebuild `app/globals.css` around a calm construction-oriented visual language: warm paper, charcoal text, restrained safety orange, and lime status accents. Update `app/layout.tsx` for Russian language metadata and a dynamic Open Graph image URL. Remove `app/_sites-preview`, remove `react-loading-skeleton`, and replace the starter tests with assertions for the rendered product. Generate one branded social card after the interface content is stable. Run the production build and rendered HTML tests, then publish privately through Sites.

## Concrete Steps

Work from `C:\Users\aidar\Documents\Codex\2026-08-10\sites-plugin-sites-openai-bundled`. Edit the page, dashboard component, layout, stylesheet, package metadata, and tests. Refresh dependencies after removing the disposable skeleton package. Run the local preview throughout implementation. Run the production build with the bundled Node.js runtime on `PATH`; success must create `dist/server/index.js`. Run the rendered HTML test and expect the QazTender product name, demonstration-data notice, ranked tender copy, and accessible controls to appear in server-rendered HTML.

## Validation and Acceptance

The home page must visibly state that its records are demonstration data and that company criteria will be connected later. Searching for a known buyer or title must narrow the list. Changing region and category must update both the visible cards and the result count. Sorting by score, budget, or deadline must reorder results. Each card must show a score, sum, deadline, buyer, region, fit explanations, risk summary, and a clear action to inspect the tender. On a narrow screen the layout must remain readable without horizontal scrolling. The production build and rendered HTML tests must pass, and the private deployed URL must load the same validated application.

## Idempotence and Recovery

All source edits are additive or replace disposable starter files. Dependency installation can be repeated safely. No database, credentials, or live procurement records are mutated. If deployment fails, the validated local build remains usable and publishing can be retried from the same source state. The generated demonstration data can later be replaced by an API adapter without changing the visual contract.

## Artifacts and Notes

The production build completed all five vinext build stages and created the deployment output. The rendered HTML test reported `tests 1`, `pass 1`, and `fail 0`. The social preview asset was generated with the built-in ImageGen workflow and saved as `public/og.png`; its exact text is `QazTender Radar` and `Тендеры, которые стоят вашего времени.` The deployed URL is pending commit authorization. The official procurement integration is deliberately deferred until the user provides company criteria and an API token can be configured as a secret.

## Interfaces and Dependencies

`app/TenderDashboard.tsx` will define a `Tender` type containing `id`, `title`, `buyer`, `region`, `category`, `method`, `budget`, `deadline`, `daysLeft`, `score`, `reasons`, `risks`, and `status`. It will export the default interactive dashboard component consumed by `app/page.tsx`. No new runtime library is required. The future live-data boundary will replace the demonstration array with normalized records from the official procurement API while preserving the same `Tender` shape.

Revision note (2026-08-09): Created the initial self-contained product plan after confirming the official data source, preparing the Sites application, and recording deferred company inputs.

Revision note (2026-08-09): Recorded the completed dashboard, interactions, product metadata, social card, successful build and test evidence, plus the remaining commit-authorization requirement for private publishing.
