# How to Run the Application

## Frontend (Next.js)

**http://localhost:3000**

- **Login page**: http://localhost:3000/bn/login
- **Admin** (after login): http://localhost:3000/bn/admin

**Demo login:** `admin@school.edu.bd` / `password`  
**Super Admin:** `superadmin@schoolportal.bd` / `password` (run `php setup_multitenant.php` first)

---

## Backend (Laravel API) — PHP 8.0 compatible

The backend now uses **Laravel 8** and works with XAMPP PHP 8.0.

### First-time setup

1. Start **MySQL** in XAMPP.
2. Run (from project root):
   ```
   cd backend
   php seed_admin.php
   ```
   This creates the database, tables, and admin user.

**For multi-tenant (custom domains, super admin):** run `php setup_multitenant.php` to add institution columns and super admin user.

**If the website landing page (http://localhost:3000/en) doesn't reflect admin changes**, ensure the `landing_page_configs` table exists:
   ```
   cd backend
   php create_landing_table.php
   ```
   Then save again from Admin → Website.

### Start the backend

**Option A** — Double-click `start-backend.bat` (in project root)

**Option B** — In a terminal:
```
cd backend\public
php -S localhost:8000
```

**Important:** Stop any existing backend on port 8000 (Ctrl+C) before starting a new one.

---

## Quick summary

| What | URL / Command |
|------|---------------|
| **Frontend** | http://localhost:3000 |
| **Login** | http://localhost:3000/bn/login |
| **Backend API** | http://localhost:8000 |
| **Start frontend** | `cd frontend` then `npm run dev` |
| **Start backend** | Run `start-backend.bat` or `cd backend\public` then `php -S localhost:8000` |
