'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  BookOpen,
  Filter,
  ChevronDown,
  ChevronUp,
  Award,
  AlertTriangle,
} from 'lucide-react';

type AssignmentRow = {
  id: number;
  title: string;
  title_bn?: string;
  description?: string;
  type: string;
  total_marks?: number;
  due_date?: string;
  start_time?: string;
  end_time?: string;
  status: string;
  scope: string;
  subject?: { id: number; name: string; name_bn?: string };
  class_model?: { id: number; name: string };
  section?: { id: number; name: string };
  creator?: { id: number; name: string };
  my_submission?: {
    id: number;
    status: string;
    marks_obtained?: number;
    feedback?: string;
    answer?: string;
    submitted_at?: string;
    graded_at?: string;
  } | null;
};

export default function StudentAssignmentsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const t = useTranslations('student');
  const tc = useTranslations('common');
  const qc = useQueryClient();

  const [typeFilter, setTypeFilter] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [submitText, setSubmitText] = useState('');
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['portal/student/assignments'],
    queryFn: () => api<AssignmentRow[]>('/portal/student/assignments'),
  });

  const assignments: AssignmentRow[] = (data as any)?.data ?? [];

  const submitMut = useMutation({
    mutationFn: ({ id, answer }: { id: number; answer: string }) =>
      api(`/portal/student/assignments/${id}/submit`, { method: 'POST', body: JSON.stringify({ answer }) }),
    onSuccess: () => {
      toast.success(t('submissionSuccess'));
      setSubmitText('');
      setSubmittingId(null);
      qc.invalidateQueries({ queryKey: ['portal/student/assignments'] });
    },
    onError: () => toast.error(t('submissionFailed')),
  });

  const filtered = assignments.filter((a) => !typeFilter || a.type === typeFilter);

  const typeCounts: Record<string, number> = {};
  assignments.forEach((a) => { typeCounts[a.type] = (typeCounts[a.type] || 0) + 1; });

  const submittedCount = assignments.filter((a) => a.my_submission).length;
  const pendingCount = assignments.filter((a) => !a.my_submission && a.status === 'published').length;
  const gradedCount = assignments.filter((a) => a.my_submission?.status === 'graded').length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-xl bg-slate-200" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{t('assignmentsTitle')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('assignmentsDesc')}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={<FileText className="h-5 w-5" />} label={t('totalAssignments')} value={assignments.length} color="blue" />
        <SummaryCard icon={<AlertTriangle className="h-5 w-5" />} label={t('pendingLabel')} value={pendingCount} color="amber" />
        <SummaryCard icon={<Send className="h-5 w-5" />} label={t('submittedLabel')} value={submittedCount} color="emerald" />
        <SummaryCard icon={<Award className="h-5 w-5" />} label={t('gradedLabel')} value={gradedCount} color="purple" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Filter className="h-4 w-4" />
          {t('filterByType')}:
        </div>
        <button
          onClick={() => setTypeFilter('')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${!typeFilter ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          All ({assignments.length})
        </button>
        {Object.entries(typeCounts).map(([type, count]) => (
          <button
            key={type}
            onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${typeFilter === type ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {type} ({count})
          </button>
        ))}
      </div>

      {/* Assignment List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <BookOpen className="h-16 w-16 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-600">{t('noAssignments')}</h3>
          <p className="mt-1 text-sm text-slate-400">{t('noAssignmentsDesc')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => {
            const isExpanded = expandedId === a.id;
            const isOverdue = a.due_date && new Date(a.due_date) < new Date() && !a.my_submission;
            const submitted = !!a.my_submission;
            const graded = a.my_submission?.status === 'graded';

            return (
              <div key={a.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                {/* Assignment Header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  className="flex w-full items-center justify-between p-5 text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-0.5 rounded-xl p-2.5 ${
                      a.type === 'quiz' ? 'bg-purple-100 text-purple-600' :
                      a.type === 'homework' ? 'bg-amber-100 text-amber-600' :
                      a.type === 'project' ? 'bg-teal-100 text-teal-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-800">
                        {locale === 'bn' ? (a.title_bn || a.title) : a.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          a.type === 'quiz' ? 'bg-purple-100 text-purple-700' :
                          a.type === 'homework' ? 'bg-amber-100 text-amber-700' :
                          a.type === 'project' ? 'bg-teal-100 text-teal-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {a.type}
                        </span>
                        {a.subject && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {locale === 'bn' ? (a.subject.name_bn || a.subject.name) : a.subject.name}
                          </span>
                        )}
                        {a.total_marks && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {a.total_marks} marks
                          </span>
                        )}
                        {a.due_date && (
                          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            <Clock className="h-3 w-3" />
                            {new Date(a.due_date).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {graded ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <Award className="h-3.5 w-3.5" />
                        {a.my_submission?.marks_obtained}/{a.total_marks}
                      </span>
                    ) : submitted ? (
                      <span className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        <CheckCircle className="h-3.5 w-3.5" />
                        {t('submitted')}
                      </span>
                    ) : isOverdue ? (
                      <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                        <XCircle className="h-3.5 w-3.5" />
                        {t('overdue')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        <Clock className="h-3.5 w-3.5" />
                        {t('pendingSubmission')}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-5">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                      {a.due_date && (
                        <div>
                          <p className="text-xs text-slate-400">{t('dueDate')}</p>
                          <p className={`font-medium ${isOverdue && !submitted ? 'text-red-600' : 'text-slate-700'}`}>
                            {new Date(a.due_date).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
                              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </p>
                        </div>
                      )}
                      {a.creator && (
                        <div>
                          <p className="text-xs text-slate-400">{t('assignedBy')}</p>
                          <p className="font-medium text-slate-700">{a.creator.name}</p>
                        </div>
                      )}
                      {a.class_model && (
                        <div>
                          <p className="text-xs text-slate-400">{t('classLabel')}</p>
                          <p className="font-medium text-slate-700">
                            {a.class_model.name}{a.section ? ` - ${a.section.name}` : ''}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-slate-400">{t('scopeLabel')}</p>
                        <p className="font-medium capitalize text-slate-700">{a.scope}</p>
                      </div>
                    </div>

                    {a.description && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-slate-400">{t('descriptionLabel')}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{a.description}</p>
                      </div>
                    )}

                    {/* Submission / Grade Info */}
                    {a.my_submission ? (
                      <div className="mt-4 rounded-xl bg-slate-50 p-4">
                        <h4 className="mb-2 text-sm font-semibold text-slate-700">{t('mySubmission')}</h4>
                        <div className="grid gap-3 sm:grid-cols-2 text-sm">
                          <div>
                            <p className="text-xs text-slate-400">{t('submittedAt')}</p>
                            <p className="font-medium text-slate-700">
                              {a.my_submission.submitted_at
                                ? new Date(a.my_submission.submitted_at).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
                                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                  })
                                : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">{tc('status')}</p>
                            <p className={`font-semibold capitalize ${
                              a.my_submission.status === 'graded' ? 'text-emerald-700' :
                              a.my_submission.status === 'late' ? 'text-amber-700' : 'text-blue-700'
                            }`}>
                              {a.my_submission.status}
                            </p>
                          </div>
                          {graded && (
                            <>
                              <div>
                                <p className="text-xs text-slate-400">{t('marksObtained')}</p>
                                <p className="text-lg font-bold text-emerald-700">
                                  {a.my_submission.marks_obtained} / {a.total_marks}
                                </p>
                              </div>
                              {a.my_submission.feedback && (
                                <div className="sm:col-span-2">
                                  <p className="text-xs text-slate-400">{t('teacherFeedback')}</p>
                                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{a.my_submission.feedback}</p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {a.my_submission.answer && (
                          <div className="mt-3 border-t border-slate-200 pt-3">
                            <p className="text-xs text-slate-400">{t('myAnswer')}</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{a.my_submission.answer}</p>
                          </div>
                        )}
                      </div>
                    ) : a.status === 'published' ? (
                      <div className="mt-4 rounded-xl bg-blue-50 p-4">
                        <h4 className="mb-2 text-sm font-semibold text-blue-700">{t('submitYourAnswer')}</h4>
                        <textarea
                          rows={4}
                          value={submittingId === a.id ? submitText : ''}
                          onFocus={() => setSubmittingId(a.id)}
                          onChange={(e) => { setSubmittingId(a.id); setSubmitText(e.target.value); }}
                          placeholder={t('answerPlaceholder')}
                          className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        <div className="mt-2 flex items-center justify-between">
                          {isOverdue && (
                            <p className="flex items-center gap-1 text-xs text-red-500">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {t('overdueWarning')}
                            </p>
                          )}
                          <button
                            type="button"
                            disabled={submitMut.isPending || (submittingId === a.id && !submitText.trim())}
                            onClick={() => {
                              if (submittingId === a.id && submitText.trim()) {
                                submitMut.mutate({ id: a.id, answer: submitText.trim() });
                              }
                            }}
                            className="ml-auto flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            <Send className="h-4 w-4" />
                            {submitMut.isPending ? tc('loading') : t('submitBtn')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                        {t('assignmentClosed')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    purple: 'bg-purple-100 text-purple-600',
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`rounded-xl p-2.5 ${colorMap[color] || colorMap.blue}`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
