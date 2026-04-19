'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { BookOpen, ClipboardList, LayoutDashboard, User, ShieldAlert, LogOut, FileBarChart, FileEdit, Settings, Globe } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/lib/auth';
import { useTranslations } from 'next-intl';
import { useCommunityEnabled } from '@/lib/useCommunityEnabled';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const { user, loading, hasRole, logout } = useAuth();
  const t = useTranslations('teacher');
  const tn = useTranslations('nav');
  const tc = useTranslations('common');
  const { enabled: communityEnabled } = useCommunityEnabled();

  const allNavItems = [
    { href: '/teacher', icon: LayoutDashboard, label: tn('dashboard') },
    { href: '/teacher/classes', icon: BookOpen, label: 'My Classes' },
    { href: '/teacher/assignments', icon: FileEdit, label: 'Assignments & Quizzes' },
    { href: '/teacher/marks', icon: ClipboardList, label: tn('marks') },
    { href: '/teacher/attendance', icon: User, label: tn('attendance') },
    { href: '/teacher/reports', icon: FileBarChart, label: tn('reports') },
    { href: '/teacher/lesson-plans', icon: BookOpen, label: tn('lessonPlans') },
    { href: '/teacher/upload', icon: BookOpen, label: tn('contentUpload') },
    ...(communityEnabled ? [{ href: '/teacher/community', icon: Globe, label: tn('community') }] : []),
    { href: '/teacher/profile', icon: Settings, label: 'Profile Settings' },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">{tc('loading')}</p>
      </div>
    );
  }

  if (!hasRole('teacher', 'super_admin')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <ShieldAlert className="mx-auto h-16 w-16 text-red-400" />
          <h2 className="mt-4 text-xl font-bold text-slate-800">{t('accessDeniedTitle')}</h2>
          <p className="mt-2 text-sm text-slate-500">{t('accessDeniedMsg')}</p>
          <p className="mt-1 text-xs text-slate-400">{t('requiredRole')}</p>
          <button type="button" onClick={() => logout()} className="btn btn-primary mt-6">{t('backToLogin')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-emerald-600 via-emerald-700 to-teal-800 shadow-xl">
        <div className="flex h-16 items-center gap-2 border-b border-white/20 px-4">
          <span className="text-lg font-bold text-white">{t('portal')}</span>
        </div>
        <nav className="space-y-1 p-4">
          {allNavItems.map(({ href, icon: Icon, label }) => {
            const path = `/${locale}${href}`;
            return (
              <Link
                key={path}
                href={path}
                className={clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  pathname === path ? 'bg-white/25 text-white shadow-inner' : 'text-emerald-100 hover:bg-white/15 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            );
          })}
          {hasRole('super_admin') && (
            <Link href={`/${locale}/admin`} className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-emerald-200 hover:bg-white/15 hover:text-white">
              ← Admin
            </Link>
          )}
        </nav>
      </aside>
      <main className="pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-emerald-200/60 bg-white/90 px-8 shadow-sm backdrop-blur-sm">
          <h1 className="text-lg font-semibold text-slate-800">{user?.name ?? t('portal')}</h1>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">{t('portal')}</span>
            <button type="button" onClick={() => logout()} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
              <LogOut className="h-4 w-4" /> {tc('logout')}
            </button>
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
