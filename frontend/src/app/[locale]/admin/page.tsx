'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  BookOpen,
  Users,
  Wallet,
  GraduationCap,
  TrendingUp,
  CalendarCheck,
  ClipboardList,
  Megaphone,
  DollarSign,
  UserCheck,
  UserX,
  Clock,
  FileBarChart,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

type DashboardData = {
  total_students: number;
  students_present_today: number;
  students_absent_today: number;
  students_late_today: number;
  total_teachers: number;
  total_employees: number;
  total_classes: number;
  total_due_amount: number;
  collected_this_month: number;
  pending_invoices: number;
  attendance_rate: number;
  recent_notices: { id: number; title: string; title_bn?: string; audience?: string; published_at: string }[];
  upcoming_exams: { id: number; name: string; start_date: string; end_date: string }[];
};

export default function AdminDashboard() {
  const t = useTranslations('dashboard');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const params = useParams();
  const locale = (params?.locale as string) || 'bn';
  const { hasRole, roles } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardData>('/dashboard'),
  });

  const stats = data?.data;
  const isAdmin = hasRole('admin', 'super_admin');
  const isAccountant = hasRole('accountant');
  const isLibrarian = hasRole('librarian');

  // Determine primary role label for the greeting
  const roleLabel = isAdmin
    ? t('administrator')
    : isAccountant
    ? t('accountant')
    : isLibrarian
    ? t('librarian')
    : t('user');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{tNav('dashboard')}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {t('welcomeBack', { role: roleLabel })}
        </p>
      </div>

      {/* ═══ PRIMARY STAT CARDS ═══ */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Students */}
        {(isAdmin || isAccountant) && (
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30">
            <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <GraduationCap className="h-8 w-8 opacity-90" />
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{t('totalStudents')}</span>
              </div>
              <p className="mt-4 text-3xl font-bold">{stats?.total_students ?? 0}</p>
              <p className="mt-1 text-sm text-blue-100">{t('activeStudentsEnrolled')}</p>
            </div>
          </div>
        )}

        {/* Teachers */}
        {isAdmin && (
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30">
            <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <Users className="h-8 w-8 opacity-90" />
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{t('teachers')}</span>
              </div>
              <p className="mt-4 text-3xl font-bold">{stats?.total_teachers ?? 0}</p>
              <p className="mt-1 text-sm text-emerald-100">{t('totalStaff', { count: stats?.total_employees ?? 0 })}</p>
            </div>
          </div>
        )}

        {/* Fee Collection (Admin + Accountant) */}
        {(isAdmin || isAccountant) && (
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-5 text-white shadow-lg shadow-amber-500/20 transition-all hover:shadow-xl hover:shadow-amber-500/30">
            <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <DollarSign className="h-8 w-8 opacity-90" />
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{t('thisMonth')}</span>
              </div>
              <p className="mt-4 text-3xl font-bold">
                ৳{' '}
                {stats?.collected_this_month != null
                  ? Number(stats.collected_this_month).toLocaleString('bn-BD')
                  : '0'}
              </p>
              <p className="mt-1 text-sm text-amber-100">{t('collectedThisMonth')}</p>
            </div>
          </div>
        )}

        {/* Attendance Rate */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-5 text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-xl hover:shadow-violet-500/30">
          <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-8 w-8 opacity-90" />
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{t('attendanceLabel')}</span>
            </div>
            <p className="mt-4 text-3xl font-bold">{stats?.attendance_rate ?? 0}%</p>
            <p className="mt-1 text-sm text-violet-100">{t('thisMonthsRate')}</p>
          </div>
        </div>

        {/* Classes (Admin only) */}
        {isAdmin && (
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 p-5 text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-xl hover:shadow-cyan-500/30">
            <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <BookOpen className="h-8 w-8 opacity-90" />
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{t('classesLabel')}</span>
              </div>
              <p className="mt-4 text-3xl font-bold">{stats?.total_classes ?? 0}</p>
              <p className="mt-1 text-sm text-cyan-100">{t('totalClasses')}</p>
            </div>
          </div>
        )}

        {/* Librarian - Basic Student Count */}
        {isLibrarian && !isAdmin && (
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30">
            <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <GraduationCap className="h-8 w-8 opacity-90" />
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{t('totalStudents')}</span>
              </div>
              <p className="mt-4 text-3xl font-bold">{stats?.total_students ?? 0}</p>
              <p className="mt-1 text-sm text-blue-100">{t('activeStudents')}</p>
            </div>
          </div>
        )}
      </div>

      {/* ═══ TODAY'S ATTENDANCE (Admin + Accountant) ═══ */}
      {(isAdmin || isAccountant) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <CalendarCheck className="h-5 w-5 text-blue-500" />
              {t('todaysAttendance')}
            </h3>
            {isAdmin && (
              <Link
                href={`/${locale}/admin/attendance`}
                className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {t('viewDetails')} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-4 rounded-xl bg-emerald-50 p-4">
              <div className="rounded-lg bg-emerald-500 p-2.5 text-white">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700">{stats?.students_present_today ?? 0}</p>
                <p className="text-sm text-emerald-600">{t('present')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl bg-red-50 p-4">
              <div className="rounded-lg bg-red-500 p-2.5 text-white">
                <UserX className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700">{stats?.students_absent_today ?? 0}</p>
                <p className="text-sm text-red-600">{t('absent')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl bg-amber-50 p-4">
              <div className="rounded-lg bg-amber-500 p-2.5 text-white">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{stats?.students_late_today ?? 0}</p>
                <p className="text-sm text-amber-600">{t('late')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MIDDLE SECTION: Financial Overview + Quick Actions ═══ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Financial Overview (Admin + Accountant) */}
        {(isAdmin || isAccountant) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                <Wallet className="h-5 w-5 text-amber-500" />
                {t('financialOverview')}
              </h3>
              <Link
                href={`/${locale}/admin/fees`}
                className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {t('manageFees')} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-red-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-semibold text-red-700">{t('totalDueAmount')}</p>
                    <p className="text-sm text-red-600">{t('pendingInvoices', { count: stats?.pending_invoices ?? 0 })}</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-red-700">
                  ৳ {stats?.total_due_amount != null ? Number(stats.total_due_amount).toLocaleString('bn-BD') : '0'}
                </p>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="font-semibold text-emerald-700">{t('collectedThisMonthLabel')}</p>
                    <p className="text-sm text-emerald-600">{t('monthlyFeeCollection')}</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-emerald-700">
                  ৳ {stats?.collected_this_month != null ? Number(stats.collected_this_month).toLocaleString('bn-BD') : '0'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions (Admin only) */}
        {isAdmin && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-800">
              <ClipboardList className="h-5 w-5 text-violet-500" />
              {t('quickActions')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: `/${locale}/admin/students`, label: t('manageStudents'), icon: GraduationCap, color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
                { href: `/${locale}/admin/attendance`, label: tNav('attendance'), icon: CalendarCheck, color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
                { href: `/${locale}/admin/exams`, label: t('manageExams'), icon: ClipboardList, color: 'bg-violet-50 text-violet-600 hover:bg-violet-100' },
                { href: `/${locale}/admin/fees`, label: t('feeCollection'), icon: DollarSign, color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
                { href: `/${locale}/admin/users`, label: t('manageUsers'), icon: Users, color: 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100' },
                { href: `/${locale}/admin/notices`, label: t('notices'), icon: Megaphone, color: 'bg-pink-50 text-pink-600 hover:bg-pink-100' },
                { href: `/${locale}/admin/reports`, label: t('reports'), icon: FileBarChart, color: 'bg-slate-50 text-slate-600 hover:bg-slate-100' },
                { href: `/${locale}/admin/classes`, label: t('classes'), icon: BookOpen, color: 'bg-teal-50 text-teal-600 hover:bg-teal-100' },
              ].map(({ href, label, icon: Icon, color }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${color}`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Librarian quick actions */}
        {isLibrarian && !isAdmin && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-800">
              <ClipboardList className="h-5 w-5 text-violet-500" />
              {t('quickActions')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={`/${locale}/admin/students`}
                className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-600 transition-all hover:bg-blue-100"
              >
                <GraduationCap className="h-5 w-5 shrink-0" />
                {t('viewStudents')}
              </Link>
              <Link
                href={`/${locale}/admin/notices`}
                className="flex items-center gap-3 rounded-xl bg-pink-50 px-4 py-3 text-sm font-medium text-pink-600 transition-all hover:bg-pink-100"
              >
                <Megaphone className="h-5 w-5 shrink-0" />
                {t('notices')}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ═══ BOTTOM SECTION: Recent Notices + Upcoming Exams ═══ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Notices */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <Megaphone className="h-5 w-5 text-pink-500" />
              {t('recentNotices')}
            </h3>
            <Link
              href={`/${locale}/admin/notices`}
              className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {t('viewAll')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {stats?.recent_notices && stats.recent_notices.length > 0 ? (
            <ul className="space-y-3">
              {stats.recent_notices.map((notice) => (
                <li key={notice.id} className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-pink-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-700">
                      {notice.title_bn || notice.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span>{new Date(notice.published_at).toLocaleDateString('en-GB')}</span>
                      {notice.audience && (
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium uppercase">
                          {notice.audience}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">{t('noRecentNotices')}</p>
          )}
        </div>

        {/* Upcoming Exams (Admin only) */}
        {isAdmin && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                <ClipboardList className="h-5 w-5 text-violet-500" />
                {t('upcomingExams')}
              </h3>
              <Link
                href={`/${locale}/admin/exams`}
                className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {t('manage')} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {stats?.upcoming_exams && stats.upcoming_exams.length > 0 ? (
              <ul className="space-y-3">
                {stats.upcoming_exams.map((exam) => (
                  <li key={exam.id} className="flex items-center justify-between rounded-xl bg-violet-50 px-4 py-3">
                    <div>
                      <p className="font-medium text-violet-700">{exam.name}</p>
                      <p className="text-xs text-violet-600">
                        {new Date(exam.start_date).toLocaleDateString('en-GB')} – {new Date(exam.end_date).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <ClipboardList className="h-5 w-5 text-violet-400" />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ClipboardList className="h-12 w-12 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">{t('noUpcomingExams')}</p>
              </div>
            )}
          </div>
        )}

        {/* Accountant: Fee reports shortcut */}
        {isAccountant && !isAdmin && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-800">
              <ClipboardList className="h-5 w-5 text-violet-500" />
              {t('quickActions')}
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <Link
                href={`/${locale}/admin/fees`}
                className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-600 transition-all hover:bg-amber-100"
              >
                <DollarSign className="h-5 w-5 shrink-0" />
                {t('feeCollection')}
              </Link>
              <Link
                href={`/${locale}/admin/reports`}
                className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100"
              >
                <FileBarChart className="h-5 w-5 shrink-0" />
                {t('reports')}
              </Link>
              <Link
                href={`/${locale}/admin/students`}
                className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-600 transition-all hover:bg-blue-100"
              >
                <GraduationCap className="h-5 w-5 shrink-0" />
                {t('viewStudents')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
