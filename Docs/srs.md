# Software Requirements Specification (SRS)
## Placement Cell Management System (PCMS)

| | |
|---|---|
| **Document Version** | 3.0 |
| **Status** | Approved for Development |
| **Prepared For** | Human development team + AI coding agent(s) |
| **Prepared As** | Authoritative requirements source — supersedes all prior scoping documents |

---

## 1. Purpose & Audience

This SRS is the single source of truth for **what** the system must do and **what data it must manage**. It is written to be consumed by two audiences simultaneously:

1. **Human stakeholders** (student developer, faculty evaluator) — for scoping, grading, and documentation purposes.
2. **An AI coding agent** — as grounding context before any implementation work. The agent should treat every requirement ID in this document as a stable reference point; when implementing a phase from `phases.md`, the agent should trace its work back to the FR/NFR/DR IDs listed here.

This document intentionally contains **no code, schema syntax, or implementation detail** — those live in `architecture.md` (system design) and `rules.md` (implementation conventions). This document answers *what* and *why*; the others answer *how*.

---

## 2. Project Overview

PCMS is a role-based web platform that manages the complete campus placement lifecycle — company drive announcements, student eligibility, multi-round interview scheduling, offer management, and placement analytics — for three actor classes: **Students**, **Placement Coordinators**, and the **Training & Placement Officer (Super Admin)**.

It replaces a currently manual process built on spreadsheets, printed notices, and WhatsApp broadcasts.

---

## 3. Scope

### 3.1 In Scope
- Student-facing: eligibility-aware drive browsing, application, round tracking, offer response, resume management, calendar view, resume-quality checklist, announcements, FAQ, contacts directory.
- Coordinator/Admin-facing: drive and round lifecycle management, applicant shortlisting (manual + bulk), eligibility overrides, offer issuance, rules/policy CMS, statistics dashboards, audit trail.
- System-wide: role-based access control, email + in-app notifications, department-level data scoping for coordinators, CSV import/export at every relevant list screen.

### 3.2 Out of Scope (this build)
- Recruiter-facing login/portal.
- AI/NLP-based resume parsing or JD-matching (the resume checklist is rule-based only — see DR-14 and FR-RES).
- SMS notifications.
- Conversational chatbot (a searchable FAQ is in scope; a chatbot is not).
- Payment processing of any kind.
- Native mobile applications (responsive web + installable PWA only).

Anything in this section may be reconsidered in a future version but must not be built speculatively during this project's phases.

---

## 4. Definitions & Glossary

| Term | Definition |
|---|---|
| **Drive** | A single company's recruitment process for one job opening, containing one or more Rounds. |
| **Round** | A discrete stage within a Drive (e.g., Online Assessment, Technical Interview) with its own date/time/venue. |
| **Info Session / PPT** | A Pre-Placement Talk — an informational session distinct from an evaluative Round. |
| **Eligibility Criteria** | The structured rule set attached to a Drive (branch, batch, CGPA, backlog limits, etc.) that determines which students may apply. |
| **Business Rules** | Cross-drive policy logic layered on top of raw eligibility — specifically the One-Offer Rule and Tier-Lock Rule (see Section 8). |
| **Tier** | A numeric classification of a Drive's compensation bracket, used to enforce the Tier-Lock Rule. |
| **Coordinator** | A department-scoped administrator. |
| **Super Admin / TPO** | An unscoped administrator with institute-wide access. |
| **Offer** | A formal job offer issued against a specific Application, requiring student response within a deadline. |
| **Audit Log** | An immutable, append-only record of every administrative write-action. |

---

## 5. Stakeholders & User Roles

| Role | Description | Data Scope |
|---|---|---|
| **Student** | Primary end user; manages own profile and applications | Self only |
| **Placement Coordinator** | Manages drives and applicants for one department | Single department (own) + institute-wide drives |
| **Super Admin (TPO)** | Full institutional oversight | All departments |

Role definitions are enforced server-side, not merely hidden in the UI (see NFR-SEC-02).

---

## 6. Functional Requirements

Each requirement carries a unique ID for traceability into `phases.md`. Priority follows MoSCoW: **M**ust, **S**hould, **C**ould.

