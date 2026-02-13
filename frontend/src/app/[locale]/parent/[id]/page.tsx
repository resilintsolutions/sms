'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft, User, Calendar, Award, Wallet, Megaphone, Clock,
  CheckCircle, XCircle, ChevronDown, ChevronUp, Receipt,
  BookOpen, GraduationCap, TrendingUp, AlertTriangle, FileText
} from 'lucide-react';

/* ── types ── */
type Enrollment = { section?: { name: string; class?: { name: string } }; academic_session?: { name: string }; roll_no?: number };
type Student = { id: number; student_id: string; name: string; name_bn?: string; date_of_birth?: string; gender?: string; photo?: string; blood_group?: string; address?: string; enrollments?: Enrollment[] };
type AttendanceRow = { date: string; status: string; remark?: string };
type ResultRow = { exam_term?: { name: string }; total_marks: number; gpa?: number; letter_grade?: string; position?: number };
type InvoiceRow = { id: number; invoice_no: string; total_amount: string; paid_amount: string; due_amount: string; status: string; academic_session?: { name: string } };
type NoticeRow = { id: number; title: string; title_bn?: string; body?: string; body_bn?: string; published_at?: string };

const TABS = ['overview', 'attendance', 'results', 'fees', 'notices'] as const;
type Tab = typeof TABS[number];

const TAB_ICONS: Record<Tab, React.ElementType> = {
  overview: User, attendance: Calendar, results: Award, fees: Wallet, notices: Megaphone
};

