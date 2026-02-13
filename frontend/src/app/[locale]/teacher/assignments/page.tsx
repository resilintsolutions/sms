'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  Plus, Pencil, Trash2, Eye, ClipboardCheck, FileText,
  BookOpen, Clock, CheckCircle, AlertCircle, Users,
} from 'lucide-react';

type ClassItem = { id: number; name: string; sections?: { id: number; name: string }[] };
type Subject = { id: number; name: string; code?: string };
type Session = { id: number; name: string; is_current?: boolean };
type AssignmentRow = {
  id: number;
  title: string;
  title_bn?: string;
  description?: string;
  type: string;
  total_marks: number;
  due_date?: string;
  start_time?: string;
  end_time?: string;
  scope: string;
  status: string;
  class_model?: { id: number; name: string };
  section?: { id: number; name: string } | null;
  subject?: { id: number; name: string };
  creator?: { id: number; name: string };
  submissions_count?: number;
  created_at: string;
};

type StudentEnrollment = {
  id: number;
  student?: { id: number; name: string; name_bn?: string; student_id: string };
  roll_no?: number;
};

type SubmissionRow = {
  student_enrollment_id: number;
  student?: { id: number; name: string; name_bn?: string; student_id: string };
  roll_no?: number;
  submission?: {
    id: number;
    answer?: string;
    marks_obtained?: number;
    feedback?: string;
    status: string;
    submitted_at?: string;
    graded_at?: string;
  } | null;
};

