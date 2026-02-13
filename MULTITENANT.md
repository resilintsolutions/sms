# Multi-Tenant SaaS Guide

## Overview

The School Management Software is designed as a **multi-tenant SaaS application**. Schools can:

- Connect their landing page to **custom domains** via DNS
- Manage everything from the central portal
- Receive contact form emails at their school email (e.g. `info@school.edu.bd`)

## Setup

1. Run `php setup_multitenant.php` from the backend folder
2. Log in as **Super Admin**: `superadmin@schoolportal.bd` / `password`

## Super Admin Dashboard

At `/super-admin` (or `/{locale}/super-admin`):

- **View all schools** (subscriptions) with status
- **Activate/Deactivate** any school's portal
- **Manage features** per school: fees, attendance, exams, notices, landing page
- **Set subscription status**: active, trial, suspended, cancelled
- **Configure custom domain** for each school

## Custom Domain (DNS) for Schools

Schools can point their domain (e.g. `www.school.edu.bd`) to the landing page:

1. In Super Admin → Edit school, set **Custom domain** to `www.school.edu.bd`
2. School adds DNS record:
   - **CNAME**: `www` → `your-portal-domain.com` (or your main app host)
   - Or **A record** to your server IP
3. Your server/reverse proxy must route requests by `Host` header to the correct institution
4. The frontend/API resolves `institution_id` from the domain (see backend logic for domain resolution)

**Note:** Full custom-domain routing requires your deployment (e.g. Nginx, Cloudflare) to pass the domain and for the API to resolve `institution_id` from it. The `institution_id` is currently passed as a query param; extend `LandingPageController::institutionId()` to also check `request()->getHost()` against `institutions.custom_domain`.

## Contact Form Emails

- Contact form submissions are sent to the **school's contact email** (from Admin → Website → Contact, or institution email)
- Configure **SMTP** in `.env` for production:
  ```
  MAIL_MAILER=smtp
  MAIL_HOST=smtp.example.com
  MAIL_PORT=587
  MAIL_USERNAME=your-username
  MAIL_PASSWORD=your-password
  MAIL_FROM_ADDRESS=noreply@yourschools.com
  MAIL_FROM_NAME="School Portal"
  ```
- For local development, use `MAIL_MAILER=log` — emails are written to `storage/logs/laravel.log`
