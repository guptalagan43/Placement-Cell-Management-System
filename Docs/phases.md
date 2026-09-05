# Phased Delivery Plan
## Placement Cell Management System (PCMS) — SKIT, Jaipur

| | |
|---|---|
| **Document Version** | 1.0 |
| **Total Phases** | 67, grouped into 12 milestones |
| **Structure** | One phase = one feature/process = one GitHub Issue = one branch/PR |

---

## How to Use This Document

- Each **Milestone** below maps cleanly to a **GitHub Milestone**.
- Each **Phase** maps to one **GitHub Issue**, one branch (`phase-<n>-<slug>`), and ideally one PR — this is deliberate, so the repository's issue/PR history becomes readable project documentation on its own.
- Phase 1 begins the moment the repo exists; every subsequent phase assumes all prior phases are complete unless stated in "Depends on."
- Every phase lists which `srs.md` requirement IDs it implements (**Traces to**) — this is how an AI agent (or a reviewer) confirms a phase actually satisfies its requirement, not just "looks done."
- `memory.md` tracks live status per phase (Not Started / In Progress / Blocked / Complete) — this document defines the plan; `memory.md` defines current reality.
- Per `rules.md` Section 8, an AI agent works on exactly one phase at a time and does not pull work forward from later phases.

---

## Milestone 0 — Foundation & Tooling

### Phase 1 — Repository & Tooling Setup
**Objective:** Establish the project skeleton both humans and the AI agent will build inside.
**Key Tasks:** Initialize `client/` and `server/` directories; configure ESLint + Prettier for both; set up `.gitignore`; write a root `README.md` linking to all governance docs (`srs.md`, `prd.md`, `architecture.md`, `rules.md`, `phases.md`, `memory.md`, `design.md`).
**Acceptance Criteria:** Repo builds/lints cleanly with no source files yet; README links resolve.
**Depends on:** —

### Phase 2 — Backend Skeleton
**Objective:** A running, connectable Express API with no business routes yet.
**Key Tasks:** Express app bootstrap; environment config loader; MongoDB connection (Atlas); a single `/health` route.
**Acceptance Criteria:** `GET /health` returns 200; server fails fast with a clear error if DB connection fails.
**Traces to:** `architecture.md` §1
**Depends on:** Phase 1

### Phase 3 — Frontend Skeleton
**Objective:** A running React SPA shell with routing, no real pages yet.
**Key Tasks:** Vite + React app bootstrap; React Router setup with placeholder routes; base app layout shell (header/sidebar containers, empty).
**Acceptance Criteria:** App runs locally; navigating between placeholder routes works.
**Depends on:** Phase 1

### Phase 4 — Design System Foundation
**Objective:** The visual tokens and base components from `design.md` are implemented and reusable.
**Key Tasks:** Tailwind config extended with color/typography/radius tokens (`design.md` §12); base components built: Button (primary/outline/danger), Badge, Card, Input.
**Acceptance Criteria:** A component-preview route renders every base component in every variant/state defined in `design.md` §6.
**Traces to:** `design.md` §3–6
**Depends on:** Phase 3

### Phase 5 — CI Baseline
**Objective:** Every push/PR is automatically checked before merge.
**Key Tasks:** GitHub Actions workflow running lint + build for both `client/` and `server/` on PR.
**Acceptance Criteria:** A deliberately broken PR fails CI; a clean PR passes.
**Depends on:** Phase 1

---

## Milestone 1 — Authentication & Access Control

### Phase 6 — User Model & Password Hashing
**Objective:** The foundational identity record exists.
**Key Tasks:** User schema (email, hashed password, role, department, active flag); bcrypt hashing on save.
**Acceptance Criteria:** A User can be created directly via a seed script; password is never stored or returned in plaintext.
**Traces to:** DR-01, NFR-SEC-01
**Depends on:** Phase 2

### Phase 7 — Login & JWT Issuance
**Objective:** A valid User can authenticate.
**Key Tasks:** `POST /auth/login`; access token (short-lived) + refresh token (rotating, httpOnly cookie) issuance.
**Acceptance Criteria:** Valid credentials return a token pair; invalid credentials return a generic error (no user-enumeration leakage).
**Traces to:** FR-AUTH-01
**Depends on:** Phase 6