### 6.1 Authentication & Access Control

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-01 | System shall authenticate users via email + password and issue a short-lived access token and a rotating refresh token. | M |
| FR-AUTH-02 | System shall support bulk onboarding of students via CSV upload, triggering an activation email to each. | M |
| FR-AUTH-03 | New students shall be forced to set their own password on first login. | M |
| FR-AUTH-04 | System shall support forgot-password / reset-password via emailed token. | M |
| FR-AUTH-05 | Every protected route shall verify both a valid token and the caller's role before executing. | M |
| FR-AUTH-06 | Coordinator accounts shall be scoped to exactly one department; Super Admin accounts shall be unscoped. | M |

### 6.2 Student Profile Management

| ID | Requirement | Priority |
|---|---|---|
| FR-STU-01 | Students shall maintain academic details (CGPA overall + semester-wise, active backlog count, 10th/12th percentage). | M |
| FR-STU-02 | Students shall upload multiple labeled resume versions and mark one as default. | M |
| FR-STU-03 | Students shall maintain skills, certifications (with proof), and project entries. | S |
| FR-STU-04 | System shall compute and display a profile-completeness percentage. | S |
| FR-STU-05 | Coordinators/Admins shall view and search the student list within their data scope, filterable by branch, batch, CGPA range, backlog count, and placement status. | M |
| FR-STU-06 | Admin shall be able to flag a student account as blacklisted, with a mandatory reason, blocking further applications. | S |

### 6.3 Company & Drive Management

| ID | Requirement | Priority |
|---|---|---|
| FR-DRV-01 | Coordinators/Admins shall create, edit, and retire Company records. | M |
| FR-DRV-02 | Coordinators/Admins shall create Drives with structured eligibility criteria (branches, batches, minimum CGPA, maximum backlogs, minimum 10th/12th %), CTC/stipend detail, vacancy count, and a registration deadline. | M |
| FR-DRV-03 | Drives shall progress through a defined status lifecycle: Draft → Published → Registration Open → Registration Closed → In Progress → Completed → Results Declared. | M |
| FR-DRV-04 | Coordinators/Admins shall be able to clone an existing Drive as a new Draft. | C |
| FR-DRV-05 | Students shall browse all Published+ Drives, filterable/sortable by job type, CTC range, status, and eligibility. | M |

### 6.4 Round & Info Session Scheduling

| ID | Requirement | Priority |
|---|---|---|
| FR-SCH-01 | Coordinators/Admins shall define one or more Rounds per Drive, each with date, time, mode (online/offline), and venue or meeting link. | M |
| FR-SCH-02 | Coordinators/Admins shall separately schedule Info Sessions (PPTs) per Drive, optionally marked mandatory. | S |
| FR-SCH-03 | Students shall view an aggregated calendar of all their upcoming Rounds and Info Sessions across all applied Drives. | S |
| FR-SCH-04 | System shall flag scheduling conflicts when two of a student's Rounds/Info Sessions overlap in time. | S |
| FR-SCH-05 | Students shall be able to export their calendar in a standard calendar-file format. | C |

### 6.5 Eligibility Engine

| ID | Requirement | Priority |
|---|---|---|
| FR-ELG-01 | System shall compute, per student per Drive, an eligibility result (`eligible: true/false`) with human-readable reasons for ineligibility. | M |
| FR-ELG-02 | Eligibility shall be evaluated server-side at both browse-time (display only) and apply-time (enforced). | M |
| FR-ELG-03 | Ineligible students shall be prevented from submitting an application, absent an explicit Admin override. | M |
| FR-ELG-04 | Admin shall be able to override an ineligible application with a mandatory logged reason (see FR-AUD-01). | S |
| FR-ELG-05 | System shall enforce the One-Offer Rule and Tier-Lock Rule as defined in Section 8. | M |

### 6.6 Application Workflow

