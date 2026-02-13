'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { downloadCSV, downloadPDF } from '@/lib/export';
import { Plus, Pencil, Trash2, FileText, FileDown } from 'lucide-react';

type Session = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
};

export default function SessionsPage() {
  const t = useTranslations('common');
  const tNav = useTranslations('nav');
  const tSessions = useTranslations('sessions');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', is_current: false });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: async () => api<{ data: Session[] }>('/academic-sessions?per_page=100'),
  });
  const payload = (data as { data?: Session[] | { data?: Session[] } })?.data;
  const sessions = Array.isArray(payload) ? payload : (payload as { data?: Session[] })?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (body: { institution_id: number; name: string; start_date: string; end_date: string; is_current?: boolean }) =>
      api('/academic-sessions', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['academic-sessions'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); toast.success(t('savedSuccessfully')); setModalOpen(false); setForm({ name: '', start_date: '', end_date: '', is_current: false }); },
    onError: () => toast.error(t('saveFailed')),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: number; name?: string; start_date?: string; end_date?: string; is_current?: boolean }) =>
      api(`/academic-sessions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['academic-sessions'] }); toast.success(t('savedSuccessfully')); setModalOpen(false); setEditing(null); },
    onError: () => toast.error(t('saveFailed')),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/academic-sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['academic-sessions'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); toast.success(t('deletedSuccessfully')); },
    onError: () => toast.error(t('deleteFailed')),
  });

  const openAdd = () => { setEditing(null); setForm({ name: '', start_date: '', end_date: '', is_current: false }); setModalOpen(true); };
  const openEdit = (s: Session) => { setEditing(s); setForm({ name: s.name, start_date: s.start_date, end_date: s.end_date, is_current: s.is_current }); setModalOpen(true); };
  const submit = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...form });
    } else {
      createMutation.mutate({ institution_id: 1, ...form });
    }
  };

  const cols = [
    { key: 'name' as const, label: t('name') },
    { key: 'start_date' as const, label: t('startDate') },
    { key: 'end_date' as const, label: t('endDate') },
    { key: 'is_current' as const, label: t('current') },
  ];
  const rows = sessions.map((s) => ({ ...s, is_current: s.is_current ? t('yes') : t('no') }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">{tNav('sessions')}</h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => downloadPDF(tNav('sessions'), cols, rows)} className="btn flex items-center gap-2">
            <FileText className="h-4 w-4" /> {t('exportPdf')}
          </button>
          <button type="button" onClick={() => downloadCSV('sessions.csv', rows, cols)} className="btn flex items-center gap-2">
            <FileDown className="h-4 w-4" /> {t('exportCsv')}
          </button>
          <button type="button" onClick={openAdd} className="btn btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> {t('add')} {tNav('sessions')}
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
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t('startDate')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t('endDate')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t('current')}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">{t('noData')}</td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id} className="table-row-hover">
                    <td className="px-4 py-3">{s.name}</td>
                    <td className="px-4 py-3">{s.start_date}</td>
                    <td className="px-4 py-3">{s.end_date}</td>
                    <td className="px-4 py-3">
                      {s.is_current ? (
                        <span className="rounded bg-primary-100 px-2 py-0.5 text-xs text-primary-700">{t('yes')}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => openEdit(s)} className="text-slate-600 hover:text-primary-600 mr-2">
                        <Pencil className="h-4 w-4 inline" />
                      </button>
                      <button type="button" onClick={() => confirm(t('delete')) && deleteMutation.mutate(s.id)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
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
            <h3 className="text-lg font-semibold text-slate-800">{editing ? tSessions('editSession') : tSessions('addSession')}</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700">{t('name')}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input w-full"
                placeholder="e.g. 2024-2025"
              />
              <label className="block text-sm font-medium text-slate-700">{t('startDate')}</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="input w-full"
              />
              <label className="block text-sm font-medium text-slate-700">{t('endDate')}</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="input w-full"
              />
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_current} onChange={(e) => setForm((f) => ({ ...f, is_current: e.target.checked }))} className="rounded" />
                <span className="text-sm text-slate-700">{t('current')}</span>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="btn">{t('cancel')}</button>
              <button type="button" onClick={submit} disabled={createMutation.isPending || updateMutation.isPending || !form.name || !form.start_date || !form.end_date} className="btn btn-primary">
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