### Phase 8 — Auth Middleware
**Objective:** Protected routes can verify identity.
**Key Tasks:** Middleware validating the access token and attaching the authenticated user to the request.
**Acceptance Criteria:** A route wrapped by this middleware rejects missing/expired/invalid tokens with a consistent error shape (per `rules.md` §6).
**Traces to:** FR-AUTH-05
**Depends on:** Phase 7

### Phase 9 — RBAC Middleware
**Objective:** Protected routes can enforce role.
**Key Tasks:** Role-guard middleware accepting an allowed-roles list per route.
**Acceptance Criteria:** A student calling a coordinator-only route is rejected; a coordinator calling it succeeds.
**Traces to:** FR-AUTH-05, NFR-SEC-02
**Depends on:** Phase 8

### Phase 10 — Department Scoping Middleware
**Objective:** Coordinators are automatically scoped to their single department at the query level.
**Key Tasks:** Scoping middleware attaching `req.departmentScope`; applied to the first scoped route (student list, built in Phase 15) as a reference implementation.
**Acceptance Criteria:** A coordinator's list queries only ever return their department's data, verified by an integration test with two coordinators in two departments.
**Traces to:** FR-AUTH-06, NFR-SEC-05
**Depends on:** Phase 9

### Phase 11 — Frontend Auth
**Objective:** A user can log in through the UI and protected routes behave correctly client-side.
**Key Tasks:** Login page (per `design.md` reference layout); AuthContext holding the current user/token; ProtectedRoute and RoleRoute wrappers.
**Acceptance Criteria:** An unauthenticated user is redirected from a protected route; an authenticated student cannot navigate to an admin-only route (cosmetically — server enforcement already exists from Phase 9).
**Traces to:** FR-AUTH-01
**Depends on:** Phase 7, Phase 4

### Phase 12 — Forgot / Reset Password Flow
**Objective:** A user who forgets their password can regain access without admin intervention.
**Key Tasks:** `POST /auth/forgot-password` (emailed reset token); `POST /auth/reset-password`; corresponding frontend pages.
**Acceptance Criteria:** A full forgot→email→reset→login cycle works end to end in a local test environment.
**Traces to:** FR-AUTH-04
**Depends on:** Phase 11

---

## Milestone 2 — Student Onboarding & Profile

### Phase 13 — Bulk Student CSV Import
**Objective:** The T&P Cell can onboard an entire cohort at once.
**Key Tasks:** `POST /students/bulk-import` accepting a CSV (roll no, name, email, branch, batch); creates User + StudentProfile per row; sends activation email per new student.
**Acceptance Criteria:** A CSV of 50 rows creates 50 accounts and triggers 50 activation emails (verified against a test SMTP sink); malformed rows are rejected with a per-row error report, not a silent partial import.
**Traces to:** FR-AUTH-02
**Depends on:** Phase 6

### Phase 14 — Password Activation Flow (Frontend)
**Objective:** A bulk-imported student can set their password and access the system for the first time.
**Key Tasks:** Activation page consuming the emailed token; forced password-set enforced by `mustResetPassword` flag from Phase 6.
**Acceptance Criteria:** A newly imported student cannot log in normally until activation is completed.
**Traces to:** FR-AUTH-03
**Depends on:** Phase 13, Phase 11

### Phase 15 — StudentProfile Schema & CRUD API
**Objective:** Students have a real academic/placement profile beyond their login identity.
**Key Tasks:** StudentProfile schema (DR-02); `GET/PUT` self-profile routes; `GET` list route for coordinators/admins with department scoping (Phase 10) applied.
**Acceptance Criteria:** A student can fetch and update their own profile; a coordinator's list route is correctly department-scoped.
**Traces to:** FR-STU-01, FR-STU-05
**Depends on:** Phase 14, Phase 10