| ID | Requirement | Priority |
|---|---|---|
| FR-APP-01 | Students shall apply to an eligible Drive, attaching a selected resume version. | M |
| FR-APP-02 | Students shall withdraw an application prior to the registration deadline. | S |
| FR-APP-03 | Applications shall track status per Round (pending/shortlisted/cleared/not cleared/absent) and an overall status. | M |
| FR-APP-04 | Coordinators/Admins shall update Round-level status manually, one applicant at a time. | M |
| FR-APP-05 | Coordinators/Admins shall bulk-update Round-level status via CSV upload of roll numbers. | S |
| FR-APP-06 | Coordinators/Admins shall view, filter, and sort the applicant list for a given Drive by Round and status. | M |

### 6.7 Offer Letter Management

| ID | Requirement | Priority |
|---|---|---|
| FR-OFR-01 | Coordinators/Admins shall issue an Offer against a selected Application, uploading the official offer document and setting a response deadline. | M |
| FR-OFR-02 | Students shall view their Offers and respond Accept/Decline within the stated deadline. | M |
| FR-OFR-03 | An unactioned Offer shall automatically transition to an Expired state after its deadline. | S |
| FR-OFR-04 | Accepting an Offer shall update the student's placement status and current Tier, feeding the Business Rules layer (FR-ELG-05). | M |

### 6.8 Announcements, Rules & Notifications

| ID | Requirement | Priority |
|---|---|---|
| FR-ANN-01 | Coordinators/Admins shall post Announcements categorized as General, Drive-specific, or Urgent, optionally pinned and optionally expiring. | M |
| FR-RUL-01 | Admin shall maintain a versioned Rules & Regulations page. | M |
| FR-RUL-02 | Students shall be required to digitally acknowledge the current Rules version before their first application; the acceptance and version shall be timestamped and retained. | M |
| FR-NOT-01 | System shall send in-app and email notifications on: new eligible Drive published, application confirmed, shortlisted for next Round, Round rescheduled, results declared, Offer issued, and approaching deadlines. | M |
| FR-NOT-02 | Students shall be able to mark notifications read individually or in bulk. | C |

### 6.9 Directory, FAQ & Resume Tooling

| ID | Requirement | Priority |
|---|---|---|
| FR-CON-01 | Admin shall maintain a searchable Contacts directory (TPO, coordinators, representatives). | S |
| FR-FAQ-01 | Admin shall maintain a searchable FAQ collection. | S |
| FR-RES-01 | Students shall run a rule-based resume checklist against a chosen resume version, receiving a completeness score and pass/fail items (contact info present, key sections present, page-length within limit). | S |
| FR-RES-02 | Each resume checklist run shall be stored server-side, retaining history per student (per user decision, see Section 12). | S |

### 6.10 Statistics & Audit

| ID | Requirement | Priority |
|---|---|---|
| FR-STA-01 | Coordinators/Admins shall view a current-season statistics snapshot: placement percentage, average/median/highest CTC, department-wise breakdown. | M |
| FR-STA-02 | Admin shall view a year-over-year comparison across at least the prior two placement seasons. | S |
| FR-STA-03 | Coordinators/Admins shall view a per-Drive funnel (Applied → Shortlisted → Selected) to identify drop-off points. | S |
| FR-STA-04 | Admin shall export statistics reports in a downloadable format. | C |
| FR-AUD-01 | System shall write an immutable Audit Log entry for every administrative override, status change, and policy edit, capturing actor, action, target, reason, and timestamp. | M |
| FR-AUD-02 | Admin shall view and filter the Audit Log by actor, action type, and date range. | S |

### 6.11 Cross-Cutting: Search, Filter, Sort, Export

| ID | Requirement | Priority |
|---|---|---|
| FR-SEA-01 | Every list screen (Drives, Students, Applications, Announcements, FAQ, Contacts) shall support search, at least one filter dimension, and at least one sort dimension appropriate to that entity. | M |
| FR-SEA-02 | List endpoints shall be paginated server-side; no endpoint shall return an unbounded result set. | M |
| FR-SEA-03 | Coordinators/Admins shall export Student lists, Applicant lists, and Statistics reports to CSV. | S |

---

