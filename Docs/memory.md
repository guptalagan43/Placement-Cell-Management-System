# Project Memory
## Placement Cell Management System (PCMS) — SKIT, Jaipur

| | |
|---|---|
| **Purpose** | The single persistent record of project state — what's done, what's active, what's been decided. This file is read *first*, before `srs.md`/`phases.md`, at the start of every work session. |
| **Last Updated** | 2026-09-05 — Phase 3 (Frontend Skeleton) complete |

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
| **Current Milestone** | M0 — Foundation & Tooling |
| **Current Phase** | Phase 4 — Design System Foundation (Not Started; next up) |
| **Phases Complete** | 3 / 67 |
| **Overall Completion** | ~4.5% |
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
| 4 | Design System Foundation | Not Started | — | — |
| 5 | CI Baseline | Not Started | — | — |

### Milestone 1 — Authentication & Access Control
| # | Phase | Status | Completed | Notes |
|---|---|---|---|---|
| 6 | User Model & Password Hashing | Not Started | — | — |
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

**Active phase:** None active — Phase 3 complete and merged. Phase 4 (Design System Foundation) is next.
**File(s) touched in Phase 3:** `client/index.html`, `client/vite.config.js`, `client/src/{main.jsx,App.jsx,index.css,App.test.jsx}`, `client/src/layouts/AppLayout.jsx`, `client/src/pages/{HomePage,DrivesPage,AboutPage,NotFoundPage}.jsx`, `client/src/test/setup.js`, `client/package.json` (+lockfile), `Docs/rules.md` (§2 testing row: recorded `jsdom` + `@testing-library/jest-dom` per §8.6).
**Next action:** Begin Phase 4 — Design System Foundation. Traces to `design.md` §3–6. Key Tasks: extend **Tailwind** config with color/typography/radius tokens (`design.md` §12); build base components (Button primary/outline/danger, Badge, Card, Input); a component-preview route rendering every variant/state (`design.md` §6). This phase **replaces** the minimal Phase 3 CSS with the Tailwind design system. Read `design.md` §3–6 and §10/§12 in full before starting.

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

---

## 5. Known Issues / Technical Debt Log

*(Empty — populate as issues are discovered during implementation. Each entry should note: what the issue is, which phase introduced it, and whether it blocks a later phase.)*

| Date | Issue | Introduced In (Phase) | Blocking? |
|---|---|---|---|
| — | — | — | — |

---

## 6. Next Session Checklist

Before starting work in a new session, confirm:
- [ ] Read this file's Section 1 (Status Summary) and Section 3 (Currently Active Work) to know exactly where things stand.
- [ ] Read the relevant phase entry in `phases.md` in full, including its "Traces to" IDs — cross-check against `srs.md` if the requirement isn't already clear.
- [ ] Check Section 4 (Decisions Log) for any prior ruling relevant to the current phase before making a new judgment call.
- [ ] Confirm no item in Section 5 (Known Issues) blocks the phase about to start.
- [ ] At the end of the session: update Sections 1–3 here, and append to Section 4/5 if anything new was decided or discovered.
