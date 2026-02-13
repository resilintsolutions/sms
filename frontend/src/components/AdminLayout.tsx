'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { Sidebar } from './Sidebar';
import { ShieldAlert } from 'lucide-react';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('common');
  const tAccess = useTranslations('accessDenied');
  const { user, loading, hasRole, logout } = useAuth();
  const params = useParams();
  const locale = (params?.locale as string) || 'bn';
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">{t('loading')}</p>
      </div>
    );
  }

  // Role check: admin, super_admin, accountant, or librarian can access admin portal
  if (!hasRole('admin', 'super_admin', 'accountant', 'librarian')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <ShieldAlert className="mx-auto h-16 w-16 text-red-400" />
          <h2 className="mt-4 text-xl font-bold text-slate-800">{tAccess('title')}</h2>
          <p className="mt-2 text-sm text-slate-500">
            {tAccess('message')}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {tAccess('requiredRole')}
          </p>
          <button
            type="button"
            onClick={() => {
              logout();
            }}
            className="btn btn-primary mt-6"
          >
            {tAccess('backToLogin')}
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/30 to-slate-100">
      <Sidebar />
      <main className="pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-primary-200/60 bg-white/90 px-8 shadow-sm backdrop-blur-sm">
          <h1 className="text-lg font-semibold text-slate-800">
            {user?.name ?? '—'}
          </h1>
          <div className="flex items-center gap-3">
            {/* Role badge */}
            <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
              {user?.roles?.[0]?.label || user?.roles?.[0]?.name || t('login')}
            </span>
            <Link
              href={`/${locale}/login`}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
              onClick={(e) => {
                e.preventDefault();
                handleLogout();
              }}
            >
              {t('logout')}
            </Link>
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
