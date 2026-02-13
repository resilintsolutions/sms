'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  BookOpen,
  Trash2,
  Search,
  FileText,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Target,
  Lightbulb,
  BookMarked,
  ClipboardList,
  CheckCircle,
  ExternalLink,
  FolderOpen,
  HardDrive,
  Cloud,
  Video,
  Globe,
  Link2,
  Eye,
  EyeOff,
  Upload,
} from 'lucide-react';

/* ─── Types ─── */
type LessonPlan = {
  id: number;
  title: string;
  title_bn?: string;
  objective?: string;
  content?: string;
  teaching_method?: string;
  resources?: string;
  assessment?: string;
  homework?: string;
  plan_date?: string;
  duration_minutes?: number;
  topic?: string;
  week_number?: number;
  status: string;
  class_model?: { id: number; name: string };
  section?: { id: number; name: string };
  subject?: { id: number; name: string };
  academic_session?: { id: number; name: string };
  creator?: { id: number; name: string };
};

type StudyMaterial = {
  id: number;
  title: string;
  description?: string;
  type: string;
  link: string;
  file_name?: string;
  file_type?: string;
  is_public: boolean;
  status: string;
  class_model?: { id: number; name: string };
  section?: { id: number; name: string };
  subject?: { id: number; name: string };
  academic_session?: { id: number; name: string };
  creator?: { id: number; name: string };
  created_at?: string;
};

type ClassItem = { id: number; name: string };
type Subject = { id: number; name: string };
type Session = { id: number; name: string; is_current?: boolean };

const typeIcons: Record<string, typeof HardDrive> = {
  google_drive: HardDrive,
  dropbox: Cloud,
  youtube: Video,
  website: Globe,
  document: FileText,
  other: Link2,
};
const typeLabels: Record<string, string> = {
  google_drive: 'Google Drive',
  dropbox: 'Dropbox',
  youtube: 'YouTube',
  website: 'Website',
  document: 'Document',
  other: 'Other',
};

