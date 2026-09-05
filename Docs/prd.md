# Product Requirements Document (PRD)
## Placement Cell Management System (PCMS) — SKIT, Jaipur

| | |
|---|---|
| **Document Version** | 1.0 |
| **Status** | Approved |
| **Owner** | Product/Project Lead |
| **Companion Documents** | `srs.md` (requirements detail), `architecture.md` (technical design), `phases.md` (delivery plan) |

---

## 1. Product Vision

A single, trustworthy digital home for SKIT's placement season — where a student always knows exactly which companies they qualify for and where they stand, and where the T&P Cell runs an entire season without a single spreadsheet.

> *"Replace the T&P Cell's spreadsheet-and-notice-board workflow with a system every student trusts and every coordinator actually wants to use."*

---

## 2. Problem Statement

**Today, placement coordination at a typical engineering college runs on:**
- Printed notices and WhatsApp broadcasts for drive announcements, easily missed or lost in scroll.
- Manual, error-prone cross-checking of each student's CGPA/branch/backlog against each company's criteria.
- Excel sheets tracking who applied, who was shortlisted, and who has offers — maintained by hand, prone to version drift when multiple coordinators edit copies.
- No consolidated season-over-season record for NBA/NAAC/NIRF reporting.
- Students with no visibility into *why* they are or aren't eligible for a given drive, leading to repeated queries to the T&P office.

**Cost of the status quo:** hours of coordinator time per drive on manual eligibility checks and shortlist compilation; missed deadlines and rounds due to poor visibility; no reliable historical data for institutional reporting.

---

## 3. Goals & Success Metrics

| Goal | Metric (Pilot Success Criteria) |
|---|---|
| Eliminate manual eligibility cross-checking | 100% of eligibility decisions computed automatically; zero manual spreadsheet cross-referencing per drive |
| Give students self-service visibility | Every student can answer "am I eligible, and if not, why?" without contacting the T&P office |
| Reduce coordinator administrative load | Shortlist processing for a 100+ applicant round takes minutes (CSV bulk upload) rather than hours |
| Maintain a trustworthy institutional record | 100% of admin actions on applications/eligibility are audit-logged with a reason |
| Produce reportable statistics on demand | Current-season and year-over-year placement statistics available without manual compilation |

This is evaluated as a **working pilot**, not a production SaaS launch — success is measured by whether the T&P Cell and a cohort of students could genuinely run one placement cycle on it end to end.

---

## 4. Target Users / Personas

**Priya — Final-Year Student (CSE)**
Wants to know, at a glance, which of this week's drives she actually qualifies for, without reading fine-print eligibility PDFs. Anxious about missing a registration deadline or an interview round buried in a WhatsApp group.

**Mr. Reddy — Department Placement Coordinator (Mechanical)**
Manages placement for his department alongside a full teaching load. Currently keeps a personal Excel sheet per company. Wants to publish a drive once and trust the system to tell him who's eligible, then process 80 shortlist decisions in one bulk action rather than one by one.

**Ms. Sharma — Training & Placement Officer (TPO)**
Owns placement outcomes and institutional reporting across all departments. Needs a real-time, comparable view of this season's numbers against the last two years for NAAC/NIRF submissions, and needs a defensible audit trail if a placement decision is ever questioned.

---

## 5. User Stories

Grouped by role. Priority follows MoSCoW, mirroring `srs.md` Section 6.

### Student

| ID | Story | Priority |
|---|---|---|
| US-01 | As a student, I want to see which drives I'm eligible for and why, so I don't waste time reading eligibility fine print. | Must |
| US-02 | As a student, I want to upload multiple resume versions and pick which one to submit per application, so I can tailor my resume by role type. | Must |
| US-03 | As a student, I want to track my application status per round, so I know exactly where I stand without asking anyone. | Must |
| US-04 | As a student, I want to see all my upcoming interview rounds in one calendar, so I never miss one. | Should |
| US-05 | As a student, I want to be warned if two rounds clash, so I can flag the conflict early. | Should |
| US-06 | As a student, I want to accept or decline an offer digitally within a deadline, so I don't need to visit the T&P office in person. | Must |
| US-07 | As a student, I want a quick rule-based check of my resume (contact info present, right length, key sections present), so I can catch obvious gaps before applying. | Should |
| US-08 | As a student, I want to read the placement rules once and acknowledge them digitally, so expectations are clear from day one. | Must |
| US-09 | As a student, I want a searchable FAQ and a contacts directory, so I can self-serve common questions instead of emailing the T&P office. | Should |

