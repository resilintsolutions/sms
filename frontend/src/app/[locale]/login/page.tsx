'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, authApi, setAuthCookie } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type LandingPageResponse = {
  config?: {
    site?: {
      timezone?: string;
    };
  };
};

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
  const [now, setNow] = useState(() => new Date());
  const { refresh } = useAuth();
  const { data: landingPage, refetch } = useQuery({
    queryKey: ['landing-page-login-clock'],
    queryFn: async () => {
      const res = await api<LandingPageResponse>('/landing-page');
      return res.data;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return undefined;
    const channel = new BroadcastChannel('landing-page-refresh');
    channel.onmessage = () => {
      refetch();
    };
    return () => channel.close();
  }, [refetch]);

  const configuredTimezone = landingPage?.config?.site?.timezone || 'Asia/Dhaka';
  const localeCode = locale === 'bn' ? 'bn-BD' : 'en-US';
  const formatClock = (date: Date, timeZone: string) => {
    try {
      return new Intl.DateTimeFormat(localeCode, {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(date);
    } catch {
      return new Intl.DateTimeFormat(localeCode, {
        timeZone: 'Asia/Dhaka',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(date);
    }
  };

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
            <div className="mt-4 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-left shadow-lg backdrop-blur-sm">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-primary-100">
                Current time
              </p>
              <p className="mt-1 font-mono text-3xl font-semibold tracking-[0.22em] text-white">
                {formatClock(now, configuredTimezone)}
              </p>
              <p className="mt-1 text-xs text-primary-100">
                {configuredTimezone}
              </p>
            </div>
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
