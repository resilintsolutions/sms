'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  Upload,
  Plus,
  Edit3,
  Trash2,
  X,
  ExternalLink,
  Search,
  FolderOpen,
  Video,
  Globe,
  FileText,
  HardDrive,
  Cloud,
  Link2,
  Eye,
  EyeOff,
} from 'lucide-react';

type StudyMaterial = {
  id: number;
  title: string;
  title_bn?: string;
  description?: string;
  description_bn?: string;
  type: 'google_drive' | 'dropbox' | 'youtube' | 'website' | 'document' | 'other';
  link: string;
  file_name?: string;
  file_type?: string;
  is_public: boolean;
  status: 'draft' | 'published';
  academic_session_id: number;
  class_id: number;
  section_id?: number;
  subject_id: number;
  class_model?: { id: number; name: string };
  section?: { id: number; name: string };
  subject?: { id: number; name: string; name_bn?: string };
  academic_session?: { id: number; name: string };
  created_at?: string;
};

type ClassItem = { id: number; name: string; sections?: { id: number; name: string }[] };
type Subject = { id: number; name: string; name_bn?: string };
type Session = { id: number; name: string; is_current?: boolean };

const CONTENT_TYPES = [
  { value: 'google_drive', label: 'Google Drive', icon: HardDrive, color: 'text-green-600 bg-green-50', hint: 'Paste a Google Drive shareable link' },
  { value: 'dropbox', label: 'Dropbox', icon: Cloud, color: 'text-blue-600 bg-blue-50', hint: 'Paste a Dropbox shareable link' },
  { value: 'youtube', label: 'YouTube', icon: Video, color: 'text-red-600 bg-red-50', hint: 'Paste a YouTube video URL' },
  { value: 'website', label: 'Website', icon: Globe, color: 'text-purple-600 bg-purple-50', hint: 'Paste any website URL' },
  { value: 'document', label: 'Document Link', icon: FileText, color: 'text-amber-600 bg-amber-50', hint: 'Link to a document (PDF, DOCX, etc.)' },
  { value: 'other', label: 'Other', icon: Link2, color: 'text-slate-600 bg-slate-50', hint: 'Any other content link' },
];

const FILE_TYPES = ['PDF', 'DOCX', 'PPTX', 'XLSX', 'Image', 'Video', 'Audio', 'ZIP', 'Other'];

function getTypeInfo(type: string) {
  return CONTENT_TYPES.find((t) => t.value === type) || CONTENT_TYPES[5];
}

function detectType(url: string): string {
  const u = url.toLowerCase();
  if (u.includes('drive.google.com') || u.includes('docs.google.com')) return 'google_drive';
  if (u.includes('dropbox.com') || u.includes('dl.dropboxusercontent.com')) return 'dropbox';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  return 'website';
}