/* ── attendance helpers ── */
function getStatusColor(status: string) {
  switch (status) {
    case 'present': return 'bg-emerald-500';
    case 'absent': return 'bg-red-500';
    case 'late': return 'bg-amber-500';
    case 'leave': return 'bg-blue-500';
    default: return 'bg-slate-300';
  }
}
function getStatusBadge(status: string) {
  switch (status) {
    case 'present': return 'bg-emerald-100 text-emerald-700';
    case 'absent': return 'bg-red-100 text-red-700';
    case 'late': return 'bg-amber-100 text-amber-700';
    case 'leave': return 'bg-blue-100 text-blue-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}
function getGradeColor(grade?: string) {
  if (!grade) return 'bg-slate-100 text-slate-600';
  if (grade.startsWith('A')) return 'bg-emerald-100 text-emerald-700';
  if (grade.startsWith('B')) return 'bg-blue-100 text-blue-700';
  if (grade.startsWith('C')) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

export default function ParentStudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const id = params?.id as string;
  const t = useTranslations('parent');
  const tc = useTranslations('common');

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [expandedInvoice, setExpandedInvoice] = useState<number | null>(null);
  const [attendanceMonth, setAttendanceMonth] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['portal/parent/student', id],
    queryFn: () => api<{ data: { student: Student; attendance: AttendanceRow[]; results: ResultRow[]; invoices: InvoiceRow[]; notices: NoticeRow[] } }>(`/portal/parent/students/${id}`),
    enabled: !!id,
  });
  const payload = (data as any)?.data;
  const student: Student | undefined = payload?.student;
  const attendance: AttendanceRow[] = payload?.attendance ?? [];
  const results: ResultRow[] = payload?.results ?? [];
  const invoices: InvoiceRow[] = payload?.invoices ?? [];
  const notices: NoticeRow[] = payload?.notices ?? [];

  if (!id) return null;

  /* ── skeleton loading ── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
        <div className="flex gap-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-10 w-24 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1,2,3,4].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      </div>
    );
  }
  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <User className="h-16 w-16 text-slate-300" />
        <p className="mt-4 text-lg font-semibold text-slate-600">{t('noChildrenFound')}</p>
        <button type="button" onClick={() => router.push(`/${locale}/parent`)} className="mt-4 rounded-xl bg-amber-500 px-6 py-2 text-white hover:bg-amber-600">{t('backToDashboard')}</button>
      </div>
    );
  }

  const enrollment = student.enrollments?.[0];

  /* ── attendance stats ── */
  const attPresent = attendance.filter(a => a.status === 'present').length;
  const attAbsent = attendance.filter(a => a.status === 'absent').length;
  const attLate = attendance.filter(a => a.status === 'late').length;
  const attLeave = attendance.filter(a => a.status === 'leave').length;
  const attRate = attendance.length > 0 ? Math.round(((attPresent + attLate) / attendance.length) * 100) : 0;

  /* attendance month filter */
  const attMonths = [...new Set(attendance.map(a => a.date.slice(0, 7)))].sort().reverse();
  const filteredAttendance = attendanceMonth === 'all' ? attendance : attendance.filter(a => a.date.startsWith(attendanceMonth));

  /* ── fee stats ── */
  const feeTotal = invoices.reduce((s, inv) => s + Number(inv.total_amount), 0);
  const feePaid = invoices.reduce((s, inv) => s + Number(inv.paid_amount), 0);
  const feeDue = invoices.reduce((s, inv) => s + Number(inv.due_amount), 0);

  /* ── latest result ── */
  const latestResult = results[0];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button type="button" onClick={() => router.push(`/${locale}/parent`)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-amber-600 transition-colors">
        <ArrowLeft className="h-4 w-4" /> {t('backToDashboard')}
      </button>

      {/* Student Profile Header */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white shadow-lg">
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            {student.photo ? (
              <img src={student.photo} alt={student.name} className="h-20 w-20 rounded-full object-cover border-2 border-white/40" />
            ) : (
              <User className="h-10 w-10 text-white" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold">{locale === 'bn' && student.name_bn ? student.name_bn : student.name}</h2>
            <p className="mt-0.5 font-mono text-sm text-amber-100">ID: {student.student_id}</p>
            {enrollment && (
              <p className="mt-1 text-amber-100">
                {t('classLabel')} {enrollment.section?.class?.name} — {t('sectionLabel')} {enrollment.section?.name}
                {enrollment.roll_no ? ` • ${t('rollLabel')} ${enrollment.roll_no}` : ''}
                {enrollment.academic_session?.name ? ` • ${enrollment.academic_session.name}` : ''}
              </p>
            )}
          </div>
          {/* Quick stats on header */}
          <div className="hidden gap-4 md:flex">
            <div className="rounded-xl bg-white/15 px-4 py-2 text-center backdrop-blur-sm">
              <p className="text-xs text-amber-100">{t('attendanceLabel')}</p>
              <p className="text-xl font-bold">{attRate}%</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-2 text-center backdrop-blur-sm">
              <p className="text-xs text-amber-100">{t('latestGPA')}</p>
              <p className="text-xl font-bold">{latestResult?.gpa ?? '—'}</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-2 text-center backdrop-blur-sm">
              <p className="text-xs text-amber-100">{t('dueLabel')}</p>
              <p className="text-xl font-bold">৳{feeDue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {TABS.map(tab => {
          const Icon = TAB_ICONS[tab];
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(`tab_${tab}`)}
            </button>
          );
        })}
      </div>

      {/* ═══════ OVERVIEW TAB ═══════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Student Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <FileText className="h-5 w-5 text-amber-500" /> {t('personalInfo')}
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {student.date_of_birth && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{t('dateOfBirth')}</p>
                  <p className="mt-0.5 font-medium text-slate-800">{new Date(student.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              )}
              {student.gender && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{t('gender')}</p>
                  <p className="mt-0.5 font-medium text-slate-800 capitalize">{student.gender}</p>
                </div>
              )}
              {student.blood_group && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{t('bloodGroup')}</p>
                  <p className="mt-0.5 font-medium text-slate-800">{student.blood_group}</p>
                </div>
              )}
              {student.address && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{t('address')}</p>
                  <p className="mt-0.5 font-medium text-slate-800">{student.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-600"><Calendar className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-slate-500">{t('attendanceLabel')}</p>
                  <p className="text-2xl font-bold text-slate-800">{attRate}%</p>
                  <p className="text-[11px] text-slate-400">{attPresent}P / {attAbsent}A / {attLate}L</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-100 p-2.5 text-blue-600"><Award className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-slate-500">{t('latestGPA')}</p>
                  <p className="text-2xl font-bold text-slate-800">{latestResult?.gpa ?? '—'}</p>
                  <p className="text-[11px] text-slate-400">{latestResult ? `${latestResult.letter_grade ?? ''} — ${latestResult.exam_term?.name ?? ''}` : t('noExamResults')}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-purple-100 p-2.5 text-purple-600"><BookOpen className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-slate-500">{t('totalExams')}</p>
                  <p className="text-2xl font-bold text-slate-800">{results.length}</p>
                  <p className="text-[11px] text-slate-400">{t('examsTaken')}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`rounded-xl p-2.5 ${feeDue > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}><Wallet className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-slate-500">{t('pendingFeesStat')}</p>
                  <p className={`text-2xl font-bold ${feeDue > 0 ? 'text-red-700' : 'text-emerald-700'}`}>৳{feeDue.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-400">{t('totalPaid')}: ৳{feePaid.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Notices */}
          {notices.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                <Megaphone className="h-5 w-5 text-pink-500" /> {t('recentNotices')}
              </h3>
              <div className="mt-4 space-y-3">
                {notices.slice(0, 3).map(n => (
                  <div key={n.id} className="rounded-xl bg-slate-50 p-4">
                    <p className="font-medium text-slate-800">{locale === 'bn' ? (n.title_bn || n.title) : n.title}</p>
                    {(n.body || n.body_bn) && <p className="mt-1 text-sm text-slate-600 line-clamp-2">{locale === 'bn' ? (n.body_bn || n.body) : n.body}</p>}
                    {n.published_at && <p className="mt-1 text-xs text-slate-400">{new Date(n.published_at).toLocaleDateString('en-GB')}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ ATTENDANCE TAB ═══════ */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Attendance Summary Bar */}
          <div className="grid gap-4 sm:grid-cols-5">
            {[
              { label: t('totalDays'), value: attendance.length, color: 'text-slate-800' },
              { label: t('present'), value: attPresent, color: 'text-emerald-600' },
              { label: t('absent'), value: attAbsent, color: 'text-red-600' },
              { label: t('late'), value: attLate, color: 'text-amber-600' },
              { label: t('onLeave'), value: attLeave, color: 'text-blue-600' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Attendance Rate Visual */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">{t('attendanceRate')}</h3>
              <span className={`text-3xl font-bold ${attRate >= 80 ? 'text-emerald-600' : attRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{attRate}%</span>
            </div>
            <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-100">
              <div className="flex h-full">
                <div className="bg-emerald-500 transition-all" style={{ width: `${attendance.length ? (attPresent/attendance.length)*100 : 0}%` }} />
                <div className="bg-amber-500 transition-all" style={{ width: `${attendance.length ? (attLate/attendance.length)*100 : 0}%` }} />
                <div className="bg-blue-500 transition-all" style={{ width: `${attendance.length ? (attLeave/attendance.length)*100 : 0}%` }} />
                <div className="bg-red-500 transition-all" style={{ width: `${attendance.length ? (attAbsent/attendance.length)*100 : 0}%` }} />
              </div>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{t('present')}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />{t('late')}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />{t('onLeave')}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />{t('absent')}</span>
            </div>
          </div>

          {/* Month filter + Records */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="font-semibold text-slate-800">{t('attendanceRecords')}</h3>
              <select
                value={attendanceMonth}
                onChange={e => setAttendanceMonth(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              >
                <option value="all">{t('allMonths')}</option>
                {attMonths.map(m => <option key={m} value={m}>{new Date(m + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</option>)}
              </select>
            </div>
            {filteredAttendance.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">{t('noRecords')}</div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr><th className="px-6 py-3 text-left">{t('date')}</th><th className="px-6 py-3 text-left">{t('day')}</th><th className="px-6 py-3 text-left">{t('status')}</th><th className="px-6 py-3 text-left">{t('remark')}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAttendance.map((a, i) => {
                      const d = new Date(a.date);
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-6 py-3 text-slate-800">{d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td className="px-6 py-3 text-slate-600">{d.toLocaleDateString('en-GB', { weekday: 'long' })}</td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(a.status)}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${getStatusColor(a.status)}`} />
                              {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-slate-500">{a.remark || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ RESULTS TAB ═══════ */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
              <GraduationCap className="h-16 w-16 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-700">{t('noExamResults')}</h3>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((r, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-800">{r.exam_term?.name ?? t('exam')}</h4>
                      <p className="mt-1 text-sm text-slate-500">{t('totalMarksLabel')}: {r.total_marks}</p>
                    </div>
                    <span className={`rounded-xl px-3 py-1 text-sm font-bold ${getGradeColor(r.letter_grade)}`}>
                      {r.letter_grade ?? '—'}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-blue-50 p-3 text-center">
                      <p className="text-xs text-blue-500">{t('gpa')}</p>
                      <p className="text-xl font-bold text-blue-700">{r.gpa ?? '—'}</p>
                    </div>
                    <div className="rounded-xl bg-purple-50 p-3 text-center">
                      <p className="text-xs text-purple-500">{t('grade')}</p>
                      <p className="text-xl font-bold text-purple-700">{r.letter_grade ?? '—'}</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-3 text-center">
                      <p className="text-xs text-amber-500">{t('position')}</p>
                      <p className="text-xl font-bold text-amber-700">{r.position ? `#${r.position}` : '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════ FEES TAB ═══════ */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          {/* Fee Summary */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <Receipt className="h-5 w-5 text-blue-500" />
              <div><p className="text-xs text-slate-500">{t('invoices')}</p><p className="text-lg font-bold text-slate-800">{invoices.length}</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <Wallet className="h-5 w-5 text-slate-500" />
              <div><p className="text-xs text-slate-500">{t('totalFees')}</p><p className="text-lg font-bold text-slate-800">৳{feeTotal.toLocaleString()}</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <div><p className="text-xs text-slate-500">{t('totalPaid')}</p><p className="text-lg font-bold text-emerald-700">৳{feePaid.toLocaleString()}</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <AlertTriangle className={`h-5 w-5 ${feeDue > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
              <div><p className="text-xs text-slate-500">{t('totalDue')}</p><p className={`text-lg font-bold ${feeDue > 0 ? 'text-red-700' : 'text-emerald-700'}`}>৳{feeDue.toLocaleString()}</p></div>
            </div>
          </div>

          {/* Invoice List */}
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
              <CheckCircle className="h-12 w-12 text-emerald-300" />
              <p className="mt-2 text-sm text-slate-500">{t('noInvoices')}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-3 text-left">{t('invoiceNo')}</th>
                    <th className="px-6 py-3 text-left">{t('session')}</th>
                    <th className="px-6 py-3 text-right">{t('totalFees')}</th>
                    <th className="px-6 py-3 text-right">{t('totalPaid')}</th>
                    <th className="px-6 py-3 text-right">{t('totalDue')}</th>
                    <th className="px-6 py-3 text-center">{t('status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-mono text-sm font-semibold text-slate-800">{inv.invoice_no}</td>
                      <td className="px-6 py-3 text-slate-600">{inv.academic_session?.name ?? '—'}</td>
                      <td className="px-6 py-3 text-right font-medium">৳{Number(inv.total_amount).toLocaleString()}</td>
                      <td className="px-6 py-3 text-right text-emerald-600">৳{Number(inv.paid_amount).toLocaleString()}</td>
                      <td className={`px-6 py-3 text-right font-semibold ${Number(inv.due_amount) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>৳{Number(inv.due_amount).toLocaleString()}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          inv.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>{inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════ NOTICES TAB ═══════ */}
      {activeTab === 'notices' && (
        <div className="space-y-4">
          {notices.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
              <Megaphone className="h-16 w-16 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-700">{t('noNotices')}</h3>
            </div>
          ) : (
            notices.map(n => (
              <div key={n.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="mt-1 rounded-xl bg-pink-100 p-2.5 text-pink-600">
                    <Megaphone className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-slate-800">{locale === 'bn' ? (n.title_bn || n.title) : n.title}</h3>
                    {(n.body || n.body_bn) && <p className="mt-2 text-sm leading-relaxed text-slate-600">{locale === 'bn' ? (n.body_bn || n.body) : n.body}</p>}
                    {n.published_at && (
                      <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3.5 w-3.5" /> {new Date(n.published_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}