### Phase 16 — Student Profile Page (Frontend)
**Objective:** A student can view and edit their profile through the UI.
**Key Tasks:** Profile page with academic fields, skills, certifications, and projects sections; form validation.
**Acceptance Criteria:** Changes persist and reload correctly; invalid input (e.g., CGPA out of range) is rejected client- and server-side.
**Traces to:** FR-STU-01, FR-STU-03
**Depends on:** Phase 15

### Phase 17 — Resume Upload (Backend)
**Objective:** Students can attach resume files to their profile.
**Key Tasks:** Cloudinary signed-upload integration; multi-resume array on StudentProfile with a default flag.
**Acceptance Criteria:** A student can upload, label, and delete multiple resume versions; files never touch the application server's local disk.
**Traces to:** FR-STU-02, NFR-PERF-02
**Depends on:** Phase 15

### Phase 18 — Resume Upload UI + Completeness Meter
**Objective:** Resume management and profile-completeness feedback are visible in the UI.
**Key Tasks:** Resume upload/list/delete UI; a computed profile-completeness percentage displayed on the profile page.
**Acceptance Criteria:** Completeness percentage updates correctly as required fields/resume are added.
**Traces to:** FR-STU-04
**Depends on:** Phase 17, Phase 16

---

## Milestone 3 — Company & Drive Management

### Phase 19 — Company Schema & CRUD API
**Objective:** Coordinators/Admins can maintain the company master list.
**Key Tasks:** Company schema (DR-03); CRUD routes, RBAC-restricted to coordinator/admin.
**Acceptance Criteria:** Full CRUD verified via integration tests; students can read but not write.
**Traces to:** FR-DRV-01
**Depends on:** Phase 9

### Phase 20 — Company Admin UI
**Objective:** Coordinators/Admins manage companies through the UI.
**Key Tasks:** Company list + create/edit form.
**Acceptance Criteria:** A new company created in the UI is immediately usable when creating a Drive (Phase 22).
**Traces to:** FR-DRV-01
**Depends on:** Phase 19, Phase 4

### Phase 21 — Drive Schema & CRUD API
**Objective:** The core recruitment-process entity exists with structured eligibility criteria.
**Key Tasks:** Drive schema (DR-04) including nested eligibility criteria object, tier, department scope, status field; CRUD routes.
**Acceptance Criteria:** A Drive cannot be created without a complete eligibility-criteria object (schema-enforced); department scoping is applied on write.
**Traces to:** FR-DRV-02, FR-DRV-03
**Depends on:** Phase 19, Phase 10

### Phase 22 — Drive Create/Edit Admin Form
**Objective:** Coordinators/Admins author drives through the UI.
**Key Tasks:** Multi-section drive form (basic info, compensation, eligibility criteria, deadline) with validation.
**Acceptance Criteria:** A drive created through the UI matches what's stored via direct API inspection; validation errors are field-level, not a generic failure message.
**Traces to:** FR-DRV-02
**Depends on:** Phase 21, Phase 20

### Phase 23 — Drive Status Lifecycle + Clone Action
**Objective:** Drives move through their defined lifecycle deliberately, and repeat-company setup is fast.
**Key Tasks:** `PATCH /drives/:id/status` enforcing legal transitions only; `POST /drives/:id/clone`.
**Acceptance Criteria:** An illegal transition (e.g., Draft → Completed directly) is rejected; cloning produces a new Draft with all fields copied except deadline/status.
**Traces to:** FR-DRV-03, FR-DRV-04
**Depends on:** Phase 22

### Phase 24 — Public Drive List API (Basic)
**Objective:** Students can retrieve the drive list, without eligibility computation yet.
**Key Tasks:** `GET /drives` with pagination, status filter (Published+ only for students), job-type/CTC filters, sort.
**Acceptance Criteria:** Response is paginated; a Draft drive never appears in a student's results.
**Traces to:** FR-DRV-05, FR-SEA-01, FR-SEA-02
**Depends on:** Phase 23

