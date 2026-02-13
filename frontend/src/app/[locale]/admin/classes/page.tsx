'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { downloadCSV, downloadPDF } from '@/lib/export';
import { Plus, Pencil, Trash2, FileText, FileDown } from 'lucide-react';

type ClassItem = {
  id: number;
  name: string;
  numeric_order: number;
  group: string | null;
  sections?: { id: number; name: string }[];
};

export default function ClassesPage() {
  const t = useTranslations('common');
  const tNav = useTranslations('nav');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClassItem | null>(null);
  const [form, setForm] = useState({ name: '', numeric_order: 0, group: '' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api<{ data: ClassItem[] }>('/classes'),
  });
  const classes = (data as { data?: ClassItem[] })?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (body: { institution_id: number; name: string; numeric_order?: number; group?: string }) =>
      api('/classes', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classes'] }); toast.success(t('savedSuccessfully')); setModalOpen(false); setForm({ name: '', numeric_order: 0, group: '' }); },
    onError: () => toast.error(t('saveFailed')),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: number; name?: string; numeric_order?: number; group?: string }) =>
      api(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classes'] }); toast.success(t('savedSuccessfully')); setModalOpen(false); setEditing(null); },
    onError: () => toast.error(t('saveFailed')),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/classes/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classes'] }); toast.success(t('deletedSuccessfully')); },
    onError: () => toast.error(t('deleteFailed')),
  });

  const openAdd = () => { setEditing(null); setForm({ name: '', numeric_order: 0, group: '' }); setModalOpen(true); };
  const openEdit = (c: ClassItem) => { setEditing(c); setForm({ name: c.name, numeric_order: c.numeric_order ?? 0, group: c.group ?? '' }); setModalOpen(true); };
  const submit = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...form });
    } else {
      createMutation.mutate({ institution_id: 1, name: form.name, numeric_order: form.numeric_order || 0, group: form.group || undefined });
    }
  };

  const cols = [
    { key: 'name' as const, label: t('name') },
    { key: 'numeric_order' as const, label: 'Order' },
    { key: 'group' as const, label: 'Group' },
  ];
  const rows = classes.map((c) => ({ name: c.name, numeric_order: c.numeric_order, group: c.group ?? '—' }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">{tNav('classes')}</h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => downloadPDF(tNav('classes'), cols, rows)} className="btn flex items-center gap-2">
            <FileText className="h-4 w-4" /> {t('exportPdf')}
          </button>
          <button type="button" onClick={() => downloadCSV('classes.csv', rows, cols)} className="btn flex items-center gap-2">
            <FileDown className="h-4 w-4" /> {t('exportCsv')}
          </button>
          <button type="button" onClick={openAdd} className="btn btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> {t('add')} {tNav('classes')}
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
                <th className="px-4 py-3 text-left text-sm font-semibold">{t('name')}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Order</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Group</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Sections</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {classes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">{t('noData')}</td>
                </tr>
              ) : (
                classes.map((c) => (
                  <tr key={c.id} className="table-row-hover">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">{c.numeric_order}</td>
                    <td className="px-4 py-3">{c.group ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.sections?.map((s) => s.name).join(', ') ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => openEdit(c)} className="mr-2 text-slate-600 hover:text-primary-600">
                        <Pencil className="h-4 w-4 inline" />
                      </button>
                      <button type="button" onClick={() => confirm(t('delete')) && deleteMutation.mutate(c.id)} className="text-red-600 hover:text-red-700">
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
            <h3 className="text-lg font-semibold text-slate-800">{editing ? t('edit') : t('add')} {tNav('classes')}</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700">{t('name')}</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input w-full" placeholder="e.g. 1" />
              <label className="block text-sm font-medium text-slate-700">Order</label>
              <input type="number" min={0} value={form.numeric_order} onChange={(e) => setForm((f) => ({ ...f, numeric_order: parseInt(e.target.value, 10) || 0 }))} className="input w-full" />
              <label className="block text-sm font-medium text-slate-700">Group (Science/Arts/Commerce)</label>
              <input type="text" value={form.group} onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))} className="input w-full" placeholder="Optional" />
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
