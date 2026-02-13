'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslations } from 'next-intl';
import { Award, BookOpen, CalendarCheck, GraduationCap, User, ChevronDown, ChevronUp, Wallet } from 'lucide-react';

type MarkItem = { subject_name: string; marks_obtained: number; full_marks: number };
type ReportCard = { exam_name: string; marks: MarkItem[]; total_marks: number; gpa?: number; letter_grade?: string; position?: number };
type Child = {
  id: number; student_id: string; name: string; name_bn?: string;
  enrollment: { class_name: string; section_name: string; session_name: string; roll_no?: number } | null;
  report_cards: ReportCard[];
  attendance_summary: { total: number; present: number; rate: number } | null;
  pending_due: number;
};

export default function ParentPerformancePage() {
  const { user } = useAuth();
  const t = useTranslations('parent');
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [expandedChild, setExpandedChild] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['reports/parent/children'],
    queryFn: () => api<{ children: Child[] }>('/reports/parent/children'),
  });

  const children = data?.data?.children ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        {[1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{t('childPerformance')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('childPerformanceDesc')}</p>
      </div>

      {children.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <GraduationCap className="h-16 w-16 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-700">{t('noChildrenPerf')}</h3>
          <p className="mt-2 text-sm text-slate-500">{t('noChildrenPerfDesc')}</p>
        </div>
      ) : (
        children.map((child) => (
          <div key={child.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Child Header */}
            <button
              type="button"
              onClick={() => setExpandedChild(expandedChild === child.id ? null : child.id)}
              className="flex w-full items-center justify-between p-6 text-left hover:bg-slate-50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">{child.name_bn || child.name}</h3>
                  <p className="text-sm text-slate-500">
                    ID: {child.student_id}
                    {child.enrollment && ` • Class ${child.enrollment.class_name} - ${child.enrollment.section_name}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {child.attendance_summary && (
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    child.attendance_summary.rate >= 80 ? 'bg-emerald-100 text-emerald-700' :
                    child.attendance_summary.rate >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>{child.attendance_summary.rate}% {t('attendanceStat')}</span>
                )}
                {child.report_cards.length > 0 && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    {child.report_cards.length === 1 ? t('examsCount', { count: child.report_cards.length }) : t('examsCountPlural', { count: child.report_cards.length })}
                  </span>
                )}
                {expandedChild === child.id ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
              </div>
            </button>

            {/* Expanded Content */}
            {expandedChild === child.id && (
              <div className="border-t border-slate-200 p-6">
                {/* Quick Stats */}
                <div className="mb-6 grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4">
                    <CalendarCheck className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="text-sm text-emerald-600">{t('attendanceStat')}</p>
                      <p className="text-lg font-bold text-emerald-700">{child.attendance_summary?.rate ?? 0}%</p>
                      <p className="text-xs text-emerald-500">{child.attendance_summary?.present ?? 0} / {child.attendance_summary?.total ?? 0} days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-4">
                    <Award className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-blue-600">{t('latestGPA')}</p>
                      <p className="text-lg font-bold text-blue-700">
                        {child.report_cards.length > 0 && child.report_cards[child.report_cards.length - 1].gpa != null
                          ? child.report_cards[child.report_cards.length - 1].gpa!.toFixed(2)
                          : '—'}
                      </p>
                      <p className="text-xs text-blue-500">
                        {child.report_cards.length > 0 ? child.report_cards[child.report_cards.length - 1].letter_grade ?? '' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4">
                    <Wallet className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm text-amber-600">{t('pendingFeesStat')}</p>
                      <p className="text-lg font-bold text-amber-700">৳ {Number(child.pending_due).toLocaleString('bn-BD')}</p>
                    </div>
                  </div>
                </div>

                {/* Report Cards */}
                {child.report_cards.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('noExamResults')}</p>
                ) : (
                  <div className="space-y-4">
                    {child.report_cards.map((rc, rcIdx) => (
                      <div key={rcIdx} className="rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                          <h4 className="font-semibold text-slate-700">{rc.exam_name}</h4>
                          <div className="flex gap-3 text-sm">
                            <span className="text-slate-600">Total: <strong>{rc.total_marks}</strong></span>
                            {rc.gpa != null && <span className="text-blue-600">GPA: <strong>{rc.gpa.toFixed(2)}</strong></span>}
                            {rc.letter_grade && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              rc.letter_grade.startsWith('A') ? 'bg-emerald-100 text-emerald-700' :
                              rc.letter_grade.startsWith('B') ? 'bg-blue-100 text-blue-700' :
                              rc.letter_grade.startsWith('C') ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>{rc.letter_grade}</span>}
                            {rc.position && <span className="text-violet-600">Position: <strong>{rc.position}</strong></span>}
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-100">
                                <th className="px-4 py-2 text-left font-medium text-slate-600">{t('subjectCol')}</th>
                                <th className="px-4 py-2 text-center font-medium text-slate-600">{t('obtained')}</th>
                                <th className="px-4 py-2 text-center font-medium text-slate-600">{t('fullMarksCol')}</th>
                                <th className="px-4 py-2 text-center font-medium text-slate-600">{t('percentCol')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {rc.marks.map((m, mi) => (
                                <tr key={mi}>
                                  <td className="px-4 py-2 flex items-center gap-2"><BookOpen className="h-3.5 w-3.5 text-slate-400" /> {m.subject_name}</td>
                                  <td className={`px-4 py-2 text-center font-semibold ${m.full_marks && m.marks_obtained < m.full_marks * 0.33 ? 'text-red-600' : ''}`}>{m.marks_obtained}</td>
                                  <td className="px-4 py-2 text-center text-slate-500">{m.full_marks}</td>
                                  <td className="px-4 py-2 text-center">{m.full_marks > 0 ? ((m.marks_obtained / m.full_marks) * 100).toFixed(0) : 0}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
