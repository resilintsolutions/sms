'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  FileBarChart,
  CalendarCheck,
  DollarSign,
  ClipboardList,
  GraduationCap,
  ArrowRight,
  TrendingUp,
  Users,
  Award,
} from 'lucide-react';

type SectionItem = { id: number; name: string; class_id: number; class?: { name: string } };
type ClassItem = { id: number; name: string; sections?: SectionItem[] };
type ExamTerm = { id: number; name: string };
type SubjectAvg = { subject_id: number; name: string; average: number; highest: number; lowest: number };
type StudentResult = { student_id: string; name: string; roll_no: number; total_marks: number; gpa?: number; letter_grade?: string; position?: number; subject_marks: { subject_id: number; marks_obtained?: number; full_marks?: number }[] };
type Subject = { id: number; name: string };

export default function AdminReportsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const { hasRole, loading: authLoading } = useAuth();
  const t = useTranslations('reports');
  const tCommon = useTranslations('common');
  const isAdmin = hasRole('admin', 'super_admin');

  const [activeTab, setActiveTab] = useState<'overview' | 'exam'>('overview');
  const [sectionId, setSectionId] = useState<number | ''>('');
  const [examTermId, setExamTermId] = useState<number | ''>('');
  const [examResults, setExamResults] = useState<{ subjects: Subject[]; students: StudentResult[]; subject_averages: SubjectAvg[]; total_students: number } | null>(null);
  const [loadingExam, setLoadingExam] = useState(false);

  // Only fetch when auth is ready (prevents 401 race conditions)
  const { data: classesData, isLoading: classesLoading, isError: classesError } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api<ClassItem[]>('/classes'),
    enabled: !authLoading,
    retry: false,
  });
  // Backend returns { success, data: ClassItem[] }
  const classesRaw = classesData as { success?: boolean; data?: ClassItem[] } | undefined;
  const classes: ClassItem[] = Array.isArray(classesRaw?.data) ? classesRaw!.data : [];
  const sections = classes.flatMap((c) => (c.sections ?? []).map((s) => ({ ...s, className: c.name })));

  const { data: examData, isLoading: examsLoading, isError: examsError } = useQuery({
    queryKey: ['exam-terms'],
    queryFn: () => api<ExamTerm[]>('/exam-terms'),
    enabled: !authLoading,
    retry: false,
  });
  // Backend returns paginated: { success, data: { data: ExamTerm[], ... } } OR flat: { success, data: ExamTerm[] }
  const examsRaw = examData as { success?: boolean; data?: ExamTerm[] | { data?: ExamTerm[] } } | undefined;
  const examTerms: ExamTerm[] = Array.isArray(examsRaw?.data)
    ? examsRaw!.data as ExamTerm[]
    : Array.isArray((examsRaw?.data as { data?: ExamTerm[] })?.data)
      ? (examsRaw!.data as { data: ExamTerm[] }).data
      : [];

  const fetchExamResults = async () => {
    if (!sectionId || !examTermId) { toast.error(t('pleaseSelectSectionAndExam')); return; }
    setLoadingExam(true);
    try {
      const res = await api<{ subjects: Subject[]; students: StudentResult[]; subject_averages: SubjectAvg[]; total_students: number }>(
        `/reports/teacher/section-results?section_id=${sectionId}&exam_term_id=${examTermId}`
      );
      if (res.success && res.data) {
        setExamResults(res.data);
        toast.success(t('examResultsLoaded'));
      } else {
        toast.error(t('failedToLoadResults'));
      }
    } catch { toast.error(t('failedToLoadResults')); }
    setLoadingExam(false);
  };

  const tabs = [
    { id: 'overview' as const, label: t('reportCenter'), icon: FileBarChart },
    { id: 'exam' as const, label: t('examResultsReport'), icon: Award },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">{t('reportsHeading')}</h2>

      {/* Loading / Error states */}
      {(classesLoading || examsLoading) && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
          {t('loadingReportData')}
        </div>
      )}
      {(classesError || examsError) && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {t('failedToLoadReportData')}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === id ? 'border-b-2 border-blue-600 bg-white text-blue-600' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link href={`/${locale}/admin/attendance?report=1`} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
                <CalendarCheck className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 group-hover:text-emerald-700">{t('attendanceReport')}</h3>
                <p className="mt-1 text-sm text-slate-500">{t('attendanceReportDesc')}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-500" />
            </div>
            <div className="mt-4 flex gap-3">
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600">{t('pdf')}</span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600">{t('csv')}</span>
            </div>
          </Link>

          <Link href={`/${locale}/admin/fees?report=1`} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-amber-300 hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-amber-100 p-3 text-amber-600">
                <DollarSign className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 group-hover:text-amber-700">{t('feeCollectionReport')}</h3>
                <p className="mt-1 text-sm text-slate-500">{t('feeCollectionDesc')}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-amber-500" />
            </div>
            <div className="mt-4 flex gap-3">
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600">{t('pdf')}</span>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600">{t('csv')}</span>
            </div>
          </Link>

          {isAdmin && (
            <Link href={`/${locale}/admin/students`} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
                  <GraduationCap className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 group-hover:text-blue-700">{t('studentDirectory')}</h3>
                  <p className="mt-1 text-sm text-slate-500">{t('studentDirectoryDesc')}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-500" />
              </div>
            </Link>
          )}

          {isAdmin && (
            <Link href={`/${locale}/admin/exams`} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-violet-300 hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-violet-100 p-3 text-violet-600">
                  <ClipboardList className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 group-hover:text-violet-700">{t('examManagement')}</h3>
                  <p className="mt-1 text-sm text-slate-500">{t('examManagementDesc')}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-violet-500" />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Exam Results Tab */}
      {activeTab === 'exam' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <Award className="h-5 w-5 text-violet-500" /> {t('sectionWiseExamResults')}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{t('sectionWiseExamResultsDesc')}</p>

            <div className="mt-4 flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">{t('section')}</label>
                <select value={sectionId} onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : '')} className="input mt-1 min-w-[200px]">
                  <option value="">{t('selectSection')}</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>{t('classPrefix')}{s.className} - {s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">{t('examTerm')}</label>
                <select value={examTermId} onChange={(e) => setExamTermId(e.target.value ? Number(e.target.value) : '')} className="input mt-1 min-w-[200px]">
                  <option value="">{t('selectExam')}</option>
                  {examTerms.map((et) => (
                    <option key={et.id} value={et.id}>{et.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button type="button" onClick={fetchExamResults} disabled={loadingExam} className="btn btn-primary">
                  {loadingExam ? tCommon('loading') : t('generateReport')}
                </button>
              </div>
            </div>
          </div>

          {examResults && (
            <>
              {/* Subject Averages */}
              {examResults.subject_averages.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="flex items-center gap-2 font-semibold text-slate-800">
                    <TrendingUp className="h-5 w-5 text-blue-500" /> {t('subjectStatistics')}
                  </h4>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {examResults.subject_averages.map((sa) => (
                      <div key={sa.subject_id} className="rounded-xl bg-slate-50 px-4 py-3">
                        <p className="font-medium text-slate-700">{sa.name}</p>
                        <div className="mt-1 flex gap-4 text-sm">
                          <span className="text-blue-600">{t('avg')}<strong>{sa.average}</strong></span>
                          <span className="text-emerald-600">{t('high')}<strong>{sa.highest}</strong></span>
                          <span className="text-red-600">{t('low')}<strong>{sa.lowest}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Results Table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h4 className="flex items-center gap-2 font-semibold text-slate-800">
                    <Users className="h-5 w-5 text-violet-500" /> {t('studentResults')} ({examResults.total_students}{t('students')})
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="table-header">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">{t('roll')}</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">{t('student')}</th>
                        {examResults.subjects.map((s) => (
                          <th key={s.id} className="px-3 py-3 text-center text-sm font-semibold">{s.name}</th>
                        ))}
                        <th className="px-4 py-3 text-center text-sm font-semibold">{t('total')}</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">{t('gpa')}</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">{t('grade')}</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">{t('pos')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {examResults.students.map((st) => (
                        <tr key={st.student_id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-sm">{st.roll_no}</td>
                          <td className="px-4 py-2.5 text-sm font-medium text-slate-700">{st.name}</td>
                          {st.subject_marks.map((sm, i) => (
                            <td key={i} className="px-3 py-2.5 text-center text-sm">
                              {sm.marks_obtained != null ? (
                                <span className={sm.full_marks && sm.marks_obtained < (sm.full_marks * 0.33) ? 'text-red-600 font-semibold' : ''}>
                                  {sm.marks_obtained}
                                </span>
                              ) : '—'}
                            </td>
                          ))}
                          <td className="px-4 py-2.5 text-center text-sm font-semibold">{st.total_marks}</td>
                          <td className="px-4 py-2.5 text-center text-sm">{st.gpa != null ? Number(st.gpa).toFixed(2) : '—'}</td>
                          <td className="px-4 py-2.5 text-center">
                            {st.letter_grade && (
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                st.letter_grade.startsWith('A') ? 'bg-emerald-100 text-emerald-700' :
                                st.letter_grade.startsWith('B') ? 'bg-blue-100 text-blue-700' :
                                st.letter_grade.startsWith('C') ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>{st.letter_grade}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center text-sm">{st.position ?? '—'}</td>
                        </tr>
                      ))}
                      {examResults.students.length === 0 && (
                        <tr><td colSpan={examResults.subjects.length + 6} className="px-4 py-8 text-center text-slate-500">{t('noResultsFound')}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
