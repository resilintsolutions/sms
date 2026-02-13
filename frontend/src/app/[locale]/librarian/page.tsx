'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslations } from 'next-intl';
import {
  BookOpen, BookMarked, Users, ArrowRight, CheckCircle, AlertCircle,
  Library, Clock, Search, Globe, TrendingUp, Layers,
} from 'lucide-react';

type DashData = {
  total_books: number;
  available_books: number;
  unique_books: number;
  issued_books: number;
  overdue_books: number;
  total_students: number;
  total_ebooks: number;
  recent_issues: { id: number; book_title: string; student_name: string; student_code: string; issue_date: string; due_date: string; return_date: string | null; status: string }[];
  popular_books: { id: number; title: string; author: string; category: string; issues_count: number }[];
  recent_notices: { id: number; title: string; title_bn?: string; published_at: string }[];
  categories: { category: string; count: number; total: number }[];
};

export default function LibrarianDashboard() {
  const params = useParams();
  const locale = (params?.locale as string) || 'bn';
  const { user } = useAuth();
  const t = useTranslations('librarian');
  const tc = useTranslations('common');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard/librarian'],
    queryFn: () => api<DashData>('/dashboard/librarian'),
  });

  const d = data?.data;
  const today = new Date().toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-2xl bg-gradient-to-r from-purple-200 to-indigo-200" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[1,2].map(i => <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      </div>
    );
  }

  const stats = [
    { label: t('totalBooks'), value: d?.total_books ?? 0, icon: BookOpen, color: 'purple', sub: `${d?.unique_books ?? 0} ${t('uniqueTitles')}` },
    { label: t('availableBooks'), value: d?.available_books ?? 0, icon: CheckCircle, color: 'emerald' },
    { label: t('issuedBooks'), value: d?.issued_books ?? 0, icon: BookMarked, color: 'blue' },
    { label: t('overdueBooks'), value: d?.overdue_books ?? 0, icon: AlertCircle, color: (d?.overdue_books ?? 0) > 0 ? 'red' : 'emerald' },
  ];

  const colors: Record<string, string> = {
    purple: 'bg-purple-100 text-purple-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-700 p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold">{t('welcome', { name: user?.name || '' })}</h2>
        <p className="mt-1 text-purple-200">{today}</p>
        <p className="mt-2 text-sm text-purple-200">{t('dashboardSubtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`rounded-xl p-3 ${colors[color]}`}><Icon className="h-6 w-6" /></div>
            <div>
              <p className="text-sm text-slate-500">{label}</p>
              <p className="text-2xl font-bold text-slate-800">{value}</p>
              {sub && <p className="text-xs text-slate-400">{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <Library className="h-5 w-5 text-purple-500" /> {t('quickActions')}
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: '/librarian/books', icon: BookOpen, label: t('browseBooks'), bg: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
            { href: '/librarian/issued', icon: BookMarked, label: t('manageIssued'), bg: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
            { href: '/librarian/ebooks', icon: Globe, label: t('eLibrary'), bg: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
            { href: '/librarian/students', icon: Search, label: t('studentLookup'), bg: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
          ].map(a => (
            <Link key={a.href} href={`/${locale}${a.href}`} className={`flex items-center gap-3 rounded-xl px-4 py-4 text-sm font-medium transition-all ${a.bg}`}>
              <a.icon className="h-5 w-5 shrink-0" /> {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Middle row: Categories + Popular Books */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Categories */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Layers className="h-5 w-5 text-purple-500" /> {t('categoryBreakdown')}
          </h3>
          {d?.categories && d.categories.length > 0 ? (
            <div className="space-y-3">
              {d.categories.map(c => {
                const pct = d.total_books ? Math.round((c.total as number / d.total_books) * 100) : 0;
                return (
                  <div key={c.category} className="flex items-center gap-3">
                    <span className="w-28 truncate text-sm font-medium text-slate-700">{c.category}</span>
                    <div className="flex-1">
                      <div className="h-2.5 rounded-full bg-slate-100">
                        <div className="h-2.5 rounded-full bg-purple-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">{c.count} {t('titles')} · {c.total as number} {t('copies')}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">{t('noBooksFound')}</p>
          )}
        </div>

        {/* Popular Books */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <TrendingUp className="h-5 w-5 text-blue-500" /> {t('popularBooks')}
          </h3>
          {d?.popular_books && d.popular_books.length > 0 ? (
            <ul className="space-y-3">
              {d.popular_books.map((b, i) => (
                <li key={b.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-600">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-700">{b.title}</p>
                    <p className="text-xs text-slate-500">{b.author}</p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{b.issues_count}x {t('issued')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">{t('noRecentIssues')}</p>
          )}
        </div>
      </div>

      {/* Bottom: Recent Issues + Notices */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <Clock className="h-5 w-5 text-blue-500" /> {t('recentIssues')}
            </h3>
            <Link href={`/${locale}/librarian/issued`} className="flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700">
              {t('viewAll')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {d?.recent_issues && d.recent_issues.length > 0 ? (
            <ul className="space-y-3">
              {d.recent_issues.slice(0, 6).map(issue => (
                <li key={issue.id} className={`flex items-center justify-between rounded-xl px-4 py-3 ${issue.status === 'overdue' ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{issue.book_title}</p>
                    <p className="text-xs text-slate-500">{issue.student_name} · {issue.student_code}</p>
                  </div>
                  <div className="ml-3 text-right shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${issue.status === 'overdue' ? 'bg-red-100 text-red-700' : issue.status === 'returned' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {issue.status === 'overdue' ? t('overdue') : issue.status === 'returned' ? t('returned') : t('issued')}
                    </span>
                    <p className="mt-1 text-xs text-slate-400">{t('dueLabel')}{new Date(issue.due_date).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB')}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BookMarked className="h-12 w-12 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">{t('noRecentIssues')}</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Library className="h-5 w-5 text-purple-500" /> {t('notices')}
          </h3>
          {d?.recent_notices && d.recent_notices.length > 0 ? (
            <ul className="space-y-3">
              {d.recent_notices.map(notice => (
                <li key={notice.id} className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-700">{locale === 'bn' && notice.title_bn ? notice.title_bn : notice.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(notice.published_at).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB')}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">{t('noNotices')}</p>
          )}
        </div>
      </div>
    </div>
  );
}