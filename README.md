# Placement Cell Management System (PCMS)

**Swami Keshvanand Institute of Technology, Management & Gramothan, Jaipur (SKIT) — Training & Placement Cell**

A comprehensive, role-based campus placement management platform that digitizes and streamlines the entire placement lifecycle — from company onboarding and drive announcements to student eligibility filtering, multi-round interview tracking, offer acceptance, and institutional placement analytics.

Built for three primary stakeholder roles: **Students**, **Department Placement Coordinators**, and the **Training & Placement Officer (TPO / Super Admin)**.

---

## 🌟 Key Features & Portals

### 🎓 Student Portal

- **Academic Profile Management**: Maintain academic records, current CGPA, active/cleared backlogs, branch, and graduation batch.
- **Resume & ATS Check**: Upload and manage resumes backed by Cloudinary with ATS compatibility checks.
- **Eligible Drive Discovery**: Browse live placement drives with automated, real-time eligibility evaluation based on company criteria (CGPA cutoff, allowed branches, max backlogs).
- **Application Tracking**: One-click drive applications; monitor progression status through multi-stage interview rounds (Aptitude, Technical, GD, HR).
- **Offer Management**: Receive and review job offers with detailed CTC breakdowns; accept or decline offers with automatic enforcement of the institutional placement policy.
- **Information & Communication**: In-app notifications, placement calendar, campus announcement board, placement rules & regulations, and FAQ directory.

### 📋 Placement Coordinator Portal

- **Department-Scoped Administration**: Manage drives and applicant data scoped directly to the coordinator's academic department.
- **Drive & Applicant Lifecycle**: Create drives, define eligibility parameters, and track student applications.
- **Multi-Round Interview Pipelines**: Progress candidates through interview rounds, mark attendance, and record interview results.
- **Department Analytics**: Track department placement percentages, student participation rates, and average CTC.

### 🏛️ Training & Placement Officer (TPO / Super Admin) Portal

- **Institutional Governance**: Full cross-department authority across all engineering and management programs.
- **Company Relationship Management**: Maintain company profiles, primary recruiter contacts, and past recruitment history.
- **Bulk Student Onboarding**: Import student cohorts via CSV/Excel spreadsheets.
- **Offer Generation & Compliance**: Release formal offers, manage offer deadlines, and enforce single/multiple offer policies.
- **Analytics & Comparative Insights**: Interactive charts for placement statistics, salary distributions, and year-over-year or department-over-department comparisons.
- **Audit Logging**: Comprehensive, tamper-evident audit logs capturing administrative actions for institutional compliance and transparency.

---

## 🔐 Authentication & Security

- **Role-Based Access Control (RBAC)**: Strict permission boundaries for `student`, `coordinator`, and `tpo` roles.
- **Multi-Factor & OTP Verification**: Email OTP verification for login, account activation, and password recovery via Nodemailer (with console fallback in development).
- **First-Time Student Activation**: Pre-provisioned accounts activate via a one-time temporary password, enforcing immediate password initialization.
- **Token-Based Sessions**: Secure JSON Web Tokens (JWT) access and refresh token authentication with HTTP-only cookies and Authorization headers.
- **Data Validation & Hashing**: Strict schema validation powered by Zod and password hashing using `bcrypt`.

---

## 🛠️ Technology Stack

| Layer                 | Technologies                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Frontend**          | React 18, Vite, Tailwind CSS, React Router v7, TanStack Query, React Hook Form, Zod, Recharts, Lucide React |
| **Backend**           | Node.js (ESM), Express.js 5, MongoDB, Mongoose ODM                                                          |
| **Authentication**    | JSON Web Tokens (`jsonwebtoken`), `bcrypt`                                                                  |
| **Cloud & Media**     | Cloudinary (resume & file storage), Multer                                                                  |
| **Jobs & Email**      | `node-cron` (automated deadline and reminder schedules), `nodemailer` (transactional emails & OTPs)         |
| **Testing & Quality** | Vitest, React Testing Library, Supertest, MongoDB Memory Server, ESLint, Prettier                           |

---

## 📂 Repository Structure

```
.
├── client/                  # React 18 + Vite SPA (Frontend)
│   ├── src/
│   │   ├── components/      # UI component library, auth guards, modals
│   │   ├── context/         # AuthContext & state providers
│   │   ├── layouts/         # AppLayout, navigation, header
│   │   ├── pages/           # Portal views (Student, Coordinator, TPO, Auth)
│   │   ├── services/        # API client modules
│   │   └── index.css        # Tailwind CSS styles and custom utilities
│   └── vite.config.js       # Vite configuration with /api backend proxy
│
├── server/                  # Node.js + Express REST API (Backend)
│   ├── src/
│   │   ├── config/          # Environment configuration & Zod schemas
│   │   ├── controllers/     # Route handler controllers
│   │   ├── middleware/      # JWT auth, RBAC, scope check, error handler
│   │   ├── models/          # Mongoose schemas (User, Drive, Application, etc.)
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Business logic, OTP, email, Cloudinary
│   │   ├── jobs/            # Scheduled cron jobs (deadlines, reminders)
│   │   └── server.js        # Express app entry point
│   ├── demo-seed.mjs        # Demo/production database seeder script
│   └── .env.example         # Sample environment variable template
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+** installed
- **MongoDB** instance running locally (e.g. `mongodb://localhost:27017/pcms`) or a MongoDB Atlas URI

