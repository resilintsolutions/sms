'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  X,
  Calendar,
  Clock,
  CheckCircle,
  FileText,
  Target,
  Lightbulb,
  ClipboardList,
  BookMarked,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';

type LessonPlan = {
  id: number;
  title: string;
  title_bn?: string;
  objective?: string;
  objective_bn?: string;
  content?: string;
  content_bn?: string;
  teaching_method?: string;
  resources?: string;
  assessment?: string;
  homework?: string;
  plan_date?: string;
  duration_minutes?: number;
  topic?: string;
  topic_bn?: string;
  week_number?: number;
  status: 'draft' | 'published' | 'completed';
  academic_session_id: number;
  class_id: number;
  section_id?: number;
  subject_id: number;
  class_model?: { id: number; name: string };
  section?: { id: number; name: string };
  subject?: { id: number; name: string; name_bn?: string };
  academic_session?: { id: number; name: string };
};

type ClassItem = { id: number; name: string; sections?: { id: number; name: string }[] };
type Subject = { id: number; name: string; name_bn?: string };
type Session = { id: number; name: string; is_current?: boolean };

export default function TeacherLessonPlansPage() {
  const queryClient = useQueryClient();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LessonPlan | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Form fields
  const [form, setForm] = useState({
    title: '',
    title_bn: '',
    objective: '',
    content: '',
    teaching_method: '',
    resources: '',
    assessment: '',
    homework: '',
    plan_date: '',
    duration_minutes: '',
    topic: '',
    topic_bn: '',
    week_number: '',
    status: 'draft' as 'draft' | 'published' | 'completed',
    academic_session_id: '',
    class_id: '',
    section_id: '',
    subject_id: '',
  });

  // Filters
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Data
  const { data: clsData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api<{ data: ClassItem[] }>('/classes'),
  });
  const rawClasses = (clsData as { data?: ClassItem[] | { data?: ClassItem[] } })?.data;
  const classes: ClassItem[] = Array.isArray(rawClasses) ? rawClasses : (rawClasses as { data?: ClassItem[] })?.data ?? [];

  const { data: subData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api<{ data: Subject[] }>('/subjects'),
  });
  const rawSubs = (subData as { data?: Subject[] | { data?: Subject[] } })?.data;
  const subjects: Subject[] = Array.isArray(rawSubs) ? rawSubs : (rawSubs as { data?: Subject[] })?.data ?? [];

  const { data: sessData } = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: () => api<{ data: Session[] | { data: Session[] } }>('/academic-sessions?per_page=100'),
  });
  const rawSess = (sessData as { data?: Session[] | { data?: Session[] } })?.data;
  const sessionsList: Session[] = Array.isArray(rawSess) ? rawSess : (rawSess as { data?: Session[] })?.data ?? [];

  // Lesson plans list
  const { data: lpData, isLoading } = useQuery({
    queryKey: ['teacher-lesson-plans'],
    queryFn: () => api<{ data: LessonPlan[] }>('/portal/teacher/lesson-plans'),
  });
  const allPlans = (lpData as { data?: LessonPlan[] })?.data ?? [];

  const filteredPlans = useMemo(() => {
    let list = allPlans;
    if (filterClass) list = list.filter((p) => String(p.class_id) === filterClass);
    if (filterSubject) list = list.filter((p) => String(p.subject_id) === filterSubject);
    if (filterStatus) list = list.filter((p) => p.status === filterStatus);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.topic && p.topic.toLowerCase().includes(q)) ||
          (p.title_bn && p.title_bn.includes(searchTerm)),
      );
    }
    return list;
  }, [allPlans, filterClass, filterSubject, filterStatus, searchTerm]);

  // Mutations
  const saveMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (editing) {
        return api(`/lesson-plans/${editing.id}`, { method: 'PUT', body: JSON.stringify(data) });
      }
      return api('/lesson-plans', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-lesson-plans'] });
      toast.success(editing ? 'Lesson plan updated' : 'Lesson plan created');
      closeModal();
    },
    onError: () => toast.error('Could not save. Please try again.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api(`/lesson-plans/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-lesson-plans'] });
      toast.success('Lesson plan deleted');
    },
    onError: () => toast.error('Could not delete'),
  });

  const openCreate = () => {
    const current = sessionsList.find((s) => s.is_current);
    setEditing(null);
    setForm({
      title: '', title_bn: '', objective: '', content: '', teaching_method: '',
      resources: '', assessment: '', homework: '', plan_date: '', duration_minutes: '',
      topic: '', topic_bn: '', week_number: '', status: 'draft',
      academic_session_id: current ? String(current.id) : '',
      class_id: '', section_id: '', subject_id: '',
    });
    setModalOpen(true);
  };

  const openEdit = (p: LessonPlan) => {
    setEditing(p);
    setForm({
      title: p.title, title_bn: p.title_bn || '', objective: p.objective || '',
      content: p.content || '', teaching_method: p.teaching_method || '',
      resources: p.resources || '', assessment: p.assessment || '',
      homework: p.homework || '', plan_date: p.plan_date ? p.plan_date.slice(0, 10) : '',
      duration_minutes: p.duration_minutes ? String(p.duration_minutes) : '',
      topic: p.topic || '', topic_bn: p.topic_bn || '',
      week_number: p.week_number ? String(p.week_number) : '',
      status: p.status, academic_session_id: String(p.academic_session_id),
      class_id: String(p.class_id), section_id: p.section_id ? String(p.section_id) : '',
      subject_id: String(p.subject_id),
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSave = () => {
    if (!form.title || !form.academic_session_id || !form.class_id || !form.subject_id) {
      toast.error('Please fill in all required fields');
      return;
    }
    const body: Record<string, unknown> = {
      title: form.title,
      academic_session_id: parseInt(form.academic_session_id),
      class_id: parseInt(form.class_id),
      subject_id: parseInt(form.subject_id),
      status: form.status,
    };
    if (form.title_bn) body.title_bn = form.title_bn;
    if (form.objective) body.objective = form.objective;
    if (form.content) body.content = form.content;
    if (form.teaching_method) body.teaching_method = form.teaching_method;
    if (form.resources) body.resources = form.resources;
    if (form.assessment) body.assessment = form.assessment;
    if (form.homework) body.homework = form.homework;
    if (form.plan_date) body.plan_date = form.plan_date;
    if (form.duration_minutes) body.duration_minutes = parseInt(form.duration_minutes);
    if (form.topic) body.topic = form.topic;
    if (form.topic_bn) body.topic_bn = form.topic_bn;
    if (form.week_number) body.week_number = parseInt(form.week_number);
    if (form.section_id) body.section_id = parseInt(form.section_id);
    saveMut.mutate(body);
  };

  const set = (key: keyof typeof form, val: string) => setForm((f) => ({ ...f, [key]: val }));
  const selectedClass = classes.find((c) => String(c.id) === form.class_id);
  const selectedSections = selectedClass?.sections ?? [];

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    published: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            <BookOpen className="mr-2 inline h-6 w-6 text-primary-600" />
            Lesson Plans
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage lesson plans for your classes and subjects.
          </p>
        </div>
        <button onClick={openCreate} className="btn btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Create Lesson Plan
        </button>
      </div>

      {/* Filters */}
      <div className="card-accent mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search lesson plans..."
              className="input w-full pl-9"
            />
          </div>
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="input w-40">
            <option value="">All Classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>Class {c.name}</option>)}
          </select>
          <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="input w-40">
            <option value="">All Subjects</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input w-36">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white py-16">
          <FileText className="h-16 w-16 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-600">No Lesson Plans</h3>
          <p className="mt-1 text-sm text-slate-400">
            Click &ldquo;Create Lesson Plan&rdquo; to add your first plan.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPlans.map((plan) => {
            const isOpen = expandedId === plan.id;
            return (
              <div key={plan.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                {/* Header Row */}
                <div
                  className="flex cursor-pointer items-center justify-between px-5 py-4"
                  onClick={() => setExpandedId(isOpen ? null : plan.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-primary-100 p-2.5 text-primary-700">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{plan.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                          Class {plan.class_model?.name}
                          {plan.section ? ` — ${plan.section.name}` : ''}
                        </span>
                        <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-600">
                          {plan.subject?.name}
                        </span>
                        {plan.topic && (
                          <span className="text-xs text-slate-400">Topic: {plan.topic}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {plan.plan_date && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(plan.plan_date).toLocaleDateString()}
                      </span>
                    )}
                    {plan.duration_minutes && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        {plan.duration_minutes}m
                      </span>
                    )}
                    {plan.week_number && (
                      <span className="text-xs text-slate-400">W{plan.week_number}</span>
                    )}
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[plan.status]}`}>
                      {plan.status}
                    </span>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isOpen && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      {plan.objective && (
                        <div className="rounded-xl bg-blue-50 p-4">
                          <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-blue-700">
                            <Target className="h-4 w-4" /> Objective
                          </h4>
                          <p className="whitespace-pre-line text-sm text-blue-600">{plan.objective}</p>
                        </div>
                      )}
                      {plan.content && (
                        <div className="rounded-xl bg-emerald-50 p-4">
                          <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                            <FileText className="h-4 w-4" /> Content / Methodology
                          </h4>
                          <p className="whitespace-pre-line text-sm text-emerald-600">{plan.content}</p>
                        </div>
                      )}
                      {plan.teaching_method && (
                        <div className="rounded-xl bg-purple-50 p-4">
                          <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-purple-700">
                            <Lightbulb className="h-4 w-4" /> Teaching Method
                          </h4>
                          <p className="whitespace-pre-line text-sm text-purple-600">{plan.teaching_method}</p>
                        </div>
                      )}
                      {plan.resources && (
                        <div className="rounded-xl bg-amber-50 p-4">
                          <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-700">
                            <BookMarked className="h-4 w-4" /> Resources
                          </h4>
                          <p className="whitespace-pre-line text-sm text-amber-600">{plan.resources}</p>
                        </div>
                      )}
                      {plan.assessment && (
                        <div className="rounded-xl bg-rose-50 p-4">
                          <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-rose-700">
                            <ClipboardList className="h-4 w-4" /> Assessment
                          </h4>
                          <p className="whitespace-pre-line text-sm text-rose-600">{plan.assessment}</p>
                        </div>
                      )}
                      {plan.homework && (
                        <div className="rounded-xl bg-cyan-50 p-4">
                          <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-cyan-700">
                            <CheckCircle className="h-4 w-4" /> Homework
                          </h4>
                          <p className="whitespace-pre-line text-sm text-cyan-600">{plan.homework}</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(plan); }}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this lesson plan?')) deleteMut.mutate(plan.id);
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── CREATE / EDIT MODAL ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="border-b border-slate-100 px-6 pt-6 pb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {editing ? 'Edit Lesson Plan' : 'Create Lesson Plan'}
              </h3>
            </div>

            <div className="space-y-5 p-6">
              {/* Row 1: Session / Class / Section / Subject */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Session *</label>
                  <select value={form.academic_session_id} onChange={(e) => set('academic_session_id', e.target.value)} className="input mt-1 w-full">
                    <option value="">Select</option>
                    {sessionsList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Class *</label>
                  <select value={form.class_id} onChange={(e) => { set('class_id', e.target.value); set('section_id', ''); }} className="input mt-1 w-full">
                    <option value="">Select</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>Class {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Section</label>
                  <select value={form.section_id} onChange={(e) => set('section_id', e.target.value)} className="input mt-1 w-full" disabled={!form.class_id}>
                    <option value="">All Sections</option>
                    {selectedSections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Subject *</label>
                  <select value={form.subject_id} onChange={(e) => set('subject_id', e.target.value)} className="input mt-1 w-full">
                    <option value="">Select</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 2: Title */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Title *</label>
                  <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} className="input mt-1 w-full" placeholder="Lesson title" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Title (বাংলা)</label>
                  <input type="text" value={form.title_bn} onChange={(e) => set('title_bn', e.target.value)} className="input mt-1 w-full" placeholder="বাংলা শিরোনাম" />
                </div>
              </div>

              {/* Row 3: Topic / Date / Duration / Week */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Topic</label>
                  <input type="text" value={form.topic} onChange={(e) => set('topic', e.target.value)} className="input mt-1 w-full" placeholder="e.g., Fractions" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Plan Date</label>
                  <input type="date" value={form.plan_date} onChange={(e) => set('plan_date', e.target.value)} className="input mt-1 w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Duration (min)</label>
                  <input type="number" value={form.duration_minutes} onChange={(e) => set('duration_minutes', e.target.value)} className="input mt-1 w-full" placeholder="45" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Week #</label>
                  <input type="number" value={form.week_number} onChange={(e) => set('week_number', e.target.value)} className="input mt-1 w-full" placeholder="1" min="1" max="52" />
                </div>
              </div>

              {/* Objective */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  <Target className="mr-1 inline h-4 w-4 text-blue-500" /> Objective
                </label>
                <textarea value={form.objective} onChange={(e) => set('objective', e.target.value)} rows={2} className="input mt-1 w-full" placeholder="What students should learn from this lesson" />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  <FileText className="mr-1 inline h-4 w-4 text-emerald-500" /> Content / Methodology
                </label>
                <textarea value={form.content} onChange={(e) => set('content', e.target.value)} rows={3} className="input mt-1 w-full" placeholder="Main lesson content and methodology" />
              </div>

              {/* Teaching Method + Resources */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    <Lightbulb className="mr-1 inline h-4 w-4 text-purple-500" /> Teaching Method
                  </label>
                  <textarea value={form.teaching_method} onChange={(e) => set('teaching_method', e.target.value)} rows={2} className="input mt-1 w-full" placeholder="Lecture, group work, demonstration..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    <BookMarked className="mr-1 inline h-4 w-4 text-amber-500" /> Resources
                  </label>
                  <textarea value={form.resources} onChange={(e) => set('resources', e.target.value)} rows={2} className="input mt-1 w-full" placeholder="Textbook pg. 45-50, whiteboard..." />
                </div>
              </div>

              {/* Assessment + Homework */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    <ClipboardList className="mr-1 inline h-4 w-4 text-rose-500" /> Assessment
                  </label>
                  <textarea value={form.assessment} onChange={(e) => set('assessment', e.target.value)} rows={2} className="input mt-1 w-full" placeholder="How to evaluate student understanding" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    <CheckCircle className="mr-1 inline h-4 w-4 text-cyan-500" /> Homework
                  </label>
                  <textarea value={form.homework} onChange={(e) => set('homework', e.target.value)} rows={2} className="input mt-1 w-full" placeholder="Homework to assign" />
                </div>
              </div>

              {/* Status */}
              <div className="w-48">
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input mt-1 w-full">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button onClick={closeModal} className="btn">Cancel</button>
                <button onClick={handleSave} disabled={saveMut.isPending} className="btn btn-primary">
                  {saveMut.isPending ? 'Saving...' : editing ? 'Update Lesson Plan' : 'Create Lesson Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