### Phase 25 — Student Drive List UI (Basic)
**Objective:** Students can browse drives visually — no eligibility badge yet (added in Phase 28).
**Key Tasks:** Drive list page with cards per `design.md` reference layout; filter bar; search.
**Acceptance Criteria:** Filtering/sorting/search all function against the live API.
**Traces to:** FR-DRV-05, FR-SEA-01
**Depends on:** Phase 24, Phase 4

---

## Milestone 4 — Eligibility Engine

### Phase 26 — Eligibility Engine Service
**Objective:** The core rule-evaluation logic exists as a pure, testable function.
**Key Tasks:** Stateless service comparing a student profile snapshot against a drive's criteria (branch, batch, CGPA, backlog, 10th/12th, blacklist); returns `{eligible, reasons[]}`.
**Acceptance Criteria:** Unit tests cover every boundary condition in `srs.md` §8 individually (exact-CGPA-match, one-backlog-over, wrong-branch, blacklisted, etc.).
**Traces to:** FR-ELG-01, `srs.md` §8
**Depends on:** Phase 21, Phase 15

### Phase 27 — Business Rules Layer
**Objective:** Cross-drive policy (One-Offer, Tier-Lock) is layered onto raw eligibility.
**Key Tasks:** Extend the eligibility engine with placement-status and tier checks; season-configurable tier-boundary source (not hardcoded, per NFR-MAINT-01).
**Acceptance Criteria:** A placed student is correctly blocked from equal/lower-tier drives and correctly permitted for a strictly-better-tier drive, verified by unit test.
**Traces to:** FR-ELG-05, `srs.md` §8.1–8.2, NFR-MAINT-01
**Depends on:** Phase 26

### Phase 28 — Eligibility Badge Integration
**Objective:** Eligibility is visible to students and enforced at apply-time.
**Key Tasks:** Drive-list and drive-detail endpoints annotate each drive with the computed eligibility result for the requesting student; frontend eligibility badge component (per `design.md` §7) with reason text on ineligible drives.
**Acceptance Criteria:** An ineligible drive's Apply action is disabled client-side; server independently re-validates at apply-time regardless (enforced fully in Phase 34).
**Traces to:** FR-ELG-02, FR-ELG-03
**Depends on:** Phase 27, Phase 25

---

## Milestone 5 — Round & Info Session Scheduling

### Phase 29 — Round Schema & CRUD API
**Objective:** Drives can have multiple evaluative stages.
**Key Tasks:** Round schema (DR-05, nested under a Drive); CRUD routes restricted to the drive's owning coordinator/admin.
**Acceptance Criteria:** Rounds are ordered by `roundNumber`; a round cannot reference a nonexistent drive.
**Traces to:** FR-SCH-01
**Depends on:** Phase 23

### Phase 30 — Round Management UI
**Objective:** Coordinators/Admins schedule rounds through the UI.
**Key Tasks:** Round list + add/edit form nested inside the drive-edit view.
**Acceptance Criteria:** Adding a round is reflected immediately in the drive's public detail view (Phase 31).
**Traces to:** FR-SCH-01
**Depends on:** Phase 29, Phase 22

### Phase 31 — Drive Detail Page (Student-Facing)
**Objective:** A student can see everything about one drive in one place.
**Key Tasks:** Drive detail page per `design.md` reference layout: JD download, eligibility badge, round list, Apply action placeholder (wired fully in Phase 35).
**Acceptance Criteria:** All Round data for a drive renders correctly, ordered and formatted.
**Traces to:** FR-DRV-05, FR-SCH-01
**Depends on:** Phase 30, Phase 28

### Phase 32 — InfoSession (PPT) Schema & CRUD API
**Objective:** Pre-placement talks are tracked separately from evaluative rounds.
**Key Tasks:** InfoSession schema (DR-06); CRUD routes.
**Acceptance Criteria:** An InfoSession never appears mixed into Round-status logic (Application status pipeline is unaffected by InfoSessions).
**Traces to:** FR-SCH-02
**Depends on:** Phase 23

