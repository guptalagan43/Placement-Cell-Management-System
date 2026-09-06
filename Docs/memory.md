# Project Memory
## Placement Cell Management System (PCMS) — SKIT, Jaipur

| | |
|---|---|
| **Purpose** | The single persistent record of project state — what's done, what's active, what's been decided. This file is read *first*, before `srs.md`/`phases.md`, at the start of every work session. |
| **Last Updated** | 2026-09-06 — Phase 6 (User Model & Password Hashing) complete |

---

## 0. Update Protocol (read before editing)

1. Update this file **at the end of every work session** — not "later." Per `rules.md` §8, this is a hard requirement for an AI agent, not optional housekeeping.
2. When a phase is completed: update its row in Section 2, move the "Currently Active" pointer in Section 3, and add a one-line note if anything relevant to future phases was learned.
3. When an assumption is made because `srs.md`/`phases.md` didn't specify something: log it in Section 4 (Decisions Log) — do not let it live only in a commit message.
4. Never mark a phase "Complete" unless its Acceptance Criteria in `phases.md` are actually met and its tests pass (`rules.md` §11, Definition of Done).
5. This file is additive — don't delete history from Sections 4/5, only append to them.

---

## 1. Project Status Summary

| | |
|---|---|
| **Current Milestone** | M1 — Authentication & Access Control |
| **Current Phase** | Phase 7 — Login & JWT Issuance (Not Started; next up) |
| **Phases Complete** | 6 / 67 |
| **Overall Completion** | ~9% |
| **Blockers** | None |

---

## 2. Phase Completion Log

Status values: `Not Started` · `In Progress` · `Blocked` · `Complete`

