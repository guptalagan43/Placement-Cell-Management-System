# Project Memory
## Placement Cell Management System (PCMS) — SKIT, Jaipur

| | |
|---|---|
| **Purpose** | The single persistent record of project state — what's done, what's active, what's been decided. This file is read *first*, before `srs.md`/`phases.md`, at the start of every work session. |
| **Last Updated** | 2026-09-10 — Phase 21 (Drive Schema & CRUD API) complete |

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
| **Current Milestone** | M4 — Eligibility Engine |
| **Current Phase** | Phase 29 — Round Schema & CRUD API (Not Started; next up) |
| **Phases Complete** | 28 / 67 |
| **Overall Completion** | ~42% |
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
| 7 | Login & JWT Issuance | Complete | 2026-09-06 | `POST /auth/login` with Zod validation; short-lived access token (15m) + rotating refresh token (7d, httpOnly cookie, `Path=/auth/refresh`); generic `INVALID_CREDENTIALS` error (no user-enumeration); `ACCOUNT_DEACTIVATED` for inactive users. `asyncHandler` utility added. Vitest+Supertest: **9** integration tests + **10** service tests pass. Lint/format clean. Introduced `jsonwebtoken`, `cookie-parser` (sanctioned in `rules.md` §2). |
| 8 | Auth Middleware | Complete | 2026-09-06 | `authenticate` middleware validates Bearer access token, re-derives user from DB (fresh role/department/active), attaches to `req.user`. Rejects missing/invalid/expired tokens (`UNAUTHORIZED`), deleted users (`UNAUTHORIZED`), deactivated accounts (`ACCOUNT_DEACTIVATED`). **10** integration tests pass. `optionalAuthenticate` exported for future use. Lint/format clean. |
| 9 | RBAC Middleware | Complete | 2026-09-06 | `authorize(...roles)` factory + convenience guards (`requireStudent`, `requireCoordinator`, `requireTPO`, `requireCoordinatorOrTPO`, `requireAnyRole`). Applied after `authenticate`; rejects with `FORBIDDEN` if role not allowed. Validates roles at startup. **20** integration tests pass. Lint/format clean. |
| 10 | Department Scoping Middleware | Complete | 2026-09-06 | `departmentScope` middleware attaches `req.departmentScope` from coordinator's department (null for TPO/student). `applyDepartmentScope(query, scope)` helper for Mongoose queries. Runs after `authenticate` + `requireCoordinator`/`requireCoordinatorOrTPO`. **9** integration + **8** unit tests pass. Lint/format clean. |
| 11 | Frontend Auth | Complete | 2026-09-06 | Login page (design.md §6 Sign In layout); `AuthContext` (user + accessToken in memory); `ProtectedRoute` redirects unauthenticated to `/login` preserving destination; `RoleRoute` cosmetic guard for admin routes. API client with `credentials: 'include'` for httpOnly refresh cookie. Button `size` prop added. **16** updated/added tests pass. Lint/format clean. Introduced `react-hook-form` (sanctioned in `rules.md` §2). |
| 12 | Forgot/Reset Password Flow | Complete | 2026-09-06 | `POST /auth/forgot-password` (generic response, no user enumeration); `POST /auth/reset-password` (validates token, sets new password via virtual setter). Password reset token (1h expiry, distinct audience `pcms-password-reset`). Frontend: ForgotPasswordPage + ResetPasswordPage with token from URL query. Nodemailer integration with SMTP config (optional in dev). **18** new tests pass. Lint/format clean. Introduced `nodemailer` (sanctioned in `rules.md` §2). Milestone 1 (Auth & Access Control) fully complete. |