### Phase 33 — InfoSession UI
**Objective:** Info sessions are schedulable by admins and visible to students.
**Key Tasks:** Admin scheduling UI; display block on the drive detail page (Phase 31), visually distinct from Rounds.
**Acceptance Criteria:** A mandatory InfoSession is visually flagged as such.
**Traces to:** FR-SCH-02
**Depends on:** Phase 32, Phase 31

---

## Milestone 6 — Application Workflow

### Phase 34 — Application Schema & Apply Endpoint
**Objective:** A student can formally apply to an eligible drive, with eligibility enforced server-side.
**Key Tasks:** Application schema (DR-07, unique per student+drive); `POST /applications` re-running the eligibility engine (Phase 27) before insert; rejects if ineligible and no override exists.
**Acceptance Criteria:** An eligible student's application succeeds; an ineligible student's request is rejected even if the client attempted to bypass the disabled button.
**Traces to:** FR-APP-01, FR-ELG-03
**Depends on:** Phase 28

### Phase 35 — Apply Button & Application State (Frontend)
**Objective:** The apply flow is usable end-to-end from the UI.
**Key Tasks:** Resume-version selector; Apply action wired to Phase 34's endpoint; success/error states.
**Acceptance Criteria:** A successful application immediately reflects in "My Applications" (Phase 36).
**Traces to:** FR-APP-01
**Depends on:** Phase 34, Phase 31

### Phase 36 — My Applications Page
**Objective:** A student can track every application they've made.
**Key Tasks:** List view of the student's applications with overall status and per-round status.
**Acceptance Criteria:** Status updates made by an admin (Phase 39) are visible here without requiring a hard refresh (via cache invalidation).
**Traces to:** FR-APP-03
**Depends on:** Phase 35

### Phase 37 — Withdraw Application Feature
**Objective:** A student can retract an application before the deadline.
**Key Tasks:** `POST /applications/:id/withdraw` (deadline-checked server-side); confirmation modal in the UI.
**Acceptance Criteria:** Withdrawal after the registration deadline is rejected; withdrawn applications are excluded from admin shortlisting views.
**Traces to:** FR-APP-02
**Depends on:** Phase 36

### Phase 38 — Admin Applicants List API
**Objective:** Coordinators/Admins can retrieve and filter a drive's applicant list.
**Key Tasks:** `GET /drives/:id/applications` with round and status filters, department-scoped.
**Acceptance Criteria:** A coordinator only sees applicants for drives within their scope.
**Traces to:** FR-APP-06, FR-SEA-01
**Depends on:** Phase 34, Phase 10

### Phase 39 — Admin Applicants Table UI + Manual Status Update
**Objective:** Coordinators/Admins can review and update individual applicant status through the UI.
**Key Tasks:** Applicant data table (per `design.md` §6 table pattern); per-row round-status update action.
**Acceptance Criteria:** A status change made here is immediately visible in the student's My Applications page (Phase 36) and triggers a notification (wired fully in Phase 52).
**Traces to:** FR-APP-04
**Depends on:** Phase 38, Phase 4

### Phase 40 — Bulk CSV Shortlist Upload
**Objective:** Coordinators/Admins can update round status for many applicants at once.
**Key Tasks:** `POST /applications/bulk-update` accepting a CSV of roll numbers + target status for a given round; admin UI upload action with a per-row result report.
**Acceptance Criteria:** A 100-row shortlist CSV updates all matching applications in one action; unmatched roll numbers are reported, not silently skipped.
**Traces to:** FR-APP-05
**Depends on:** Phase 39

---

## Milestone 7 — Governance: Overrides, Audit, Offers

### Phase 41 — Eligibility Override + AuditLog Schema & Wiring
**Objective:** Admins can approve exceptional cases transparently.
**Key Tasks:** AuditLog schema (DR-15); `POST /applications/:id/eligibility-override` requiring a reason, writing both the override flag on the Application and an AuditLog entry.
**Acceptance Criteria:** An override without a reason is rejected; every override produces exactly one AuditLog entry.
**Traces to:** FR-ELG-04, FR-AUD-01, NFR-AUD-01
**Depends on:** Phase 34

