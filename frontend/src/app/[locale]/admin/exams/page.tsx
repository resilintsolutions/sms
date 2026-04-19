'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { downloadCSV, downloadPDF } from '@/lib/export';
import { Plus, Pencil, Trash2, FileText, FileDown, Filter } from 'lucide-react';

type SessionItem = { id: number; name: string; is_current?: boolean };

type ExamTerm = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  publish_status: string;
  academic_session_id?: number;
  academic_session?: { id: number; name: string };
};

type ExamTermMutationBody = {
  name?: string;
  start_date?: string;
  end_date?: string;
  publish_status?: string;
  academic_session_id?: number;
};

function getTermsList(res: unknown): ExamTerm[] {
  const d = (res as { data?: ExamTerm[] | { data?: ExamTerm[] } })?.data;
  return Array.isArray(d) ? d : (d as { data?: ExamTerm[] })?.data ?? [];
}

export default function ExamsPage() {
  const t = useTranslations('common');
  const tNav = useTranslations('nav');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExamTerm | null>(null);
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', publish_status: 'draft', academic_session_id: '' as number | '' });
  const [filterSessionId, setFilterSessionId] = useState<number | ''>('');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const institutionId = (user as unknown as { institution_id?: number })?.institution_id ?? 1;

  // Fetch sessions
  const { data: sessionsData } = useQuery({ queryKey: ['academic-sessions'], queryFn: () => api<{ data: SessionItem[] }>('/academic-sessions?per_page=100') });
  const sessionsPayload = (sessionsData as any)?.data;
  const sessions: SessionItem[] = Array.isArray(sessionsPayload) ? sessionsPayload : sessionsPayload?.data ?? [];

  // Auto-select current session
  useEffect(() => {
    if (sessions.length > 0 && !filterSessionId) {
      const current = sessions.find(s => s.is_current);
      if (current) setFilterSessionId(current.id);
    }
  }, [sessions, filterSessionId]);

  const { data, isLoading } = useQuery({
    queryKey: ['exam-terms', filterSessionId],
    queryFn: () => api<{ data: ExamTerm[] }>(`/exam-terms?per_page=100${filterSessionId ? `&academic_session_id=${filterSessionId}` : ''}`),
  });
  const terms = getTermsList(data?.data ?? data);

  const createMutation = useMutation({
    mutationFn: (body: { institution_id: number; academic_session_id: number; name: string; start_date?: string; end_date?: string; publish_status?: string }) =>
      api('/exam-terms', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exam-terms'] }); toast.success(t('savedSuccessfully')); setModalOpen(false); setForm({ name: '', start_date: '', end_date: '', publish_status: 'draft', academic_session_id: '' }); },
    onError: () => toast.error(t('saveFailed')),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & ExamTermMutationBody) =>
      api(`/exam-terms/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exam-terms'] }); toast.success(t('savedSuccessfully')); setModalOpen(false); setEditing(null); },
    onError: () => toast.error(t('saveFailed')),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/exam-terms/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exam-terms'] }); toast.success(t('deletedSuccessfully')); },
    onError: () => toast.error(t('deleteFailed')),
  });

  const openAdd = () => { setEditing(null); setForm({ name: '', start_date: '', end_date: '', publish_status: 'draft', academic_session_id: filterSessionId || '' }); setModalOpen(true); };
  const openEdit = (term: ExamTerm) => { setEditing(term); setForm({ name: term.name, start_date: term.start_date ?? '', end_date: term.end_date ?? '', publish_status: term.publish_status, academic_session_id: term.academic_session_id ?? '' }); setModalOpen(true); };
  const submit = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...form, academic_session_id: form.academic_session_id || undefined });
    } else {
      const sessionId = form.academic_session_id || filterSessionId;
      if (!sessionId) { toast.error('Please select an academic session'); return; }
      createMutation.mutate({ institution_id: institutionId, academic_session_id: Number(sessionId), name: form.name, start_date: form.start_date || undefined, end_date: form.end_date || undefined, publish_status: form.publish_status });
    }
  };

  const cols = [
    { key: 'name' as const, label: t('name') },
    { key: 'start_date' as const, label: t('startDate') },
    { key: 'end_date' as const, label: t('endDate') },
    { key: 'publish_status' as const, label: 'Status' },
  ];
  const rows = terms.map((x) => ({ ...x, start_date: x.start_date ?? '—', end_date: x.end_date ?? '—' }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">{tNav('exams')}</h2>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1">
            <Filter className="h-4 w-4 text-slate-400" />
            <select className="input text-sm" value={filterSessionId} onChange={e => setFilterSessionId(e.target.value ? +e.target.value : '')}>
              <option value="">All Sessions</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' ★' : ''}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => downloadPDF(tNav('exams'), cols, rows)} className="btn flex items-center gap-2">
            <FileText className="h-4 w-4" /> {t('exportPdf')}
          </button>
          <button type="button" onClick={() => downloadCSV('exam_terms.csv', rows, cols)} className="btn flex items-center gap-2">
            <FileDown className="h-4 w-4" /> {t('exportCsv')}
          </button>
          <button type="button" onClick={openAdd} className="btn btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> {t('add')} Exam Term
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-slate-500">{t('loading')}</p>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t('name')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Session</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t('startDate')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t('endDate')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {terms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">{t('noData')}</td>
                </tr>
              ) : (
                terms.map((term) => (
                  <tr key={term.id} className="table-row-hover">
                    <td className="px-4 py-3">{term.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{term.academic_session?.name ?? sessions.find(s => s.id === term.academic_session_id)?.name ?? '—'}</td>
                    <td className="px-4 py-3">{term.start_date ?? '—'}</td>
                    <td className="px-4 py-3">{term.end_date ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs ${term.publish_status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {term.publish_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => openEdit(term)} className="mr-2 text-slate-600 hover:text-primary-600"><Pencil className="h-4 w-4 inline" /></button>
                      <button type="button" onClick={() => confirm(t('delete')) && deleteMutation.mutate(term.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4 inline" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800">{editing ? t('edit') : t('add')} Exam Term</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700">Session</label>
              <select value={form.academic_session_id} onChange={(e) => setForm((f) => ({ ...f, academic_session_id: e.target.value ? +e.target.value : '' }))} className="input w-full">
                <option value="">— Select Session —</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' ★' : ''}</option>)}
              </select>
              <label className="block text-sm font-medium text-slate-700">{t('name')}</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input w-full" placeholder="e.g. Half Yearly 2024" />
              <label className="block text-sm font-medium text-slate-700">{t('startDate')}</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} className="input w-full" />
              <label className="block text-sm font-medium text-slate-700">{t('endDate')}</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} className="input w-full" />
              <label className="block text-sm font-medium text-slate-700">Publish status</label>
              <select value={form.publish_status} onChange={(e) => setForm((f) => ({ ...f, publish_status: e.target.value }))} className="input w-full">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="btn">{t('cancel')}</button>
              <button type="button" onClick={submit} disabled={createMutation.isPending || updateMutation.isPending || !form.name} className="btn btn-primary">{t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