## 7. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-PERF-01 | Performance | List endpoints shall respond within 500ms under nominal load (≤5,000 students, ≤200 concurrent Drives) with proper indexing. |
| NFR-PERF-02 | Performance | File uploads (resumes, JDs, offer letters) shall be offloaded to external object storage, never served from the application server's local disk. |
| NFR-SEC-01 | Security | Passwords shall be hashed (never stored or logged in plaintext). |
| NFR-SEC-02 | Security | Authorization shall be enforced at the API layer for every mutating and every scoped-read route; client-side role checks are cosmetic only and never authoritative. |
| NFR-SEC-03 | Security | All file uploads shall be validated for type and size before storage. |
| NFR-SEC-04 | Security | Authentication endpoints shall be rate-limited to mitigate credential-stuffing/brute-force attempts. |
| NFR-SEC-05 | Security | Coordinator data access shall be scoped to their single assigned department at the query level, not merely filtered in the UI. |
| NFR-SCAL-01 | Scalability | The backend shall be stateless, permitting horizontal scaling without session affinity. |
| NFR-USE-01 | Usability | The interface shall be fully usable on mobile viewports (≥360px width). |
| NFR-USE-02 | Usability | The interface shall support a user-toggleable dark mode without loss of contrast/accessibility. |
| NFR-REL-01 | Reliability | Scheduled notification jobs (reminders, offer-expiry sweep) shall be resilient to a single missed run — no student-facing deadline shall depend on job timing alone without a passive server-side deadline check as backstop. |
| NFR-MAINT-01 | Maintainability | Business rules subject to change each placement season (backlog limits, tier boundaries, one-offer policy) shall be data-driven, not hardcoded in application logic. |
| NFR-AUD-01 | Auditability | Audit Log entries, once written, shall never be updated or deleted by application code. |
| NFR-COMP-01 | Compliance | Student academic and personal data shall be accessible only to the student themself and to admins/coordinators within their authorized scope — never publicly exposed. |

---

## 8. Business Rules (Detailed Specification)

These rules govern eligibility beyond raw criteria matching and must be treated as first-class, testable logic — not incidental UI behavior.

**8.1 One-Offer Rule**
Once a student's placement status becomes `placed`, they are excluded from applying to further Drives, **except** where the Tier-Lock exception (8.2) applies.

**8.2 Tier-Lock Rule**
Every Drive carries a numeric `tier` (lower number = more competitive/higher compensation bracket). A placed student may still apply to a Drive of a **strictly better** tier than the one they were placed at (an "upgrade"), but not to a Drive of an equal or worse tier.

**8.3 Backlog & Academic Thresholds**
A Drive's `maxBacklogs`, `minCgpa`, `min10th`, and `min12th` values are authored per-Drive by Coordinators/Admins at creation time and are not institution-wide constants — different companies set different bars.

**8.4 Blacklist Override**
A blacklisted student is ineligible for all Drives regardless of academic criteria, until the blacklist flag is cleared by Admin.

**8.5 Season Configurability**
The specific numeric boundaries used in 8.1–8.3 (e.g., what counts as a "better tier") must be configurable per placement season rather than fixed in code, since placement policy is set annually by the TPO office.

---

## 9. Data Requirements (Conceptual Data Dictionary)

This section describes *what data the system must retain and relate*, independent of any specific database technology or schema syntax (see `architecture.md` for the chosen persistence approach).