### Phase 42 — Admin Audit Log Viewer UI
**Objective:** The TPO can review the full history of administrative overrides and status changes.
**Key Tasks:** Audit log list page, filterable by actor/action/date; Admin-only route.
**Acceptance Criteria:** Every override created in Phase 41 is visible and correctly attributed.
**Traces to:** FR-AUD-02
**Depends on:** Phase 41

### Phase 43 — OfferLetter Schema & Issue-Offer Endpoint
**Objective:** Coordinators/Admins can formally extend an offer against an application.
**Key Tasks:** OfferLetter schema (DR-08); `POST /offers` uploading the offer document (Cloudinary) and setting a response deadline.
**Acceptance Criteria:** An offer can only be issued against an application with `overallStatus: selected`.
**Traces to:** FR-OFR-01
**Depends on:** Phase 39, Phase 17

### Phase 44 — Offer Issuance Admin UI
**Objective:** Admins issue offers through the UI.
**Key Tasks:** Offer-issuance form (document upload, deadline picker) accessible from the applicant table.
**Acceptance Criteria:** A newly issued offer is visible to the student (Phase 45) and triggers a notification.
**Traces to:** FR-OFR-01
**Depends on:** Phase 43

### Phase 45 — Offer Response Flow
**Objective:** Students accept or decline offers, and acceptance correctly updates placement status for the Business Rules layer.
**Key Tasks:** `PATCH /offers/:id/respond`; on Accept, atomically updates `StudentProfile.placementStatus` and `currentTier` (per `architecture.md` §3.3); frontend offer-response page.
**Acceptance Criteria:** Accepting an offer is immediately reflected in eligibility results for that student on subsequent drive-list requests (verified by re-running Phase 26/27 tests against the updated profile).
**Traces to:** FR-OFR-02, FR-OFR-04
**Depends on:** Phase 44, Phase 27

---

## Milestone 8 — Policy, Announcements & Notifications

### Phase 46 — RulesPage Schema & CMS API
**Objective:** Placement policy content is centrally maintained and versioned.
**Key Tasks:** RulesPage schema (DR-11); `GET /rules` (public), `PUT /rules` (Admin-only, auto-increments version).
**Acceptance Criteria:** Every edit produces a new version identifier and an AuditLog entry.
**Traces to:** FR-RUL-01, FR-AUD-01
**Depends on:** Phase 9

### Phase 47 — Rules Page UI + Policy Acknowledgment Gate
**Objective:** Students must read and accept policy before their first application.
**Key Tasks:** Rules & Regulations page (rendered content); acknowledgment checkbox writing to `StudentProfile.policyAcknowledgment`; Apply action (Phase 35) blocked until acknowledgment is recorded.
**Acceptance Criteria:** A student cannot submit their first application without a recorded, versioned acknowledgment timestamp.
**Traces to:** FR-RUL-02
**Depends on:** Phase 46, Phase 35

### Phase 48 — Announcement Schema & CRUD API
**Objective:** The T&P Cell can broadcast notices.
**Key Tasks:** Announcement schema (DR-09); CRUD routes with category, department scope, pin, and expiry fields.
**Acceptance Criteria:** An expired announcement is excluded from the default student-facing list.
**Traces to:** FR-ANN-01
**Depends on:** Phase 9

### Phase 49 — Announcement Board UI
**Objective:** Announcements are visible and filterable by all users.
**Key Tasks:** Announcement feed page; category/department filters; pinned items surfaced first.
**Acceptance Criteria:** A department-scoped announcement is visible only to students in that department (and Admins).
**Traces to:** FR-ANN-01, FR-SEA-01
**Depends on:** Phase 48, Phase 4

### Phase 50 — Notification Schema & In-App API
**Objective:** Users receive persistent, trackable alerts.
**Key Tasks:** Notification schema (DR-10); `GET /notifications/me`, mark-read routes.
**Acceptance Criteria:** Marking one notification read does not affect others; mark-all-read works in one call.
**Traces to:** FR-NOT-01, FR-NOT-02
**Depends on:** Phase 6

