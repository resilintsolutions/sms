'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';
import {
  FileBarChart,
  CalendarCheck,
  Award,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

type Assignment = { id: number; section?: { id: number; name: string; class?: { name: string } }; subject?: { name: string }; academic_session?: { name: string } };
type ExamTerm = { id: number; name: string };
type Subject = { id: number; name: string };
type SubjectAvg = { subject_id: number; name: string; average: number; highest: number; lowest: number };
type StudentResult = { student_id: string; name: string; roll_no: number; total_marks: number; gpa?: number; letter_grade?: string; position?: number; subject_marks: { subject_id: number; marks_obtained?: number; full_marks?: number }[] };
type StudentAtt = { student_id: string; name: string; roll_no: number; total: number; present: number; absent: number; late: number; leave: number; rate: number };
type DailyAtt = { date: string; present: number; absent: number; late: number; leave: number; total: number };

export default function TeacherReportsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const t = useTranslations('teacher');

  const [activeTab, setActiveTab] = useState<'attendance' | 'results'>('attendance');
  const [sectionId, setSectionId] = useState<number | ''>('');
  const [examTermId, setExamTermId] = useState<number | ''>('');
  const [fromDate, setFromDate] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Attendance report data
  const [attData, setAttData] = useState<{ students: StudentAtt[]; daily_summary: DailyAtt[]; total_students: number } | null>(null);
  const [loadingAtt, setLoadingAtt] = useState(false);

  // Results report data
  const [resultsData, setResultsData] = useState<{ subjects: Subject[]; students: StudentResult[]; subject_averages: SubjectAvg[]; total_students: number } | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // Get teacher's assignments to populate section dropdown
  const { data: dashData } = useQuery({
    queryKey: ['dashboard/teacher'],
    queryFn: () => api<{ assignments: Assignment[] }>('/dashboard/teacher'),
  });
  const assignments = dashData?.data?.assignments ?? [];
  const uniqueSections = assignments.filter((a, i, arr) => arr.findIndex((x) => x.section?.id === a.section?.id) === i).map((a) => a.section).filter(Boolean);

  // Exam terms
  const { data: examData } = useQuery({ queryKey: ['exam-terms'], queryFn: () => api<{ data: ExamTerm[] }>('/exam-terms') });
  const examTermsPl = (examData as { data?: ExamTerm[] | { data?: ExamTerm[] } })?.data;
  const examTerms: ExamTerm[] = Array.isArray(examTermsPl) ? examTermsPl : (examTermsPl as { data?: ExamTerm[] })?.data ?? [];

  const fetchAttendance = async () => {
    if (!sectionId) { toast.error(t('selectSectionError')); return; }
    setLoadingAtt(true);
    try {
      const res = await api<{ students: StudentAtt[]; daily_summary: DailyAtt[]; total_students: number }>(
        `/reports/teacher/section-attendance?section_id=${sectionId}&from_date=${fromDate}&to_date=${toDate}`
      );
      if (res.success && res.data) { setAttData(res.data); toast.success(t('attendanceLoaded')); }
      else toast.error(t('failedToLoad'));
    } catch { toast.error(t('failedToLoad')); }
    setLoadingAtt(false);
  };

  const fetchResults = async () => {
    if (!sectionId || !examTermId) { toast.error(t('selectSectionExamError')); return; }
    setLoadingResults(true);
    try {
      const res = await api<{ subjects: Subject[]; students: StudentResult[]; subject_averages: SubjectAvg[]; total_students: number }>(
        `/reports/teacher/section-results?section_id=${sectionId}&exam_term_id=${examTermId}`
      );
      if (res.success && res.data) { setResultsData(res.data); toast.success(t('resultsLoaded')); }
      else toast.error(t('failedToLoad'));
    } catch { toast.error(t('failedToLoad')); }
    setLoadingResults(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">{t('reportsTitle')}</h2>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button type="button" onClick={() => setActiveTab('attendance')} className={`flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium ${activeTab === 'attendance' ? 'border-b-2 border-emerald-600 bg-white text-emerald-600' : 'text-slate-600 hover:bg-slate-50'}`}>
          <CalendarCheck className="h-4 w-4" /> {t('attendanceReport')}
        </button>
        <button type="button" onClick={() => setActiveTab('results')} className={`flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium ${activeTab === 'results' ? 'border-b-2 border-blue-600 bg-white text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}>
          <Award className="h-4 w-4" /> {t('examResults')}
        </button>
      </div>

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <CalendarCheck className="h-5 w-5 text-emerald-500" /> {t('sectionAttendanceReport')}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{t('sectionAttendanceDesc')}</p>

            <div className="mt-4 flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">{t('sectionLabel')}</label>
                <select value={sectionId} onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : '')} className="input mt-1 min-w-[200px]">
                  <option value="">{t('selectSection')}</option>
                  {uniqueSections.map((s) => s && (
                    <option key={s.id} value={s.id}>Class {s.class?.name} - {s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">{t('fromLabel')}</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input mt-1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">{t('toLabel')}</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input mt-1" />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={fetchAttendance} disabled={loadingAtt} className="btn btn-primary">
                  {loadingAtt ? t('loadingText') : t('generate')}
                </button>
              </div>
            </div>
          </div>

          {attData && (
            <>
              {/* Student Summary Table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h4 className="flex items-center gap-2 font-semibold text-slate-800">
                    <Users className="h-5 w-5 text-emerald-500" /> {t('studentAttendance')} ({attData.total_students} {t('students')})
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="table-header">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">{t('roll')}</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">{t('student')}</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">{t('days')}</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">{t('present')}</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">{t('absent')}</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">{t('late')}</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">{t('rate')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attData.students.map((st) => (
                        <tr key={st.student_id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-sm">{st.roll_no}</td>
                          <td className="px-4 py-2.5 text-sm font-medium text-slate-700">{st.name}</td>
                          <td className="px-4 py-2.5 text-center text-sm">{st.total}</td>
                          <td className="px-4 py-2.5 text-center text-sm text-emerald-600 font-semibold">{st.present}</td>
                          <td className="px-4 py-2.5 text-center text-sm text-red-600 font-semibold">{st.absent}</td>
                          <td className="px-4 py-2.5 text-center text-sm text-amber-600">{st.late}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              st.rate >= 80 ? 'bg-emerald-100 text-emerald-700' :
                              st.rate >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>{st.rate}%</span>
                          </td>
                        </tr>
                      ))}
                      {attData.students.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">{t('noDataForPeriod')}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Daily Summary */}
              {attData.daily_summary.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
                    <FileBarChart className="h-5 w-5 text-blue-500" /> {t('dailySummary')}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600">{t('date')}</th>
                          <th className="px-4 py-2 text-center text-sm font-semibold text-slate-600">{t('present')}</th>
                          <th className="px-4 py-2 text-center text-sm font-semibold text-slate-600">{t('absent')}</th>
                          <th className="px-4 py-2 text-center text-sm font-semibold text-slate-600">{t('late')}</th>
                          <th className="px-4 py-2 text-center text-sm font-semibold text-slate-600">{t('total')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attData.daily_summary.map((day) => (
                          <tr key={day.date} className="hover:bg-slate-50">
                            <td className="px-4 py-2 text-sm">{new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                            <td className="px-4 py-2 text-center text-sm text-emerald-600 font-semibold">{day.present}</td>
                            <td className="px-4 py-2 text-center text-sm text-red-600 font-semibold">{day.absent}</td>
                            <td className="px-4 py-2 text-center text-sm text-amber-600">{day.late}</td>
                            <td className="px-4 py-2 text-center text-sm">{day.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <Award className="h-5 w-5 text-blue-500" /> {t('sectionExamResults')}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{t('sectionResultsDesc')}</p>

            <div className="mt-4 flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">{t('sectionLabel')}</label>
                <select value={sectionId} onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : '')} className="input mt-1 min-w-[200px]">
                  <option value="">{t('selectSection')}</option>
                  {uniqueSections.map((s) => s && (
                    <option key={s.id} value={s.id}>Class {s.class?.name} - {s.name}</option>
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
                <button type="button" onClick={fetchResults} disabled={loadingResults} className="btn btn-primary">
                  {loadingResults ? t('loadingText') : t('generate')}
                </button>
              </div>
            </div>
          </div>

          {resultsData && (
            <>
              {/* Subject Statistics */}
              {resultsData.subject_averages.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
                    <TrendingUp className="h-5 w-5 text-blue-500" /> {t('subjectStatistics')}
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {resultsData.subject_averages.map((sa) => (
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
                    <Users className="h-5 w-5 text-blue-500" /> {t('studentResults')} ({resultsData.total_students} {t('students')})
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="table-header">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Roll</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Student</th>
                        {resultsData.subjects.map((s) => (
                          <th key={s.id} className="px-3 py-3 text-center text-sm font-semibold">{s.name}</th>
                        ))}
                        <th className="px-4 py-3 text-center text-sm font-semibold">{t('total')}</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">{t('gpa')}</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">{t('grade')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {resultsData.students.map((st) => (
                        <tr key={st.student_id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-sm">{st.roll_no}</td>
                          <td className="px-4 py-2.5 text-sm font-medium text-slate-700">{st.name}</td>
                          {st.subject_marks.map((sm, i) => (
                            <td key={i} className="px-3 py-2.5 text-center text-sm">
                              {sm.marks_obtained != null ? (
                                <span className={sm.full_marks && sm.marks_obtained < (sm.full_marks * 0.33) ? 'text-red-600 font-semibold' : ''}>{sm.marks_obtained}</span>
                              ) : '—'}
                            </td>
                          ))}
                          <td className="px-4 py-2.5 text-center text-sm font-bold">{st.total_marks}</td>
                          <td className="px-4 py-2.5 text-center text-sm">{st.gpa?.toFixed(2) ?? '—'}</td>
                          <td className="px-4 py-2.5 text-center">
                            {st.letter_grade && (
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                st.letter_grade.startsWith('A') ? 'bg-emerald-100 text-emerald-700' :
                                st.letter_grade.startsWith('B') ? 'bg-blue-100 text-blue-700' :
                                st.letter_grade.startsWith('C') ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                              }`}>{st.letter_grade}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {resultsData.students.length === 0 && (
                        <tr><td colSpan={resultsData.subjects.length + 5} className="px-4 py-8 text-center text-slate-500">{t('noResultsFound')}</td></tr>
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
