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
│   ├── seed.mjs             # Test database seeder script
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

### 3. Seed Test Users

Run the database seeder to populate test accounts for each role:

```bash
cd server
node seed.mjs
```

**Pre-configured Seed Accounts:**

| Role            | Email                    | Password                | Status                           |
| --------------- | ------------------------ | ----------------------- | -------------------------------- |
| **TPO / Admin** | `admin@skit.ac.in`       | `Admin@1234`            | Active                           |
| **Coordinator** | `coordinator@skit.ac.in` | `Coord@1234`            | Active (CSE Department)          |
| **Student**     | `b241218@skit.ac.in`     | _Set during activation_ | Pending Activation (`/activate`) |

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

## 📄 License

Academic project — developed for **Swami Keshvanand Institute of Technology, Management & Gramothan, Jaipur (SKIT)**.
