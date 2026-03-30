# RHpro — HR & Attendance Management Platform

A full-stack HR management platform built with **Next.js 14** (frontend) and **NestJS** (backend), backed by **PostgreSQL** via **Prisma ORM** and **Supabase** for authentication.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [Getting Started](#3-getting-started)
4. [Seeded Test Accounts](#4-seeded-test-accounts)
5. [Roles & Permissions](#5-roles--permissions)
6. [Modules & Functionalities](#6-modules--functionalities)
   - [Authentication](#61-authentication)
   - [User Management](#62-user-management)
   - [Employee Dossier (Mon Dossier)](#63-employee-dossier-mon-dossier)
   - [Leave & Absence Management](#64-leave--absence-management)
   - [Timesheet Management](#65-timesheet-management)
   - [Project Tracking](#66-project-tracking)
   - [Performance Management](#67-performance-management)
   - [Public Holidays](#68-public-holidays)
   - [In-App Notifications](#69-in-app-notifications)
7. [API Reference](#7-api-reference)
8. [Frontend Routes](#8-frontend-routes)
9. [Design System](#9-design-system)
10. [Environment Variables](#10-environment-variables)

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS, Recharts |
| Backend | NestJS, Prisma ORM |
| Database | PostgreSQL (hosted on Supabase) |
| Auth | Supabase Auth (JWT tokens) |
| File Storage | Supabase Storage |
| Language | TypeScript (full-stack) |

---

## 2. Project Structure

```
Attendance-workflow/
├── backend/                    NestJS API server
│   ├── prisma/
│   │   ├── schema.prisma       Database schema
│   │   └── seed.ts             Database seeder (9 users, full data)
│   └── src/
│       └── modules/
│           ├── auth/           Authentication (login, refresh, reset)
│           ├── users/          User CRUD, dossier, hierarchy
│           ├── roles/          Role management
│           ├── requests/       Leave requests & balances
│           ├── timesheets/     Timesheet lifecycle & reports
│           ├── projects/       Project tracking & team management
│           ├── evaluations/    Performance evaluations & salary history
│           └── holidays/       Public holiday calendar
│
├── FrontEnd/                   Next.js application
│   ├── app/
│   │   ├── (dashboard)/        Protected dashboard pages
│   │   │   ├── dashboard/      Role-specific dashboards
│   │   │   ├── requests/       Leave management
│   │   │   ├── timesheets/     Timesheet workspace
│   │   │   ├── projects/       Project tracking
│   │   │   ├── performance/    Performance module
│   │   │   ├── approvals/      Manager approvals hub
│   │   │   └── profile/        Employee dossier
│   │   └── auth/               Login, reset-password pages
│   └── src/
│       ├── components/         All UI components (by module)
│       ├── context/            AuthContext, LanguageContext
│       └── utils/              api-client.ts, api-config.ts
│
└── README.md
```

---

## 3. Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (PostgreSQL + Auth)
- `.env` in `backend/` (see [Environment Variables](#10-environment-variables))
- `.env.local` in `FrontEnd/` (see [Environment Variables](#10-environment-variables))

### Install & Run

```bash
# From repository root — installs both workspaces
npm install

# Start backend (port 3001) + frontend (port 3000) concurrently
npm run dev
```

The frontend `dev` script picks **port 3000** when it is free; if something else is already bound to 3000, it tries **3002, 3003, …** (never **3001**, reserved for the API). Check the terminal for the exact URL (e.g. `http://localhost:3002`).

**Only one Next.js dev server** should run per `FrontEnd/` folder at a time. If you start a second instance while another is still running, you may see **lockfile** or **EADDRINUSE** errors.

#### Frontend dev won’t start (common on Windows)

1. **Port in use (`EADDRINUSE`)** — Stop other `npm run dev` terminals, then in **Task Manager** end stray **Node.js** processes and run `npm run dev` again.
2. **Unable to acquire lock / Access denied on `.next`** — Stop **all** Node processes, delete the folder `FrontEnd/.next`, then run `npm run dev` again.
3. **Wrong API URL / 404 on `/users/...` in the browser** — Ensure `FrontEnd/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:3001` and restart the dev server.

### Database Setup

```bash
cd backend

# Apply all migrations
npx prisma migrate deploy

# Seed with test data (9 users, projects, timesheets, leaves, evaluations)
npx ts-node prisma/seed.ts
```

### Individual commands

```bash
npm run build    # Build both backend and frontend
npm run lint     # Lint both workspaces
npm run test     # Run backend unit + e2e tests
```

---

## 4. Seeded Test Accounts

All accounts share the same password: **`RHpro2026!`**

| Role | Email | Name | Notes |
|---|---|---|---|
| **Admin** | `hr.admin@rhpro.local` | Nadia Amrani | Full platform access |
| **Manager** | `manager.eng@rhpro.local` | Younes Benali | Engineering team lead |
| **Manager** | `manager.ops@rhpro.local` | Laila Chraibi | Operations team lead |
| **Collaborator** | `salma.idrissi@rhpro.local` | Salma Idrissi | Under Younes Benali |
| **Collaborator** | `omar.fassi@rhpro.local` | Omar Fassi | Under Younes Benali |
| **Collaborator** | `fatima.zaoui@rhpro.local` | Fatima Zaoui | Under Laila Chraibi |
| **Collaborator** | `karim.berrada@rhpro.local` | Karim Berrada | Under Younes Benali |
| **Collaborator** | `amina.tazi@rhpro.local` | Amina Tazi | Under Laila Chraibi |
| **Collaborator** | `mehdi.alaoui@rhpro.local` | Mehdi Alaoui | Under Younes Benali |

> **Tip:** Use the admin account first to explore the full platform, then log in as a collaborator and manager to test role-specific flows.

---

## 5. Roles & Permissions

| Action | Admin | Manager | Collaborator |
|---|:---:|:---:|:---:|
| View all users | ✅ | ❌ | ❌ |
| Create / delete users | ✅ | ❌ | ❌ |
| View own dossier | ✅ | ✅ | ✅ |
| View all leave requests | ✅ | ❌ | ❌ |
| Approve / reject leaves | ✅ | ✅ (own team) | ❌ |
| Manage leave balances | ✅ | ❌ | ❌ |
| Manage public holidays | ✅ | ❌ | ❌ |
| Submit timesheets | ✅ | ✅ | ✅ |
| Approve timesheets | ✅ | ✅ (own team) | ❌ |
| View all timesheets (admin view) | ✅ | ❌ | ❌ |
| Create / delete projects | ✅ | ❌ | ❌ |
| Manage project team | ✅ | ✅ | ❌ |
| Create evaluations | ✅ | ✅ | ❌ |
| View own evaluations | ✅ | ✅ | ✅ |
| View salary history (all) | ✅ | ❌ | ❌ |
| View own salary history | ✅ | ✅ | ✅ |
| Receive in-app notifications | ✅ | ✅ | ✅ |

---

## 6. Modules & Functionalities

### 6.1 Authentication

**What it does:** Email/password login via Supabase Auth, JWT-based session management with automatic token refresh, and password reset by email link.

#### Scenarios

**Login**
1. Navigate to `http://localhost:3000`
2. Click **"Se connecter"** on the landing page (or go to `/auth/login`)
3. Enter credentials (e.g., `hr.admin@rhpro.local` / `RHpro2026!`)
4. You are redirected to the role-specific dashboard

**Forgot Password**
1. On `/auth/login`, click **"Mot de passe oublié ?"**
2. Enter your email — a reset link is sent
3. Click the link → fill in and confirm new password on `/auth/reset-password`

**Token Refresh**
- Handled transparently by `api-client.ts`; if the access token expires mid-session, a silent refresh occurs using the stored refresh token
- If refresh fails (e.g., session revoked), the user is logged out and redirected to `/auth/login`

**Logout**
- Click your avatar/name in the sidebar → **"Se déconnecter"**

---

### 6.2 User Management

**What it does:** Admins can create, edit, and delete users. Each user is linked to a role, department, and optionally a manager.

#### Scenarios

**View all employees (Admin)**
1. Log in as admin
2. Go to **Paramètres → Employés**
3. Browse the employee list with role, department, and status filters

**Create a new employee (Admin)**
1. Go to **Paramètres → Employés** → click **"Ajouter un employé"**
2. Fill in: first name, last name, email, role, department, phone, address
3. Click **"Créer"** — a Supabase auth account is created with a temporary password

**Assign a manager to a collaborator (Admin)**
1. Open an employee's profile
2. In the **Hiérarchie** tab → select a manager from the dropdown
3. Click **"Assigner"** — the collaborator now appears in that manager's team

**Set hierarchy (API direct)**
```
POST http://localhost:3001/users/{collaboratorId}/manager/{managerId}
Authorization: Bearer <admin_token>
```

---

### 6.3 Employee Dossier (Mon Dossier)

**What it does:** Every user has a personal dossier accessible at `/profile`. It contains personal info, contract history, salary history, hierarchy, evaluations, and documents.

#### Scenarios

**View your own dossier**
1. Log in as any user
2. Click **"Mon Dossier"** in the sidebar
3. Navigate through tabs:
   - **Informations** — contact, birth date, work email, personal email
   - **Hiérarchie** — your manager and supervised team (if manager)
   - **Contrats & Rémunération** — active contract details, salary history with % changes
   - **Performances** — latest evaluation scores and history
   - **Documents** — upload and manage personal documents

**Upload a document**
1. Go to **Mon Dossier → Documents**
2. Click **"Nouveau Document"**
3. Fill in title, category (Contract, ID, Certificate, etc.), upload file
4. Click **"Téléverser"**

---

### 6.4 Leave & Absence Management

**What it does:** Full leave request lifecycle — collaborators submit requests, managers approve or reject them, and balances are automatically deducted. Includes a visual calendar and public holiday awareness.

#### Leave Types

| Code | Label | Affects Balance |
|---|---|---|
| `PTO` | Congés Payés | ✅ |
| `SICK` | Maladie | ❌ |
| `MATERNITY` | Maternité | ❌ |
| `PATERNITY` | Paternité | ❌ |
| `UNPAID` | Sans Solde | ❌ |
| `OTHER` | Autre | ❌ |

#### Request Status Flow

```
DRAFT → PENDING → APPROVED
                ↘ REJECTED → (edit) → PENDING
     ↘ CANCELLED (by collaborator, from DRAFT or PENDING)
```

#### Scenarios

**Submit a leave request (Collaborator)**
1. Log in as collaborator (e.g., `salma.idrissi@rhpro.local`)
2. Go to **Congés & Absences**
3. Click **"Nouvelle Demande"**
4. Select leave type (e.g., PTO), start date, end date, optional comment
5. Click **"Enregistrer brouillon"** to save, or **"Soumettre"** to send immediately
6. The request appears in your list with status **En attente**

**Approve or reject a leave (Manager)**
1. Log in as manager (e.g., `manager.eng@rhpro.local`)
2. Go to **Approbations** → tab **"Congés & Absences"**
3. See all pending requests from your team
4. Click **"Approuver"** or **"Rejeter"** (rejection requires a comment)
5. The collaborator's balance is updated automatically on approval

**View leave calendar**
1. Go to **Congés & Absences → Calendrier**
2. See all team leaves color-coded by type, public holidays marked

**Manage leave balances (Admin)**
1. Go to **Congés & Absences → Soldes** tab
2. Adjust the annual PTO allocation for any collaborator

**View all requests (Admin)**
1. Go to **Congés & Absences → Toutes les demandes**
2. Filter by status (PENDING, APPROVED, REJECTED) or type

---

### 6.5 Timesheet Management

**What it does:** Collaborators log time per project per day, organized weekly. Managers approve or reject timesheets with comments. Admins see global monthly reports with charts and exports.

#### Timesheet Status Flow

```
DRAFT (editable) → SUBMITTED → APPROVED (locked)
                             ↘ REJECTED → DRAFT (re-editable)
```

> **Key rule:** `APPROVED` timesheets are permanently locked. Any other status can be reset to `DRAFT` by saving a new draft.

#### Scenarios

**Log time — Weekly Grid Mode (Collaborator)**
1. Log in as collaborator (e.g., `omar.fassi@rhpro.local`)
2. Go to **Feuilles de Temps**
3. The current week (Mon–Fri) is shown with 5 day sections
4. Click **"+ Ajouter une entrée pour lundi"** → select project, task, hours → click **"Ajouter"**
5. The entry auto-saves as a draft immediately
6. Add more entries for other days throughout the week
7. When ready, click **"Soumettre la semaine"**

**Log time — Daily Quick-Add Mode (Collaborator)**
1. On the timesheets page, toggle to **"Saisie rapide"**
2. Select the day (the current day is pre-selected and marked "auj.")
3. Select project, task, enter hours → **"Ajouter & sauvegarder"**
4. Switch days and add more entries
5. Submit when the week is complete

**Fix a rejected timesheet (Collaborator)**
1. You will see a red banner: _"Feuille rejetée — corrections requises"_ with the manager's comment
2. Add/remove/edit entries directly in the weekly grid
3. Click **"Corriger & Soumettre"** — the timesheet goes back to SUBMITTED

**Approve/Reject timesheets (Manager)**
1. Log in as manager
2. Go to **Approbations → Feuilles de temps**
3. See all SUBMITTED timesheets from your team with hours and entries detail
4. Enter a comment (required for rejection), click **"Approuver"** or **"Rejeter"**

**View monthly report (Collaborator)**
1. Go to **Feuilles de Temps → Rapport mensuel**
2. Navigate months with chevron arrows
3. See KPIs (total hours, overtime), a bar chart by project, and a percentage breakdown table

**Export data (Admin)**
1. Go to **Feuilles de Temps → Export** tab
2. Select month/year
3. Click **"Export CSV / Excel"** or **"Export PDF"**

---

### 6.6 Project Tracking

**What it does:** Admins create projects with budgets and deadlines. Managers assign team members. Time logged in timesheets is automatically aggregated per project.

#### Project Statuses

| Status | Label |
|---|---|
| `IN_PROGRESS` | En cours |
| `FINISHED` | Terminé |
| `SUSPENDED` | Suspendu |

#### Scenarios

**Create a project (Admin)**
1. Log in as admin
2. Go to **Projets** → click **"Nouveau Projet"**
3. Fill in: name, unique code, client, description, start/end dates, budget (hours or amount), status
4. Click **"Créer"** — project appears in the list

**Assign team members (Admin or Manager)**
1. Open a project → click **"Équipe"** tab
2. Click **"Ajouter un membre"** → select a collaborator from the dropdown
3. Specify their role on the project (e.g., Developer, Designer)
4. Click **"Ajouter"**

**View project hours (any role)**
1. Open a project → **"Heures"** tab
2. See total hours logged per collaborator, budget vs actual comparison, and a breakdown by timesheet period

**Filter projects**
- Use the status tabs (**Tous / En cours / Terminés / Suspendus**) at the top of the project list

**View projects I'm assigned to (Collaborator)**
1. Go to **Projets**
2. Only projects where you are a team member are shown

---

### 6.7 Performance Management

**What it does:** Managers and admins create performance evaluations (annual, semi-annual, project-based, or 360°) with technical scores, soft skill scores, and objectives. Salary augmentations are tracked per collaborator with approval history.

#### Evaluation Types

| Code | Label |
|---|---|
| `ANNUAL` | Évaluation Annuelle |
| `SEMIANNUAL` | Évaluation Semestrielle |
| `PROJECT` | Évaluation Projet |
| `THREE_SIXTY` | Feedback 360° |

#### Scenarios

**Create an evaluation (Manager or Admin)**
1. Log in as manager
2. Go to **Performance** → click **"Nouvelle Évaluation"**
3. Select collaborator, evaluation type, date
4. Enter global score (0–100), technical score, soft skills score
5. Add objectives and comments
6. Click **"Créer"**

**View my evaluations (Collaborator)**
1. Log in as collaborator
2. Go to **Performance**
3. See your evaluation history with scores, trends, and manager comments

**View department performance stats (Admin)**
1. Go to **Performance → Rapport département**
2. See average scores per department with bar chart, plus a performance vs. salary correlation table

**View salary history (any user)**
1. Go to **Mon Dossier → Contrats & Rémunération**
2. Salary increases are listed with date, old/new salary, % change, and reason

**View all salary histories (Admin)**
1. Go to **Performance → Augmentations**
2. Filter by department to see all salary changes across the company

---

### 6.8 Public Holidays

**What it does:** Admins configure the annual calendar of public holidays. These are automatically displayed in the leave calendar and excluded from working day calculations for leave requests.

#### Pre-seeded holidays (current year)

- Nouvel An (1 Jan)
- Fête du Travail (1 May)
- Fête de l'Indépendance (18 Nov)
- Aid al-Fitr (variable)
- Aid al-Adha (variable)

#### Scenarios

**View holidays**
1. Go to **Congés & Absences → Jours Fériés**
2. All configured holidays for the current year are listed

**Add a holiday (Admin)**
1. Click **"Ajouter un jour férié"**
2. Enter name, date, and optional description
3. Click **"Ajouter"**

---

### 6.9 In-App Notifications

**What it does:** Real-time-style **in-app notifications** stored in PostgreSQL (`notifications` table). When collaborators take actions that concern their manager or company oversight, the right users are notified. The **top navigation bar** (all dashboard pages) loads notifications from the API, shows an **unread badge**, **polls every 60 seconds**, and supports **mark one as read** (click) and **mark all as read**.

#### Who receives what

| Event | Manager (direct) | Admin(s) | Collaborator (actor) |
|---|---|---|---|
| Leave request submitted | ✅ | ✅ | — |
| Leave request approved / rejected | — | — | ✅ (submitter) |
| Leave request cancelled by admin (someone else’s request) | — | — | ✅ (submitter) |
| Timesheet submitted | ✅ | ✅ | — |
| Timesheet approved / rejected | — | — | ✅ (owner) |
| Assigned to a project | — | — | ✅ |
| New performance evaluation created | — | — | ✅ (evaluated) |

> **Admin broadcast:** “Admin” means every user whose role description contains `Admin` (case-insensitive). Managers are resolved via the `Collaborator.managerId` link.

#### Title format (for UI)

Notifications use a machine-readable prefix in `title` so the frontend can show the correct icon:

| Prefix | Meaning |
|---|---|
| `[LEAVE_REQUEST]` | Congés / demandes |
| `[TIMESHEET]` | Feuilles de temps |
| `[PROJECT]` | Projets / affectation |
| `[EVALUATION]` | Performance |
| `[SYSTEM]` | General (fallback) |

The visible title is the text **after** the `]` and space (e.g. `[TIMESHEET] Nouvelle feuille…`).

#### Scenarios

**See notifications as a manager**
1. Log in as a manager.
2. Have a collaborator submit a leave request or timesheet (or use the API).
3. Open the **bell** in the top-right: new items appear with type-colored icons.
4. Click an item to mark it read, or **Tout lire** for all.

**See notifications as admin**
1. Log in as admin.
2. Trigger a team-wide event (e.g. collaborator submits leave or timesheet).
3. Admins receive the same class of “oversight” notifications (leave/timesheet submissions).

**Verify via API**
1. `GET /notifications/user/<your_user_uuid>` — list (newest first, up to 30).
2. `PATCH /notifications/<notification_uuid>/seen` — mark one read.
3. `PATCH /notifications/user/<your_user_uuid>/read-all` — mark all read.

#### Frontend configuration

Endpoints are defined in `FrontEnd/src/utils/api-config.ts` under `endpoints.notifications` (`byUser`, `unreadCount`, `markSeen`, `markAllSeen`). The navbar uses **named import** `{ apiClient }` from `@/utils/api-client`.

#### Legacy routes (still present)

For backward compatibility, `GET /requests/notifications/:userId` and `PATCH /requests/notifications/:id/seen` still exist. **Prefer** `/notifications/...` for new integrations.

---

## 7. API Reference

Base URL: `http://localhost:3001`

All endpoints (except `/auth/*`) require `Authorization: Bearer <access_token>` header.

### 7.1 Authentication — `/auth`

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | Returns `{ accessToken, refreshToken, user }` |
| POST | `/auth/refresh` | `{ refreshToken }` | Returns new `{ accessToken }` |
| POST | `/auth/logout` | — | Invalidates session |
| POST | `/auth/forgot-password` | `{ email }` | Sends reset email |
| POST | `/auth/reset-password` | `{ token, newPassword }` | Resets password |

**Example — Login:**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hr.admin@rhpro.local","password":"RHpro2026!"}'
```

---

### 7.2 Users — `/users`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/users` | Any | List all users |
| GET | `/users/:id` | Any | Get user by ID |
| GET | `/users/:id/dossier` | Any | Get full employee dossier |
| POST | `/users/add` | Admin | Create a new user |
| PATCH | `/users/:id` | Any | Update user profile |
| DELETE | `/users/:id` | Admin | Delete user |
| PATCH | `/users/:id/password` | Admin | Reset user password |
| POST | `/users/:id/picture` | Any | Upload profile picture (multipart) |
| DELETE | `/users/:id/picture` | Any | Remove profile picture |
| POST | `/users/:collaboratorId/manager/:managerId` | Admin | Assign manager |
| GET | `/users/:userId/manager` | Any | Get user's manager |
| GET | `/users/:managerId/supervised-collaborators` | Any | Get supervised team |

**Example — Create user:**
```bash
curl -X POST http://localhost:3001/users/add \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ahmed",
    "lastName": "Alami",
    "email": "ahmed.alami@rhpro.local",
    "password": "TempPass123!",
    "roleId": "<role_uuid>",
    "departmentId": "<dept_uuid>"
  }'
```

---

### 7.3 Leave Requests — `/requests`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/requests` | Any | Create a draft request |
| PATCH | `/requests/:id` | Any | Update draft request |
| POST | `/requests/:id/submit` | Any | Submit for approval |
| POST | `/requests/:id/approve` | Manager, Admin | Approve request |
| POST | `/requests/:id/reject` | Manager, Admin | Reject with comment |
| POST | `/requests/:id/cancel` | Any | Cancel own request |
| GET | `/requests/user/:userId` | Any | Get user's requests |
| GET | `/requests/manager/:managerId/pending` | Manager, Admin | Pending for manager |
| GET | `/requests/admin/all` | Admin | All requests (filter by status/type) |
| GET | `/requests/calendar?month=&year=` | Any | Calendar data |
| GET | `/requests/balance/:userId?year=` | Any | User's leave balance |
| PATCH | `/requests/balance/:userId` | Admin | Update leave balance |
| GET | `/requests/balance?year=` | Admin | All employees' balances |
| GET | `/requests/stats?year=` | Admin | Annual leave stats |

> **Notifications:** Use **§7.8** (`/notifications` base path) for listing and marking read. Legacy `GET/PATCH /requests/notifications/...` routes remain for compatibility.

**Example — Create and submit a leave request:**
```bash
# Step 1: Create draft
curl -X POST http://localhost:3001/requests \
  -H "Authorization: Bearer <collab_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "submittedBy": "<user_uuid>",
    "requestType": "LEAVE",
    "leaveType": "PTO",
    "leaveStartDate": "2026-04-10",
    "leaveEndDate": "2026-04-14",
    "comment": "Vacances de printemps"
  }'

# Step 2: Submit
curl -X POST http://localhost:3001/requests/<request_uuid>/submit \
  -H "Authorization: Bearer <collab_token>"

# Step 3: Manager approves
curl -X POST http://localhost:3001/requests/<request_uuid>/approve \
  -H "Authorization: Bearer <manager_token>" \
  -H "Content-Type: application/json" \
  -d '{"decidedBy": "<manager_uuid>", "comment": "Approuvé"}'
```

---

### 7.4 Timesheets — `/timesheets`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/timesheets/projects` | Any | List active projects for entry |
| POST | `/timesheets/draft` | Any | Create or update a draft (upsert) |
| POST | `/timesheets/:id/submit` | Any | Submit timesheet for approval |
| POST | `/timesheets/:id/approve` | Manager, Admin | Approve timesheet |
| POST | `/timesheets/:id/reject` | Manager, Admin | Reject with comment |
| GET | `/timesheets/user/:userId` | Any | All timesheets for a user |
| GET | `/timesheets/manager/:managerId/submitted` | Manager, Admin | Submitted timesheets for manager's team |
| GET | `/timesheets/reports/user/:userId/weekly?weekStartDate=` | Any | Weekly report for a user |
| GET | `/timesheets/reports/user/:userId/monthly?year=&month=` | Any | Monthly report for a user |
| GET | `/timesheets/reports/projects/totals?year=&month=` | Any | Hours by project for a period |
| GET | `/timesheets/reports/admin/monthly?year=&month=` | Admin | Company-wide monthly stats (KPIs, status breakdown, project totals) |
| GET | `/timesheets/export/excel?year=&month=` | Admin | Download CSV export |
| GET | `/timesheets/export/pdf?year=&month=` | Admin | Download PDF export |
| GET | `/timesheets/:id` | Any | Get a specific timesheet |

**Example — Submit a week's timesheet:**
```bash
# Save draft (upserts — safe to call multiple times)
curl -X POST http://localhost:3001/timesheets/draft \
  -H "Authorization: Bearer <collab_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<user_uuid>",
    "weekStartDate": "2026-03-24",
    "entries": [
      { "projectId": "<proj_uuid>", "entryDate": "2026-03-24", "taskName": "Dev sprint", "hours": 8 },
      { "projectId": "<proj_uuid>", "entryDate": "2026-03-25", "taskName": "Code review", "hours": 6 },
      { "projectId": "<proj2_uuid>", "entryDate": "2026-03-26", "taskName": "Meeting", "hours": 2 }
    ]
  }'

# Submit
curl -X POST http://localhost:3001/timesheets/<timesheet_uuid>/submit \
  -H "Authorization: Bearer <collab_token>"
```

> **Note on upsert:** Sending a `POST /timesheets/draft` for the same `userId + weekStartDate` always replaces all entries and resets status to `DRAFT`. This works for initial creation, updating a draft, and re-editing after rejection. Approved timesheets are blocked.

---

### 7.5 Projects — `/projects`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/projects` | Any | List all projects (optional `?status=IN_PROGRESS`) |
| GET | `/projects/:id` | Any | Get project details |
| GET | `/projects/user/:userId` | Any | Projects a user is assigned to |
| POST | `/projects` | Admin | Create a project |
| PATCH | `/projects/:id` | Admin, Manager | Update project |
| DELETE | `/projects/:id` | Admin | Delete project |
| GET | `/projects/:id/team` | Any | Get project team members |
| POST | `/projects/:id/team` | Admin, Manager | Add a team member |
| DELETE | `/projects/:id/team/:collaboratorId` | Admin, Manager | Remove a team member |
| GET | `/projects/:id/hours?year=&month=` | Any | Hours logged for this project |
| GET | `/projects/reports/overview?year=&month=` | Any | Overview report (all projects) |
| GET | `/projects/reports/resources?year=&month=` | Any | Resource allocation report |

**Example — Create project and assign member:**
```bash
# Create project
curl -X POST http://localhost:3001/projects \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ERP Modernisation",
    "code": "ERP-2026",
    "client": "Groupe Atlas",
    "description": "Migration vers nouvelle stack",
    "startDate": "2026-01-01",
    "endDate": "2026-12-31",
    "status": "IN_PROGRESS",
    "budgetHours": 2000
  }'

# Assign team member
curl -X POST http://localhost:3001/projects/<project_uuid>/team \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{ "collaboratorId": "<collab_uuid>", "roleOnProject": "Développeur Senior" }'
```

---

### 7.6 Evaluations — `/evaluations`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/evaluations` | Any | List evaluations (filter: `collaboratorId`, `managerId`, `type`, `year`) |
| GET | `/evaluations/:id` | Any | Get a single evaluation |
| GET | `/evaluations/collaborator/:id` | Any | All evaluations for a collaborator |
| GET | `/evaluations/collaborator/:id/trend` | Any | Score trend over time |
| POST | `/evaluations` | Manager, Admin | Create evaluation |
| PATCH | `/evaluations/:id` | Manager, Admin | Update evaluation |
| DELETE | `/evaluations/:id` | Manager, Admin | Delete evaluation |
| GET | `/evaluations/reports/departments?year=` | Any | Department performance stats |
| GET | `/evaluations/reports/performance-vs-salary` | Manager, Admin | Perf vs salary correlation |
| GET | `/evaluations/salary/all?departmentId=` | Admin | All salary histories |
| GET | `/evaluations/salary/user/:userId` | Any | Salary history for a user |

**Example — Create an evaluation:**
```bash
curl -X POST http://localhost:3001/evaluations \
  -H "Authorization: Bearer <manager_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "collaboratorId": "<collab_uuid>",
    "evaluationType": "ANNUAL",
    "evaluationDate": "2026-03-15",
    "globalScore": 82,
    "technicalScore": 85,
    "softSkillsScore": 78,
    "comments": "Excellent travail cette année",
    "objectives": "Améliorer la documentation technique"
  }'
```

---

### 7.7 Public Holidays — `/holidays`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/holidays?year=2026` | Any | List holidays for a year |
| POST | `/holidays` | Admin | Create a holiday |
| PATCH | `/holidays/:id` | Admin | Update a holiday |
| DELETE | `/holidays/:id` | Admin | Delete a holiday |

**Example — Add a holiday:**
```bash
curl -X POST http://localhost:3001/holidays \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Aid al-Fitr", "date": "2026-03-30", "description": "Fin du Ramadan" }'
```

---

### 7.8 Notifications

Base path: **`/notifications`**. Central API for **in-app** notifications (`NotificationChannel.IN_APP`). All routes require a valid Bearer token (`RolesGuard` — any authenticated role).

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/notifications/user/:userId` | Any | Last **30** notifications for that user (newest first) |
| GET | `/notifications/user/:userId/count` | Any | `{ count }` — number of notifications with `status: UNSEEN` |
| PATCH | `/notifications/:id/seen` | Any | Mark one notification as `SEEN` |
| PATCH | `/notifications/user/:userId/read-all` | Any | Mark **all** of that user’s notifications as `SEEN` |

**Response shape (list item):** `id`, `recipientId`, `channel`, `title`, `message`, `status` (`SEEN` \| `UNSEEN`), `createdAt`, `updatedAt`.

**Example — List and mark read:**
```bash
# List
curl -s http://localhost:3001/notifications/user/<user_uuid> \
  -H "Authorization: Bearer <token>" | jq .

# Unread count
curl -s http://localhost:3001/notifications/user/<user_uuid>/count \
  -H "Authorization: Bearer <token>"

# Mark one seen
curl -X PATCH http://localhost:3001/notifications/<notification_uuid>/seen \
  -H "Authorization: Bearer <token>"

# Mark all seen
curl -X PATCH http://localhost:3001/notifications/user/<user_uuid>/read-all \
  -H "Authorization: Bearer <token>"
```

**Backend wiring:** `NotificationsService` is called from `requests`, `timesheets`, `projects`, and `evaluations` services when the events in [§6.9](#69-in-app-notifications) occur.

---

## 8. Frontend Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/auth/login` | Public | Login page |
| `/auth/reset-password` | Public | Password reset |
| `/dashboard` | All roles | Role-specific dashboard |
| `/requests` | All roles | Leave requests & calendar |
| `/timesheets` | All roles | Timesheet workspace |
| `/projects` | All roles | Project list and details |
| `/performance` | All roles | Evaluations & salary history |
| `/approvals` | Manager, Admin | Approval hub (leaves + timesheets) |
| `/profile` | All roles | Employee dossier (Mon Dossier) |

### Global UI (dashboard layout)

| Area | Description |
|---|---|
| **Top bar** | Role badge, **notifications** (bell: live list, 60s refresh, unread badge, mark read / mark all), user block, logout. Page titles live **only** in the page body (not duplicated in the navbar). |
| **Sidebar** | Module navigation (includes **Mon Dossier**; manager **Approvals** link). |

### Dashboard per role

| Role | Dashboard shows |
|---|---|
| **Admin** | 6 KPIs + area/donut/bar charts + recent activity tables for leaves, evaluations, projects |
| **Manager** | Team KPIs + pending queue + project hours chart + upcoming deadlines |
| **Collaborator** | Personal KPIs (weekly hours, timesheet status, pending leaves, monthly total) + real recent activity feed |

---

## 9. Design System

The application uses a unified dark theme defined via CSS custom properties in `FrontEnd/app/globals.css`.

| Variable | Purpose |
|---|---|
| `--bg` | Page background (deepest dark) |
| `--surface` | Card/panel background |
| `--surface-raised` | Elevated elements (rows, inputs) |
| `--border` | Default border color |
| `--border-strong` | Emphasized borders |
| `--accent` | Primary action color (orange `#f97316`) |
| `--accent-dim` | 15% opacity accent background |
| `--text-1` | Primary text |
| `--text-2` | Secondary text |
| `--text-3` | Muted / placeholder text |

### Utility classes

| Class | Usage |
|---|---|
| `.card` | Rounded elevated panel with border |
| `.stat-card` | KPI card with padding |
| `.stat-label` | Small label above stat |
| `.stat-value` | Large numeric stat value |
| `.btn-primary` | Filled accent button |
| `.btn-ghost` | Outline/ghost button |
| `.tab-bar` | Horizontal tab navigation container |
| `.tab` / `.tab.active` | Individual tab button |
| `.page-title` | Page heading (H1) |
| `.page-subtitle` | Page sub-heading |
| `.empty-state` | Centered empty-state container |

---

## 10. Environment Variables

### `backend/.env`

```env
DATABASE_URL="postgresql://..."           # Supabase PostgreSQL connection string
DIRECT_URL="postgresql://..."            # Direct URL (bypasses pgBouncer for migrations)
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."       # Service role key (backend only, never expose)
SUPABASE_ANON_KEY="eyJ..."
JWT_SECRET="your-jwt-secret"
```

### `FrontEnd/.env.local`

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"         # Backend base URL
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
```

---

## Ports Summary

| Service | Port | URL |
|---|---|---|
| Frontend (Next.js) | 3000 | http://localhost:3000 |
| Backend (NestJS) | 3001 | http://localhost:3001 |
| Supabase (hosted) | — | Your Supabase project URL |

---

*Last updated: March 2026 — RHpro v1.0 (in-app notifications module, `/notifications` API, navbar integration, admin timesheet monthly stats endpoint documented)*
