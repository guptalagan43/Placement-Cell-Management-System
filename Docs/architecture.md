# Architecture Document
## Placement Cell Management System (PCMS) — SKIT, Jaipur

| | |
|---|---|
| **Document Version** | 1.0 |
| **Companion Documents** | `srs.md` (what the system must do), `rules.md` (implementation conventions), `design.md` (visual system) |

---

## 1. Architecture Style

PCMS follows a **three-tier architecture**: a React single-page application (client), a stateless REST API (server), and a document database (persistence), with three external managed services handling concerns the application server should never own directly: file storage, transactional email, and scheduled jobs.

```
┌─────────────────────┐        ┌──────────────────────┐        ┌───────────────────┐
│   CLIENT (React)     │  HTTPS │   API (Node/Express)  │  Driver │  MongoDB Atlas     │
│   Vite SPA            │◄──────►│   Stateless REST API  │◄───────►│  (Persistence)     │
└─────────────────────┘        └──────────┬───────────┘        └───────────────────┘
                                            │
                        ┌───────────────────┼───────────────────┐
                        ▼                   ▼                   ▼
                ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
                │  Cloudinary    │   │  SMTP Provider │   │  Scheduled Jobs│
                │  (file storage)│   │  (email)       │   │  (cron/agenda) │
                └───────────────┘   └───────────────┘   └───────────────┘
```

**Rationale:** a three-tier REST architecture is the simplest model that satisfies every NFR in `srs.md` (statelessness for NFR-SCAL-01, clean separation for NFR-MAINT-01) without introducing infrastructure complexity (message queues, microservices) that this project's scale doesn't warrant.

---

## 2. Component Architecture

### 2.1 Frontend Layers

| Layer | Responsibility |
|---|---|
| **Pages** | Route-level views composed from components; one page per screen (Drive List, Drive Detail, Admin Dashboard, etc.) |
| **Components** | Reusable, presentation-focused UI pieces (Badge, DataTable, FilterBar, Modal, Stepper) — styled per `design.md` |
| **API Layer** | A thin, typed client wrapping HTTP calls, paired with a server-state library for caching/refetching |
| **Context** | Cross-cutting client state only: authenticated user/session, theme (light/dark) — not a substitute for server state |
| **Route Guards** | Wrap protected routes; redirect unauthenticated users and hide routes the current role cannot access (cosmetic only — never the authorization boundary, per NFR-SEC-02) |

### 2.2 Backend Layers

| Layer | Responsibility |
|---|---|
| **Routes** | URL → controller mapping only; no business logic |
| **Middleware** | Auth verification, RBAC/role guard, department-scope resolution, input validation, audit-log capture, centralized error handling |
| **Controllers** | Translate HTTP request/response; delegate to services; no direct database queries |
| **Services** | Business logic — the eligibility engine, notification dispatch, statistics aggregation, resume checklist scoring — independent of HTTP concerns, independently testable |
| **Models** | Data access + schema definition (persistence layer only) |
| **Jobs** | Scheduled/background processes: deadline reminders, offer-expiry sweep |

This layering exists specifically so business logic (the eligibility engine, business rules) is testable in isolation, not entangled with request handling — this matters because `srs.md` Section 8's Business Rules must be independently verifiable.

---

## 3. Key Data Flows

### 3.1 Student Applies to a Drive