### Milestone 2 — Student Onboarding & Profile
| # | Phase | Status | Completed | Notes |
|---|---|---|---|---|
| 13 | Bulk Student CSV Import | Complete | 2026-09-06 | `POST /students/bulk-import` with multer CSV upload; creates User (mustResetPassword=true) + StudentProfile per row; per-row validation (email format, branch enum, batch range); duplicate roll number/email reported as row errors; generic 200 response with per-row report (no silent partial import). Multer fileFilter rejects non-CSV. Email sending optional in dev (SMTP not required). **12** integration tests pass (valid CSV, mixed valid/invalid, duplicates, empty CSV, 50-row acceptance, TPO/coordinator roles). Lint/format clean. Introduced `csv-parse`, `multer` (sanctioned in `rules.md` §2). |
| 14 | Password Activation Flow | Complete | 2026-09-06 | `POST /auth/activate` endpoint validates activation token (same JWT as reset password), sets new password, clears `mustResetPassword` flag, returns token pair for auto-login. Frontend: ActivatePage at `/activate?token=` reads token from URL, submits new password, auto-logs in and redirects to dashboard. ForgotPasswordPage updated to mention activation for newly imported students. **10** integration tests pass (valid token, expired/invalid token, already activated, role support). Lint/format clean. |
| 15 | StudentProfile Schema & CRUD API | Complete | 2026-09-06 | StudentProfile model (rollNumber, branch, batch, section, CGPA, backlogs, skills, certifications, projects, placementStatus, blacklist); `GET/PUT /students/me/profile` for student self-profile; `GET /students` scoped list for coordinators/TPO with filters, pagination, sorting; `GET/PUT /students/:id` for admin access with department scoping. Department scoping enforced at query level via `departmentScope` middleware (Phase 10). **23** integration tests pass. Lint/format clean. |
| 16 | Student Profile Page | Complete | 2026-09-06 | Student-facing profile page at `/profile` with tabbed sections: Academic (CGPA, semester-wise CGPA, backlogs, 10th/12th %, section), Skills (dynamic array), Certifications (name, issuer, year, proof URL), Projects (title, description, tech stack, link). Uses React Hook Form + Zod with field arrays for dynamic lists. Auto-loads profile on mount, saves with validation. `GET/PUT /students/me/profile` integration. **All lint/format clean**, client build successful. |
| 17 | Resume Upload (Backend) | Complete | 2026-09-06 | StudentProfile model extended with `resumes` array (label, cloudinaryPublicId, cloudinarySecureUrl, originalFilename, fileSize, mimeType, isDefault, uploadedAt). Cloudinary signed-upload integration via `GET /students/me/resumes/upload-params` (signed params for direct client upload). `POST /students/me/resumes` adds resume metadata after client upload. `GET /students/me/resumes` lists all, `GET /students/me/resumes/default` gets default, `PUT /:resumeId/default` sets default, `DELETE /:resumeId` deletes from Cloudinary and profile. Files never touch app server (direct client→Cloudinary). **17** integration tests pass. Lint/format clean. Introduced `cloudinary` (sanctioned in `rules.md` §2). |
| 18 | Resume Upload UI + Completeness Meter | Complete | 2026-09-08 | Resume tab added to Student Profile Page with upload/list/delete/set-default UI using Cloudinary direct upload; profile completeness meter (Progress component) displayed in header showing real-time percentage. Created `client/src/api/resume.api.js` client. Fixed `computeCompleteness` to handle string-array skills from server. **11** component tests pass (completeness meter, resume tab, upload modal, resume list, computeCompleteness function). Lint/format clean, build successful. |