| # | Entity | Represents | Key Attributes (conceptual) | Relationships |
|---|---|---|---|---|
| DR-01 | **User** | An authenticated account | name, email, password credential, role, department (if coordinator), active flag | 1:1 with Student Profile when role=student |
| DR-02 | **Student Profile** | A student's academic + placement identity | roll number, branch, batch, section, academic record, resumes, skills, certifications, projects, placement status, current tier, blacklist flag, policy-acknowledgment record | 1:1 User; 1:N Applications; 1:N Resume Checklist Runs |
| DR-03 | **Company** | An organization running a Drive | name, sector, about, HR contact | 1:N Drives |
| DR-04 | **Drive** | A single job opening's recruitment process | job title, job type, compensation, eligibility criteria, tier, vacancies, deadline, status, department scope | N:1 Company; 1:N Rounds; 1:N Info Sessions; 1:N Applications |
| DR-05 | **Round** | One evaluative stage of a Drive | round number, name, date/time, mode, venue/link, instructions | N:1 Drive |
| DR-06 | **Info Session** | A non-evaluative Drive event (PPT) | title, date/time, mode, venue/link, mandatory flag | N:1 Drive |
| DR-07 | **Application** | A student's candidacy for a Drive | resume snapshot used, per-Round status history, overall status, eligibility-override record, applied timestamp | N:1 Student Profile; N:1 Drive; 1:1 Offer (if issued) |
| DR-08 | **Offer** | A formal offer against an Application | document reference, issued date, response deadline, status, response timestamp | 1:1 Application |
| DR-09 | **Announcement** | A posted notice | title, body, category, related Drive (optional), department scope, pin flag, expiry | N:1 posting Admin/Coordinator |
| DR-10 | **Notification** | A per-user alert | type, message, link, read flag, email-sent flag | N:1 User |
| DR-11 | **Rules Page** | Versioned policy content | content body, version identifier, editor | Referenced by Student Profile's acknowledgment record |
| DR-12 | **Contact** | A directory entry | name, role, department, email, phone | Standalone |
| DR-13 | **FAQ Entry** | A help-center Q&A pair | question, answer, category, tags | Standalone, text-searchable |
| DR-14 | **Resume Checklist Run** | One rule-based scoring pass | resume label, pass/fail checklist items, numeric score, timestamp | N:1 Student Profile |
| DR-15 | **Audit Log Entry** | One immutable record of an admin action | actor, action type, target entity + ID, reason, metadata snapshot, timestamp | N:1 acting User; references arbitrary target entity |

---

## 10. External Interface Requirements

| Interface | Requirement |
|---|---|
| Email delivery | System shall integrate with a transactional email provider for activation, reset, and notification emails. |
| File storage | System shall integrate with external object storage for resumes, job descriptions, and offer documents. |
| Browser support | Latest two major versions of Chrome, Firefox, Edge, and Safari (desktop + mobile). |
| Calendar export | System shall produce a standard, calendar-application-importable file for a student's schedule. |

---

## 11. Assumptions & Dependencies

- The institution provides an initial, accurate student master list (roll number, name, email, branch, batch) for the bulk-import feature.
- Placement policy numeric values (backlog limits, tier boundaries) are supplied by the TPO office and may change between seasons.
- Students have consistent access to institutional or personal email for activation and notifications.
- A single deployment serves a single institution (multi-tenancy is not required).

---

## 12. Confirmed Scope Decisions

The following decisions were made explicitly during requirements review and should be treated as settled, not open questions, in all downstream documents:

1. **Coordinator department scoping is single-valued** (one coordinator → one department), enforced at the query layer.
2. **The resume checklist runs server-side and retains history** per student, rather than being a stateless client-only tool.

---

## 13. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | Inaccurate or stale student master data breaks eligibility computation | Medium | High | Validate CSV import against required fields; provide an admin correction workflow |
| R-02 | Placement policy changes mid-season (new tier boundary, relaxed backlog rule) | Medium | Medium | Keep business-rule constants data-driven (NFR-MAINT-01), not hardcoded |
| R-03 | Coordinators attempt to access another department's data | Low | High | Enforce department scoping server-side (NFR-SEC-05), never trust client-supplied scope |
| R-04 | Missed scheduled reminder job causes a student to miss a deadline | Low | Medium | Passive deadline checks in addition to proactive reminder jobs (NFR-REL-01) |
| R-05 | Scope creep toward out-of-scope items (Section 3.2) mid-build | Medium | Medium | `rules.md` explicitly instructs the AI agent to stay within the active phase in `phases.md` |

---

## 14. Acceptance Criteria for the System

The system is considered functionally complete for this build when:
1. All requirements marked **Must (M)** in Section 6 are implemented and demonstrable end-to-end for all three roles.
2. All Non-Functional Requirements marked with a `01` suffix in each category (the baseline tier) are satisfied.
3. Every phase in `phases.md` has reached "Complete" status in `memory.md`.

---

## 15. Traceability Note

Every Functional Requirement ID in Section 6 is implemented by one or more phases in `phases.md`. When beginning a phase, cross-reference its stated objective against this section to confirm alignment before writing any code.