### Phase 51 — Notification Bell/Center UI
**Objective:** In-app notifications are visible and actionable.
**Key Tasks:** Notification bell with unread count (per `design.md` top-bar pattern); dropdown/panel listing recent notifications.
**Acceptance Criteria:** A new notification (triggered manually for this test) appears without a full page reload.
**Traces to:** FR-NOT-02
**Depends on:** Phase 50, Phase 4

### Phase 52 — Email Notification Service + Trigger Wiring
**Objective:** Every major status-change event described in `srs.md` FR-NOT-01 also sends an email.
**Key Tasks:** Nodemailer service; wire triggers into: application confirmed (Ph.34), shortlisted (Ph.39/40), round rescheduled (Ph.30), results declared (Ph.39), offer issued (Ph.44).
**Acceptance Criteria:** Each trigger event produces exactly one email (verified against a test SMTP sink) and one Notification record, from the same event — not duplicated or divergent logic per event type.
**Traces to:** FR-NOT-01
**Depends on:** Phase 51

### Phase 53 — Scheduled Reminder Jobs
**Objective:** Time-based reminders fire without a manual trigger.
**Key Tasks:** node-cron jobs: registration-deadline-approaching sweep, round-approaching sweep, offer-expiry sweep (also flips unactioned offers to `expired`, per FR-OFR-03).
**Acceptance Criteria:** Each job is idempotent — running it twice in the same window does not send duplicate reminders.
**Traces to:** FR-NOT-01, FR-OFR-03, NFR-REL-01
**Depends on:** Phase 52

---

## Milestone 9 — Contacts, FAQ & Resume Checklist

### Phase 54 — Contacts Directory
**Objective:** Everyone can find the right person to contact.
**Key Tasks:** Contact schema (DR-12) + CRUD API (Admin-only write) + searchable directory UI.
**Acceptance Criteria:** Search matches on name, role, and department.
**Traces to:** FR-CON-01, FR-SEA-01
**Depends on:** Phase 9, Phase 4

### Phase 55 — FAQ / Help Center
**Objective:** Common questions are self-served.
**Key Tasks:** FAQ schema (DR-13, text-indexed) + CRUD API (Admin-only write) + searchable UI.
**Acceptance Criteria:** A text search for a partial phrase returns relevant FAQ entries.
**Traces to:** FR-FAQ-01, FR-SEA-01
**Depends on:** Phase 9, Phase 4

### Phase 56 — Resume Checklist Rule Engine
**Objective:** Students get automated, rule-based feedback on a resume's completeness.
**Key Tasks:** ResumeCheck schema (DR-14, server-side with history per the confirmed scope decision in `srs.md` §12); rule-based checks (contact info present, key sections present, page-length within limit) — explicitly no NLP/AI parsing, per `rules.md` §3.
**Acceptance Criteria:** Running the checklist twice on the same resume produces two distinct, timestamped ResumeCheck records (history is retained, not overwritten).
**Traces to:** FR-RES-01, FR-RES-02
**Depends on:** Phase 17

### Phase 57 — Resume Checklist UI
**Objective:** Students see their checklist results and score.
**Key Tasks:** Checklist trigger action on the profile page; score + pass/fail item display.
**Acceptance Criteria:** Score and item breakdown match the backend result exactly.
**Traces to:** FR-RES-01
**Depends on:** Phase 56, Phase 16

---

## Milestone 10 — Calendar & Statistics

### Phase 58 — Student Calendar Aggregation API + Conflict Detection
**Objective:** A student can see every upcoming Round/InfoSession in one place, with clashes flagged.
**Key Tasks:** `GET /students/me/calendar` aggregating Rounds + InfoSessions across all of a student's Applications; overlap-detection logic.
**Acceptance Criteria:** Two rounds scheduled at overlapping times are both flagged as conflicting in the response.
**Traces to:** FR-SCH-03, FR-SCH-04
**Depends on:** Phase 34, Phase 33

### Phase 59 — Calendar View UI + ICS Export
**Objective:** The calendar is usable visually and exportable.
**Key Tasks:** Calendar/agenda view component; conflict warning UI; `.ics` file export action.
**Acceptance Criteria:** Exported `.ics` file imports correctly into a standard calendar application.
**Traces to:** FR-SCH-03, FR-SCH-05
**Depends on:** Phase 58, Phase 4