export default function TeacherAssignmentsPage() {
  const t = useTranslations('common');
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'list' | 'create'>('list');
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Create form
  const [form, setForm] = useState({
    title: '', title_bn: '', description: '', type: 'assignment' as string,
    total_marks: 100, due_date: '', scope: 'class' as string,
    class_id: '', section_id: '', subject_id: '', academic_session_id: '',
    status: 'draft',
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  // Grade modal
  const [gradingSubmission, setGradingSubmission] = useState<SubmissionRow | null>(null);
  const [gradeForm, setGradeForm] = useState({ marks_obtained: '', feedback: '' });

  // Data queries
  const { data: clsData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api<{ data: ClassItem[] }>('/classes'),
  });
  const rawClasses = (clsData as { data?: ClassItem[] | { data?: ClassItem[] } })?.data;
  const classes: ClassItem[] = Array.isArray(rawClasses) ? rawClasses : (rawClasses as { data?: ClassItem[] })?.data ?? [];
  const sections = useMemo(() => {
    if (!form.class_id) return [];
    const cls = classes.find(c => c.id === parseInt(form.class_id));
    return cls?.sections ?? [];
  }, [classes, form.class_id]);

  const { data: subData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api<{ data: Subject[] }>('/subjects'),
  });
  const subjects = (subData as { data?: Subject[] })?.data ?? [];

  const { data: sessData } = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: () => api<{ data: Session[] | { data: Session[] } }>('/academic-sessions?per_page=100'),
  });
  const rawSess = (sessData as { data?: Session[] | { data?: Session[] } })?.data;
  const sessionsList: Session[] = Array.isArray(rawSess) ? rawSess : (rawSess as { data?: Session[] })?.data ?? [];

  // Assignments list
  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (filterType) p.set('type', filterType);
    if (filterStatus) p.set('status', filterStatus);
    return p.toString();
  }, [filterType, filterStatus]);

  const { data: asnData, isLoading } = useQuery({
    queryKey: ['portal/teacher/my-assignments', queryParams],
    queryFn: () => api<{ data: AssignmentRow[] }>(`/portal/teacher/my-assignments?${queryParams}`),
  });
  const assignments = (asnData as { data?: AssignmentRow[] })?.data ?? [];

  // Submissions for a specific assignment
  const { data: submissionsData, isLoading: submsLoading } = useQuery({
    queryKey: ['assignment-submissions', viewingId],
    queryFn: () => api<{ data: { assignment: AssignmentRow; students: SubmissionRow[] } }>(`/assignments/${viewingId}/submissions`),
    enabled: !!viewingId,
  });
  const viewData = (submissionsData as { data?: { assignment: AssignmentRow; students: SubmissionRow[] } })?.data;

  // Mutations
  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/assignments', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal/teacher/my-assignments'] });
      toast.success('Assignment created!');
      setTab('list');
      resetForm();
    },
    onError: () => toast.error(t('saveFailed')),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) => api(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal/teacher/my-assignments'] });
      toast.success(t('savedSuccessfully'));
      setTab('list');
      resetForm();
    },
    onError: () => toast.error(t('saveFailed')),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => api(`/assignments/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['portal/teacher/my-assignments'] }); toast.success(t('deletedSuccessfully')); },
    onError: () => toast.error(t('deleteFailed')),
  });
  const gradeMut = useMutation({
    mutationFn: ({ id, ...body }: { id: number; marks_obtained: number; feedback?: string }) =>
      api(`/assignment-submissions/${id}/grade`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-submissions', viewingId] });
      toast.success('Graded successfully!');
      setGradingSubmission(null);
    },
    onError: () => toast.error(t('saveFailed')),
  });

  const resetForm = () => {
    setForm({ title: '', title_bn: '', description: '', type: 'assignment', total_marks: 100, due_date: '', scope: 'class', class_id: '', section_id: '', subject_id: '', academic_session_id: '', status: 'draft' });
    setEditingId(null);
  };

  const openEdit = (a: AssignmentRow) => {
    setForm({
      title: a.title, title_bn: a.title_bn ?? '', description: a.description ?? '',
      type: a.type, total_marks: a.total_marks, due_date: a.due_date ?? '',
      scope: a.scope, class_id: String(a.class_model?.id ?? ''), section_id: String(a.section?.id ?? ''),
      subject_id: String(a.subject?.id ?? ''), academic_session_id: '', status: a.status,
    });
    setEditingId(a.id);
    setTab('create');
  };

  const submitForm = () => {
    const payload = {
      institution_id: 1,
      academic_session_id: parseInt(form.academic_session_id) || (sessionsList.find(s => s.is_current)?.id ?? sessionsList[0]?.id),
      class_id: parseInt(form.class_id),
      section_id: form.section_id ? parseInt(form.section_id) : null,
      subject_id: parseInt(form.subject_id),
      title: form.title,
      title_bn: form.title_bn || undefined,
      description: form.description || undefined,
      type: form.type,
      total_marks: form.total_marks,
      due_date: form.due_date || undefined,
      scope: form.scope,
      status: form.status,
    };
    if (editingId) {
      updateMut.mutate({ id: editingId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const openGrade = (sub: SubmissionRow) => {
    setGradingSubmission(sub);
    setGradeForm({
      marks_obtained: String(sub.submission?.marks_obtained ?? ''),
      feedback: sub.submission?.feedback ?? '',
    });
  };

  const submitGrade = () => {
    if (!gradingSubmission?.submission) return;
    gradeMut.mutate({
      id: gradingSubmission.submission.id,
      marks_obtained: parseFloat(gradeForm.marks_obtained),
      feedback: gradeForm.feedback || undefined,
    });
  };

  const typeLabel = (type: string) => {
    const map: Record<string, { label: string; color: string }> = {
      assignment: { label: 'Assignment', color: 'bg-blue-100 text-blue-700' },
      quiz: { label: 'Quiz', color: 'bg-purple-100 text-purple-700' },
      homework: { label: 'Homework', color: 'bg-emerald-100 text-emerald-700' },
      project: { label: 'Project', color: 'bg-amber-100 text-amber-700' },
    };
    return map[type] ?? { label: type, color: 'bg-slate-100 text-slate-700' };
  };

  const statusLabel = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600' },
      published: { label: 'Published', color: 'bg-emerald-100 text-emerald-700' },
      closed: { label: 'Closed', color: 'bg-red-100 text-red-700' },
    };
    return map[status] ?? { label: status, color: 'bg-slate-100 text-slate-600' };
  };

  // ═══ Viewing Submissions ═══
  if (viewingId && viewData) {
    const a = viewData.assignment;
    const students = viewData.students ?? [];
    const submitted = students.filter(s => s.submission);
    const graded = students.filter(s => s.submission?.status === 'graded');

    return (
      <div>
        <button onClick={() => setViewingId(null)} className="btn mb-4">← Back to list</button>
        <div className="card mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">{a.title}</h2>
              {a.description && <p className="mt-1 text-sm text-slate-600">{a.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${typeLabel(a.type).color}`}>{typeLabel(a.type).label}</span>
                <span className="text-sm text-slate-500">Class {a.class_model?.name} {a.section ? `- ${a.section.name}` : ''}</span>
                <span className="text-sm text-slate-500">{a.subject?.name}</span>
                <span className="text-sm text-slate-500">Total: {a.total_marks}</span>
                {a.due_date && <span className="text-sm text-slate-500">Due: {new Date(a.due_date).toLocaleDateString('en-GB')}</span>}
              </div>
            </div>
            <div className="text-right text-sm text-slate-500">
              <p>{submitted.length}/{students.length} submitted</p>
              <p>{graded.length} graded</p>
            </div>
          </div>
        </div>

        {submsLoading ? <p className="text-slate-500">Loading...</p> : (
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Roll</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Submitted</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Marks</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map((s) => {
                  const sub = s.submission;
                  return (
                    <tr key={s.student_enrollment_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm">{s.roll_no ?? '—'}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm">{s.student?.name_bn || s.student?.name}</p>
                        <p className="text-xs text-slate-500">{s.student?.student_id}</p>
                      </td>
                      <td className="px-4 py-3">
                        {sub ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            sub.status === 'graded' ? 'bg-emerald-100 text-emerald-700' :
                            sub.status === 'late' ? 'bg-amber-100 text-amber-700' :
                            sub.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>{sub.status}</span>
                        ) : (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">Not submitted</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {sub?.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        {sub?.marks_obtained != null ? `${sub.marks_obtained}/${a.total_marks}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {sub && (
                          <button onClick={() => openGrade(s)} className="btn text-sm">
                            <ClipboardCheck className="mr-1 inline h-3.5 w-3.5" />
                            {sub.status === 'graded' ? 'Re-grade' : 'Grade'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Grade Modal */}
        {gradingSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold">Grade: {gradingSubmission.student?.name}</h3>
              {gradingSubmission.submission?.answer && (
                <div className="mt-3 rounded border bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="mb-1 text-xs font-medium text-slate-500">Student&apos;s Answer:</p>
                  {gradingSubmission.submission.answer}
                </div>
              )}
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Marks (out of {viewData.assignment.total_marks})</label>
                  <input type="number" min={0} max={viewData.assignment.total_marks} value={gradeForm.marks_obtained} onChange={(e) => setGradeForm(f => ({ ...f, marks_obtained: e.target.value }))} className="input mt-1 w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Feedback</label>
                  <textarea value={gradeForm.feedback} onChange={(e) => setGradeForm(f => ({ ...f, feedback: e.target.value }))} className="input mt-1 w-full min-h-[80px]" rows={3} />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setGradingSubmission(null)} className="btn">{t('cancel')}</button>
                <button onClick={submitGrade} disabled={!gradeForm.marks_obtained || gradeMut.isPending} className="btn btn-primary">Save Grade</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Assignments & Quizzes</h2>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 p-1">
        <button onClick={() => { setTab('list'); resetForm(); }} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${tab === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <FileText className="mr-1 inline h-4 w-4" /> My Assignments
        </button>
        <button onClick={() => { setTab('create'); if (!editingId) resetForm(); }} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${tab === 'create' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <Plus className="mr-1 inline h-4 w-4" /> {editingId ? 'Edit' : 'Create New'}
        </button>
      </div>

      {/* ═══ Tab: List ═══ */}
      {tab === 'list' && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input w-40">
              <option value="">All Types</option>
              <option value="assignment">Assignment</option>
              <option value="quiz">Quiz</option>
              <option value="homework">Homework</option>
              <option value="project">Project</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input w-40">
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {isLoading ? <p className="text-slate-500">Loading...</p> : assignments.length === 0 ? (
            <div className="card flex flex-col items-center py-12">
              <BookOpen className="h-16 w-16 text-slate-300" />
              <p className="mt-4 text-slate-500">No assignments yet. Create your first one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((a) => (
                <div key={a.id} className="card flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800">{a.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeLabel(a.type).color}`}>{typeLabel(a.type).label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusLabel(a.status).color}`}>{statusLabel(a.status).label}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-500">
                      <span>Class {a.class_model?.name} {a.section ? `- ${a.section.name}` : '(all sections)'}</span>
                      <span>{a.subject?.name}</span>
                      <span>Marks: {a.total_marks}</span>
                      {a.due_date && <span>Due: {new Date(a.due_date).toLocaleDateString('en-GB')}</span>}
                      <span>{a.submissions_count ?? 0} submissions</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setViewingId(a.id)} className="btn text-sm flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> View
                    </button>
                    <button onClick={() => openEdit(a)} className="text-slate-600 hover:text-primary-600">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => confirm('Delete?') && deleteMut.mutate(a.id)} className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══ Tab: Create / Edit ═══ */}
      {tab === 'create' && (
        <div className="card max-w-2xl">
          <h3 className="text-lg font-semibold text-slate-800 mb-5">{editingId ? 'Edit Assignment' : 'Create Assignment / Quiz'}</h3>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className="input mt-1 w-full" placeholder="e.g. Chapter 5 Quiz" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Title (বাংলা)</label>
                <input type="text" value={form.title_bn} onChange={(e) => setForm(f => ({ ...f, title_bn: e.target.value }))} className="input mt-1 w-full" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Description</label>
              <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="input mt-1 w-full min-h-[100px]" rows={4} placeholder="Instructions for students..." />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Type *</label>
                <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))} className="input mt-1 w-full">
                  <option value="assignment">Assignment</option>
                  <option value="quiz">Quiz</option>
                  <option value="homework">Homework</option>
                  <option value="project">Project</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Total Marks *</label>
                <input type="number" min={1} value={form.total_marks} onChange={(e) => setForm(f => ({ ...f, total_marks: parseInt(e.target.value) || 100 }))} className="input mt-1 w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Due Date</label>
                <input type="date" value={form.due_date} onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))} className="input mt-1 w-full" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Class *</label>
                <select value={form.class_id} onChange={(e) => setForm(f => ({ ...f, class_id: e.target.value, section_id: '' }))} className="input mt-1 w-full">
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>Class {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Section (optional = all sections)</label>
                <select value={form.section_id} onChange={(e) => setForm(f => ({ ...f, section_id: e.target.value }))} className="input mt-1 w-full">
                  <option value="">All sections</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Subject *</label>
                <select value={form.subject_id} onChange={(e) => setForm(f => ({ ...f, subject_id: e.target.value }))} className="input mt-1 w-full">
                  <option value="">Select subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Scope</label>
                <select value={form.scope} onChange={(e) => setForm(f => ({ ...f, scope: e.target.value }))} className="input mt-1 w-full">
                  <option value="class">Entire class</option>
                  <option value="section">Specific section</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))} className="input mt-1 w-48">
                <option value="draft">Draft (not visible to students)</option>
                <option value="published">Published (visible to students)</option>
                {editingId && <option value="closed">Closed</option>}
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => { setTab('list'); resetForm(); }} className="btn">{t('cancel')}</button>
            <button
              onClick={submitForm}
              disabled={!form.title || !form.class_id || !form.subject_id || createMut.isPending || updateMut.isPending}
              className="btn btn-primary"
            >
              {editingId ? 'Update' : 'Create'} {form.type === 'quiz' ? 'Quiz' : 'Assignment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
