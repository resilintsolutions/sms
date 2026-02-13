'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';
import {
  BookOpen, User, Clock, CheckCircle, XCircle, AlertTriangle,
  FileText, Award, Filter, Search, Calendar, ChevronDown, ChevronUp,
  ClipboardList, GraduationCap, Pencil
} from 'lucide-react';

/* ── types ── */
type Submission = {
  id: number; status: string; marks_obtained?: number;
  feedback?: string; submitted_at?: string; graded_at?: string;
};
type Assignment = {
  id: number; title: string; title_bn?: string; description?: string;
  type: string; total_marks: number; due_date?: string;
  start_time?: string; end_time?: string; scope: string; status: string;
  class_model?: { id: number; name: string };
  section?: { id: number; name: string } | null;
  subject?: { id: number; name: string; name_bn?: string };
  creator?: { id: number; name: string; name_bn?: string };
  submission?: Submission | null;
  created_at: string;
};
type Child = { id: number; student_id: string; name: string; name_bn?: string; pending_due: number; enrollment: { class_name: string; section_name: string } | null };

const TYPE_STYLES: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
  assignment: { icon: FileText, bg: 'bg-blue-100', text: 'text-blue-700' },
  homework: { icon: Pencil, bg: 'bg-amber-100', text: 'text-amber-700' },
  quiz: { icon: ClipboardList, bg: 'bg-purple-100', text: 'text-purple-700' },
  project: { icon: GraduationCap, bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

function getSubmissionStatus(a: Assignment) {
  if (!a.submission) return 'not_submitted';
  return a.submission.status;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'submitted': return { bg: 'bg-blue-100 text-blue-700', label: 'Submitted' };
    case 'graded': return { bg: 'bg-emerald-100 text-emerald-700', label: 'Graded' };
    case 'late': return { bg: 'bg-amber-100 text-amber-700', label: 'Late' };
    case 'not_submitted': return { bg: 'bg-red-100 text-red-700', label: 'Not Submitted' };
    default: return { bg: 'bg-slate-100 text-slate-700', label: status };
  }
}

function isOverdue(a: Assignment) {
  if (!a.due_date) return false;
  return new Date(a.due_date) < new Date() && !a.submission;
}

