'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslations } from 'next-intl';
import {
  BookOpen,
  ClipboardList,
  Users,
  GraduationCap,
  CalendarCheck,
  Megaphone,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Award,
  Clock,
} from 'lucide-react';

type Assignment = {
  id: number;
  section?: { id: number; name: string; class?: { name: string } };
  subject?: { name: string };
  academic_session?: { name: string };
  is_class_teacher?: boolean;
};

type TeacherDashData = {
  employee: {
    id: number;
    name: string;
    name_bn?: string;
    designation: string;
    department: string;
    employee_id: string;
  } | null;
  assignments: Assignment[];
  total_sections: number;
  total_subjects: number;
  total_students: number;
  class_teacher_of: { section_id: number; section_name: string; class_name: string } | null;
  attendance_marked_today: boolean;
  pending_marks: { exam_name: string; subject: string; section: string; start_date: string }[];
  recent_notices: { id: number; title: string; title_bn?: string; published_at: string }[];
};

export default function TeacherDashboard() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const { user } = useAuth();
  const t = useTranslations('teacher');
  const tc = useTranslations('common');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard/teacher'],
    queryFn: () => api<TeacherDashData>('/dashboard/teacher'),
  });

  const d = data?.data;
  const employee = d?.employee;
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header / Welcome */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold">
          {t('welcome', { name: employee?.name_bn || employee?.name || user?.name || '' })}
        </h2>
        <p className="mt-1 text-emerald-100">{today}</p>
        {employee && (
          <div className="mt-3 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm">
              {employee.designation}
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm">
              {employee.department}
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-mono">
              ID: {employee.employee_id}
            </span>
            {d?.class_teacher_of && (
              <span className="rounded-full bg-yellow-400/30 px-3 py-1 text-sm font-semibold">
                {t('classTeacher', { class: d.class_teacher_of.class_name, section: d.class_teacher_of.section_name })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t('mySections')}</p>
            <p className="text-2xl font-bold text-slate-800">{d?.total_sections ?? 0}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-violet-100 p-3 text-violet-600">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t('mySubjects')}</p>
            <p className="text-2xl font-bold text-slate-800">{d?.total_subjects ?? 0}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t('totalStudents')}</p>
            <p className="text-2xl font-bold text-slate-800">{d?.total_students ?? 0}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className={`rounded-xl p-3 ${d?.attendance_marked_today ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t('todaysAttendance')}</p>
            <p className={`text-sm font-semibold ${d?.attendance_marked_today ? 'text-emerald-600' : 'text-amber-600'}`}>
              {d?.attendance_marked_today ? t('marked') : t('notYet')}
            </p>
          </div>
        </div>
      </div>

      {/* Middle: Pending Marks + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Marks */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              {t('pendingMarksEntry')}
            </h3>
            <Link
              href={`/${locale}/teacher/marks`}
              className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              {t('enterMarks')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {d?.pending_marks && d.pending_marks.length > 0 ? (
            <ul className="space-y-3">
              {d.pending_marks.map((pm, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-700">{pm.exam_name}</p>
                    <p className="text-sm text-slate-600">
                      {pm.subject} — {pm.section}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-12 w-12 text-emerald-300" />
              <p className="mt-2 text-sm text-slate-500">{t('allMarksUpToDate')}</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Award className="h-5 w-5 text-emerald-500" />
            {t('quickActions')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/${locale}/teacher/attendance`}
              className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-600 transition-all hover:bg-emerald-100"
            >
              <CalendarCheck className="h-5 w-5 shrink-0" />
              {t('takeAttendance')}
            </Link>
            <Link
              href={`/${locale}/teacher/marks`}
              className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-4 text-sm font-medium text-blue-600 transition-all hover:bg-blue-100"
            >
              <ClipboardList className="h-5 w-5 shrink-0" />
              {t('enterMarks')}
            </Link>
            <Link
              href={`/${locale}/teacher/lesson-plans`}
              className="flex items-center gap-3 rounded-xl bg-violet-50 px-4 py-4 text-sm font-medium text-violet-600 transition-all hover:bg-violet-100"
            >
              <BookOpen className="h-5 w-5 shrink-0" />
              {t('lessonPlans')}
            </Link>
            <Link
              href={`/${locale}/teacher/upload`}
              className="flex items-center gap-3 rounded-xl bg-pink-50 px-4 py-4 text-sm font-medium text-pink-600 transition-all hover:bg-pink-100"
            >
              <Award className="h-5 w-5 shrink-0" />
              {t('uploadContent')}
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom: Assignments Table + Notices */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Assignments Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Users className="h-5 w-5 text-blue-500" />
            {t('myAssignments')}
          </h3>
          {d?.assignments && d.assignments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-2.5 text-left text-sm font-semibold text-slate-600">{t('classSection')}</th>
                    <th className="px-4 py-2.5 text-left text-sm font-semibold text-slate-600">{t('subject')}</th>
                    <th className="px-4 py-2.5 text-left text-sm font-semibold text-slate-600">{t('session')}</th>
                    <th className="px-4 py-2.5 text-left text-sm font-semibold text-slate-600">{t('role')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {d.assignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-sm text-slate-700">
                        Class {a.section?.class?.name} - {a.section?.name}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-700">{a.subject?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-500">{a.academic_session?.name ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        {a.is_class_teacher ? (
                          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">{t('classTeacherRole')}</span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{t('subjectTeacher')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">{t('noAssignments')}</p>
            </div>
          )}
        </div>

        {/* Notices */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Megaphone className="h-5 w-5 text-pink-500" />
            {t('notices')}
          </h3>
          {d?.recent_notices && d.recent_notices.length > 0 ? (
            <ul className="space-y-3">
              {d.recent_notices.map((notice) => (
                <li key={notice.id} className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="font-medium text-slate-700 text-sm">{notice.title_bn || notice.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(notice.published_at).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB')}
                  </p>
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
