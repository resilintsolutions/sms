'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslations } from 'next-intl';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  Award,
  Wallet,
  Megaphone,
  ArrowRight,
  AlertTriangle,
  User,
} from 'lucide-react';

type ChildData = {
  id: number;
  student_id: string;
  name: string;
  name_bn?: string;
  photo?: string;
  gender?: string;
  enrollment: {
    class_name: string;
    section_name: string;
    session_name: string;
    roll_no?: number;
  } | null;
  attendance_summary: {
    total_days: number;
    present: number;
    rate: number;
  } | null;
  latest_result: {
    exam_name: string;
    gpa?: number;
    letter_grade?: string;
    total_marks: number;
  } | null;
  pending_due: number;
};

type ParentDashData = {
  guardian: {
    id: number;
    name: string;
    name_bn?: string;
    relation: string;
    phone: string;
  } | null;
  children: ChildData[];
  recent_notices: { id: number; title: string; title_bn?: string; body?: string; published_at: string }[];
};

export default function ParentPortalPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const { user } = useAuth();
  const t = useTranslations('parent');
  const tc = useTranslations('common');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard/parent'],
    queryFn: () => api<ParentDashData>('/dashboard/parent'),
  });

  const d = data?.data;
  const guardian = d?.guardian;
  const children = d?.children ?? [];
  const notices = d?.recent_notices ?? [];
  const totalDue = children.reduce((sum, c) => sum + (c.pending_due ?? 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-200" />
        <div className="grid gap-6 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold">
          {t('welcome', { name: guardian?.name_bn || guardian?.name || user?.name || t('portal') })}
        </h2>
        <p className="mt-1 text-amber-100">
          {guardian?.relation ? `${guardian.relation.charAt(0).toUpperCase() + guardian.relation.slice(1)}` : t('guardian')} &middot;{' '}
          {children.length === 1 ? t('childEnrolled', { count: children.length }) : t('childrenEnrolled', { count: children.length })}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t('myChildren')}</p>
            <p className="text-2xl font-bold text-slate-800">{children.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t('avgAttendance')}</p>
            <p className="text-2xl font-bold text-slate-800">
              {children.length > 0
                ? Math.round(children.reduce((sum, c) => sum + (c.attendance_summary?.rate ?? 0), 0) / children.length)
                : 0}%
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className={`rounded-xl p-3 ${totalDue > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t('totalPendingFees')}</p>
            <p className={`text-2xl font-bold ${totalDue > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              ৳ {Number(totalDue).toLocaleString('bn-BD')}
            </p>
          </div>
        </div>
      </div>

      {/* Children Cards */}
      {children.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <GraduationCap className="mx-auto h-16 w-16 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-700">{t('noChildrenFound')}</h3>
          <p className="mt-2 text-sm text-slate-500">
            {t('noChildrenDesc')}
          </p>
        </div>
      ) : (
        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-800">{t('myChildren')}</h3>
          <div className="grid gap-6 sm:grid-cols-2">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/${locale}/parent/${child.id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-amber-300 hover:shadow-md"
              >
                {/* Child Header */}
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    {child.photo ? (
                      <img src={child.photo} alt={child.name} className="h-14 w-14 rounded-full object-cover" />
                    ) : (
                      <User className="h-7 w-7" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-lg font-semibold text-slate-800 group-hover:text-amber-700">
                      {child.name_bn || child.name}
                    </h4>
                    <p className="font-mono text-sm text-slate-500">ID: {child.student_id}</p>
                    {child.enrollment && (
                      <p className="text-sm text-slate-600">
                        Class {child.enrollment.class_name} - {child.enrollment.section_name}
                        {child.enrollment.roll_no && ` (Roll: ${child.enrollment.roll_no})`}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-amber-500" />
                </div>

                {/* Child Stats */}
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {/* Attendance */}
                  <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-center">
                    <CalendarCheck className="mx-auto h-4 w-4 text-emerald-500" />
                    <p className="mt-1 text-lg font-bold text-emerald-700">
                      {child.attendance_summary?.rate ?? 0}%
                    </p>
                    <p className="text-[10px] font-medium text-emerald-600">{t('attendanceLabel')}</p>
                  </div>

                  {/* Latest Result */}
                  <div className="rounded-xl bg-blue-50 px-3 py-2.5 text-center">
                    <Award className="mx-auto h-4 w-4 text-blue-500" />
                    <p className="mt-1 text-lg font-bold text-blue-700">
                      {child.latest_result?.gpa != null ? child.latest_result.gpa.toFixed(2) : '—'}
                    </p>
                    <p className="text-[10px] font-medium text-blue-600">
                      {child.latest_result?.letter_grade ?? 'GPA'}
                    </p>
                  </div>

                  {/* Fees Due */}
                  <div className={`rounded-xl px-3 py-2.5 text-center ${child.pending_due > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <Wallet className={`mx-auto h-4 w-4 ${child.pending_due > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                    <p className={`mt-1 text-lg font-bold ${child.pending_due > 0 ? 'text-red-700' : 'text-slate-600'}`}>
                      ৳{Number(child.pending_due).toLocaleString('bn-BD')}
                    </p>
                    <p className={`text-[10px] font-medium ${child.pending_due > 0 ? 'text-red-600' : 'text-slate-500'}`}>{t('dueLabel')}</p>
                  </div>
                </div>

                {/* Fee Warning */}
                {child.pending_due > 0 && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {t('pendingFeesWarning')}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Notices */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <Megaphone className="h-5 w-5 text-pink-500" />
          {t('recentNotices')}
        </h3>
        {notices.length > 0 ? (
          <ul className="space-y-3">
            {notices.map((notice) => (
              <li key={notice.id} className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="font-medium text-slate-700">{notice.title_bn || notice.title}</p>
                {notice.body && (
                  <p className="mt-1 text-sm text-slate-600">
                    {notice.body.length > 150 ? notice.body.slice(0, 150) + '...' : notice.body}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(notice.published_at).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB')}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">{t('noRecentNotices')}</p>
        )}
      </div>
    </div>
  );
}
