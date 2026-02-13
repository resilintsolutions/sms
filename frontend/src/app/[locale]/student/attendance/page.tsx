'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Calendar, CalendarCheck, CheckCircle, XCircle, Clock, User, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Record = { date: string; status: string; remark?: string };
type Monthly = { month: string; total: number; present: number; absent: number; late: number; leave: number; rate: number };
type Summary = { total: number; present: number; absent: number; late: number; leave: number; rate: number };
type Data = {
  student: { id: number; student_id: string; name: string; name_bn?: string };
  enrollment: { class_name: string; section_name: string; session_name: string; roll_no?: number } | null;
  records: Record[];
  summary: Summary;
  monthly: Monthly[];
};

export default function StudentAttendancePage() {
  const t = useTranslations('student');
  const { data, isLoading } = useQuery({
    queryKey: ['reports/student/attendance'],
    queryFn: () => api<Data>('/reports/student/attendance'),
  });

  const d = data?.data;
  const student = d?.student;
  const enrollment = d?.enrollment;
  const records = d?.records ?? [];
  const summary = d?.summary ?? { total: 0, present: 0, absent: 0, late: 0, leave: 0, rate: 0 };
  const monthly = d?.monthly ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <User className="h-16 w-16 text-slate-300" />
        <h2 className="mt-4 text-xl font-bold text-slate-700">{t('noStudentProfile')}</h2>
        <p className="mt-2 text-sm text-slate-500">{t('notLinked')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{t('attendanceTitle')}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {student.name_bn || student.name} &mdash;{' '}
          {enrollment ? `Class ${enrollment.class_name} - ${enrollment.section_name} (${enrollment.session_name})` : ''}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className={`rounded-xl p-3 ${summary.rate >= 80 ? 'bg-emerald-100 text-emerald-600' : summary.rate >= 60 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t('rateLabel')}</p>
            <p className="text-2xl font-bold text-slate-800">{summary.rate}%</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-600"><Calendar className="h-6 w-6" /></div>
          <div>
            <p className="text-sm text-slate-500">{t('totalDays')}</p>
            <p className="text-2xl font-bold text-slate-800">{summary.total}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600"><CheckCircle className="h-6 w-6" /></div>
          <div>
            <p className="text-sm text-slate-500">{t('presentDays')}</p>
            <p className="text-2xl font-bold text-emerald-700">{summary.present}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-red-100 p-3 text-red-600"><XCircle className="h-6 w-6" /></div>
          <div>
            <p className="text-sm text-slate-500">{t('absentDays')}</p>
            <p className="text-2xl font-bold text-red-700">{summary.absent}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-amber-100 p-3 text-amber-600"><Clock className="h-6 w-6" /></div>
          <div>
            <p className="text-sm text-slate-500">{t('leave')}</p>
            <p className="text-2xl font-bold text-amber-700">{summary.late}</p>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      {monthly.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <CalendarCheck className="h-5 w-5 text-blue-500" /> {t('monthlyBreakdown')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">{t('month')}</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">{t('totalDays')}</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">{t('presentDays')}</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">{t('absentDays')}</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">{t('leave')}</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">{t('leave')}</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">{t('rateLabel')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthly.map((m) => (
                  <tr key={m.month} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{m.month}</td>
                    <td className="px-4 py-3 text-center text-sm">{m.total}</td>
                    <td className="px-4 py-3 text-center text-sm text-emerald-600 font-semibold">{m.present}</td>
                    <td className="px-4 py-3 text-center text-sm text-red-600 font-semibold">{m.absent}</td>
                    <td className="px-4 py-3 text-center text-sm text-amber-600">{m.late}</td>
                    <td className="px-4 py-3 text-center text-sm text-blue-600">{m.leave}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-200">
                          <div className={`h-full rounded-full ${m.rate >= 80 ? 'bg-emerald-500' : m.rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${m.rate}%` }} />
                        </div>
                        <span className="text-sm font-medium">{m.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Daily Records */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Calendar className="h-5 w-5 text-violet-500" /> {t('dailyRecords')}
        </h3>
        {records.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {records.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
                  <span className="text-sm text-slate-700">
                    {new Date(r.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    r.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                    r.status === 'late' ? 'bg-amber-100 text-amber-700' :
                    r.status === 'leave' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t('noRecordsYet')}</p>
        )}
      </div>
    </div>
  );
}
