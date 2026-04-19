'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  BookOpen,
  ClipboardList,
  DollarSign,
  GraduationCap,
  Globe,
  LayoutDashboard,
  Megaphone,
  Users,
  UserCircle,
  UsersRound,
  School,
  Calendar,
  FileBarChart,
  ShieldCheck,
  Receipt,
  Library,
  BookMarked,
  UserCog,
  CreditCard,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth, type UserRole } from '@/lib/auth';
import { useCommunityEnabled } from '@/lib/useCommunityEnabled';

type NavItem = {
  href: string;
  icon: typeof LayoutDashboard;
  key: string;
  /** Roles allowed to see this item. Empty = visible to all admin panel users. */
  roles?: UserRole[];
};

/**
 * Admin panel nav items with role-based visibility.
 * `roles` specifies which roles see this item. Must match backend API access.
 */
const adminNavItems: NavItem[] = [
  { href: '/admin', icon: LayoutDashboard, key: 'dashboard', roles: ['admin', 'super_admin', 'accountant', 'librarian'] },
  { href: '/admin/website', icon: Globe, key: 'website', roles: ['admin', 'super_admin'] },
  { href: '/admin/users', icon: Users, key: 'users', roles: ['admin', 'super_admin'] },
  { href: '/admin/sessions', icon: ClipboardList, key: 'sessions', roles: ['admin', 'super_admin'] },
  { href: '/admin/classes', icon: BookOpen, key: 'classes', roles: ['admin', 'super_admin'] },
  { href: '/admin/subjects', icon: BookMarked, key: 'subjects', roles: ['admin', 'super_admin'] },
  { href: '/admin/teachers', icon: UserCog, key: 'teacherAssignment', roles: ['admin', 'super_admin'] },
  { href: '/admin/routine', icon: Calendar, key: 'routine', roles: ['admin', 'super_admin'] },
  { href: '/admin/exams', icon: ClipboardList, key: 'exams', roles: ['admin', 'super_admin'] },
  { href: '/admin/fees', icon: DollarSign, key: 'fees', roles: ['admin', 'super_admin', 'accountant'] },
  { href: '/admin/students', icon: GraduationCap, key: 'students', roles: ['admin', 'super_admin'] },
  { href: '/admin/attendance', icon: Users, key: 'attendance', roles: ['admin', 'super_admin'] },
  { href: '/admin/notices', icon: Megaphone, key: 'notices', roles: ['admin', 'super_admin'] },
  { href: '/admin/lesson-plans', icon: BookOpen, key: 'lessonPlans', roles: ['admin', 'super_admin'] },
  { href: '/admin/id-cards', icon: CreditCard, key: 'idCards', roles: ['admin', 'super_admin'] },
  { href: '/admin/result-cards', icon: FileBarChart, key: 'resultCards', roles: ['admin', 'super_admin'] },
  { href: '/admin/exam-config', icon: ClipboardList, key: 'examConfig', roles: ['admin', 'super_admin'] },
  { href: '/admin/community', icon: Globe, key: 'community', roles: ['admin', 'super_admin', 'teacher', 'student', 'parent'] },
  { href: '/admin/reports', icon: FileBarChart, key: 'reports', roles: ['admin', 'super_admin', 'accountant'] },
];

type PortalItem = {
  href: string;
  icon: typeof UserCircle;
  label: string;
  roles: UserRole[];
};

const portalItems: PortalItem[] = [
  { href: '/teacher', icon: UserCircle, label: 'Teacher Portal', roles: ['teacher'] },
  { href: '/student', icon: School, label: 'Student Portal', roles: ['student'] },
  { href: '/parent', icon: UsersRound, label: 'Parents Portal', roles: ['parent'] },
  { href: '/accountant', icon: Receipt, label: 'Accountant Portal', roles: ['accountant'] },
  { href: '/librarian', icon: Library, label: 'Librarian Portal', roles: ['librarian'] },
  { href: '/super-admin', icon: ShieldCheck, label: 'Super Admin', roles: ['super_admin'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) || 'bn';
  const t = useTranslations('nav');
  const { hasRole, roles, canAccess } = useAuth();
  const { enabled: communityEnabled } = useCommunityEnabled();

  // Map nav keys to module names for canAccess checks
  const keyToModule: Record<string, string> = {
    dashboard: 'dashboard',
    website: 'website',
    users: 'users',
    sessions: 'sessions',
    classes: 'classes',
    subjects: 'subjects',
    teacherAssignment: 'teacherAssignment',
    routine: 'routine',
    exams: 'exams',
    fees: 'fees',
    students: 'students',
    attendance: 'attendance',
    notices: 'notices',
    lessonPlans: 'lessonPlans',
    idCards: 'idCards',
    resultCards: 'resultCards',
    examConfig: 'examConfig',
    community: 'community',
    reports: 'reports',
  };

  const visibleAdminItems = adminNavItems.filter((item) => {
    // Hide community nav item if community is disabled (admin always sees it to manage settings)
    if (item.key === 'community' && !communityEnabled && !hasRole('admin', 'super_admin')) {
      return false;
    }
    // If item has explicit roles, check those
    if (item.roles) return item.roles.some((r) => roles.includes(r));
    // Otherwise use canAccess for the module
    const module = keyToModule[item.key];
    return module ? canAccess(module) : hasRole('admin', 'super_admin');
  });

  const visiblePortals = portalItems.filter((item) =>
    item.roles.some((r) => roles.includes(r))
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-primary-700 via-primary-800 to-primary-900 shadow-xl">
      <div className="flex h-16 items-center gap-2 border-b border-white/20 px-4">
        <span className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
          SMS
        </span>
        {hasRole('super_admin') && (
          <span className="ml-auto rounded bg-red-500/80 px-1.5 py-0.5 text-[10px] font-bold text-white">SA</span>
        )}
      </div>

      <nav className="flex flex-col h-[calc(100vh-4rem)] overflow-y-auto">
        {/* Admin Panel Items */}
        <div className="space-y-1 p-4">
          <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-200">
            Admin Panel
          </p>
          {visibleAdminItems.map(({ href, icon: Icon, key }) => {
            const path = `/${locale}${href}`;
            return (
              <Link
                key={path}
                href={path}
                className={clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  pathname === path
                    ? 'bg-white/25 text-white shadow-inner'
                    : 'text-primary-100 hover:bg-white/15 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {t(key)}
              </Link>
            );
          })}
        </div>

        {/* Portal Links */}
        {visiblePortals.length > 0 && (
          <div className="border-t border-white/20 p-4">
            <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-200">
              Portals
            </p>
            <div className="space-y-1">
              {visiblePortals.map(({ href, icon: Icon, label }) => {
                const path = `/${locale}${href}`;
                return (
                  <Link
                    key={path}
                    href={path}
                    className={clsx(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      pathname === path || pathname.startsWith(path + '/')
                        ? 'bg-white/25 text-white shadow-inner'
                        : 'text-primary-100 hover:bg-white/15 hover:text-white'
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
