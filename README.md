# Bangladesh School Management System (Class 1–12)

A full-stack **School Management Web Application** for Bangladeshi schools (Class 1–12), built as per the SRS with **Laravel (PHP) backend** and **Next.js frontend**.

## Features (MVP)

- **Institution setup**: Academic sessions, classes (1–12), sections, shifts, subjects
- **User management & RBAC**: Roles (Admin, Teacher, Accounts, Student, Guardian, etc.) with permissions
- **Admissions & students**: Student profiles, guardians, enrollment, roll numbers, promotion
- **Attendance**: Student (and staff) attendance with override and reports
- **Exams & results**: Exam terms, marks entry, grade rules (GPA/letter), result calculation, report cards
- **Fees**: Fee heads, structures, invoices, collection, receipts, dues
- **Communication**: Noticeboard, SMS gateway (pluggable), message logs
- **Reporting**: Dashboard KPIs, filterable reports, export (PDF/Excel via API)
- **Localization**: Bangla-first UI with English (next-intl)
- **BDT currency**, Bangladesh timezone (Asia/Dhaka), configurable grading

## Tech Stack

| Layer    | Stack |
|----------|--------|
| Backend  | Laravel 11, PHP 8.2+, Laravel Sanctum (API auth) |
| Frontend | Next.js 14, React 18, Tailwind CSS, next-intl, TanStack Query |
| Database | MySQL (or PostgreSQL) |

## Project Structure

```
School Management Software/
├── backend/          # Laravel API
│   ├── app/
│   │   ├── Http/Controllers/Api/V1/
│   │   ├── Models/
│   │   └── ...
│   ├── config/
│   ├── database/migrations/
│   ├── routes/api.php
│   └── ...
├── frontend/         # Next.js app
│   ├── src/
│   │   ├── app/          # App router (login, admin, teacher, portal)
│   │   ├── components/
│   │   ├── lib/api.ts
│   │   └── messages/     # bn.json, en.json
│   └── ...
└── README.md
```

## Prerequisites

- **PHP** 8.2+ with extensions: mbstring, openssl, PDO, tokenizer, XML, ctype, JSON, bcrypt
- **Composer**
- **Node.js** 18+
- **MySQL** (or PostgreSQL)

## Backend Setup (Laravel)

```bash
cd backend
cp .env.example .env
# Edit .env: set DB_DATABASE, DB_USERNAME, DB_PASSWORD, FRONTEND_URL=http://localhost:3000

composer install
php artisan key:generate
php artisan migrate
php artisan db:seed
```

- **API base**: `http://localhost:8000`
- **Health**: `http://localhost:8000/up`
- **Demo login**: `admin@school.edu.bd` / `password`

## Frontend Setup (Next.js)

```bash
cd frontend
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 (or use rewrites in next.config.js)

npm install
npm run dev
```

- **App**: `http://localhost:3000`
- **Login**: `/login` → then redirects to `/admin`

To call the Laravel API from the browser without CORS issues, either:

1. Run Laravel on port 8000 and set `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`, and allow `http://localhost:3000` in Laravel `config/cors.php` (already set via `FRONTEND_URL`), or  
2. Use the Next.js rewrite in `next.config.js` so that `/api/*` is proxied to `http://localhost:8000/api/*` and set `NEXT_PUBLIC_API_URL=` (empty) so the frontend uses relative `/api/v1`.

## API Overview (v1)

| Method | Endpoint | Description |
|--------|----------|--------------|
| POST   | `/api/v1/login` | Login (email, password) → token |
| POST   | `/api/v1/logout` | Logout (Bearer token) |
| GET    | `/api/v1/user` | Current user + roles |
| GET    | `/api/v1/dashboard` | Admin KPIs |
| CRUD   | `/api/v1/academic-sessions` | Sessions |
| CRUD   | `/api/v1/classes` | Classes |
| GET/POST | `/api/v1/sections` | Sections |
| CRUD   | `/api/v1/subjects` | Subjects |
| CRUD   | `/api/v1/students` | Students |
| POST   | `/api/v1/students/enroll` | Enroll student (section, session, roll_no) |
| GET/POST | `/api/v1/attendance` | Student attendance (section, date) |
| CRUD   | `/api/v1/exam-terms` | Exam terms |
| GET/POST | `/api/v1/marks` | Marks entry |
| POST   | `/api/v1/exam-terms/{id}/calculate-results` | Calculate results |
| GET    | `/api/v1/fee-heads`, `/api/v1/fee-structures` | Fee config |
| GET    | `/api/v1/invoices` | Invoices |
| POST   | `/api/v1/payments` | Collect payment |
| GET/POST | `/api/v1/notices` | Notices |

All authenticated routes require header: `Authorization: Bearer <token>`.

## Portals

- **Admin**: `/admin` – full setup, reports, configuration
- **Teacher**: `/teacher` – assigned classes, attendance, marks (same login; role-based UI can be extended)
- **Student/Guardian**: `/portal` – profile, attendance, results, fees (guardian sees linked students only)

## Database (main entities)

Institution, AcademicSession, Shift, Class, Section, Subject, ClassSubject, User, Role, Permission, Employee, TeacherAssignment, Student, Guardian, StudentGuardian, StudentEnrollment, StudentAttendance, StaffAttendance, GradeRule, ExamTerm, ExamRoutine, Mark, Result, FeeHead, FeeStructure, Invoice, InvoiceItem, Payment, Notice, MessageLog, AuditLog.

## Security (NFR)

- Auth via Laravel Sanctum; RBAC on API (role middleware ready).
- Passwords hashed (bcrypt); CORS and CSRF configured; audit logging support in `AuditLog` model.

## License

MIT.