### Phase 60 — Statistics Aggregation API (Current Season)
**Objective:** The TPO/Coordinators get real-time placement numbers.
**Key Tasks:** `GET /stats/overview` — database-level aggregation (not in-memory) for placement %, avg/median/highest CTC, department-wise breakdown; `GET /stats/drive/:id/funnel`.
**Acceptance Criteria:** Numbers match a manual count against seed/test data exactly.
**Traces to:** FR-STA-01, FR-STA-03
**Depends on:** Phase 45

### Phase 61 — Statistics Dashboard UI
**Objective:** Statistics are visible as charts, not raw numbers.
**Key Tasks:** Dashboard page using Recharts per `rules.md` stack; department-wise bar chart; per-drive funnel visualization.
**Acceptance Criteria:** Chart values match the API response exactly; coordinator view is department-scoped, admin view is institute-wide.
**Traces to:** FR-STA-01, FR-STA-03
**Depends on:** Phase 60, Phase 4

### Phase 62 — Year-over-Year Comparison
**Objective:** The TPO can compare seasons for institutional reporting.
**Key Tasks:** `GET /stats/compare?years=...` API; trend-line UI overlaying current vs. prior seasons.
**Acceptance Criteria:** Comparison correctly handles a season with zero prior-year data (first year of use) without erroring.
**Traces to:** FR-STA-02
**Depends on:** Phase 61

---

## Milestone 11 — Cross-Cutting Hardening & Launch

### Phase 63 — Search/Filter/Sort Consistency Audit
**Objective:** Every list screen meets the FR-SEA-01 bar, not just the ones built with it in mind from the start.
**Key Tasks:** Review Drives, Students, Applications, Announcements, FAQ, Contacts lists against the filter/sort matrix in the original requirement analysis; close any gaps.
**Acceptance Criteria:** Every listed screen has at least one working filter and one working sort.
**Traces to:** FR-SEA-01
**Depends on:** All list-screen phases above

### Phase 64 — CSV Export Consistency Audit
**Objective:** Every export requirement is actually implemented, not just the schema fields that support it.
**Key Tasks:** Verify/complete CSV export for Students, Applications, and Statistics reports.
**Acceptance Criteria:** Each export opens cleanly in a spreadsheet application with correct headers.
**Traces to:** FR-SEA-03, FR-STA-04
**Depends on:** Phase 63

### Phase 65 — Dark Mode & Responsive/PWA Polish
**Objective:** The app meets NFR-USE-01/02 fully, not just on the primary screens built first.
**Key Tasks:** Theme toggle wired to the dark palette in `design.md` §10; responsive pass on every page down to 360px width; PWA manifest + installability.
**Acceptance Criteria:** No layout breaks at 360px on any page; dark mode maintains contrast per `design.md` §11 on every page.
**Traces to:** NFR-USE-01, NFR-USE-02
**Depends on:** All UI phases above

### Phase 66 — Automated Testing Pass
**Objective:** Core correctness is verifiable, not just visually apparent.
**Key Tasks:** Fill any coverage gaps against `rules.md` §9 (eligibility engine boundary tests, API integration tests, key component tests).
**Acceptance Criteria:** Test suite passes in CI; eligibility engine and business-rules coverage is exhaustive per `rules.md` §9.
**Traces to:** `rules.md` §9, §11
**Depends on:** Phase 65

### Phase 67 — Deployment, Demo Seed Data & Documentation
**Objective:** The system is live and demonstrable.
**Key Tasks:** Production deployment per `architecture.md` §8 (Vercel + Render + Atlas + Cloudinary); realistic demo/seed dataset (companies, drives, students across SKIT's actual 8 departments per `design.md` §9); final README pass.
**Acceptance Criteria:** A cold visitor can register/log in and see a fully populated, believable demo without any manual setup.
**Traces to:** `prd.md` §9 (Success Criteria)
**Depends on:** Phase 66
