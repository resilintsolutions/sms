'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslations } from 'next-intl';
import {
  User,
  Calendar,
  CalendarCheck,
  Award,
  Wallet,
  Megaphone,
  BookOpen,
  ClipboardList,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Phone,
  Mail,
  MapPin,
  Heart,
  Users,
  GraduationCap,
} from 'lucide-react';

type AttendanceSummary = {
  total_days: number;
  present: number;
  absent: number;
  late: number;
  rate: number;
};

type RecentAttendance = { date: string; status: string };

type ResultRow = {
  id?: number;
  exam_term?: { id: number; name: string };
  total_marks: number;
  gpa?: number;
  letter_grade?: string;
  position?: number;
};

type InvoiceRow = {
  id: number;
  invoice_no: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  status: string;
  due_date?: string;
  academic_session?: { name: string };
};

type NoticeRow = {
  id: number;
  title: string;
  title_bn?: string;
  body?: string;
  published_at: string;
};

type GuardianInfo = {
  id: number;
  name: string;
  name_bn?: string;
  phone?: string;
  email?: string;
  relation?: string;
  occupation?: string;
  address?: string;
  nid?: string;
};

type EnrollmentInfo = {
  id: number;
  roll_no?: number;
  section?: {
    id: number;
    name: string;
    class?: { id: number; name: string; numeric_name?: number };
  };
  academic_session?: { id: number; name: string; is_current?: boolean };
};

type AssignmentRow = {
  id: number;
  title: string;
  title_bn?: string;
  type: string;
  total_marks?: number;
  due_date?: string;
  status: string;
  subject?: { id: number; name: string };
  class_model?: { id: number; name: string };
  my_submission?: { id: number; status: string; marks_obtained?: number } | null;
};

type StudentDashData = {
  student: {
    id: number;
    student_id: string;
    name: string;
    name_bn?: string;
    gender?: string;
    photo?: string;
    date_of_birth?: string;
    admission_date?: string;
    status?: string;
    blood_group?: string;
    phone?: string;
    email?: string;
    address?: string;
    religion?: string;
    nationality?: string;
    guardians?: GuardianInfo[];
    enrollments?: EnrollmentInfo[];
  } | null;
  enrollment: {
    class_name: string;
    section_name: string;
    session_name: string;
    roll_no?: number;
  } | null;
  attendance_summary: AttendanceSummary | null;
  recent_attendance: RecentAttendance[];
  recent_results: ResultRow[];
  pending_fees: InvoiceRow[];
  recent_notices: NoticeRow[];
};