### Placement Coordinator

| ID | Story | Priority |
|---|---|---|
| US-10 | As a coordinator, I want to publish a drive with structured eligibility criteria once, so the system filters eligible students automatically. | Must |
| US-11 | As a coordinator, I want to clone last year's drive for a returning company, so I don't re-enter the same data. | Could |
| US-12 | As a coordinator, I want to bulk-upload a shortlist by roll number after an OA, so I don't update 150 records by hand. | Must |
| US-13 | As a coordinator, I want to see only my department's students and drives by default, so my workspace isn't cluttered with other departments' data. | Must |
| US-14 | As a coordinator, I want to issue offer letters and track responses, so I know final placement numbers in real time. | Must |
| US-15 | As a coordinator, I want to override an ineligible application in special cases, with the reason recorded, so exceptions are handled transparently. | Should |

### TPO / Super Admin

| ID | Story | Priority |
|---|---|---|
| US-16 | As the TPO, I want a live statistics dashboard across all departments, so I always know current placement standing. | Must |
| US-17 | As the TPO, I want to compare this season's numbers against the past two seasons, so I can report trends to leadership and accreditation bodies. | Should |
| US-18 | As the TPO, I want a full audit trail of every override and status change, so decisions are defensible if questioned. | Must |
| US-19 | As the TPO, I want to maintain a single, versioned rules & regulations page, so policy is always current and centrally controlled. | Must |
| US-20 | As the TPO, I want to post institute-wide announcements distinct from department-level ones, so urgent, cross-department notices are clearly distinguished. | Should |

---

## 6. Feature Prioritization (MoSCoW Summary)

| Priority | Features |
|---|---|
| **Must Have** | Auth + RBAC, department scoping, drive/company management, eligibility engine, application workflow, offer letters, policy acknowledgment, audit log, current-season statistics, search/filter/sort, CSV import/export |
| **Should Have** | Round/PPT scheduling with calendar + conflict detection, bulk shortlist upload, eligibility override, year-over-year statistics, resume checklist tool, contacts directory, FAQ, notifications (email + in-app), dark mode/PWA |
| **Could Have** | Drive cloning, calendar export (.ics), announcement pinning/expiry, statistics report export |
| **Won't Have (this build)** | Recruiter login, AI/NLP resume parsing, SMS notifications, chatbot, payments, native mobile apps |

Full requirement-level detail and IDs live in `srs.md` Section 6; this table is the executive-level cut.

---

## 7. Assumptions & Constraints

- Single institution, single deployment — no multi-tenancy requirement.
- The T&P office can supply an accurate student master CSV (roll no., name, email, branch, batch) at season start.
- Development is time-boxed to an academic lab-project timeline (see `phases.md` for the phased delivery plan) — scope is intentionally sequenced so a usable subset is demonstrable well before every phase completes.
- No dedicated design or backend infrastructure team — architecture choices in `architecture.md` favor managed/free-tier services (MongoDB Atlas, Render, Vercel, Cloudinary) appropriate for a solo/small-team build.

---

## 8. Risks

See `srs.md` Section 13 for the full risk register. Product-level highlights:

| Risk | Mitigation |
|---|---|
| Low pilot adoption if coordinators find it harder than their existing Excel workflow | Prioritize bulk CSV actions (US-12) and a low-friction drive-creation form; validate with a real coordinator before finalizing the drive-creation UI in Phase (see `phases.md`) |
| Placement policy changes mid-build (new tier rule, changed backlog limit) | Business rules kept data-driven per `srs.md` NFR-MAINT-01, not hardcoded |
| Scope creep into out-of-scope items (recruiter portal, AI parsing) | `rules.md` explicitly bounds the AI agent to the active phase only |

---

## 9. Success Criteria / Launch Readiness

The product is ready for pilot use when:
1. All **Must Have** features in Section 6 are live and demonstrable for all three roles.
2. At least one real drive has been run end-to-end through the system (publish → apply → shortlist → offer → accept) with real or realistic data.
3. A coordinator and a small student cohort (5–10) have used it and confirmed it's faster than their prior workflow for at least the eligibility-check and shortlist steps.

---

## 10. Sign-off

| Role | Name | Status |
|---|---|---|
| Product/Project Owner | *(you)* | Pending |
| Technical Reviewer | *(faculty guide, if applicable)* | Pending |
| Pilot Coordinator | *(a real T&P coordinator, if arranged)* | Pending |