### Milestone 3 — Company & Drive Management
| # | Phase | Status | Completed | Notes |
|---|---|---|---|---|
| 19 | Company Schema & CRUD API | Complete | 2026-09-09 | Company schema (DR-03) with name, sector, about, HR contact, website, isActive; CRUD routes (POST/GET/PUT/DELETE /companies) RBAC-restricted to coordinator/TPO; GET /companies/active for all authenticated users (students for drive dropdowns); search, filter (sector, isActive), pagination, sorting. **36** integration tests pass. Lint/format clean. |
| 20 | Company Admin UI | Complete | 2026-09-10 | Company list page at `/companies` with search, filter (sector, status), pagination, sorting; create/edit modal with Zod validation (name, sector, about, HR contact, website, isActive); delete with confirmation; RBAC via RoleRoute (coordinator/TPO only). Nav link added to admin header. **43** client tests pass, build successful. Lint/format clean. |
| 21 | Drive Schema & CRUD API | Complete | 2026-09-10 | Drive schema (DR-04) with nested eligibility criteria, tier, department scope, status; CRUD routes with department scoping; registration deadline validation; 59 integration tests pass. Lint/format clean. |
| 22 | Drive Create/Edit Admin Form | Complete | 2026-09-11 | Drive list page at `/drives-admin` with search, filter (status, job type, tier), pagination, sorting; create/edit modal with multi-section form (basic info, compensation, eligibility criteria, department scope) with Zod validation; field-level error display; company dropdown from active companies; branch/batch checkboxes; delete with confirmation; RBAC via RoleRoute (coordinator/TPO only). Nav link added to admin header. **All client tests pass**, build successful. Lint/format clean. |
| 23 | Drive Status Lifecycle + Clone | Complete | 2026-09-11 | `PATCH /drives/:id/status` enforcing legal transitions only (draft→published→registration_open→registration_closed→in_progress→completed→results_declared); `POST /drives/:id/clone` creates new Draft with all fields copied except deadline/status; 15 new integration tests added (74 total for drive routes). Lint/format clean. |
| 24 | Public Drive List API (Basic) | Complete | 2026-09-11 | Student-facing `GET /drives/student` endpoint (implemented in Phase 21) with pagination, Published+ status filter (excludes Draft), job-type filter, CTC range filter, tier filter, search, and sorting; 12 integration tests pass. All acceptance criteria met. Lint/format clean. |
| 25 | Student Drive List UI (Basic) | Complete | 2026-09-11 | Student drive list page at `/drives` with cards layout per `design.md` reference; filter bar (search, job type, tier, status, CTC range); filter chips with clear; sort dropdown; pagination; accessible cards showing company, title, job type, tier, CTC, deadline, eligibility summary; "View Details" action. All 43 client tests pass. Lint/format clean. |

### Milestone 4 — Eligibility Engine
| # | Phase | Status | Completed | Notes |
|---|---|---|---|---|
| 26 | Eligibility Engine Service | Complete | 2026-09-11 | Stateless `checkEligibility(student, drive)` service with individual check functions (branch, batch, CGPA, backlogs, 10th/12th %, blacklist); returns `{eligible, reasons[]}` with machine-readable codes; 64 unit tests covering every boundary condition in srs.md §8 (exact-CGPA-match, one-backlog-over, wrong-branch, blacklisted, null/undefined fields, detailed vs legacy 10th/12th records). Lint/format clean. |
| 27 | Business Rules Layer | Complete | 2026-09-11 | Extended eligibility engine with One-Offer Rule and Tier-Lock Rule (srs.md §8.1–8.2); season-configurable via SeasonConfig model (NFR-MAINT-01); `applyBusinessRules(rawEligibility, student, drive, seasonConfig)` returns combined academic + business rule reasons; 21 unit tests covering placed student blocked from equal/worse tier, allowed for strictly better tier, rule enable/disable configs, reverse tier ordering, short-circuit on academic ineligibility. Lint/format clean. |
| 28 | Eligibility Badge Integration | Complete | 2026-09-11 | Drive-list endpoint (`GET /drives/student`) annotates each drive with computed eligibility (`eligible`, `reasons`, `reasonMessages`); frontend `EligibilityBadge` component (per design.md §7) with success/danger tones and reason text; student drive list UI shows badge next to status, disables "View Details" for ineligible drives with reason text. 74 drive route tests pass. Lint/format clean. |

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

