# Placement Cell Management System (PCMS)

**Swami Keshvanand Institute of Technology, Management & Gramothan, Jaipur (SKIT) — T&P Cell**

A role-based web platform that manages the complete campus placement lifecycle — company drive
announcements, student eligibility, multi-round interview scheduling, offer management, and placement
analytics — for three actor classes: **Students**, **Placement Coordinators**, and the **Training &
Placement Officer (Super Admin)**.

It replaces a manual process built on spreadsheets, printed notices, and WhatsApp broadcasts.

> This repository is built incrementally, one phase at a time, per [`Docs/phases.md`](Docs/phases.md).
> Live per-phase status lives in [`Docs/memory.md`](Docs/memory.md).

---

## Governance Documents

These documents are the single source of truth for the project. Read them before contributing.

| Document | Purpose |
| --- | --- |
| [Product Requirements (PRD)](Docs/prd.md) | Product vision, personas, user stories, success criteria |
| [Software Requirements (SRS)](Docs/srs.md) | Authoritative functional/non-functional requirements with stable IDs |
| [Architecture](Docs/architecture.md) | System design — layers, data flows, deployment shape |
| [Design System](Docs/design.md) | Visual tokens, components, and institutional identity |
| [Engineering Rules](Docs/rules.md) | Binding tech-stack, security, and contributor conventions |
| [Phased Delivery Plan](Docs/phases.md) | The 67-phase build order — one phase = one branch = one PR |
| [Project Memory](Docs/memory.md) | Live project state: what's done, active, and decided |

---

## Repository Structure

```
.
├── client/        # React 18 + Vite single-page application (frontend)
├── server/        # Node.js + Express REST API (backend)
├── Docs/          # Governance documents (see table above)
└── README.md
```

Each of `client/` and `server/` is an independent npm project (the two deploy separately — the client
to a static host, the server to a Node host — per [`Docs/architecture.md`](Docs/architecture.md) §8).

---

## Tech Stack (locked — see [`Docs/rules.md`](Docs/rules.md) §2)

| Concern | Choice |
| --- | --- |
| Frontend | React 18 (Vite), Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod |
| Backend | Node.js + Express, MongoDB + Mongoose |
| Auth | jsonwebtoken + bcrypt |
| Files / Email / Jobs | Cloudinary, Nodemailer, node-cron |
| Testing | Vitest/Jest + Supertest (API), React Testing Library (frontend) |

Introducing any library **not** listed in `Docs/rules.md` §2–3 requires adding it there first.

---

## Local Development

Prerequisites: **Node.js 20+** and npm.

Install dependencies (each package separately):

```bash
cd client && npm install
cd ../server && npm install
```

### Linting & formatting

Both packages share the root Prettier config ([`.prettierrc.json`](.prettierrc.json)) and use ESLint.

```bash
# from client/ or server/
npm run lint          # check for lint errors
npm run format:check  # verify formatting
npm run format        # apply formatting
```

> Application source is added phase by phase. As of Phase 1 the repository contains tooling
> configuration only — there is no runnable app yet (the backend arrives in Phase 2, the frontend
> shell in Phase 3).

---

## License

Academic project — not licensed for redistribution.
