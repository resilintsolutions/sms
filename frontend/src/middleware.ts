import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from '@/i18n/routing';

const AUTH_COOKIE = 'sb_auth';
const ROLES_COOKIE = 'sb_roles';

/**
 * The primary platform domain. Requests from custom school domains
 * (that are NOT this domain or its subdomains) will have their
 * institution resolved from the Host header by the backend API.
 */
const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'sms.resilentsolutions.com';

const protectedPaths = ['admin', 'teacher', 'parent', 'student', 'portal', 'super-admin', 'accountant', 'librarian'];

/** Which roles can access which path segments */
const pathRoleMap: Record<string, string[]> = {
  'super-admin': ['super_admin'],
  admin: ['admin', 'super_admin', 'accountant', 'librarian'],
  accountant: ['accountant', 'super_admin'],
  librarian: ['librarian', 'super_admin'],
  teacher: ['teacher', 'super_admin'],
  parent: ['parent', 'super_admin'],
  student: ['student', 'super_admin'],
};

function isProtectedPath(pathname: string): boolean {
  return protectedPaths.some((p) => pathname.includes(`/${p}`));
}

function getLocaleFromPath(pathname: string): string {
  const segment = pathname.split('/')[1];
  return locales.includes(segment as (typeof locales)[number]) ? segment : defaultLocale;
}

/** Check if this request is from a school's custom domain (not the platform domain) */
function isSchoolCustomDomain(host: string): boolean {
  const hostLower = host.toLowerCase().replace(/:\d+$/, ''); // strip port

  // localhost / IP / platform domain itself / platform subdomains → not a school custom domain
  if (
    hostLower === 'localhost' ||
    hostLower.startsWith('127.0.0.1') ||
    hostLower.startsWith('192.168.') ||
    hostLower === PLATFORM_DOMAIN ||
    hostLower.endsWith('.' + PLATFORM_DOMAIN)
  ) {
    return false;
  }

  // *.local domains that match a school custom_domain pattern ARE school domains
  // e.g. dhaka-ideal.local is a school custom domain
  // e.g. dhaka.school.local is a platform subdomain (caught above)
  return true;
}

/** Get the default portal path for a user based on their roles */
function getDefaultPortal(rolesCookieValue: string | undefined, locale: string): string {
  const roles = rolesCookieValue?.split(',') ?? [];
  if (roles.includes('super_admin')) return `/${locale}/super-admin`;
  if (roles.includes('admin')) return `/${locale}/admin`;
  if (roles.includes('accountant')) return `/${locale}/accountant`;
  if (roles.includes('teacher')) return `/${locale}/teacher`;
  if (roles.includes('parent')) return `/${locale}/parent`;
  if (roles.includes('student')) return `/${locale}/student`;
  if (roles.includes('librarian')) return `/${locale}/librarian`;
  // Fall back to landing page — NEVER to /login (would cause redirect loop)
  return `/${locale}`;
}

function getPortalSegment(pathname: string): string | null {
  // e.g. /en/admin/users -> "admin", /bn/teacher/marks -> "teacher"
  const parts = pathname.split('/').filter(Boolean);
  // parts[0] = locale, parts[1] = portal segment
  if (parts.length >= 2) {
    const seg = parts[1];
    if (Object.keys(pathRoleMap).includes(seg)) return seg;
  }
  return null;
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';
  const authCookie = request.cookies.get(AUTH_COOKIE);
  const rolesCookie = request.cookies.get(ROLES_COOKIE);
  const locale = getLocaleFromPath(pathname);

  // ── School custom domain handling ──
  // If a request arrives on a custom school domain (e.g. www.dtschool.edu.bd),
  // the landing page (/) is the default. Only /login and portal routes work.
  // The backend API will resolve the institution from the Host header.
  if (isSchoolCustomDomain(host)) {
    // Allow: root/landing page, login, API, static assets, and authenticated portal routes
    const isLandingOrLogin = pathname === '/' || pathname.match(/^\/[a-z]{2}\/?$/) || pathname.includes('/login');
    const isStaticOrApi = pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.');

    // For protected paths on custom domains, still enforce auth
    if (isProtectedPath(pathname) && !authCookie?.value) {
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  }

  // Redirect logged-in users away from login page to their default portal
  if (pathname.includes('/login') && authCookie?.value) {
    const target = getDefaultPortal(rolesCookie?.value, locale);
    // Guard: never redirect login → login (prevents infinite loop)
    if (!target.endsWith('/login')) {
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  // Protect authenticated routes - redirect to login if no auth cookie
  if (isProtectedPath(pathname) && !authCookie?.value) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  // Role-based route protection
  if (authCookie?.value && rolesCookie?.value) {
    const userRoles = rolesCookie.value.split(',');
    const segment = getPortalSegment(pathname);

    if (segment && pathRoleMap[segment]) {
      const allowedRoles = pathRoleMap[segment];
      const hasAccess = userRoles.some((r) => allowedRoles.includes(r));

      if (!hasAccess) {
        return NextResponse.redirect(new URL(getDefaultPortal(rolesCookie?.value, locale), request.url));
      }
    }
  }

  return createMiddleware({
    locales,
    defaultLocale,
    localePrefix: 'always',
  })(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