export default function StudentPortalPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const { user: authUser } = useAuth();
  const t = useTranslations('student');
  const tc = useTranslations('common');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard/student'],
    queryFn: () => api<StudentDashData>('/dashboard/student'),
  });

  const d = data?.data;
  const student = d?.student;
  const enrollment = d?.enrollment;
  const attendanceSummary = d?.attendance_summary;
  const recentAttendance = d?.recent_attendance ?? [];
  const recentResults = d?.recent_results ?? [];
  const pendingFees = d?.pending_fees ?? [];
  const recentNotices = d?.recent_notices ?? [];
  const totalDue = pendingFees.reduce((sum, f) => sum + Number(f.due_amount ?? 0), 0);
  const guardians = student?.guardians ?? [];
  const currentEnrollment = student?.enrollments?.find((e: EnrollmentInfo) => e.academic_session?.is_current) || student?.enrollments?.[0];

  // Fetch upcoming assignments
  const { data: assignData } = useQuery({
    queryKey: ['portal/student/assignments'],
    queryFn: () => api<AssignmentRow[]>('/portal/student/assignments'),
    enabled: !!student,
  });
  const assignments = (assignData as any)?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <User className="h-20 w-20 text-slate-300" />
        <h2 className="mt-6 text-xl font-bold text-slate-700">{t('profileNotFound')}</h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          {t('profileNotFoundDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 p-6 text-white shadow-lg">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            {student.photo ? (
              <img src={student.photo} alt={student.name} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <User className="h-8 w-8" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{student.name_bn || student.name}</h2>
            <div className="mt-1 flex flex-wrap gap-3 text-sky-100">
              <span className="font-mono text-sm">ID: {student.student_id}</span>
              {enrollment && (
                <>
                  <span className="text-sm">
                    Class {enrollment.class_name} - {enrollment.section_name}
                  </span>
                  {enrollment.roll_no && <span className="text-sm">Roll: {enrollment.roll_no}</span>}
                  <span className="text-sm">{enrollment.session_name}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Complete Profile Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <User className="h-5 w-5 text-blue-500" />
            {t('personalInfo')}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label={t('nameEn')} value={student.name} />
            <InfoRow label={t('nameBn')} value={student.name_bn} />
            <InfoRow label={t('studentIdLabel')} value={student.student_id} />
            <InfoRow label={t('genderLabel')} value={student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : undefined} />
            <InfoRow label={t('dateOfBirth')} value={student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB') : undefined} />
            <InfoRow label={t('admissionDate')} value={student.admission_date ? new Date(student.admission_date).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB') : undefined} />
            <InfoRow label={t('bloodGroup')} value={student.blood_group} icon={<Heart className="h-3.5 w-3.5 text-red-400" />} />
            <InfoRow label={t('religion')} value={student.religion} />
            <InfoRow label={t('nationality')} value={student.nationality} />
            <InfoRow label={t('statusLabel')} value={student.status ? student.status.charAt(0).toUpperCase() + student.status.slice(1) : undefined} />
            {student.phone && <InfoRow label={t('phoneLabel')} value={student.phone} icon={<Phone className="h-3.5 w-3.5 text-emerald-500" />} />}
            {student.email && <InfoRow label={t('emailLabel')} value={student.email} icon={<Mail className="h-3.5 w-3.5 text-blue-500" />} />}
            {student.address && (
              <div className="sm:col-span-2">
                <InfoRow label={t('addressLabel')} value={student.address} icon={<MapPin className="h-3.5 w-3.5 text-amber-500" />} />
              </div>
            )}
          </div>
          {/* Enrollment Info */}
          {currentEnrollment?.section && (
            <div className="mt-4 rounded-xl bg-blue-50 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                <GraduationCap className="h-4 w-4" />
                {t('currentEnrollment')}
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-sm text-blue-600">
                <span>Class {currentEnrollment.section.class?.name} - {currentEnrollment.section.name}</span>
                {currentEnrollment.roll_no && <span>Roll: {currentEnrollment.roll_no}</span>}
                <span>{currentEnrollment.academic_session?.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Guardian Information */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Users className="h-5 w-5 text-purple-500" />
            {t('guardianInfo')}
          </h3>
          {guardians.length > 0 ? (
            <div className="space-y-4">
              {guardians.map((g) => (
                <div key={g.id} className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-800">{g.name_bn || g.name}</p>
                    {g.relation && (
                      <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                        {g.relation}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 grid gap-1.5 text-sm">
                    {g.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="h-3.5 w-3.5 text-slate-400" /> {g.phone}
                      </div>
                    )}
                    {g.email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="h-3.5 w-3.5 text-slate-400" /> {g.email}
                      </div>
                    )}
                    {g.occupation && (
                      <p className="text-slate-500">{t('occupation')}: {g.occupation}</p>
                    )}
                    {g.nid && (
                      <p className="text-slate-500">NID: {g.nid}</p>
                    )}
                    {g.address && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" /> {g.address}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">{t('noGuardianInfo')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Attendance Rate */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className={`rounded-xl p-3 ${
            (attendanceSummary?.rate ?? 0) >= 80
              ? 'bg-emerald-100 text-emerald-600'
              : (attendanceSummary?.rate ?? 0) >= 60
              ? 'bg-amber-100 text-amber-600'
              : 'bg-red-100 text-red-600'
          }`}>
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t('attendanceRate')}</p>
            <p className="text-2xl font-bold text-slate-800">{attendanceSummary?.rate ?? 0}%</p>
            <p className="text-xs text-slate-400">{t('schoolDays', { count: attendanceSummary?.total_days ?? 0 })}</p>
          </div>
        </div>

        {/* Present Days */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t('presentDays')}</p>
            <p className="text-2xl font-bold text-emerald-700">{attendanceSummary?.present ?? 0}</p>
            <p className="text-xs text-slate-400">
              {attendanceSummary?.late ?? 0} {t('attendanceRate').includes('হার') ? 'দেরি' : 'late'}
            </p>
          </div>
        </div>

        {/* Absent Days */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-red-100 p-3 text-red-600">
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t('absentDays')}</p>
            <p className="text-2xl font-bold text-red-700">{attendanceSummary?.absent ?? 0}</p>
            <p className="text-xs text-slate-400">{t('daysMissed')}</p>
          </div>
        </div>

        {/* Pending Fees */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className={`rounded-xl p-3 ${totalDue > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t('feesDue')}</p>
            <p className={`text-2xl font-bold ${totalDue > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              ৳ {Number(totalDue).toLocaleString('bn-BD')}
            </p>
            <p className="text-xs text-slate-400">{pendingFees.length} {t('pending')}</p>
          </div>
        </div>
      </div>

      {/* Middle: Recent Attendance + Results */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Attendance */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <CalendarCheck className="h-5 w-5 text-emerald-500" />
            {t('recentAttendance')}
          </h3>
          {recentAttendance.length > 0 ? (
            <div className="space-y-2">
              {recentAttendance.map((a, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">
                      {new Date(a.date).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      a.status === 'present'
                        ? 'bg-emerald-100 text-emerald-700'
                        : a.status === 'late'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarCheck className="h-12 w-12 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">{t('noAttendanceRecords')}</p>
            </div>
          )}
        </div>

        {/* Exam Results */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Award className="h-5 w-5 text-blue-500" />
            {t('examResults')}
          </h3>
          {recentResults.length > 0 ? (
            <div className="space-y-3">
              {recentResults.map((r, i) => (
                <div key={i} className="rounded-xl bg-blue-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-blue-700">{r.exam_term?.name ?? t('exam')}</p>
                    {r.position && (
                      <span className="rounded-full bg-blue-200/60 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        {t('position')}: {r.position}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className="text-slate-600">{t('totalLabel')}: <strong>{r.total_marks}</strong></span>
                    {r.gpa != null && (
                      <span className="text-slate-600">GPA: <strong>{r.gpa.toFixed(2)}</strong></span>
                    )}
                    {r.letter_grade && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.letter_grade.startsWith('A') ? 'bg-emerald-100 text-emerald-700' :
                        r.letter_grade.startsWith('B') ? 'bg-blue-100 text-blue-700' :
                        r.letter_grade.startsWith('C') ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {r.letter_grade}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Award className="h-12 w-12 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">{t('noResultsPublished')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Fees + Assignments + Notices */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pending Fees */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Wallet className="h-5 w-5 text-amber-500" />
            {t('pendingFees')}
          </h3>
          {pendingFees.length > 0 ? (
            <div className="space-y-3">
              {pendingFees.map((inv) => (
                <div key={inv.id} className="rounded-xl bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm font-medium text-slate-700">{inv.invoice_no}</p>
                      {inv.academic_session && (
                        <p className="text-xs text-slate-500">{inv.academic_session.name}</p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        inv.status === 'pending' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className="text-slate-600">{tc('name')}: ৳{Number(inv.total_amount).toLocaleString('bn-BD')}</span>
                    <span className="text-emerald-600">{t('totalLabel')}: ৳{Number(inv.paid_amount).toLocaleString('bn-BD')}</span>
                    <span className="font-semibold text-red-600">{t('feesDue')}: ৳{Number(inv.due_amount).toLocaleString('bn-BD')}</span>
                  </div>
                  {inv.due_date && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      {t('dueBy')}: {new Date(inv.due_date).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB')}
                    </div>
                  )}
                </div>
              ))}
              {totalDue > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {t('contactOffice')}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-12 w-12 text-emerald-300" />
              <p className="mt-2 text-sm text-slate-500">{t('allFeesPaid')}</p>
            </div>
          )}
        </div>

        {/* Upcoming Assignments */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <FileText className="h-5 w-5 text-indigo-500" />
            {t('upcomingAssignments')}
          </h3>
          {assignments.length > 0 ? (
            <div className="space-y-3">
              {assignments.slice(0, 5).map((a: AssignmentRow) => (
                <div key={a.id} className="rounded-xl bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-700">{a.title_bn || a.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      a.type === 'quiz' ? 'bg-purple-100 text-purple-700' :
                      a.type === 'homework' ? 'bg-amber-100 text-amber-700' :
                      a.type === 'project' ? 'bg-teal-100 text-teal-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {a.type}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {a.subject && <span>{a.subject.name}</span>}
                    {a.total_marks && <span>{a.total_marks} marks</span>}
                    {a.due_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(a.due_date).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB')}
                      </span>
                    )}
                  </div>
                  {a.my_submission ? (
                    <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.my_submission.status === 'graded' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {a.my_submission.status === 'graded' ? `${t('graded')}: ${a.my_submission.marks_obtained}/${a.total_marks}` : t('submitted')}
                    </span>
                  ) : (
                    <span className="mt-1.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {t('pendingSubmission')}
                    </span>
                  )}
                </div>
              ))}
              {assignments.length > 5 && (
                <p className="text-center text-sm text-blue-600">+{assignments.length - 5} more</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-12 w-12 text-slate-300" />
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
          {recentNotices.length > 0 ? (
            <ul className="space-y-3">
              {recentNotices.map((notice) => (
                <li key={notice.id} className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="font-medium text-slate-700">{notice.title_bn || notice.title}</p>
                  {notice.body && (
                    <p className="mt-1 text-sm text-slate-600">
                      {notice.body.length > 120 ? notice.body.slice(0, 120) + '...' : notice.body}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(notice.published_at).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB')}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Megaphone className="h-12 w-12 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">{t('noNotices')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="truncate text-sm font-medium text-slate-700">{value || '—'}</p>
      </div>
    </div>
  );
}
