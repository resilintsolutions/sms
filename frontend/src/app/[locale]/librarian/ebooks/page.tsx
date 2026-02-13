'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Globe, Search, Plus, Edit, Trash2, X, ExternalLink, FileText, Video, Link as LinkIcon, Download, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

type EBook = {
  id: number; title: string; title_bn?: string; author: string; author_bn?: string;
  category: string; description?: string; description_bn?: string; type: string;
  link: string; file_name?: string; file_type?: string; file_size?: number;
  is_public: boolean; download_count: number; status: string;
};

const TYPES = ['pdf', 'youtube', 'website', 'google_drive', 'document', 'other'];
const CATEGORIES = ['Literature', 'Science', 'Mathematics', 'History', 'Religion', 'Geography', 'Language', 'Arts', 'Reference', 'Children', 'Biography', 'Technology', 'Philosophy', 'Poetry', 'Other'];

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  pdf: { icon: FileText, color: 'text-red-600', bg: 'bg-red-100' },
  youtube: { icon: Video, color: 'text-red-600', bg: 'bg-red-50' },
  website: { icon: Globe, color: 'text-blue-600', bg: 'bg-blue-100' },
  google_drive: { icon: ExternalLink, color: 'text-green-600', bg: 'bg-green-100' },
  document: { icon: FileText, color: 'text-amber-600', bg: 'bg-amber-100' },
  other: { icon: LinkIcon, color: 'text-slate-600', bg: 'bg-slate-100' },
};

const emptyForm = {
  title: '', title_bn: '', author: '', author_bn: '', category: 'Literature',
  description: '', description_bn: '', type: 'pdf', link: '', is_public: true,
};

export default function LibrarianEBooksPage() {
  const t = useTranslations('librarian');
  const tc = useTranslations('common');
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EBook | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['library/ebooks', search, typeFilter],
    queryFn: () => api<EBook[]>(`/library/ebooks?search=${search}&type=${typeFilter}`),
  });

  const ebooks = (data as any)?.data ?? [];

  const saveMut = useMutation({
    mutationFn: (d: any) => editing
      ? api(`/library/ebooks/${editing.id}`, { method: 'PUT', body: JSON.stringify(d) })
      : api('/library/ebooks', { method: 'POST', body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['library/ebooks'] }); toast.success(editing ? t('ebookUpdated') : t('ebookAdded')); closeModal(); },
    onError: () => toast.error(tc('error')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api(`/library/ebooks/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['library/ebooks'] }); toast.success(t('ebookDeleted')); },
    onError: () => toast.error(tc('error')),
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (e: EBook) => {
    setEditing(e);
    setForm({
      title: e.title, title_bn: e.title_bn || '', author: e.author, author_bn: e.author_bn || '',
      category: e.category, description: e.description || '', description_bn: e.description_bn || '',
      type: e.type, link: e.link, is_public: e.is_public,
    });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyForm); };

  const handleSave = () => {
    if (!form.title || !form.author || !form.link) { toast.error(t('fillRequired')); return; }
    saveMut.mutate(form);
  };

  const handleDelete = (e: EBook) => {
    if (confirm(`${t('confirmDelete')} "${e.title}"?`)) deleteMut.mutate(e.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('eLibrary')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('eLibraryDesc')}</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-700 transition-colors">
          <Plus className="h-4 w-4" /> {t('addEbook')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchEbooks')}
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="rounded-xl border border-slate-200 py-2.5 px-4 text-sm text-slate-600 focus:border-purple-400 focus:outline-none">
          <option value="">{t('allTypes')}</option>
          {TYPES.map(ty => <option key={ty} value={ty}>{ty.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
        </select>
        <span className="text-sm text-slate-500">{ebooks.length} {t('resourcesFound')}</span>
      </div>

      {/* E-Books Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : ebooks.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ebooks.map((ebook: EBook) => {
            const cfg = typeConfig[ebook.type] || typeConfig.other;
            const Icon = cfg.icon;
            return (
              <div key={ebook.id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className={`rounded-xl p-2.5 ${cfg.bg} ${cfg.color} shrink-0`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 truncate">{ebook.title}</h4>
                    <p className="text-sm text-slate-500">{ebook.author}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{ebook.category}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>{ebook.type.replace('_',' ')}</span>
                  {ebook.is_public && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-600">{t('public')}</span>}
                </div>
                {ebook.description && <p className="mt-2 text-xs text-slate-400 line-clamp-2">{ebook.description}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <a href={ebook.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700">
                    <ExternalLink className="h-3.5 w-3.5" /> {t('openResource')}
                  </a>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(ebook)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(ebook)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Globe className="h-16 w-16 text-slate-300" />
          <p className="mt-4 text-sm text-slate-500">{t('noEbooksFound')}</p>
          <button onClick={openAdd} className="mt-4 flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700">
            <Plus className="h-4 w-4" /> {t('addEbook')}
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">{editing ? t('editEbook') : t('addEbook')}</h3>
              <button onClick={closeModal} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('resourceTitle')} *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('resourceTitleBn')}</label>
                <input value={form.title_bn} onChange={e => setForm({...form, title_bn: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('author')} *</label>
                <input value={form.author} onChange={e => setForm({...form, author: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('category')}</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('resourceType')} *</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none">
                  {TYPES.map(ty => <option key={ty} value={ty}>{ty.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mt-6">
                  <input type="checkbox" checked={form.is_public} onChange={e => setForm({...form, is_public: e.target.checked})} className="rounded border-slate-300 text-purple-600 focus:ring-purple-400" />
                  {t('publicAccess')}
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('resourceLink')} *</label>
                <input value={form.link} onChange={e => setForm({...form, link: e.target.value})} placeholder="https://..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('description')}</label>
                <textarea rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none" />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={closeModal} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">{tc('cancel')}</button>
              <button onClick={handleSave} disabled={saveMut.isPending}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                {saveMut.isPending ? tc('saving') : editing ? tc('save') : t('addEbook')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}