### Milestone 0 — Foundation & Tooling
| # | Phase | Status | Completed | Notes |
|---|---|---|---|---|
| 1 | Repository & Tooling Setup | Complete | 2026-09-05 | client/ + server/ npm projects (ESLint 10 flat config + Prettier 3), root README linking all governance docs, .gitignore/.gitattributes/.editorconfig/.nvmrc. Lint + format:check pass in both packages. |
| 2 | Backend Skeleton | Complete | 2026-09-05 | Express 5 app factory (`createApp`) + fail-fast bootstrap; Zod env loader; Mongoose 9 connect helper; `GET /health` (200, reports DB state); centralized error contract (`ApiError` + not-found + error-handler, rules.md §6). Vitest+Supertest: 10 tests pass. Lint/format clean. |
| 3 | Frontend Skeleton | Complete | 2026-09-05 | Vite 8 + React 18 SPA under `client/src/`; React Router v7 with placeholder routes (`/`, `/drives`, `/about`, `*`); `AppLayout` shell (header nav + empty sidebar container + `<Outlet/>`); minimal neutral CSS (NOT the design system — that's Phase 4). Vitest+RTL(jsdom): 6 tests pass (routes render + nav works). Build succeeds. Lint/format clean. |
| 4 | Design System Foundation | Complete | 2026-09-05 | Tailwind **v3** + PostCSS/autoprefixer configured with `design.md` §12 tokens (primary/ink/canvas/surface/border + 5 semantic color pairs, `heading`/`body` fonts, pill/md/lg/xl radii) plus §5 elevation shadows. Reusable base components under `src/components/ui/`: Button (primary/outline/danger + disabled-muted, `fullWidth`, ref-forwarding), Badge (5 semantic tones), Card (resting/raised), Input (label/error/disabled/search-icon/`pill`, ref-forwarding, a11y `aria-invalid`/`aria-describedby`). `/preview` route (`ComponentPreviewPage`) renders every §6 variant/state (acceptance met). `index.css` replaced with Tailwind base layer (§4 heading scale); `AppLayout` restyled to tokens; Inter + Plus Jakarta Sans via Google Fonts. Vitest+RTL: **24** tests pass (13 component + 5 preview + 6 prior). Build compiles all tokens (verified in dist CSS); lint/format clean. |
| 5 | CI Baseline | Complete | 2026-09-05 | GitHub Actions workflow `.github/workflows/ci.yml`: matrix over `client`/`server`, each leg runs `npm ci → lint → format:check → build --if-present → test` on Node 20 (`node-version-file: .nvmrc`, in ESLint 10's engine range). Triggers on all pushes + PRs; `permissions: contents: read`; concurrency cancels superseded runs. `--if-present` cleanly skips the (nonexistent) server build. Validated locally: both legs green (client 24 tests + build; server 10 tests) and a deliberately broken file makes `npm run lint` exit 1 → job would fail. Remote Actions run not observable in this environment; acceptance validated by command-level parity (see Decisions Log Ph.5). |

### Milestone 1 — Authentication & Access Control
| # | Phase | Status | Completed | Notes |
|---|---|---|---|---|
| 6 | User Model & Password Hashing | Complete | 2026-09-06 | Mongoose `User` schema (email, bcrypt passwordHash, role, department, active, mustResetPassword); pre-validate hook hashes password; `select: false` + `toJSON`/`toObject` transforms exclude hash from all output; `comparePassword` instance method. Seed script (`src/scripts/seed-user.js`) creates users. Vitest+MongoMemoryServer: **15** unit tests pass (hashing, comparison, output exclusion, role/department validation, uniqueness). Lint/format clean. |
| 7 | Login & JWT Issuance | Not Started | — | — |
| 8 | Auth Middleware | Not Started | — | — |
| 9 | RBAC Middleware | Not Started | — | — |
| 10 | Department Scoping Middleware | Not Started | — | — |
| 11 | Frontend Auth | Not Started | — | — |
| 12 | Forgot/Reset Password Flow | Not Started | — | — |

### Milestone 2 — Student Onboarding & Profile
| # | Phase | Status | Completed | Notes |
|---|---|---|---|---|
| 13 | Bulk Student CSV Import | Not Started | — | — |
| 14 | Password Activation Flow | Not Started | — | — |
| 15 | StudentProfile Schema & CRUD API | Not Started | — | — |
| 16 | Student Profile Page | Not Started | — | — |
| 17 | Resume Upload (Backend) | Not Started | — | — |
| 18 | Resume Upload UI + Completeness Meter | Not Started | — | — |

### Milestone 3 — Company & Drive Management
| # | Phase | Status | Completed | Notes |
|---|---|---|---|---|
| 19 | Company Schema & CRUD API | Not Started | — | — |
| 20 | Company Admin UI | Not Started | — | — |
| 21 | Drive Schema & CRUD API | Not Started | — | — |
| 22 | Drive Create/Edit Admin Form | Not Started | — | — |
| 23 | Drive Status Lifecycle + Clone | Not Started | — | — |
| 24 | Public Drive List API (Basic) | Not Started | — | — |
| 25 | Student Drive List UI (Basic) | Not Started | — | — |

### Milestone 4 — Eligibility Engine
| # | Phase | Status | Completed | Notes |
|---|---|---|---|---|
| 26 | Eligibility Engine Service | Not Started | — | — |
| 27 | Business Rules Layer | Not Started | — | — |
| 28 | Eligibility Badge Integration | Not Started | — | — |

### Milestone 5 — Round & Info Session Scheduling
| # | Phase | Status | Completed | Notes |
|---|---|---|---|---|
| 29 | Round Schema & CRUD API | Not Started | — | — |
| 30 | Round Management UI | Not Started | — | — |
| 31 | Drive Detail Page | Not Started | — | — |
| 32 | InfoSession Schema & CRUD API | Not Started | — | — |
| 33 | InfoSession UI | Not Started | — | — |

### Milestone 6 — Application Workflow
| # | Phase | Status | Completed | Notes |
|---|---|---|---|---|
| 34 | Application Schema & Apply Endpoint | Not Started | — | — |
| 35 | Apply Button & Application State | Not Started | — | — |
| 36 | My Applications Page | Not Started | — | — |
| 37 | Withdraw Application Feature | Not Started | — | — |
| 38 | Admin Applicants List API | Not Started | — | — |
| 39 | Admin Applicants Table UI + Status Update | Not Started | — | — |
| 40 | Bulk CSV Shortlist Upload | Not Started | — | — |

### Milestone 7 — Governance: Overrides, Audit, Offers
| # | Phase | Status | Completed | Notes |
|---|---|---|---|---|
| 41 | Eligibility Override + AuditLog | Not Started | — | — |
| 42 | Admin Audit Log Viewer UI | Not Started | — | — |
| 43 | OfferLetter Schema & Issue-Offer Endpoint | Not Started | — | — |
| 44 | Offer Issuance Admin UI | Not Started | — | — |
| 45 | Offer Response Flow | Not Started | — | — |

### Milestone 8 — Policy, Announcements & Notifications
| # | Phase | Status | Completed | Notes |
|---|---|---|---|---|
| 46 | RulesPage Schema & CMS API | Not Started | — | — |
| 47 | Rules Page UI + Acknowledgment Gate | Not Started | — | — |
| 48 | Announcement Schema & CRUD API | Not Started | — | — |
| 49 | Announcement Board UI | Not Started | — | — |
| 50 | Notification Schema & In-App API | Not Started | — | — |
| 51 | Notification Bell/Center UI | Not Started | — | — |
| 52 | Email Notification Service + Wiring | Not Started | — | — |
| 53 | Scheduled Reminder Jobs | Not Started | — | — |

### Milestone 9 — Contacts, FAQ & Resume Checklist
| # | Phase | Status | Completed | Notes |
|---|---|---|---|---|
| 54 | Contacts Directory | Not Started | — | — |
| 55 | FAQ / Help Center | Not Started | — | — |
| 56 | Resume Checklist Rule Engine | Not Started | — | — |
| 57 | Resume Checklist UI | Not Started | — | — |

### Milestone 10 — Calendar & Statistics
| # | Phase | Status | Completed | Notes |
|---|---|---|---|---|
| 58 | Calendar Aggregation API + Conflict Detection | Not Started | — | — |
| 59 | Calendar View UI + ICS Export | Not Started | — | — |
| 60 | Statistics Aggregation API | Not Started | — | — |
| 61 | Statistics Dashboard UI | Not Started | — | — |
| 62 | Year-over-Year Comparison | Not Started | — | — |

### Milestone 11 — Cross-Cutting Hardening & Launch
| # | Phase | Status | Completed | Notes |
|---|---|---|---|---|
| 63 | Search/Filter/Sort Consistency Audit | Not Started | — | — |
| 64 | CSV Export Consistency Audit | Not Started | — | — |
| 65 | Dark Mode & Responsive/PWA Polish | Not Started | — | — |
| 66 | Automated Testing Pass | Not Started | — | — |
| 67 | Deployment, Demo Seed Data & Documentation | Not Started | — | — |

---

## 3. Currently Active Work

**Active phase:** None active — Phase 6 complete; **Milestone 1 (Authentication & Access Control) phase 6 done**. Phase 7 (Login & JWT Issuance, M1) is next.
**File(s) touched in Phase 6:** _New_ — `server/src/models/User.model.js`, `server/src/models/User.model.test.js`, `server/src/scripts/seed-user.js`. _Modified_ — `server/package.json` (bcrypt already present from Phase 1 setup).
**Next action:** Begin Phase 7 — Login & JWT Issuance (M1). Traces to **FR-AUTH-01**. Key tasks: `POST /auth/login` route; validate credentials against User model; issue short-lived access token (JWT) + rotating refresh token (httpOnly cookie); generic error on invalid credentials (no user-enumeration leakage). Introduces `jsonwebtoken` (sanctioned in `rules.md` §2). The `asyncHandler` deferred from Phase 2 can now be introduced as a small utility for wrapping async route handlers.

---

## 4. Decisions Log

Append-only. Every entry below was settled during requirements/design review, before implementation began, and should be treated as final unless explicitly revisited here.

| Date | Decision | Rationale |
|---|---|---|
| Pre-implementation | Coordinators are scoped to **exactly one department** (not multiple). | Simpler data model and query-scoping logic; matches `srs.md` FR-AUTH-06. Documented in `architecture.md` §4 and enforced in Phase 10. |
| Pre-implementation | The Resume Checklist tool runs **server-side and retains history** per student (not client-only, stateless). | Enables tracking improvement over time and matches `srs.md` FR-RES-02. Implemented in Phase 56. |
| Pre-implementation | Visual design system is based on user-provided reference screenshots (green-based institutional portal), with SKIT's real identity (name, "T&P Cell" terminology, 8-department list) layered on as content — **not** SKIT's public website's colors, which weren't extractable/verifiable. | See `design.md` §1. If an official SKIT brand color guideline surfaces later, it should override `design.md` §3 only — no other section depends on the specific hex values chosen. |
| Pre-implementation | Out-of-scope for this build: recruiter portal, AI/NLP resume parsing, SMS, chatbot, payments, native mobile apps. | See `srs.md` §3.2 and `prd.md` §6. Do not build these speculatively even if a phase seems to invite it. |
| 2026-09-05 (Ph.1) | Both `client/` and `server/` use ESM (`"type": "module"`). | `rules.md` does not mandate CJS vs ESM; ESM is the modern Node default and keeps both packages consistent. Server code (Phase 2+) should be authored as ESM (`import`/`export`). |
| 2026-09-05 (Ph.1) | Lintable source for each package lives under `src/` (lint script = `eslint src`). | Satisfies Phase 1's "lints cleanly with no source files yet" via `--no-error-on-unmatched-pattern`. Consequence: Phase 2 must place the Express entry point at `server/src/…` and Phase 3 the Vite app at `client/src/…`, or those files go unlinted. Root-level config files (e.g. `vite.config.js`) are intentionally outside lint scope. |
| 2026-09-05 (Ph.1) | ESLint 10 requires Node `^20.19.0 || ^22.13.0 || >=24`; `.nvmrc` pins `20`. | `20` resolves to latest 20.x (≥20.19), which satisfies the engine range. **Phase 5 CI must use a Node version in this range** (e.g. `node-version-file: .nvmrc`, or `22.x`/`20.x` latest) — not a bare `20.9`. |
| 2026-09-05 (Ph.1) | `client/` and `server/` are independent npm projects (no root package.json / no workspaces). | They deploy to separate hosts (Vercel + Render, `architecture.md` §8); a monorepo tool is unjustified overhead at this scale. CI (Phase 5) runs lint/build per-package. |
| 2026-09-05 (Ph.1) | Added `.gitattributes` (`* text=auto eol=lf`) as part of repo setup, beyond the `.gitignore` named in the phase. | Prevents CRLF/LF diff churn on Windows and keeps line endings deterministic across platforms and CI, aligned with `.editorconfig` and Prettier's `endOfLine: lf`. In-scope "repository setup." |
| 2026-09-05 (Ph.2) | Env files loaded via Node's built-in `process.loadEnvFile()` (guarded; missing `.env` ignored) — **no `dotenv` dependency**. | `rules.md` §3 is native-first; `.nvmrc` pins Node ≥20.19 which has `loadEnvFile`. Avoids a dependency and a `rules.md` §2 addition. Production injects real env vars (no file), so ENOENT is expected and swallowed intentionally (not a silent catch — non-ENOENT rethrows). |
| 2026-09-05 (Ph.2) | Backend layout: `app.js` is a pure `createApp()` factory (no DB, no `listen`); `server.js` is the runtime bootstrap (env → DB → listen). | Lets Supertest import the app with no live DB or open port. Establishes the routes→middleware structure from `architecture.md` §2.2 for all later phases. |
| 2026-09-05 (Ph.2) | Centralized error contract (`utils/api-error.js`, `middleware/not-found.js`, `middleware/error-handler.js`) built in the skeleton. `asyncHandler` **deferred** to the first phase with an async route. | `rules.md` §6 mandates a single centralized handler + the `{success,message,code}` contract; it is foundational infra (not later-phase feature work) and is exercised now by `/health` + the 404 path. `asyncHandler` would be dead code until an async DB route exists, so it waits (Phase 6/7). |
| 2026-09-05 (Ph.2) | Backend file-naming: kebab-case base, dotted type-suffix for layered files (`*.routes.js`, later `*.controller.js`/`*.service.js`/`*.model.js`); tests co-located as `*.test.js` under `src/`. | Satisfies `rules.md` §5 (kebab-case) and the Phase 1 `src/`-lint-scope decision. Test files use explicit `vitest` imports (no globals) so `eslint src` stays clean without extra globals config. |
| 2026-09-05 (Ph.2) | Installed latest majors: **Express 5, Mongoose 9, Zod 4** (+ Vitest 5, Supertest). Code verified against them (10 tests green; both fail-fast paths exit 1). | All are already sanctioned in `rules.md` §2, so no §8.6 update. Note for later phases: this is Express **5** (not 4) — path-matching, `req.body` defaults, and middleware error semantics follow v5. Zod **4** uses the unified `{ error }` customization API (used in `env.js`). |
| 2026-09-05 (Ph.2) | `GET /health` always returns 200 (liveness) and reports `mongoose.connection.readyState` as an informational `database` field. | Health/liveness must respond even when the DB is down (for load balancers / uptime checks); readiness vs. liveness distinction. Acceptance only requires 200. |
| 2026-09-05 (Ph.3) | React pinned to **18** (`^18.3.1`), not latest 19, honoring `rules.md` §2 ("React 18"). `react-router-dom` is **v7** (rules.md doesn't pin it; v7 supports React 18 and its declarative `<Routes>/<Route>/<NavLink>/<Outlet>` API is stable). | `rules.md` §2 is binding. If a later phase needs React 19, update `rules.md` §2 first (§8.6). |
| 2026-09-05 (Ph.3) | Tailwind + design tokens + base components deliberately **excluded** from Phase 3; the shell uses minimal neutral plain CSS (`index.css`). | Those are Phase 4 (Key Tasks: "Tailwind config extended with tokens; base components"). Phase 3 acceptance is only "app runs + navigation works." **Phase 4 replaces `client/src/index.css` with the Tailwind design system.** |
| 2026-09-05 (Ph.3) | Router provider (`<BrowserRouter>`) lives in `main.jsx`; `App` exports only `<Routes>`. | Lets tests wrap `<App/>` in `<MemoryRouter initialEntries=[...]>` to assert per-route rendering + navigation without a browser. |
| 2026-09-05 (Ph.3) | Minimal nav placed in the **header**; the **sidebar** is left as an empty `<aside>` container. | Phase 3 says "header/sidebar containers, empty," but the acceptance also requires demonstrable navigation — the smallest nav that satisfies it goes in the header; the sidebar stays a structural placeholder for later phases. |
| 2026-09-05 (Ph.3) | Client Vitest uses `pool: 'threads'` (set in `vite.config.js`). | The default `forks` pool's child-process worker fails to start ("Timeout waiting for worker to respond") when the project path contains spaces on Windows — the repo path is `D:\Projects\MERN Lab Project`. Threads are unaffected and also work on Linux CI. Server tests are unaffected (no Vite). |
| 2026-09-05 (Ph.3) | Vitest `globals: false`: tests import `describe/it/expect` from `vitest`; `src/test/setup.js` registers manual RTL `cleanup()` + `@testing-library/jest-dom/vitest`. | Keeps `eslint src` clean without configuring test globals (mirrors the server test convention). |
| 2026-09-05 (Ph.3) | Reuse finding (Home/Drives/About placeholder pages are near-identical) resolved as **no change**. | They are placeholders for genuinely distinct future pages that diverge in dedicated later phases; the file-per-page layout mirrors the intended `pages/` structure. Consolidating into one parametrized component now would just be reversed later (create→merge→re-split churn). |
| 2026-09-05 (Ph.4) | **Tailwind v3** (JS `tailwind.config.js` + PostCSS) chosen over v4 (CSS-first `@theme`). | `design.md` §12 specifies tokens in the exact `theme.extend` object shape and `phases.md` Phase 4 says "Tailwind config extended with tokens" — v3 maps §12 1:1 with zero translation and is the least ambiguous reading of the binding docs. If v4's CSS-first tokens are later preferred, migrate and update `rules.md` §2 first (§8.6). |
| 2026-09-05 (Ph.4) | Extended `design.md` §12 beyond its literal list: each semantic color gets a `DEFAULT` equal to its `text` value (so `bg-danger`/`text-success` read naturally), and the two §5 elevation shadows are added as `boxShadow.card`/`boxShadow.raised`. | Values are unchanged from `design.md` (§3.3 text colors, §5 shadows) — these are ergonomic aliases, not new design decisions. Phase 4 "Traces to §3–6," which includes the §5 elevation table. |
| 2026-09-05 (Ph.4) | Fonts (Inter + Plus Jakarta Sans) loaded via a Google Fonts `<link>` in `index.html`, **not** self-hosted / `@fontsource`. | Avoids a new npm dependency (`rules.md` §8.6); `design.md` §4 notes self-hosting is a *performance* option, not a requirement. Offline/CSP-blocked → `sans-serif` fallback. Revisit as a perf optimization (Phase 65 polish) if needed. |
| 2026-09-05 (Ph.4) | `AppLayout` restyled to Tailwind tokens and `index.css` replaced with the Tailwind base layer (rather than leaving the Phase 3 plain-CSS `.app-*` island). Added a `Components` nav item → `/preview` route. | Establishing the design foundation means the shell should consume the tokens too; a parallel plain-CSS system would violate `rules.md` §3 ("Tailwind utility classes only"). Landmark roles/`aria-label`s were preserved, so Phase 3 tests stay green. The preview link is for design-time access; later phases rebuild the nav/auth shell. Box-sizing/margin/full-height are re-established by Tailwind Preflight + `min-h-screen`. |
| 2026-09-05 (Ph.4) | Introduced a local 5-line `cn()` joiner (`src/lib/cn.js`) instead of `clsx`/`tailwind-merge`. | Covers the components' conditional-class needs without a dependency. Limitation logged in §5 (no conflicting-utility resolution). |
| 2026-09-05 (Ph.5) | CI runs `lint` + `format:check` + `build --if-present` + `test` per package — extending the literal "lint + build" in `phases.md` Phase 5 to also run the formatter check and the test suites. | Phase 5's Objective ("every push/PR automatically checked before merge") is broader than its Key-Tasks shorthand, and `rules.md` §9 makes the test suites the regression gate — a CI baseline that skipped them would not actually gate regressions. `format:check` belongs to the same lint/format quality gate (`rules.md` §2 groups them) and already runs locally each phase. |
| 2026-09-05 (Ph.5) | Workflow triggers on **all** pushes and all pull requests (`on: {push, pull_request}`, no branch filter). | Most literal reading of "every push/PR." In this repo's actual process (local squash-merge, no PRs opened), an unfiltered `push` is what produces a pre-merge check on the feature-branch push and a post-merge check on `main`. If a human later opens a PR, both events fire (two runs) — an accepted minor cost, bounded by `concurrency`. Revisit to `push: {branches: [main]}` + `pull_request` if PR-based contribution begins. |
| 2026-09-05 (Ph.5) | Server "build" realized via `npm run build --if-present`, not a no-op build script. | The server is a Node service with no compile step; `--if-present` makes the shared matrix step a clean no-op there (verified exit 0) without polluting `server/package.json` with a fake script. `phases.md` says "lint + build for both"; build is genuinely absent for the server, so skipping is the correct realization, not an omission. |
| 2026-09-05 (Ph.5) | Acceptance ("broken PR fails, clean PR passes") validated by **command-level parity**, not an observed GitHub Actions run. | `gh` is unavailable and remote Actions results aren't observable from this environment (same constraint that makes merges local). Validated instead by running the exact CI sequence locally in both packages on the clean tree (all steps exit 0) and confirming a deliberately broken file makes `npm run lint` exit 1 (→ job red). The pushed workflow runs on GitHub for the user to observe. |
| 2026-09-06 (Ph.6) | Password hashing done in a Mongoose **pre-validate** hook (not pre-save) so the required `passwordHash` field is populated before validation runs. | Mongoose validates before pre-save hooks; a pre-validate async hook ensures the hash exists when the `required: true` validator checks `passwordHash`. The plaintext password is accepted via a virtual setter that stores to `_plainPassword`, which the hook reads. |

---

## 5. Known Issues / Technical Debt Log

*(Empty — populate as issues are discovered during implementation. Each entry should note: what the issue is, which phase introduced it, and whether it blocks a later phase.)*

| Date | Issue | Introduced In (Phase) | Blocking? |
|---|---|---|---|
| 2026-09-05 | `cn()` (`client/src/lib/cn.js`) joins class strings but does **not** resolve conflicting Tailwind utilities (no `tailwind-merge`). A base component's `className` prop therefore can't reliably override a conflicting *base* utility (e.g. padding/radius) — order in the class attribute doesn't decide CSS precedence. All current call sites pass only non-conflicting utilities (`w-64`, `mt-1`, `max-w-sm`), so there is no present bug. | Phase 4 | No — if a later phase needs override-safe merging, add `tailwind-merge` (update `rules.md` §2 first per §8.6). |

---

## 6. Next Session Checklist

Before starting work in a new session, confirm:
- [ ] Read this file's Section 1 (Status Summary) and Section 3 (Currently Active Work) to know exactly where things stand.
- [ ] Read the relevant phase entry in `phases.md` in full, including its "Traces to" IDs — cross-check against `srs.md` if the requirement isn't already clear.
- [ ] Check Section 4 (Decisions Log) for any prior ruling relevant to the current phase before making a new judgment call.
- [ ] Confirm no item in Section 5 (Known Issues) blocks the phase about to start.
- [ ] At the end of the session: update Sections 1–3 here, and append to Section 4/5 if anything new was decided or discovered.
