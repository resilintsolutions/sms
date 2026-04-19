# Multi-Tenant SaaS Guide

## Overview

The School Management Software is designed as a **multi-tenant SaaS application**. Schools can:

- Connect their landing page to **custom domains** via DNS
- Use **subdomains** under the platform domain (e.g. `dt-school.sms.resilentsolutions.com`)
- Manage everything from the central portal
- Receive contact form emails at their school email (e.g. `info@school.edu.bd`)

## Production Deployment

| Item | Value |
|------|-------|
| **Server IP** | `185.146.167.202` |
| **Platform Domain** | `sms.resilentsolutions.com` |
| **Super Admin URL** | `https://sms.resilentsolutions.com/bn/super-admin` |
| **Backend API** | `https://sms.resilentsolutions.com/api/v1` |

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
- **Verify DNS** — check if school's domain correctly points to `185.146.167.202`
- **Domain Management** panel with server IP, platform domain, and step-by-step DNS guide

## Custom Domain (DNS) for Schools

Schools can point their domain (e.g. `www.dtschool.edu.bd`) to the landing page:

### Option A: Custom Domain (school owns a domain)

1. In Super Admin → Edit school, set **Custom domain** to `www.dtschool.edu.bd`
2. School adds DNS records at their domain registrar:
   - **A Record**: `@` → `185.146.167.202`
   - **A Record**: `www` → `185.146.167.202`
3. Click **Verify DNS** in the Super Admin DNS tab to check configuration
4. Once verified, visiting `www.dtschool.edu.bd` shows the school's landing page

### Option B: Subdomain (under the platform domain)

1. In Super Admin → Edit school, set **Subdomain** to `dt-school`
2. The school is accessible at `dt-school.sms.resilentsolutions.com`
3. No additional DNS setup needed — wildcard DNS covers all subdomains

### How Domain Resolution Works

When a visitor accesses a school's URL, the system resolves the school in this priority order:

1. **`?institution_id=` query parameter** — direct override
2. **`custom_domain`** — match the `Host` header against `institutions.custom_domain`
3. **Subdomain** — extract `slug` from `slug.sms.resilentsolutions.com` and match against `institutions.subdomain`
4. **Default** — falls back to institution ID 1

## DNS Requirements for Production Server

Add these DNS records to your domain registrar for `sms.resilentsolutions.com`:

```
# Platform domain
sms.resilentsolutions.com  A  185.146.167.202

# Wildcard for school subdomains
*.sms.resilentsolutions.com  A  185.146.167.202
```

## Contact Form Emails

- Contact form submissions are sent to the **school's contact email** (from Admin → Website → Contact, or institution email)
- Configure **SMTP** in `.env` for production:
  ```
  MAIL_MAILER=smtp
  MAIL_HOST=smtp.example.com
  MAIL_PORT=587
  MAIL_USERNAME=your-username
  MAIL_PASSWORD=your-password
  MAIL_FROM_ADDRESS=noreply@resilentsolutions.com
  MAIL_FROM_NAME="School Portal"
  ```
- For local development, use `MAIL_MAILER=log` — emails are written to `storage/logs/laravel.log`

## Environment Variables

### Backend (.env)
```
PLATFORM_DOMAIN=sms.resilentsolutions.com    # Used for subdomain resolution
SERVER_IP=185.146.167.202                     # Used for DNS verification
CORS_ALLOWED_DOMAINS=                         # Extra allowed origins (comma-separated)
```

### Frontend (.env.local)
```
NEXT_PUBLIC_PLATFORM_DOMAIN=sms.resilentsolutions.com   # Used in middleware & UI
```
