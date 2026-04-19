'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Building2, LayoutDashboard, LogOut, ShieldAlert, Settings, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const locale = (params?.locale as string) || 'bn';
  const { user, loading, hasRole, logout } = useAuth();
  const t = useTranslations('superAdmin');
  const tc = useTranslations('common');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">{tc('loading')}</p>
      </div>
    );
  }

  if (!hasRole('super_admin')) {
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
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white shadow-lg">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-4">
          <Building2 className="h-8 w-8 text-indigo-600" />
          <span className="text-lg font-bold text-slate-800">{t('portal')}</span>
        </div>
        <nav className="space-y-1 p-4">
          <Link
            href={`/${locale}/super-admin`}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <LayoutDashboard className="h-5 w-5" /> {t('schoolDashboard')}
          </Link>
          <Link
            href={`/${locale}/admin`}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <Building2 className="h-5 w-5" /> {t('schoolAdmin')}
          </Link>
          <Link
            href={`/${locale}/super-admin/community`}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <Globe className="h-5 w-5" /> Community Management
          </Link>
          <Link
            href={`/${locale}/super-admin/profile`}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <Settings className="h-5 w-5" /> Profile Settings
          </Link>
        </nav>
      </aside>
      <main className="pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-800">{user?.name ?? t('portal')}</h1>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">{t('portal')}</span>
            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" /> {tc('logout')}
            </button>
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