export default function TeacherContentUploadPage() {
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudyMaterial | null>(null);

  const [form, setForm] = useState({
    title: '',
    title_bn: '',
    description: '',
    type: 'google_drive' as string,
    link: '',
    file_name: '',
    file_type: '',
    is_public: true,
    status: 'published' as 'draft' | 'published',
    academic_session_id: '',
    class_id: '',
    section_id: '',
    subject_id: '',
  });

  // Filters
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterType, setFilterType] = useState('');
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

  const { data: matData, isLoading } = useQuery({
    queryKey: ['teacher-study-materials'],
    queryFn: () => api<{ data: StudyMaterial[] }>('/portal/teacher/study-materials'),
  });
  const allMaterials = (matData as { data?: StudyMaterial[] })?.data ?? [];

  const filteredMaterials = useMemo(() => {
    let list = allMaterials;
    if (filterClass) list = list.filter((m) => String(m.class_id) === filterClass);
    if (filterSubject) list = list.filter((m) => String(m.subject_id) === filterSubject);
    if (filterType) list = list.filter((m) => m.type === filterType);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q)) ||
          (m.file_name && m.file_name.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [allMaterials, filterClass, filterSubject, filterType, searchTerm]);

  // Group by type for stats
  const typeStats = useMemo(() => {
    const map: Record<string, number> = {};
    allMaterials.forEach((m) => {
      map[m.type] = (map[m.type] || 0) + 1;
    });
    return map;
  }, [allMaterials]);

  const saveMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (editing) {
        return api(`/study-materials/${editing.id}`, { method: 'PUT', body: JSON.stringify(data) });
      }
      return api('/study-materials', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-study-materials'] });
      toast.success(editing ? 'Content updated' : 'Content shared successfully');
      closeModal();
    },
    onError: () => toast.error('Could not save. Please check the link and try again.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api(`/study-materials/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-study-materials'] });
      toast.success('Content deleted');
    },
    onError: () => toast.error('Could not delete'),
  });

  const openCreate = () => {
    const current = sessionsList.find((s) => s.is_current);
    setEditing(null);
    setForm({
      title: '', title_bn: '', description: '', type: 'google_drive', link: '',
      file_name: '', file_type: '', is_public: true, status: 'published',
      academic_session_id: current ? String(current.id) : '',
      class_id: '', section_id: '', subject_id: '',
    });
    setModalOpen(true);
  };

  const openEdit = (m: StudyMaterial) => {
    setEditing(m);
    setForm({
      title: m.title, title_bn: m.title_bn || '', description: m.description || '',
      type: m.type, link: m.link, file_name: m.file_name || '', file_type: m.file_type || '',
      is_public: m.is_public, status: m.status,
      academic_session_id: String(m.academic_session_id),
      class_id: String(m.class_id), section_id: m.section_id ? String(m.section_id) : '',
      subject_id: String(m.subject_id),
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSave = () => {
    if (!form.title || !form.link || !form.academic_session_id || !form.class_id || !form.subject_id) {
      toast.error('Please fill in title, class, subject, and link');
      return;
    }
    const body: Record<string, unknown> = {
      title: form.title,
      type: form.type,
      link: form.link,
      is_public: form.is_public,
      status: form.status,
      academic_session_id: parseInt(form.academic_session_id),
      class_id: parseInt(form.class_id),
      subject_id: parseInt(form.subject_id),
    };
    if (form.title_bn) body.title_bn = form.title_bn;
    if (form.description) body.description = form.description;
    if (form.file_name) body.file_name = form.file_name;
    if (form.file_type) body.file_type = form.file_type;
    if (form.section_id) body.section_id = parseInt(form.section_id);
    saveMut.mutate(body);
  };

  const handleLinkChange = (url: string) => {
    setForm((f) => ({ ...f, link: url, type: detectType(url) }));
  };

  const set = (key: keyof typeof form, val: string | boolean) => setForm((f) => ({ ...f, [key]: val }));
  const selectedClass = classes.find((c) => String(c.id) === form.class_id);
  const selectedSections = selectedClass?.sections ?? [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            <Upload className="mr-2 inline h-6 w-6 text-primary-600" />
            Content Upload
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Share study materials with students via Google Drive, Dropbox, YouTube, or any link.
          </p>
        </div>
        <button onClick={openCreate} className="btn btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Share Content
        </button>
      </div>

      {/* Stats Bar */}
      {!isLoading && allMaterials.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
            <p className="text-xl font-bold text-slate-700">{allMaterials.length}</p>
            <p className="text-xs text-slate-400">Total</p>
          </div>
          {CONTENT_TYPES.filter((ct) => typeStats[ct.value]).map((ct) => {
            const Icon = ct.icon;
            return (
              <div key={ct.value} className={`rounded-xl border border-slate-200 bg-white px-4 py-3 text-center`}>
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${ct.color.split(' ')[0]}`} />
                  <p className="text-xl font-bold text-slate-700">{typeStats[ct.value]}</p>
                </div>
                <p className="text-xs text-slate-400">{ct.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="card-accent mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search content..."
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
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input w-44">
            <option value="">All Types</option>
            {CONTENT_TYPES.map((ct) => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
          </select>
        </div>
      </div>

      {/* Content List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white py-16">
          <FolderOpen className="h-16 w-16 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-600">No Content Shared Yet</h3>
          <p className="mt-1 text-sm text-slate-400">
            Click &ldquo;Share Content&rdquo; to add Google Drive, Dropbox, or any content link.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredMaterials.map((m) => {
            const typeInfo = getTypeInfo(m.type);
            const Icon = typeInfo.icon;
            return (
              <div key={m.id} className="group rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                {/* Card Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-xl p-2.5 ${typeInfo.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800 line-clamp-2">{m.title}</h3>
                        {m.title_bn && <p className="mt-0.5 text-xs text-slate-400">{m.title_bn}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => openEdit(m)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => confirm('Delete this content?') && deleteMut.mutate(m.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {m.description && (
                    <p className="mt-2 text-sm text-slate-500 line-clamp-2">{m.description}</p>
                  )}

                  {/* Meta Tags */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                      Class {m.class_model?.name}{m.section ? ` — ${m.section.name}` : ''}
                    </span>
                    <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-600">
                      {m.subject?.name}
                    </span>
                    {m.file_type && (
                      <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                        {m.file_type}
                      </span>
                    )}
                    <span className="flex items-center gap-1 rounded bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
                      {m.is_public ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {m.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                  <span className="text-xs text-slate-400">
                    {m.created_at ? new Date(m.created_at).toLocaleDateString() : ''}
                  </span>
                  <a
                    href={m.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 transition hover:bg-primary-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open Link
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── CREATE / EDIT MODAL ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="border-b border-slate-100 px-6 pt-6 pb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {editing ? 'Edit Content' : 'Share Content'}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Share study materials via Google Drive, Dropbox, YouTube, or any content link.
              </p>
            </div>

            <div className="space-y-5 p-6">
              {/* Content Type Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Content Type</label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {CONTENT_TYPES.map((ct) => {
                    const TIcon = ct.icon;
                    const active = form.type === ct.value;
                    return (
                      <button
                        key={ct.value}
                        type="button"
                        onClick={() => set('type', ct.value)}
                        className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-xs font-medium transition ${
                          active
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <TIcon className="h-5 w-5" />
                        {ct.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Link */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  <Link2 className="mr-1 inline h-4 w-4 text-primary-500" />
                  Content Link *
                </label>
                <input
                  type="url"
                  value={form.link}
                  onChange={(e) => handleLinkChange(e.target.value)}
                  className="input mt-1 w-full"
                  placeholder={getTypeInfo(form.type).hint}
                />
                <p className="mt-1 text-xs text-slate-400">
                  {getTypeInfo(form.type).hint}
                </p>
              </div>

              {/* Session / Class / Section / Subject */}
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
                    <option value="">All</option>
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

              {/* Title */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Title *</label>
                  <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} className="input mt-1 w-full" placeholder="e.g., Chapter 5 Notes" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Title (বাংলা)</label>
                  <input type="text" value={form.title_bn} onChange={(e) => set('title_bn', e.target.value)} className="input mt-1 w-full" placeholder="বাংলা শিরোনাম" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} className="input mt-1 w-full" placeholder="Brief description of the content" />
              </div>

              {/* File info + Visibility */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">File Name</label>
                  <input type="text" value={form.file_name} onChange={(e) => set('file_name', e.target.value)} className="input mt-1 w-full" placeholder="e.g., chapter5.pdf" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">File Type</label>
                  <select value={form.file_type} onChange={(e) => set('file_type', e.target.value)} className="input mt-1 w-full">
                    <option value="">Select</option>
                    {FILE_TYPES.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Status</label>
                  <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input mt-1 w-full">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              {/* Public toggle */}
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.is_public}
                    onChange={(e) => set('is_public', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {form.is_public ? (
                        <><Eye className="mr-1 inline h-4 w-4 text-emerald-500" /> Visible to Students</>
                      ) : (
                        <><EyeOff className="mr-1 inline h-4 w-4 text-slate-400" /> Hidden from Students</>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {form.is_public ? 'Students can see and access this content' : 'Only you and admins can see this content'}
                    </p>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button onClick={closeModal} className="btn">Cancel</button>
                <button onClick={handleSave} disabled={saveMut.isPending} className="btn btn-primary">
                  {saveMut.isPending ? 'Saving...' : editing ? 'Update Content' : 'Share Content'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