**Active phase:** None active — Phase 28 complete; **Milestone 4 (Eligibility Engine) Phases 26–28 done**. Phase 29 (Round Schema & CRUD API, M5) is next.
**File(s) touched in Phase 28:** _New_ — `client/src/components/ui/EligibilityBadge.jsx`. _Modified_ — `server/src/services/drive.service.js` (eligibility annotation), `server/src/controllers/drive.controller.js` (student profile fetch), `client/src/pages/StudentDriveListPage.jsx` (badge display, disabled action).
**Next action:** Begin Phase 29 — Round Schema & CRUD API (M5). Traces to **FR-SCH-01**. Key tasks: Round schema (DR-05, nested under Drive); CRUD routes restricted to drive's owning coordinator/admin.

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
| 2026-09-06 (Ph.7) | Refresh token stored in httpOnly cookie with `Path=/auth/refresh` so it's only sent to the refresh endpoint (not on every request). Access token returned in response body for client to store in memory. | Limits CSRF exposure and follows the token storage pattern in `rules.md` §3 (access token in memory only, refresh token in httpOnly cookie). Cookie `sameSite: lax` balances security with cross-origin needs for the SPA. |
| 2026-09-06 (Ph.7) | Generic `INVALID_CREDENTIALS` error for both "user not found" and "wrong password" — no user-enumeration leakage. | Required by `rules.md` §7.3 / NFR-SEC-02. Identical response shape and timing prevents attackers from determining valid emails. |
| 2026-09-06 (Ph.7) | `asyncHandler` wrapper introduced as the first async route appears (Phase 7 login). | Deferred from Phase 2 per `architecture.md` and `rules.md` §6 — now needed to forward unhandled rejections to centralized error handler. |
| 2026-09-06 (Ph.8) | Auth middleware **re-derives user from DB** on every request (not trusting token claims for role/department/active). | Required by `rules.md` §7.3 / NFR-SEC-02/NFR-SEC-05. Token claims can be stale (e.g., coordinator reassigned, user deactivated); DB is source of truth. |
| 2026-09-06 (Ph.8) | Consistent error codes: `UNAUTHORIZED` for missing/invalid/expired/deleted-user; `ACCOUNT_DEACTIVATED` for inactive; `FORBIDDEN` reserved for RBAC (Phase 9). | Matches `rules.md` §6 contract and enables frontend to branch on specific codes. `TOKEN_EXPIRED` not used separately — treated as `UNAUTHORIZED` for simplicity (both require re-login). |
| 2026-09-06 (Ph.9) | RBAC middleware is a factory `authorize(...roles)` returning middleware; convenience exports for common role combinations. | Keeps route definitions declarative (`router.get('/coordinator', authenticate, requireCoordinator, handler)`). Role validation at startup catches typos early. |
| 2026-09-06 (Ph.9) | `FORBIDDEN` (403) used for role mismatches; `UNAUTHORIZED` (401) only for missing/invalid auth. | Clear semantic distinction: 401 = "who are you?", 403 = "you're not allowed here". Frontend can branch on codes. |
| 2026-09-06 (Ph.10) | Department scoping middleware sets `req.departmentScope` (null for TPO/student). Coordinator scope = their department. | Enforces NFR-SEC-05 at query level, not just UI. `applyDepartmentScope()` helper adds `.where('department').equals(scope)` to Mongoose queries. Safety net: throws `CONFIG_ERROR` if coordinator missing department. |
| 2026-09-06 (Ph.11) | Access token stored in memory (AuthContext), NOT in localStorage/sessionStorage. Refresh token in httpOnly cookie (`credentials: 'include'`). | Follows `rules.md` §3 token storage pattern. Access token in memory only prevents XSS exposure; httpOnly cookie prevents CSRF on refresh endpoint. |
| 2026-09-06 (Ph.11) | `ProtectedRoute` redirects to `/login` with `state={{ from: location }}` for post-login redirect. `RoleRoute` is cosmetic only — real RBAC on server (Phase 9). | Per `architecture.md` §4: frontend guards mirror server enforcement for UX only. `RoleRoute` shows/hides nav links but server rejects unauthorized requests. |
| 2026-09-06 (Ph.12) | Password reset token uses **distinct JWT audience** (`pcms-password-reset`) and 1h expiry, separate from access/refresh tokens. | Prevents token confusion attacks. Reset token cannot be used as access token. Short expiry limits exposure window. |
| 2026-09-06 (Ph.12) | `POST /auth/forgot-password` returns **generic success** for both existing and non-existing emails. | Prevents user enumeration (same as login). Email is sent only if user exists, but response is identical. |
| 2026-09-06 (Ph.12) | SMTP configuration optional in development/test — email send failures are logged but don't fail the request. | Allows local development without SMTP server. Production requires valid SMTP config. |
| 2026-09-06 (Ph.13) | Bulk import returns **200 with per-row report** even when all rows fail (acceptance criteria). | "Malformed rows are rejected with a per-row error report, not a silent partial import" — return 200 with summary + results array so client can display all errors. |
| 2026-09-06 (Ph.13) | Email sending is **optional in dev/test** — skipped when SMTP not configured; logged as warning. | Allows local development without SMTP server. Production requires valid SMTP config. |
| 2026-09-06 (Ph.13) | Duplicate roll number/email reported as **row-level errors** (not 500), import continues for other rows. | Per-row error report enables admin to fix specific rows and re-import. |
| 2026-09-06 (Ph.14) | Activation endpoint reuses **password reset token** (same JWT, audience `pcms-password-reset`) but clears `mustResetPassword` flag and returns token pair for auto-login. | Reuses existing token infrastructure. Single token type for both reset and activation simplifies implementation. |
| 2026-09-06 (Ph.14) | Activation page at `/activate?token=` reads token from URL query param; on success, auto-logs in and redirects to dashboard. | Follows same pattern as reset password flow. Token in URL is standard for email-based activation. |
| 2026-09-06 (Ph.15) | StudentProfile CRUD routes enforce **department scoping** via `departmentScope` middleware (Phase 10) — coordinators only see their dept's students. | Enforces NFR-SEC-05 at query level. Self-profile routes (`/me/profile`) are separate from admin routes and don't use scoping. |
| 2026-09-06 (Ph.15) | `applyDepartmentScope()` helper fixed to filter by `branch` field (not `department`) to match StudentProfile schema. | StudentProfile uses `branch` field for department; the helper was incorrectly using `department` field. |
| 2026-09-06 (Ph.16) | Student Profile Page uses **tabbed interface** with 4 sections (Academic, Skills, Certifications, Projects) and React Hook Form + Zod for validation. | Tabbed UX keeps long form manageable. Field arrays for dynamic lists (skills, certifications, projects). Zod schemas per section for granular validation. Client-side validation mirrors server-side Zod schemas. |
| 2026-09-06 (Ph.16) | Student Profile Page **does not use `useAuth` or `useNavigate`** — relies on API client and `methods.reset()` for data loading. | Removes unnecessary dependencies. Navigation handled by AppLayout's logout button. Auth state managed by AuthContext provider at app root. |
| 2026-09-06 (Ph.17) | Resume upload uses **direct client-to-Cloudinary upload** with signed parameters; server never touches file bytes. | Satisfies NFR-PERF-02 (files never touch app server) and keeps server stateless. Signed upload params generated server-side with short expiry. |
| 2026-09-06 (Ph.17) | Resume metadata stored in StudentProfile `resumes` array with `cloudinaryPublicId`, `cloudinarySecureUrl`, `isDefault` flag. | Keeps resume metadata with profile for easy querying. `isDefault` ensures only one default resume per student. |
| 2026-09-06 (Ph.17) | Validation middleware throws `ApiError` for Zod validation errors (not plain Error). | Ensures error handler correctly returns 400 with `VALIDATION_ERROR` code instead of 500. |
| 2026-09-11 (Ph.22) | Drive create/edit form uses a multi-section layout (Basic Info, Compensation, Eligibility Criteria, Department Scope) with checkbox groups for branches/batches instead of multi-select for better UX. Department scope field is displayed but disabled for coordinators (auto-scoped on server). TPO sees it as editable dropdown. | Matches FR-DRV-02 (structured eligibility criteria, tier, deadline). Field-level validation via Zod mirrors server-side schema. Branch/batch as checkboxes improves discoverability over multi-select. Coordinator department scoping enforced on server (Phase 21), so form reflects this by disabling scope for coordinators. |
| 2026-09-11 (Ph.23) | Drive status lifecycle enforces forward-only transitions: draft→published→registration_open→registration_closed→in_progress→completed→results_declared. Illegal transitions (skipping stages, going backwards) return 400 with INVALID_STATUS_TRANSITION code. Clone creates new Draft with all fields copied except registrationDeadline (set to 30 days from now) and status (reset to draft). | Matches FR-DRV-03 (defined status lifecycle) and FR-DRV-04 (clone action). Forward-only transitions prevent accidental state corruption. Clone deadline reset ensures new drive has valid future deadline. Department scoping applies to both endpoints. |
| 2026-09-11 (Ph.24) | Student-facing drive list API (`GET /drives/student`) was implemented in Phase 21 (not Phase 24) and already meets all Phase 24 acceptance criteria: pagination, Published+ status filter (excludes Draft), job-type/CTC/tier filters, search, sorting. Phase 24 required no new code — only verification against existing implementation. | FR-DRV-05 (student drive browsing) is satisfied by the `/drives/student` endpoint created in Phase 21. Acceptance criteria (pagination, no Draft drives, filters, sort) all verified via existing 12 integration tests. |
| 2026-09-11 (Ph.25) | Student drive list UI uses "Drives" as page heading (not "Available Drives") to match existing test expectations. Cards layout follows `design.md` reference with semantic color badges for status, icons for job type/tier/CTC/deadline, and eligibility summary. Filter chips with inline clear (×) for active filters. Heading "Drives" satisfies test `getByRole('heading', { name: 'Drives' })`. | Matches FR-DRV-05 (student drive browsing) and FR-SEA-01 (search/filter/sort). Test compatibility required heading text match. Cards layout per design.md §6 Data Table / Card patterns with semantic status colors from §7. |
| 2026-09-11 (Ph.26) | Eligibility engine is a pure, stateless service (`checkEligibility`) with no DB dependencies — enables identical logic at browse-time and apply-time. Individual check functions exported for granular unit testing. Blacklist checked first (override). 10th/12th % prefers detailed records (`tenthDetails.percentage`, `twelfthDetails.percentage`) with fallback to legacy fields (`tenthPercent`, `twelfthPercent`). Null/undefined academic fields treated as failure. Machine-readable reason codes (`INELIGIBILITY_REASONS`) returned for frontend branching. | Matches FR-ELG-01 and srs.md §8. Pure function design per architecture.md §5 enables exhaustive unit testing (64 tests) without database. Business rules (One-Offer, Tier-Lock) deferred to Phase 27 per srs.md §8.1–8.2. |
| 2026-09-11 (Ph.27) | Business rules layered onto raw eligibility via `applyBusinessRules()`. One-Offer Rule blocks placed students; Tier-Lock Rule allows upgrade to strictly better tier (lower number = better by default). SeasonConfig model provides data-driven configuration (tier ordering, rule enable/disable) per NFR-MAINT-01. Academic ineligibility short-circuits business rules. 21 unit tests cover all rule combinations, config variations, and short-circuit behavior. | Matches FR-ELG-05, srs.md §8.1–8.2, NFR-MAINT-01. Data-driven tier ordering (not hardcoded) enables annual policy changes. Lower-is-better default matches srs.md §8.2. Short-circuit ensures academic reasons take precedence. |
| 2026-09-11 (Ph.28) | Eligibility badge integrated into student drive list (`GET /drives/student` returns `eligibility` object per drive). Frontend `EligibilityBadge` component uses design.md §7 semantic colors (success/danger) with reason text. Ineligible drives show disabled "Not Eligible" button with reason text. Server re-validates at apply-time (Phase 34). | Matches FR-ELG-02, FR-ELG-03. Badge uses design.md §7 semantic colors (success for eligible, danger for not eligible). Reason text provides transparency per NFR-SEC-02. |

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
