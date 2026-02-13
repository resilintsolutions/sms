# School Management API (Laravel)

## Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Configure `.env`:

- `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- `FRONTEND_URL=http://localhost:3000` (for CORS)

Then:

```bash
php artisan migrate
php artisan db:seed
php artisan serve
```

API: `http://localhost:8000`  
Demo login: `admin@school.edu.bd` / `password`

## Seed data

- One institution (Demo School)
- Roles: super_admin, admin, academic_admin, accounts, teacher, student, guardian
- Admin user with role `admin`
- Current academic session and classes 1–12

## API base path

All API routes are under `/api/v1`. Use `Authorization: Bearer <token>` for protected routes.