1. Client requests the drive list; server computes eligibility for the authenticated student against every published drive (Eligibility Engine service) and returns each drive annotated `eligible: true/false` with reasons.
2. Client renders eligibility badges (see `design.md` for badge treatment); apply action is only enabled where `eligible: true`.
3. On Apply, client submits the drive ID and chosen resume version.
4. Server **re-runs** the eligibility check server-side (never trusts the client's cached eligibility) before creating the Application record. This closes the gap where eligibility could have changed between page load and submission (e.g., another admin edited criteria).
5. Server writes the Application, triggers a confirmation notification (in-app + email), and returns the created record.

### 3.2 Coordinator Publishes a Drive

1. Coordinator submits drive details including structured eligibility criteria through the drive form.
2. Server validates input, associates the drive with the coordinator's department (or leaves it institute-wide, TPO only), and persists as `status: draft`.
3. Coordinator transitions status to `published` via a separate action — this is deliberately a distinct step (not automatic on creation) so drives can be prepared ahead of time without going live prematurely.
4. On transition to `published`, server computes the eligible student set and dispatches "new eligible drive" notifications in a background batch (not inline in the request/response cycle, to keep the status-change response fast).

### 3.3 Admin Issues and a Student Responds to an Offer

1. Coordinator/Admin issues an offer against a specific Application: uploads the offer document (routed to Cloudinary), sets a response deadline.
2. Server creates the Offer record (`status: pending`) and notifies the student.
3. Student responds Accept/Decline before the deadline.
4. On Accept: server updates the student's `placementStatus` and `currentTier`, which immediately feeds the Business Rules layer (One-Offer/Tier-Lock) for all future eligibility computations — this update must happen synchronously and atomically with the offer-status update, since a delayed or missed update would let a placed student incorrectly appear eligible elsewhere.
5. On Decline, or if the deadline passes unactioned (server-side passive check, per NFR-REL-01), status updates accordingly without touching placement status.

---

## 4. Authentication & Authorization Architecture

- **Token model:** short-lived JWT access token + longer-lived rotating refresh token. Access tokens carry role and, for coordinators, department — but the server treats these as *hints only* for routing; every scoped query re-derives authorization from the persisted User record, never trusting claims alone for data-scoping decisions where staleness would matter (e.g., a coordinator reassigned to a new department mid-session).
- **Layered enforcement, applied in order, on every protected route:**
  1. Token verification (is this a valid, unexpired credential?)
  2. Role guard (is this role even permitted on this route?)
  3. Department-scope resolution (for coordinators — attach the scope filter used by the controller/service layer)
  4. Ownership check where applicable (is a student acting only on their own resources?)
- **Frontend route guards mirror this only for UX** (avoiding a flash of unauthorized content); they are never the actual security boundary.

---

## 5. Eligibility Engine Architecture

The eligibility engine is a **pure, stateless service function**: given a student's profile snapshot and a drive's criteria + business-rule context (current season config), it returns an eligibility verdict and reasons. It has no side effects and no direct database access — callers (the drive-list controller, the apply controller) fetch the needed data and pass it in.

This design choice exists specifically so the engine can be:
- Unit-tested exhaustively against edge cases (backlog boundary, tier boundary, blacklist) without a database.
- Invoked identically at both browse-time (advisory) and apply-time (enforced) without behavioral drift between the two call sites — a common source of eligibility bugs.

Business-rule constants (tier boundaries, current backlog policy) are loaded from a season-configuration source rather than hardcoded, per `srs.md` NFR-MAINT-01.

---

## 6. File Storage Architecture

All user-uploaded files (resumes, job description PDFs, offer letters) are uploaded directly to Cloudinary via signed, short-lived upload credentials issued by the server — the application server itself never holds file bytes on local disk, satisfying NFR-PERF-02 and keeping the backend stateless/horizontally-scalable (NFR-SCAL-01).

---

## 7. Notification Architecture

Notifications are **event-driven**: a domain event (application confirmed, shortlisted, offer issued, etc.) triggers the Notification service, which:
1. Writes an in-app Notification record immediately.
2. Enqueues an email send (does not block the triggering request on SMTP latency).

**Scheduled reminder jobs** (registration-deadline-approaching, round-approaching, offer-expiry sweep) run on a periodic schedule, querying for records crossing a threshold and dispatching through the same notification service — ensuring a single notification code path regardless of trigger source (immediate event vs. scheduled sweep).

---

## 8. Deployment Architecture

```
┌────────────────┐      ┌──────────────────┐      ┌───────────────────┐
│  Vercel          │      │  Render/Railway    │      │  MongoDB Atlas      │
│  (Frontend SPA)  │─────►│  (Backend API +    │─────►│  (Database, free/   │
│                  │      │   scheduled jobs)  │      │   shared tier)      │
└────────────────┘      └──────────┬───────┘      └───────────────────┘
                                     │
                       ┌─────────────┼─────────────┐
                       ▼             ▼             ▼
               ┌─────────────┐ ┌───────────┐ ┌───────────┐
               │ Cloudinary   │ │  SMTP       │ │  (future:  │
               │ (files)      │ │  provider   │ │  domain)   │
               └─────────────┘ └───────────┘ └───────────┘
```

**Environment strategy:** a single production-like environment is sufficient for this project's scope; a local development environment (`.env`-driven, local or Atlas free-tier database) mirrors it. A staging tier is not required given the project's scale, but the environment variable structure (see `rules.md`) supports adding one later without code changes.

---

## 9. Security Architecture (Defense in Depth)

| Layer | Control |
|---|---|
| Transport | HTTPS enforced at the hosting platform level |
| Authentication | Hashed passwords, short-lived access tokens, rotating refresh tokens |
| Authorization | Server-enforced RBAC + department scoping on every route (never client-trusted) |
| Input | Schema-based validation on every mutating endpoint, rejecting unexpected fields |
| Files | Type and size validation before any upload is accepted |
| Rate limiting | Applied to authentication endpoints specifically, to blunt credential-stuffing attempts |
| Audit | Immutable, append-only log of every administrative override and status change |
| Secrets | Environment-variable only; never committed, never logged |

---

## 10. Scalability & Performance Considerations

- All list endpoints are paginated and indexed on their primary filter fields (branch, batch, status, drive reference) — see `srs.md` NFR-PERF-01/FR-SEA-02.
- The eligibility engine's statelessness means it scales linearly with request volume, with no shared-state bottleneck.
- Statistics aggregation (current-season snapshot, year-over-year comparison) is computed via database-level aggregation rather than pulling raw records into application memory, since these queries scale with student/application volume.
- No caching layer is required at this project's scale; if introduced later, the eligibility engine's statelessness makes it a natural caching candidate first.

---

## 11. Technology Decision Log

| Decision | Alternatives Considered | Rationale |
|---|---|---|
| MongoDB over a relational database | PostgreSQL/MySQL | Requirement entities (Application's per-round status array, Drive's flexible eligibility criteria) are naturally document-shaped and evolve per placement season; document flexibility outweighs relational join guarantees at this scale |
| JWT (access + refresh) over server-side sessions | Session cookies + server session store | Keeps the API stateless (NFR-SCAL-01) without requiring a session store service |
| Cloudinary over local/server disk storage | Local filesystem, raw S3 | Managed service removes the need to build upload validation, resizing, and CDN delivery from scratch; free tier is sufficient at this project's scale |
| Structured eligibility criteria over free-text | Free-text eligibility description parsed by an admin manually | Structured fields are what makes automated, testable eligibility computation (a core differentiator of this project) possible at all |
| Stateless eligibility engine over an eligibility "status" field cached on the Application | Pre-computed and stored eligibility flag | Avoids staleness bugs when criteria or student data change after the flag would have been cached; recomputation is cheap and always correct |

---

## 12. Module Boundaries (Reference)

Exact folder/file layout, naming conventions, and library choices are governed by `rules.md` — this document defines *where responsibility lives conceptually* (the layers in Section 2); `rules.md` defines *how that maps to actual files and packages*.
