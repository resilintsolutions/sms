'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Plus, Pencil, Trash2, BookOpen, LinkIcon } from 'lucide-react';

type Subject = { id: number; name: string; name_bn?: string; code?: string; is_optional: boolean };
type ClassItem = { id: number; name: string; sections?: { id: number; name: string }[] };
type ClassSubject = {
  id: number;
  class_id: number;
  subject_id: number;
  full_marks: number;
  pass_marks: number;
  weight: number;
  is_optional: boolean;
  class?: { id: number; name: string };
  subject?: { id: number; name: string };
};

export default function SubjectsAdminPage() {
  const t = useTranslations('common');
  const queryClient = useQueryClient();

  // ─── Tabs ───
  const [tab, setTab] = useState<'subjects' | 'assign'>('subjects');

  // ─── Subjects CRUD ───
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: '', name_bn: '', code: '', is_optional: false });

  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api<{ data: Subject[] }>('/subjects'),
  });
  const subjects = (subData as { data?: Subject[] })?.data ?? [];

  const { data: clsData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api<{ data: ClassItem[] }>('/classes'),
  });
  const classes: ClassItem[] = ((clsData as { data?: ClassItem[] | { data?: ClassItem[] } })?.data as ClassItem[]) 
    ?? ((clsData as { data?: { data?: ClassItem[] } })?.data as { data?: ClassItem[] })?.data 
    ?? [];

  // ─── Class-Subject Assignments ───
  const [csModal, setCsModal] = useState(false);
  const [csForm, setCsForm] = useState({ class_id: '', subject_id: '', full_marks: 100, pass_marks: 33, weight: 1, is_optional: false });
  const [csFilter, setCsFilter] = useState('');

  const { data: csData, isLoading: csLoading } = useQuery({
    queryKey: ['class-subjects', csFilter],
    queryFn: () => api<{ data: ClassSubject[] }>(`/class-subjects${csFilter ? `?class_id=${csFilter}` : ''}`),
  });
  const classSubjects = (csData as { data?: ClassSubject[] })?.data ?? [];

  // Mutations
  const createSub = useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/subjects', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subjects'] }); toast.success(t('savedSuccessfully')); setModalOpen(false); },
    onError: () => toast.error(t('saveFailed')),
  });
  const updateSub = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) => api(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subjects'] }); toast.success(t('savedSuccessfully')); setModalOpen(false); setEditing(null); },
    onError: () => toast.error(t('saveFailed')),
  });
  const deleteSub = useMutation({
    mutationFn: (id: number) => api(`/subjects/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subjects'] }); toast.success(t('deletedSuccessfully')); },
    onError: () => toast.error(t('deleteFailed')),
  });
  const createCS = useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/class-subjects', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['class-subjects'] }); toast.success(t('savedSuccessfully')); setCsModal(false); },
    onError: () => toast.error(t('saveFailed')),
  });
  const deleteCS = useMutation({
    mutationFn: (id: number) => api(`/class-subjects/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['class-subjects'] }); toast.success(t('deletedSuccessfully')); },
    onError: () => toast.error(t('deleteFailed')),
  });

  const openAddSub = () => { setEditing(null); setForm({ name: '', name_bn: '', code: '', is_optional: false }); setModalOpen(true); };
  const openEditSub = (s: Subject) => { setEditing(s); setForm({ name: s.name, name_bn: s.name_bn ?? '', code: s.code ?? '', is_optional: s.is_optional }); setModalOpen(true); };
  const submitSub = () => {
    if (editing) {
      updateSub.mutate({ id: editing.id, name: form.name, name_bn: form.name_bn || undefined, code: form.code || undefined, is_optional: form.is_optional });
    } else {
      createSub.mutate({ institution_id: 1, name: form.name, name_bn: form.name_bn || undefined, code: form.code || undefined, is_optional: form.is_optional });
    }
  };

  const openAddCS = () => { setCsForm({ class_id: '', subject_id: '', full_marks: 100, pass_marks: 33, weight: 1, is_optional: false }); setCsModal(true); };
  const submitCS = () => {
    createCS.mutate({
      class_id: parseInt(csForm.class_id),
      subject_id: parseInt(csForm.subject_id),
      full_marks: csForm.full_marks,
      pass_marks: csForm.pass_marks,
      weight: csForm.weight,
      is_optional: csForm.is_optional,
    });
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Subjects & Class Assignments</h2>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 p-1">
        <button onClick={() => setTab('subjects')} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${tab === 'subjects' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <BookOpen className="mr-2 inline h-4 w-4" /> All Subjects
        </button>
        <button onClick={() => setTab('assign')} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${tab === 'assign' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <LinkIcon className="mr-2 inline h-4 w-4" /> Class ↔ Subject Mapping
        </button>
      </div>

      {/* ═══ Tab: Subjects ═══ */}
      {tab === 'subjects' && (
        <>
          <div className="mb-4 flex justify-end">
            <button onClick={openAddSub} className="btn btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Subject
            </button>
          </div>
          {subLoading ? (
            <p className="text-slate-500">{t('loading')}</p>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">{t('name')}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Name (বাংলা)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Code</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Optional</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {subjects.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">{t('noData')}</td></tr>
                  ) : subjects.map((s) => (
                    <tr key={s.id} className="table-row-hover">
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{s.name_bn ?? '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono">{s.code ?? '—'}</td>
                      <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs ${s.is_optional ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{s.is_optional ? 'Optional' : 'Required'}</span></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEditSub(s)} className="mr-2 text-slate-600 hover:text-primary-600"><Pencil className="h-4 w-4 inline" /></button>
                        <button onClick={() => confirm('Delete?') && deleteSub.mutate(s.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4 inline" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ═══ Tab: Class ↔ Subject Mapping ═══ */}
      {tab === 'assign' && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Filter by Class</label>
              <select value={csFilter} onChange={(e) => setCsFilter(e.target.value)} className="input mt-1 w-48">
                <option value="">All Classes</option>
                {classes.map((c) => <option key={c.id} value={c.id}>Class {c.name}</option>)}
              </select>
            </div>
            <button onClick={openAddCS} className="btn btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> Assign Subject to Class
            </button>
          </div>
          {csLoading ? (
            <p className="text-slate-500">{t('loading')}</p>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Class</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Subject</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Full Marks</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Pass Marks</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Weight</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Optional</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {classSubjects.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">{t('noData')}</td></tr>
                  ) : classSubjects.map((cs) => (
                    <tr key={cs.id} className="table-row-hover">
                      <td className="px-4 py-3 font-medium">Class {cs.class?.name ?? cs.class_id}</td>
                      <td className="px-4 py-3">{cs.subject?.name ?? cs.subject_id}</td>
                      <td className="px-4 py-3">{cs.full_marks}</td>
                      <td className="px-4 py-3">{cs.pass_marks}</td>
                      <td className="px-4 py-3">{cs.weight}</td>
                      <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs ${cs.is_optional ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{cs.is_optional ? 'Yes' : 'No'}</span></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => confirm('Remove?') && deleteCS.mutate(cs.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4 inline" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ═══ Modal: Add/Edit Subject ═══ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800">{editing ? 'Edit' : 'Add'} Subject</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Name (English) *</label>
                <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="input mt-1 w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Name (বাংলা)</label>
                <input type="text" value={form.name_bn} onChange={(e) => setForm(f => ({ ...f, name_bn: e.target.value }))} className="input mt-1 w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Code</label>
                <input type="text" value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} className="input mt-1 w-full" placeholder="e.g. BNG, ENG, MTH" />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.is_optional} onChange={(e) => setForm(f => ({ ...f, is_optional: e.target.checked }))} className="rounded" />
                Optional subject
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="btn">{t('cancel')}</button>
              <button onClick={submitSub} disabled={!form.name || createSub.isPending || updateSub.isPending} className="btn btn-primary">{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal: Assign Subject to Class ═══ */}
      {csModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800">Assign Subject to Class</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Class *</label>
                <select value={csForm.class_id} onChange={(e) => setCsForm(f => ({ ...f, class_id: e.target.value }))} className="input mt-1 w-full">
                  <option value="">Select class</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>Class {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Subject *</label>
                <select value={csForm.subject_id} onChange={(e) => setCsForm(f => ({ ...f, subject_id: e.target.value }))} className="input mt-1 w-full">
                  <option value="">Select subject</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Full Marks</label>
                  <input type="number" min={1} value={csForm.full_marks} onChange={(e) => setCsForm(f => ({ ...f, full_marks: parseInt(e.target.value) || 100 }))} className="input mt-1 w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Pass Marks</label>
                  <input type="number" min={0} value={csForm.pass_marks} onChange={(e) => setCsForm(f => ({ ...f, pass_marks: parseInt(e.target.value) || 33 }))} className="input mt-1 w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Weight</label>
                <input type="number" min={0} step={0.1} value={csForm.weight} onChange={(e) => setCsForm(f => ({ ...f, weight: parseFloat(e.target.value) || 1 }))} className="input mt-1 w-full" />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={csForm.is_optional} onChange={(e) => setCsForm(f => ({ ...f, is_optional: e.target.checked }))} className="rounded" />
                Optional for this class
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setCsModal(false)} className="btn">{t('cancel')}</button>
              <button onClick={submitCS} disabled={!csForm.class_id || !csForm.subject_id || createCS.isPending} className="btn btn-primary">{t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