export default function ParentAssignmentsPage() {
  const t = useTranslations('parent');
  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  /* ── fetch children ── */
  const { data: parentData, isLoading: loadingParent } = useQuery({
    queryKey: ['dashboard/parent'],
    queryFn: () => api<{ children: Child[] }>('/dashboard/parent'),
  });
  const children: Child[] = (parentData as any)?.data?.children ?? [];

  /* ── fetch assignments ── */
  const { data: assignData, isLoading: loadingAssign } = useQuery({
    queryKey: ['portal/parent/assignments', selectedChild],
    queryFn: () => api<{ data: Assignment[] }>(`/portal/parent/assignments?student_id=${selectedChild}`),
    enabled: !!selectedChild,
  });
  const assignments: Assignment[] = (assignData as any)?.data ?? [];

  /* ── filters ── */
  const filtered = useMemo(() => {
    let list = assignments;
    if (typeFilter !== 'all') list = list.filter(a => a.type === typeFilter);
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') list = list.filter(a => isOverdue(a));
      else list = list.filter(a => getSubmissionStatus(a) === statusFilter);
    }
    if (search) list = list.filter(a => a.title.toLowerCase().includes(search.toLowerCase()) || a.subject?.name?.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [assignments, typeFilter, statusFilter, search]);

  /* ── stats ── */
  const stats = useMemo(() => {
    const total = assignments.length;
    const submitted = assignments.filter(a => a.submission).length;
    const graded = assignments.filter(a => a.submission?.status === 'graded').length;
    const overdue = assignments.filter(a => isOverdue(a)).length;
    const avgMarks = graded > 0 ? Math.round(assignments.filter(a => a.submission?.marks_obtained != null).reduce((s, a) => s + (a.submission!.marks_obtained! / a.total_marks) * 100, 0) / graded) : null;
    return { total, submitted, graded, overdue, avgMarks };
  }, [assignments]);

  if (loadingParent) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        {[1, 2].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{t('assignmentsTitle')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('assignmentsDesc')}</p>
      </div>

      {children.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <User className="h-16 w-16 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-700">{t('noChildrenFound')}</h3>
          <p className="mt-2 text-sm text-slate-500">{t('noChildrenDesc')}</p>
        </div>
      ) : (
        <>
          {/* Child Selector */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children.map(child => (
              <button
                key={child.id}
                type="button"
                onClick={() => { setSelectedChild(child.id); setExpandedId(null); }}
                className={`rounded-2xl border p-5 text-left transition-all ${
                  selectedChild === child.id
                    ? 'border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-200'
                    : 'border-slate-200 bg-white shadow-sm hover:border-amber-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{child.name_bn || child.name}</p>
                    <p className="text-xs text-slate-500">{child.student_id}{child.enrollment ? ` • ${t('classLabel')} ${child.enrollment.class_name}` : ''}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedChild && (
            <>
              {loadingAssign ? (
                <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}</div>
              ) : (
                <div className="space-y-6">
                  {/* Stats */}
                  <div className="grid gap-4 sm:grid-cols-5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                      <p className="text-xs text-slate-500">{t('totalAssignments')}</p>
                      <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                      <p className="text-xs text-slate-500">{t('submitted')}</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.submitted}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                      <p className="text-xs text-slate-500">{t('graded')}</p>
                      <p className="text-2xl font-bold text-emerald-600">{stats.graded}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                      <p className="text-xs text-slate-500">{t('overdue')}</p>
                      <p className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-600' : 'text-slate-800'}`}>{stats.overdue}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                      <p className="text-xs text-slate-500">{t('avgScore')}</p>
                      <p className="text-2xl font-bold text-purple-600">{stats.avgMarks != null ? `${stats.avgMarks}%` : '—'}</p>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder={t('searchAssignments')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      />
                    </div>
                    <select
                      value={typeFilter}
                      onChange={e => setTypeFilter(e.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="all">{t('allTypes')}</option>
                      <option value="assignment">{t('typeAssignment')}</option>
                      <option value="homework">{t('typeHomework')}</option>
                      <option value="quiz">{t('typeQuiz')}</option>
                      <option value="project">{t('typeProject')}</option>
                    </select>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="all">{t('allStatuses')}</option>
                      <option value="not_submitted">{t('notSubmitted')}</option>
                      <option value="submitted">{t('submitted')}</option>
                      <option value="graded">{t('graded')}</option>
                      <option value="overdue">{t('overdue')}</option>
                    </select>
                  </div>

                  {/* Assignment List */}
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
                      <BookOpen className="h-12 w-12 text-slate-300" />
                      <p className="mt-2 text-sm text-slate-500">{t('noAssignments')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filtered.map(a => {
                        const typeStyle = TYPE_STYLES[a.type] ?? TYPE_STYLES.assignment;
                        const TypeIcon = typeStyle.icon;
                        const subStatus = getSubmissionStatus(a);
                        const badge = getStatusBadge(subStatus);
                        const overdue = isOverdue(a);
                        const expanded = expandedId === a.id;

                        return (
                          <div key={a.id} className={`rounded-2xl border bg-white shadow-sm transition-all ${overdue ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}>
                            <button
                              type="button"
                              onClick={() => setExpandedId(expanded ? null : a.id)}
                              className="flex w-full items-center gap-4 p-5 text-left hover:bg-slate-50"
                            >
                              <div className={`rounded-xl p-2.5 ${typeStyle.bg} ${typeStyle.text}`}>
                                <TypeIcon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-slate-800 truncate">{a.title}</h4>
                                  {overdue && <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${typeStyle.bg} ${typeStyle.text}`}>{a.type}</span>
                                  {a.subject && <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {a.subject.name}</span>}
                                  {a.due_date && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(a.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                                  <span className="flex items-center gap-1"><Award className="h-3 w-3" /> {a.total_marks} {t('marks')}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.bg}`}>{badge.label}</span>
                                {a.submission?.marks_obtained != null && (
                                  <span className="rounded-lg bg-emerald-50 px-2 py-1 text-sm font-bold text-emerald-700">
                                    {a.submission.marks_obtained}/{a.total_marks}
                                  </span>
                                )}
                                {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                              </div>
                            </button>

                            {expanded && (
                              <div className="border-t border-slate-100 px-5 pb-5">
                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                  {/* Details */}
                                  <div className="space-y-3">
                                    <h5 className="text-sm font-semibold text-slate-700">{t('details')}</h5>
                                    {a.description && <p className="text-sm text-slate-600 leading-relaxed">{a.description}</p>}
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div className="rounded-lg bg-slate-50 p-2.5">
                                        <p className="text-xs text-slate-500">{t('totalMarksLabel')}</p>
                                        <p className="font-semibold text-slate-800">{a.total_marks}</p>
                                      </div>
                                      {a.due_date && (
                                        <div className="rounded-lg bg-slate-50 p-2.5">
                                          <p className="text-xs text-slate-500">{t('dueDate')}</p>
                                          <p className="font-semibold text-slate-800">{new Date(a.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                        </div>
                                      )}
                                      {a.creator && (
                                        <div className="rounded-lg bg-slate-50 p-2.5">
                                          <p className="text-xs text-slate-500">{t('assignedBy')}</p>
                                          <p className="font-semibold text-slate-800">{a.creator.name}</p>
                                        </div>
                                      )}
                                      <div className="rounded-lg bg-slate-50 p-2.5">
                                        <p className="text-xs text-slate-500">{t('scope')}</p>
                                        <p className="font-semibold text-slate-800 capitalize">{a.scope}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Submission */}
                                  <div className="space-y-3">
                                    <h5 className="text-sm font-semibold text-slate-700">{t('submissionStatus')}</h5>
                                    {a.submission ? (
                                      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.bg}`}>{badge.label}</span>
                                          {a.submission.submitted_at && (
                                            <span className="text-xs text-slate-500">{new Date(a.submission.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                          )}
                                        </div>
                                        {a.submission.marks_obtained != null && (
                                          <div className="rounded-xl bg-emerald-50 p-4 text-center">
                                            <p className="text-xs text-emerald-600">{t('marksObtained')}</p>
                                            <p className="text-3xl font-bold text-emerald-700">{a.submission.marks_obtained}<span className="text-lg text-emerald-500">/{a.total_marks}</span></p>
                                            <p className="mt-1 text-sm text-emerald-600">{Math.round((a.submission.marks_obtained / a.total_marks) * 100)}%</p>
                                          </div>
                                        )}
                                        {a.submission.feedback && (
                                          <div className="rounded-lg bg-blue-50 p-3">
                                            <p className="text-xs font-medium text-blue-600">{t('teacherFeedback')}</p>
                                            <p className="mt-1 text-sm text-blue-800">{a.submission.feedback}</p>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className={`flex flex-col items-center justify-center rounded-xl border p-6 text-center ${
                                        overdue ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'
                                      }`}>
                                        {overdue ? (
                                          <>
                                            <AlertTriangle className="h-8 w-8 text-red-400" />
                                            <p className="mt-2 text-sm font-semibold text-red-600">{t('overdueWarning')}</p>
                                          </>
                                        ) : (
                                          <>
                                            <Clock className="h-8 w-8 text-slate-300" />
                                            <p className="mt-2 text-sm text-slate-500">{t('awaitingSubmission')}</p>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}