export default function AdminLessonPlansContentPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'plans' | 'materials'>('plans');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterSession, setFilterSession] = useState('');

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
  const sessions: Session[] = Array.isArray(rawSess) ? rawSess : (rawSess as { data?: Session[] })?.data ?? [];

  // Build query params
  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (filterSession) p.set('academic_session_id', filterSession);
    if (filterClass) p.set('class_id', filterClass);
    if (filterSubject) p.set('subject_id', filterSubject);
    p.set('per_page', '100');
    return p.toString();
  }, [filterSession, filterClass, filterSubject]);

  // Lesson Plans
  const { data: lpData, isLoading: lpLoading } = useQuery({
    queryKey: ['admin-lesson-plans', queryParams],
    queryFn: () => api<{ data: { data?: LessonPlan[] } }>(`/lesson-plans?${queryParams}`),
    enabled: tab === 'plans',
  });
  const rawLp = (lpData as { data?: { data?: LessonPlan[] } | LessonPlan[] })?.data;
  const allPlans: LessonPlan[] = Array.isArray(rawLp) ? rawLp : (rawLp as { data?: LessonPlan[] })?.data ?? [];

  // Study Materials
  const { data: matData, isLoading: matLoading } = useQuery({
    queryKey: ['admin-study-materials', queryParams],
    queryFn: () => api<{ data: { data?: StudyMaterial[] } }>(`/study-materials?${queryParams}`),
    enabled: tab === 'materials',
  });
  const rawMat = (matData as { data?: { data?: StudyMaterial[] } | StudyMaterial[] })?.data;
  const allMaterials: StudyMaterial[] = Array.isArray(rawMat) ? rawMat : (rawMat as { data?: StudyMaterial[] })?.data ?? [];

  // Filter by search
  const filteredPlans = useMemo(() => {
    if (!search) return allPlans;
    const q = search.toLowerCase();
    return allPlans.filter((p) => p.title.toLowerCase().includes(q) || (p.topic && p.topic.toLowerCase().includes(q)));
  }, [allPlans, search]);

  const filteredMaterials = useMemo(() => {
    if (!search) return allMaterials;
    const q = search.toLowerCase();
    return allMaterials.filter((m) => m.title.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q)));
  }, [allMaterials, search]);

  const deletePlan = useMutation({
    mutationFn: (id: number) => api(`/lesson-plans/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-lesson-plans'] }); toast.success('Deleted'); },
  });
  const deleteMaterial = useMutation({
    mutationFn: (id: number) => api(`/study-materials/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-study-materials'] }); toast.success('Deleted'); },
  });

  const isLoading = tab === 'plans' ? lpLoading : matLoading;

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    published: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">
          <BookOpen className="mr-2 inline h-6 w-6 text-primary-600" />
          Lesson Plans & Content
        </h2>
        <p className="mt-1 text-sm text-slate-500">View and manage lesson plans and study materials shared by teachers.</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => { setTab('plans'); setSearch(''); setExpandedId(null); }}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${tab === 'plans' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <FileText className="mr-2 inline h-4 w-4" /> Lesson Plans
        </button>
        <button
          onClick={() => { setTab('materials'); setSearch(''); setExpandedId(null); }}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${tab === 'materials' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Upload className="mr-2 inline h-4 w-4" /> Study Materials
        </button>
      </div>

      {/* Filters */}
      <div className="card-accent mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="input w-full pl-9" />
          </div>
          <select value={filterSession} onChange={(e) => setFilterSession(e.target.value)} className="input w-44">
            <option value="">All Sessions</option>
            {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' ✓' : ''}</option>)}
          </select>
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="input w-40">
            <option value="">All Classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>Class {c.name}</option>)}
          </select>
          <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="input w-40">
            <option value="">All Subjects</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : tab === 'plans' ? (
        /* ─── LESSON PLANS TAB ─── */
        filteredPlans.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white py-16">
            <FileText className="h-16 w-16 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-600">No Lesson Plans Found</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPlans.map((plan) => {
              const isOpen = expandedId === plan.id;
              return (
                <div key={plan.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="rounded bg-blue-50 px-2 py-0.5 font-medium text-blue-600">Class {plan.class_model?.name}{plan.section ? ` — ${plan.section.name}` : ''}</span>
                          <span className="rounded bg-purple-50 px-2 py-0.5 font-medium text-purple-600">{plan.subject?.name}</span>
                          <span className="text-slate-400">by {plan.creator?.name}</span>
                          <span className="text-slate-400">{plan.academic_session?.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {plan.plan_date && <span className="flex items-center gap-1 text-xs text-slate-400"><Calendar className="h-3.5 w-3.5" />{new Date(plan.plan_date).toLocaleDateString()}</span>}
                      {plan.duration_minutes && <span className="flex items-center gap-1 text-xs text-slate-400"><Clock className="h-3.5 w-3.5" />{plan.duration_minutes}m</span>}
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[plan.status] || statusColors.draft}`}>{plan.status}</span>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>
                  {isOpen && (
                    <div className="border-t border-slate-100 px-5 py-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        {plan.objective && <div className="rounded-xl bg-blue-50 p-4"><h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-blue-700"><Target className="h-4 w-4" /> Objective</h4><p className="whitespace-pre-line text-sm text-blue-600">{plan.objective}</p></div>}
                        {plan.content && <div className="rounded-xl bg-emerald-50 p-4"><h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-emerald-700"><FileText className="h-4 w-4" /> Content</h4><p className="whitespace-pre-line text-sm text-emerald-600">{plan.content}</p></div>}
                        {plan.teaching_method && <div className="rounded-xl bg-purple-50 p-4"><h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-purple-700"><Lightbulb className="h-4 w-4" /> Teaching Method</h4><p className="whitespace-pre-line text-sm text-purple-600">{plan.teaching_method}</p></div>}
                        {plan.resources && <div className="rounded-xl bg-amber-50 p-4"><h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-700"><BookMarked className="h-4 w-4" /> Resources</h4><p className="whitespace-pre-line text-sm text-amber-600">{plan.resources}</p></div>}
                        {plan.assessment && <div className="rounded-xl bg-rose-50 p-4"><h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-rose-700"><ClipboardList className="h-4 w-4" /> Assessment</h4><p className="whitespace-pre-line text-sm text-rose-600">{plan.assessment}</p></div>}
                        {plan.homework && <div className="rounded-xl bg-cyan-50 p-4"><h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-cyan-700"><CheckCircle className="h-4 w-4" /> Homework</h4><p className="whitespace-pre-line text-sm text-cyan-600">{plan.homework}</p></div>}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => confirm('Delete this lesson plan?') && deletePlan.mutate(plan.id)}
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
        )
      ) : (
        /* ─── STUDY MATERIALS TAB ─── */
        filteredMaterials.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white py-16">
            <FolderOpen className="h-16 w-16 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-600">No Study Materials Found</h3>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredMaterials.map((m) => {
              const Icon = typeIcons[m.type] || Link2;
              return (
                <div key={m.id} className="group rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800">{m.title}</h3>
                          <p className="mt-0.5 text-xs text-slate-400">{typeLabels[m.type] || m.type} · by {m.creator?.name}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => confirm('Delete?') && deleteMaterial.mutate(m.id)}
                        className="rounded-lg p-1.5 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {m.description && <p className="mt-2 text-sm text-slate-500 line-clamp-2">{m.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">Class {m.class_model?.name}{m.section ? ` — ${m.section.name}` : ''}</span>
                      <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-600">{m.subject?.name}</span>
                      {m.file_type && <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">{m.file_type}</span>}
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        {m.is_public ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {m.is_public ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                    <span className="text-xs text-slate-400">{m.created_at ? new Date(m.created_at).toLocaleDateString() : ''} · {m.academic_session?.name}</span>
                    <a href={m.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100">
                      <ExternalLink className="h-3.5 w-3.5" /> Open
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
