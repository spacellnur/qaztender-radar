# Add tender-specialist accounts and company onboarding

This ExecPlan is a living document and follows `C:\Users\aidar\.codex\PLANS.md`. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must remain current.

## Purpose / Big Picture

The site owner can create tender-specialist accounts without giving those users administrator authority. Each tender specialist signs in with the assigned credentials and must describe their company before seeing recommendations. The saved company facts later become the inputs for ranking live tenders.

## Progress

- [x] (2026-08-10 03:45Z) Confirmed the authorization boundary and selected D1 for durable users and company profiles.
- [x] (2026-08-10 04:02Z) Added the database schema, generated migration, and access helpers.
- [x] (2026-08-10 04:02Z) Added administrator-only user management and tender-specialist authentication.
- [x] (2026-08-10 04:02Z) Added the required company onboarding form and saved profile flow.
- [x] (2026-08-10 04:18Z) Validated lint, build, administrator authentication, and redirects, then deployed the migration-backed version privately.
- [x] (2026-08-10 04:42Z) Refined company onboarding with optional details, selectable regions and activity taxonomy, and one optional/unlimited budget limit; lint, build, and authentication tests pass.

## Surprises & Discoveries

- Observation: The existing D1 starter binding was intentionally null and the schema empty.
  Evidence: The feature required explicitly changing the logical binding to `DB` and generated `drizzle/0000_naive_manta.sql` with two tables and two unique indexes.

## Decision Log

- Decision: Only `super_admin` may create accounts; created accounts always receive `tender_specialist` in this milestone.
  Rationale: This directly enforces the requested authority boundary and prevents privilege escalation through client-supplied roles.
  Date/Author: 2026-08-10 / Codex

- Decision: Store users and one company profile per tender specialist in D1.
  Rationale: Accounts and company details must survive sessions, require uniqueness and ownership checks, and will later participate in server-side tender matching.
  Date/Author: 2026-08-10 / Codex

- Decision: Require company name, at least one region, and at least one business direction; make BIN, experience, licenses, employee count, and budget optional.
  Rationale: These three inputs are sufficient to begin broad tender matching, while forcing incomplete legal or capacity data would block legitimate users from onboarding.
  Date/Author: 2026-08-10 / Codex

- Decision: Represent budget as one maximum tender amount, with an explicit unlimited option.
  Rationale: Users naturally know the largest contract they can handle; a minimum-plus-maximum range added unnecessary friction at this stage.
  Date/Author: 2026-08-10 / Codex

## Outcomes & Retrospective

The account and onboarding milestone is complete. The administrator has a team-management surface that can create only tender-specialist accounts. Tender specialists authenticate through the durable user table, are forced through company onboarding until their profile exists, and then reach the radar. Version 3 deployed privately with the D1 binding and migration package. Personalized live-tender scoring remains the next milestone because the official tender source and detailed scoring policy are separate from account onboarding.

## Context and Orientation

`app/auth.ts` signs application sessions and currently validates one secret-backed administrator. `app/api/auth/login/route.ts` creates the session, and `app/page.tsx` protects the dashboard. D1 is Cloudflare's hosted SQLite database. New tables will hold tender-specialist credentials and company profiles; administrator credentials remain deployment secrets.

## Plan of Work

Declare the `DB` binding, define `users` and `company_profiles`, and generate a migration. Extend login to check the secret-backed administrator first and then active database users. Add an administrator page and API that always creates a tender specialist regardless of client input. Add a company onboarding page and API scoped to the current tender specialist. Route incomplete specialists to onboarding and completed specialists to the dashboard.

## Concrete Steps

Work from the repository root. Edit `.openai/hosting.json`, `db/schema.ts`, the worker environment type, authentication helpers, route handlers, pages, dashboard navigation, styling, and tests. Run the Drizzle migration generator, inspect its SQL, run lint, build, and rendered-worker tests. Commit and push the validated source, package the build with migrations, save a version, and deploy it privately.

## Validation and Acceptance

The administrator can create a unique tender-specialist username and temporary password and see the account in the team list. A non-administrator receives HTTP 403 from the account-creation endpoint. A tender specialist can sign in but cannot open the team page. Before saving a company, that user is redirected to onboarding. Saving required company data persists it and opens the dashboard. Reloading and signing in again preserves the completed profile.

## Idempotence and Recovery

Schema creation and indexes use migration-managed additive changes. Duplicate usernames are rejected without modifying existing records. Profile saves use an ownership-scoped upsert, so retrying is safe. A failed deployment leaves the previous private version active.

## Artifacts and Notes

Drizzle generated one migration containing `users`, `company_profiles`, unique username and one-profile-per-user indexes, and a cascading profile foreign key. ESLint passed. The production build emitted the dashboard, team, onboarding, and five API routes. The existing rendered-worker suite passed three of three authentication tests. Sites version 3 deployed successfully with environment revision 2 and the packaged migrations. Passwords and password hashes are excluded from this document.

## Interfaces and Dependencies

The `users` table contains an id, unique username, password hash, role, active flag, and timestamps. The `company_profiles` table uses the user id as a unique owner and stores company name, BIN, regions, work categories, licenses, experience, employee count, minimum and maximum tender budget, and completion timestamp. APIs never accept an administrator role from the browser.

Revision note (2026-08-10): Created this plan after clarifying that administrators create tender specialists and specialists must complete a company profile before personalized recommendations.

Revision note (2026-08-10 04:02Z): Recorded completion of the database, administrator account management, onboarding UI, migration, lint, build, and local authentication validation.

Revision note (2026-08-10 04:18Z): Marked the milestone complete after saving and privately deploying version 3 with the D1 migration package.

Revision note (2026-08-10 04:42Z): Simplified onboarding after user feedback, documented the reduced required-field set and unified budget decision, and recorded successful validation.
