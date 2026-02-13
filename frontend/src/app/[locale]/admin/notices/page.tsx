'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { downloadCSV, downloadPDF } from '@/lib/export';
import { Plus, Pencil, Trash2, FileText, FileDown } from 'lucide-react';

type Notice = {
  id: number;
  title: string;
  title_bn: string | null;
  body: string | null;
  audience: string;
  is_published: boolean;
  published_at: string | null;
  expires_at: string | null;
};

function getNoticesList(res: unknown): Notice[] {
  const d = (res as { data?: Notice[] | { data?: Notice[] } })?.data;
  return Array.isArray(d) ? d : (d as { data?: Notice[] })?.data ?? [];
}

export default function NoticesPage() {
  const t = useTranslations('common');
  const tNav = useTranslations('nav');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState({ title: '', title_bn: '', body: '', audience: 'all', is_published: false, expires_at: '' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: () => api<{ data: Notice[] }>('/notices?per_page=100'),
  });
  const notices = getNoticesList(data?.data ?? data);

  const createMutation = useMutation({
    mutationFn: (body: { institution_id: number; title: string; title_bn?: string; body?: string; audience?: string; is_published?: boolean; expires_at?: string }) =>
      api('/notices', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notices'] }); queryClient.invalidateQueries({ queryKey: ['notices-preview'] }); toast.success(t('savedSuccessfully')); setModalOpen(false); setForm({ title: '', title_bn: '', body: '', audience: 'all', is_published: false, expires_at: '' }); },
    onError: () => toast.error(t('saveFailed')),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: number; title?: string; title_bn?: string; body?: string; audience?: string; is_published?: boolean; expires_at?: string }) =>
      api(`/notices/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notices'] }); queryClient.invalidateQueries({ queryKey: ['notices-preview'] }); toast.success(t('savedSuccessfully')); setModalOpen(false); setEditing(null); },
    onError: () => toast.error(t('saveFailed')),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/notices/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notices'] }); queryClient.invalidateQueries({ queryKey: ['notices-preview'] }); toast.success(t('deletedSuccessfully')); },
    onError: () => toast.error(t('deleteFailed')),
  });

  const openAdd = () => { setEditing(null); setForm({ title: '', title_bn: '', body: '', audience: 'all', is_published: false, expires_at: '' }); setModalOpen(true); };
  const openEdit = (n: Notice) => {
    setEditing(n);
    setForm({
      title: n.title,
      title_bn: n.title_bn ?? '',
      body: n.body ?? '',
      audience: n.audience ?? 'all',
      is_published: n.is_published ?? false,
      expires_at: n.expires_at ? n.expires_at.slice(0, 10) : '',
    });
    setModalOpen(true);
  };
  const submit = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...form, expires_at: form.expires_at || undefined });
    } else {
      createMutation.mutate({ institution_id: 1, ...form, expires_at: form.expires_at || undefined });
    }
  };

  const cols = [
    { key: 'title' as const, label: t('name') },
    { key: 'audience' as const, label: 'Audience' },
    { key: 'published_at' as const, label: 'Published' },
  ];
  const rows = notices.map((n) => ({ title: n.title_bn || n.title, audience: n.audience, published_at: n.published_at ?? '—' }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">{tNav('notices')}</h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => downloadPDF(tNav('notices'), cols, rows)} className="btn flex items-center gap-2">
            <FileText className="h-4 w-4" /> {t('exportPdf')}
          </button>
          <button type="button" onClick={() => downloadCSV('notices.csv', rows, cols)} className="btn flex items-center gap-2">
            <FileDown className="h-4 w-4" /> {t('exportCsv')}
          </button>
          <button type="button" onClick={openAdd} className="btn btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> {t('add')} {tNav('notices')}
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
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Audience</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Published</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {notices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">{t('noData')}</td>
                </tr>
              ) : (
                notices.map((n) => (
                  <tr key={n.id} className="table-row-hover">
                    <td className="px-4 py-3 font-medium">{n.title_bn || n.title}</td>
                    <td className="px-4 py-3 text-sm">{n.audience}</td>
                    <td className="px-4 py-3 text-sm">{n.is_published ? (n.published_at ?? 'Yes') : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => openEdit(n)} className="mr-2 text-slate-600 hover:text-primary-600"><Pencil className="h-4 w-4 inline" /></button>
                      <button type="button" onClick={() => confirm(t('delete')) && deleteMutation.mutate(n.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4 inline" /></button>
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
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800">{editing ? t('edit') : t('add')} {tNav('notices')}</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700">Title</label>
              <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input w-full" required />
              <label className="block text-sm font-medium text-slate-700">Title (Bangla)</label>
              <input type="text" value={form.title_bn} onChange={(e) => setForm((f) => ({ ...f, title_bn: e.target.value }))} className="input w-full" />
              <label className="block text-sm font-medium text-slate-700">Body</label>
              <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} className="input w-full min-h-[80px]" />
              <label className="block text-sm font-medium text-slate-700">Audience</label>
              <input type="text" value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))} className="input w-full" placeholder="all" />
              <label className="block text-sm font-medium text-slate-700">Expires at</label>
              <input type="date" value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} className="input w-full" />
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_published} onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))} className="rounded" />
                <span className="text-sm text-slate-700">Published</span>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="btn">{t('cancel')}</button>
              <button type="button" onClick={submit} disabled={createMutation.isPending || updateMutation.isPending || !form.title} className="btn btn-primary">{t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
