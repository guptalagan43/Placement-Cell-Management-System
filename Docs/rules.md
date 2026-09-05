# Engineering Rules & AI Agent Boundaries
## Placement Cell Management System (PCMS) — SKIT, Jaipur

| | |
|---|---|
| **Document Version** | 1.0 |
| **Authority** | This document governs all contributors — human or AI coding agent. Where it conflicts with a contributor's own convention preferences, this document wins. |

---

## 1. Purpose

This file exists so that an AI coding agent (or any new contributor) makes the *same* implementation decisions a senior engineer on this project would — without needing to re-litigate them in every session. It complements `architecture.md` (the *shape* of the system) with the *specific tools and guardrails* used to build it.

**Before writing any code in a session, an AI agent should read this file in full, plus the current entry in `memory.md`.**

---

## 2. Approved Tech Stack (Locked)

| Concern | Choice | Do not substitute without updating this file |
|---|---|---|
| Frontend framework | React 18 (Vite) | — |
| Styling | Tailwind CSS, tokens per `design.md` | — |
| Routing | React Router | — |
| Server state / data fetching | React Query (TanStack Query) | — |
| Forms | React Hook Form | — |
| Validation (client + server) | Zod | — |
| Icons | lucide-react | — |
| Charts | Recharts | — |
| Backend runtime | Node.js + Express | — |
| Database | MongoDB + Mongoose | — |
| Auth | jsonwebtoken + bcrypt | — |
| File storage | Cloudinary SDK | — |
| Email | Nodemailer | — |
| Scheduled jobs | node-cron | — |
| Testing | Vitest/Jest + Supertest (API), React Testing Library (frontend); client test env uses `jsdom` + `@testing-library/jest-dom` | — |
| Linting / formatting (dev-only) | ESLint 10 (flat config) + Prettier 3; `eslint-config-prettier` to defer style rules to Prettier; client adds `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` | — |

Introducing any library **not** on this list requires adding it here first, with a one-line rationale — never add a dependency silently mid-task.

---

## 3. Approved Libraries by Concern (with rationale)

| Need | Use | Avoid | Why |
|---|---|---|---|
| Date handling | Native `Intl`/`date-fns` | Moment.js | Moment is legacy and unmaintained; date-fns is tree-shakeable and sufficient |
| Global client state | React Query + Context (auth, theme only) | Redux, MobX, Zustand | This app's client state is thin — server state dominates; a global state library is unjustified overhead |
| CSS | Tailwind utility classes only | styled-components, CSS-in-JS, raw CSS files (except `index.css` tokens) | One styling approach avoids specificity conflicts and keeps `design.md` tokens as the single source of truth |
| HTTP client | `fetch` wrapped in a small typed API client | axios (unless a specific need arises) | Avoids an extra dependency for something native `fetch` handles adequately here |
| Auth token storage (frontend) | httpOnly cookie for refresh token; access token held in memory only | localStorage/sessionStorage for any token | Tokens in Web Storage are readable by any injected script (XSS exposure) |
| ID generation | MongoDB ObjectId (native) | uuid (unless a client-generated ID is specifically required) | No need for a second ID scheme |
| PDF/file text extraction | None — out of scope | Any resume-parsing NLP library | Resume checklist is rule-based only per `srs.md` FR-RES-01; do not introduce parsing libraries to "improve" it |

---

## 4. Explicitly Avoid

| Anti-pattern | Why it's banned here |
|---|---|
| Business logic inside route handlers/controllers | Violates the layering in `architecture.md` Section 2; makes the eligibility engine and business rules untestable in isolation |
| Hardcoded business-rule constants (tier boundaries, backlog limits) | Violates `srs.md` NFR-MAINT-01 — these change every placement season and must be data-driven |
| Trusting client-supplied role or department-scope claims for authorization decisions | Violates `srs.md` NFR-SEC-02/NFR-SEC-05 — always re-derive from the persisted User record server-side |
| Returning unbounded/unpaginated list results | Violates `srs.md` FR-SEA-02 |
| Storing uploaded files on the application server's local disk | Violates `architecture.md` Section 6 and breaks horizontal scalability |
| Silent `catch` blocks that swallow errors | See Section 6 below |
| Editing or deleting AuditLog documents from application code | Violates `srs.md` NFR-AUD-01 — audit entries are write-once |
| Introducing a new npm dependency without adding it to Section 2/3 of this file first | Keeps the stack auditable and intentional |
| Building any feature listed in `srs.md` Section 3.2 (Out of Scope) | Recruiter portal, AI resume parsing, SMS, chatbot, payments, native apps — not this build |

---

## 5. Coding Conventions

- **Naming:** camelCase for variables/functions, PascalCase for React components and Mongoose model names, kebab-case for file names except React component files (PascalCase matching the component).
- **Folder structure:** as defined in `architecture.md` Section 2 (routes/controllers/services/models/middleware on the backend; pages/components/api/context on the frontend). Do not introduce a parallel structure.
- **One responsibility per file:** a service file owns one domain concern (e.g., `eligibilityEngine.js` does not also send emails).
- **Commit messages:** Conventional Commits format — `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:` — each commit scoped to a single phase from `phases.md` wherever possible.
- **Comments:** explain *why*, not *what*; every new service module gets a short header comment describing its responsibility.

