'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { authApi, setAuthCookie } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const t = useTranslations('common');
  const tAuth = useTranslations('auth');
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'bn';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { refresh } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await authApi.login(email, password);
    setLoading(false);
    if (res.success && res.data?.token) {
      localStorage.setItem('token', res.data.token);
      const loginData = res.data as { user?: { roles?: { name: string }[] }; roles?: string[] };
      const roles = loginData.roles ?? loginData.user?.roles?.map((r) => r.name) ?? [];
      setAuthCookie(roles);
      // Refresh AuthProvider so it picks up user data & roles before navigation
      await refresh();
      toast.success(tAuth('loginSuccess') || 'Login successful');
      let target = `/${locale}/admin`;
      if (roles.includes('super_admin')) target = `/${locale}/super-admin`;
      else if (roles.includes('admin')) target = `/${locale}/admin`;
      else if (roles.includes('accountant')) target = `/${locale}/accountant`;
      else if (roles.includes('librarian')) target = `/${locale}/librarian`;
      else if (roles.includes('teacher')) target = `/${locale}/teacher`;
      else if (roles.includes('parent')) target = `/${locale}/parent`;
      else if (roles.includes('student')) target = `/${locale}/student`;
      router.push(target);
    } else {
      const msg = res.message || tAuth('loginFailed');
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-400 via-primary-600 to-violet-700 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card overflow-hidden border-2 border-primary-200/80 bg-white text-center shadow-2xl">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4 text-white">
            <h1 className="text-2xl font-bold tracking-tight">
              {t('appName')}
            </h1>
            <p className="mt-1 text-sm text-primary-100">
              বাংলাদেশ স্কুল ম্যানেজমেন্ট সিস্টেম
            </p>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-left text-sm font-medium text-slate-700">
                  {tAuth('email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="admin@school.edu.bd"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-left text-sm font-medium text-slate-700">
                  {tAuth('password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  required
                />
              </div>
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-base"
              >
                {loading ? t('loading') : t('login')}
              </button>
            </form>
            <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">
              {tAuth('demoCredentials')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