### 1. Install Dependencies

Install dependencies for both client and server:

```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `server/` directory (you can copy `server/.env.example` as a starting point):

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pcms

# JWT Secrets (minimum 32 characters each)
JWT_ACCESS_SECRET=your-secure-jwt-access-secret-key-32-chars-min
JWT_REFRESH_SECRET=your-secure-jwt-refresh-secret-key-32-chars-min

# Frontend URL
FRONTEND_BASE_URL=http://localhost:5173

# Optional: SMTP Configuration (in development, OTPs also log to console)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="SKIT Placement Cell" <noreply@skit.ac.in>

# Optional: Cloudinary Configuration (for resume uploads)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### 3. Seed Demo Data

Run the demo seed script to populate the database with realistic demo accounts and placement data:

```bash
cd server
node demo-seed.mjs
```

**Pre-configured Demo Accounts:**

| Role            | Email                      | Password       | Notes                              |
| --------------- | -------------------------- | -------------- | ---------------------------------- |
| **TPO / Admin** | `tpo@skit.ac.in`           | `Tpo@1234`     | Active, full access                |
| **Coordinator** | `coord.cse@skit.ac.in`     | `Coord@1234`   | Active, CSE Department             |
| **Student**     | `b221001@skit.ac.in`       | `Student@1234` | Active (8 dept × 5 students = 40)  |

> **Development Note**: When signing in or activating, OTPs and temporary passwords are logged directly to the server terminal console in development mode.

### 4. Run the Development Servers

Open two terminal windows:

```bash
# Terminal 1 — Backend API (runs on http://localhost:5000)
cd server
npm run dev
```

```bash
# Terminal 2 — Frontend Application (runs on http://localhost:5173)
cd client
npm run dev
```

The Vite development server is pre-configured with a reverse proxy that forwards `/api` calls directly to the Express backend on port 5000.

---

## 🧪 Testing & Code Quality

Both packages include test suites and linting scripts:

```bash
# Frontend tests (Vitest + React Testing Library)
cd client
npm test

# Backend tests (Vitest + Supertest + In-Memory MongoDB)
cd ../server
npm test

# Linting & Formatting checks
npm run lint
npm run format:check
```

To build the client for production:

```bash
cd client
npm run build
```

---

## 🚀 Deployment

The system deploys as two independent services:

| Layer        | Platform        | Config file           |
| ------------ | --------------- | --------------------- |
| **Frontend** | Vercel          | `client/vercel.json`  |
| **Backend**  | Render          | `render.yaml`         |
| **Database** | MongoDB Atlas   | —                     |
| **Media**    | Cloudinary      | —                     |

### Backend — Render

1. Connect your repository to [Render](https://render.com) and select **Blueprint** deploy — Render auto-detects `render.yaml` and creates the `pcms-api` web service.
2. In the Render dashboard, set the following environment variables manually (marked `sync: false` in `render.yaml`):

   | Variable                  | Description                                    |
   | ------------------------- | ---------------------------------------------- |
   | `MONGODB_URI`             | MongoDB Atlas connection string                |
   | `JWT_SECRET`              | JWT access-token secret (≥32 chars)            |
   | `JWT_REFRESH_SECRET`      | JWT refresh-token secret (≥32 chars)           |
   | `CLOUDINARY_CLOUD_NAME`   | Cloudinary cloud name                          |
   | `CLOUDINARY_API_KEY`      | Cloudinary API key                             |
   | `CLOUDINARY_API_SECRET`   | Cloudinary API secret                          |
   | `SMTP_HOST`               | SMTP server hostname                           |
   | `SMTP_PORT`               | SMTP server port (e.g. `587`)                  |
   | `SMTP_USER`               | SMTP username / address                        |
   | `SMTP_PASS`               | SMTP password                                  |
   | `CLIENT_ORIGIN`           | Your Vercel frontend URL (e.g. `https://pcms-skit.vercel.app`) |

3. Deploy — Render runs `npm install` then `node src/server.js` from the `server/` root directory.

### Frontend — Vercel

1. Connect your repository to [Vercel](https://vercel.com) and set the **Root Directory** to `client/`.
2. Vercel auto-detects the Vite framework; `client/vercel.json` provides SPA rewrites and security headers.
3. Set the following environment variable in the Vercel dashboard:

   | Variable            | Value                                          |
   | ------------------- | ---------------------------------------------- |
   | `VITE_API_BASE_URL` | Your Render service URL (e.g. `https://pcms-api.onrender.com`) |

4. Deploy — Vercel runs `npm run build` and serves the `dist/` output.

### Demo Data

After deployment, populate the database with realistic demo data by running the seed script against your production MongoDB Atlas database:

```bash
cd server
# Edit .env or set MONGODB_URI to your Atlas URI, then:
node demo-seed.mjs
```

This creates 1 TPO, 8 department coordinators, 40 students across SKIT's 8 departments, 12 companies, 11 drives at various lifecycle stages, and all supporting data (announcements, FAQs, contacts, placement rules).

> **Warning**: `demo-seed.mjs` clears all existing data before seeding. Do **not** run it against a database with real student data.

---

## 📄 License

Academic project — developed for **Swami Keshvanand Institute of Technology, Management & Gramothan, Jaipur (SKIT)**.