---

## 6. Error Handling Standards

- Every async route handler is wrapped so unhandled promise rejections reach a **single centralized error-handling middleware** — never left to crash the process or silently resolve as `undefined`.
- **No silent catches.** A caught error is either handled meaningfully (retried, translated to a clear user-facing message) or re-thrown/logged with context — never caught and ignored.
- **Consistent error response contract** returned by the API on failure:

| Field | Purpose |
|---|---|
| `success` | Always `false` on an error response |
| `message` | Human-readable, safe to show the end user |
| `code` | A stable machine-readable error code (e.g., `NOT_ELIGIBLE`, `DEADLINE_PASSED`, `UNAUTHORIZED`) for the frontend to branch on |

- Validation errors (Zod) are caught and translated into this shape with field-level detail — never leaked as a raw stack trace to the client.
- Server-side logs may contain full error detail; client responses never do.

---

## 7. Security Rules (Non-Negotiable)

1. Passwords are always hashed (bcrypt); never logged, never returned in any API response, ever.
2. Every mutating route validates its input against a schema before touching the database.
3. Every route that reads or writes scoped data (department, student-owned resource) re-derives the scope from the authenticated user's persisted record — never from a request parameter or client claim alone.
4. File uploads are validated for MIME type and size before being accepted.
5. Authentication endpoints are rate-limited.
6. Secrets live only in environment variables, are never committed, and are never included in error messages or logs.
7. AuditLog entries are created for: eligibility overrides, manual round-status changes, blacklist flag changes, rules-page edits, and offer issuance — this list is a floor, not a ceiling; when in doubt, log it.

---

## 8. AI Agent Operating Boundaries

These rules apply specifically when an AI coding agent is doing the implementation work.

1. **Stay inside the active phase.** Work only on the single phase currently marked "In Progress" in `memory.md`. Do not implement functionality from a later phase "while you're in there," even if it looks convenient — this breaks the incremental, reviewable structure `phases.md` was designed to produce.
2. **Update `memory.md` at the end of every work session** — mark the phase's status, note which files were touched, and log anything left incomplete. Do not leave this for a "later cleanup."
3. **Do not invent unstated business rules.** If `srs.md` doesn't specify a value or behavior needed to complete a task (e.g., an exact reminder timing, an exact tier boundary), flag it explicitly in the `memory.md` Decisions Log as an assumption made, rather than silently choosing a value and moving on.
4. **Never remove security, RBAC, validation, or audit-logging code to "simplify" a change** or make a test pass faster.
5. **Never delete or disable an existing test** to make a build green — fix the underlying issue, or flag it in `memory.md` if it's genuinely out of scope for the current phase.
6. **New dependencies require updating this file first** (Section 2/3), in the same commit that introduces them.
7. **Keep changes scoped to the current phase's files.** Avoid unrelated refactors bundled into the same commit — if a refactor is genuinely needed, note it as a follow-up in `memory.md` rather than expanding the current phase's diff.
8. **When a requirement is ambiguous, prefer the interpretation already recorded in `srs.md` Section 12 (Confirmed Scope Decisions)** over re-deciding it independently.
9. **Every new service or non-trivial module gets a short doc comment** stating its responsibility, consistent with Section 5 above.

---

## 9. Testing Expectations

| Layer | Minimum expectation |
|---|---|
| Eligibility engine & business rules | Unit tests covering every boundary condition described in `srs.md` Section 8 (backlog limit, tier boundary, blacklist, one-offer) |
| API routes (auth, applications, offers) | Integration tests (Supertest) for the happy path and at least one authorization-failure path per route |
| Frontend | Component tests for the eligibility badge, application status tracker, and any form with non-trivial validation |
| Regression | A failing test blocks marking a phase "Complete" in `memory.md` |

Exhaustive coverage of every screen is not expected given the project's scope — but the eligibility engine and business rules layer (the system's core differentiator) must be thoroughly tested, since a silent bug there is a correctness failure, not a cosmetic one.

---

## 10. Git & Version Control Conventions

- **Branch naming:** `phase-<number>-<short-slug>` (e.g., `phase-12-student-profile-crud`), matching `phases.md` numbering directly.
- **One phase → one PR (or one commit series) → one GitHub Issue**, closed on merge. This is what makes the phase breakdown double as GitHub project documentation, as intended.
- **PR/commit description** should reference the FR/NFR IDs from `srs.md` that the phase implements.

---

## 11. Definition of Done (applies to every phase)

A phase is only marked "Complete" in `memory.md` when:
1. Its stated acceptance criteria (in `phases.md`) are met.
2. Relevant tests (per Section 9) are written and passing.
3. No security/RBAC/validation/audit-logging rule in this document was bypassed.
4. `memory.md` has been updated accordingly.

---

## 12. Escalation Protocol

If a phase cannot be completed as specified because the requirement is missing, contradictory, or technically infeasible as written:
1. Do not silently improvise a resolution.
2. Record the specific gap/conflict in `memory.md`'s Decisions Log, flagged clearly (e.g., `⚠️ NEEDS INPUT`).
3. Implement the most conservative interpretation that satisfies `srs.md`'s stated intent, and note that this was a judgment call.
4. Move on only if blocking would halt all further progress; otherwise, pause and surface the question.
