# Project Memory
## Placement Cell Management System (PCMS) — SKIT, Jaipur

| | |
|---|---|
| **Purpose** | The single persistent record of project state — what's done, what's active, what's been decided. This file is read *first*, before `srs.md`/`phases.md`, at the start of every work session. |
| **Last Updated** | 2026-09-05 — Phase 1 (Repository & Tooling Setup) complete |

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
| **Current Phase** | Phase 2 — Backend Skeleton (Not Started; next up) |
| **Phases Complete** | 1 / 67 |
| **Overall Completion** | ~1.5% |
| **Blockers** | None |

---

## 2. Phase Completion Log

Status values: `Not Started` · `In Progress` · `Blocked` · `Complete`

### Milestone 0 — Foundation & Tooling
| # | Phase | Status | Completed | Notes |
|---|---|---|---|---|
| 1 | Repository & Tooling Setup | Complete | 2026-09-05 | client/ + server/ npm projects (ESLint 10 flat config + Prettier 3), root README linking all governance docs, .gitignore/.gitattributes/.editorconfig/.nvmrc. Lint + format:check pass in both packages. |
| 2 | Backend Skeleton | Not Started | — | — |
| 3 | Frontend Skeleton | Not Started | — | — |
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

**Active phase:** None active — Phase 1 complete and merged. Phase 2 (Backend Skeleton) is next.
**File(s) touched in Phase 1:** `README.md`, `.gitignore`, `.gitattributes`, `.editorconfig`, `.nvmrc`, `.prettierrc.json`, `.prettierignore`, `client/{package.json,eslint.config.js,.prettierignore}`, `server/{package.json,eslint.config.js,.prettierignore}`, plus `Docs/rules.md` (recorded tooling deps per §8.6). Governance docs brought under version control.
**Next action:** Begin Phase 2 — Express app bootstrap, env config loader, MongoDB (Atlas) connection, single `/health` route (Traces to architecture.md §1).

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
