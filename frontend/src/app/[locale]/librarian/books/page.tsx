'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BookOpen, Search, Plus, Edit, Trash2, X, Eye, ChevronDown, Filter } from 'lucide-react';
import { toast } from 'sonner';

type Book = {
  id: number; title: string; title_bn?: string; author: string; author_bn?: string;
  isbn: string; category: string; publisher?: string; edition?: string; language?: string;
  pages?: number; shelf_location?: string; total_copies: number; available_copies: number;
  description?: string; description_bn?: string; status: string;
};

const CATEGORIES = [
  'Literature', 'Science', 'Mathematics', 'History', 'Religion',
  'Geography', 'Language', 'Arts', 'Reference', 'Children',
  'Biography', 'Technology', 'Philosophy', 'Poetry', 'Other',
];

const emptyForm = {
  title: '', title_bn: '', author: '', author_bn: '', isbn: '', category: 'Literature',
  publisher: '', edition: '', language: 'Bangla', pages: '', shelf_location: '',
  total_copies: '1', description: '', description_bn: '',
};

export default function LibrarianBooksPage() {
  const t = useTranslations('librarian');
  const tc = useTranslations('common');
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['library/books', search, catFilter],
    queryFn: () => api<Book[]>(`/library/books?search=${search}&category=${catFilter}`),
  });

  const { data: viewData } = useQuery({
    queryKey: ['library/books', viewing],
    queryFn: () => api<{ book: Book; issue_history: any[] }>(`/library/books/${viewing}`),
    enabled: viewing !== null,
  });

  const books = (data as any)?.data ?? [];

  const saveMut = useMutation({
    mutationFn: (d: any) => editing
      ? api(`/library/books/${editing.id}`, { method: 'PUT', body: JSON.stringify(d) })
      : api('/library/books', { method: 'POST', body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['library/books'] }); qc.invalidateQueries({ queryKey: ['dashboard/librarian'] }); toast.success(editing ? t('bookUpdated') : t('bookAdded')); closeModal(); },
    onError: () => toast.error(tc('error')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api(`/library/books/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['library/books'] }); qc.invalidateQueries({ queryKey: ['dashboard/librarian'] }); toast.success(t('bookDeleted')); },
    onError: (e: any) => toast.error(e?.message || tc('error')),
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (b: Book) => {
    setEditing(b);
    setForm({
      title: b.title, title_bn: b.title_bn || '', author: b.author, author_bn: b.author_bn || '',
      isbn: b.isbn || '', category: b.category, publisher: b.publisher || '', edition: b.edition || '',
      language: b.language || 'Bangla', pages: b.pages ? String(b.pages) : '',
      shelf_location: b.shelf_location || '', total_copies: String(b.total_copies),
      description: b.description || '', description_bn: b.description_bn || '',
    });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyForm); };

  const handleSave = () => {
    if (!form.title || !form.author || !form.category) { toast.error(t('fillRequired')); return; }
    const payload: any = { ...form, total_copies: parseInt(form.total_copies) || 1 };
    if (form.pages) payload.pages = parseInt(form.pages);
    else delete payload.pages;
    saveMut.mutate(payload);
  };

  const handleDelete = (b: Book) => {
    if (confirm(`${t('confirmDelete')} "${b.title}"?`)) deleteMut.mutate(b.id);
  };

  const categories = Array.from(new Set(books.map((b: Book) => b.category))).sort() as string[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('bookCatalog')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('bookCatalogDesc')}</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-700 transition-colors">
          <Plus className="h-4 w-4" /> {t('addBook')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchBooks')}
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="rounded-xl border border-slate-200 py-2.5 px-4 text-sm text-slate-600 focus:border-purple-400 focus:outline-none">
          <option value="">{t('allCategories')}</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-sm text-slate-500">{books.length} {t('booksFound')}</span>
      </div>

      {/* Books Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : books.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book: Book) => (
            <div key={book.id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-purple-100 p-3 text-purple-600 shrink-0">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-800 truncate">{book.title}</h4>
                  <p className="text-sm text-slate-500">{book.author}</p>
                  {book.isbn && <p className="mt-1 text-xs font-mono text-slate-400">ISBN: {book.isbn}</p>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{book.category}</span>
                {book.shelf_location && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-600">{book.shelf_location}</span>}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={`text-sm font-medium ${book.available_copies > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {book.available_copies}/{book.total_copies} {t('available')}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setViewing(book.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-purple-600"><Eye className="h-4 w-4" /></button>
                  <button onClick={() => openEdit(book)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"><Edit className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(book)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-16 w-16 text-slate-300" />
          <p className="mt-4 text-sm text-slate-500">{t('noBooksFound')}</p>
          <button onClick={openAdd} className="mt-4 flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700">
            <Plus className="h-4 w-4" /> {t('addBook')}
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">{editing ? t('editBook') : t('addBook')}</h3>
              <button onClick={closeModal} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('bookTitle')} *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('bookTitleBn')}</label>
                <input value={form.title_bn} onChange={e => setForm({...form, title_bn: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('author')} *</label>
                <input value={form.author} onChange={e => setForm({...form, author: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('authorBn')}</label>
                <input value={form.author_bn} onChange={e => setForm({...form, author_bn: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ISBN</label>
                <input value={form.isbn} onChange={e => setForm({...form, isbn: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('category')} *</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('publisher')}</label>
                <input value={form.publisher} onChange={e => setForm({...form, publisher: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('edition')}</label>
                <input value={form.edition} onChange={e => setForm({...form, edition: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('language')}</label>
                <select value={form.language} onChange={e => setForm({...form, language: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none">
                  <option value="Bangla">Bangla</option>
                  <option value="English">English</option>
                  <option value="Arabic">Arabic</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('pages')}</label>
                <input type="number" value={form.pages} onChange={e => setForm({...form, pages: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('shelfLocation')}</label>
                <input value={form.shelf_location} onChange={e => setForm({...form, shelf_location: e.target.value})} placeholder="e.g. Shelf A-3" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('totalCopies')} *</label>
                <input type="number" min="1" value={form.total_copies} onChange={e => setForm({...form, total_copies: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('description')}</label>
                <textarea rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none" />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={closeModal} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">{tc('cancel')}</button>
              <button onClick={handleSave} disabled={saveMut.isPending} className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                {saveMut.isPending ? tc('saving') : editing ? tc('save') : t('addBook')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {viewing !== null && viewData?.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewing(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800">{t('bookDetails')}</h3>
              <button onClick={() => setViewing(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            {(() => { const b = (viewData.data as any).book; const hist = (viewData.data as any).issue_history ?? []; return (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><span className="text-xs text-slate-500">{t('bookTitle')}</span><p className="font-medium text-slate-800">{b.title}</p></div>
                  <div><span className="text-xs text-slate-500">{t('author')}</span><p className="font-medium text-slate-800">{b.author}</p></div>
                  <div><span className="text-xs text-slate-500">ISBN</span><p className="font-mono text-slate-700">{b.isbn || '—'}</p></div>
                  <div><span className="text-xs text-slate-500">{t('category')}</span><p className="text-slate-700">{b.category}</p></div>
                  <div><span className="text-xs text-slate-500">{t('publisher')}</span><p className="text-slate-700">{b.publisher || '—'}</p></div>
                  <div><span className="text-xs text-slate-500">{t('shelfLocation')}</span><p className="text-slate-700">{b.shelf_location || '—'}</p></div>
                  <div><span className="text-xs text-slate-500">{t('totalCopies')}</span><p className="text-slate-700">{b.total_copies}</p></div>
                  <div><span className="text-xs text-slate-500">{t('availableBooks')}</span><p className={`font-medium ${b.available_copies > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{b.available_copies}</p></div>
                </div>
                {b.description && <div className="mt-4"><span className="text-xs text-slate-500">{t('description')}</span><p className="mt-1 text-sm text-slate-600">{b.description}</p></div>}
                {hist.length > 0 && (
                  <div className="mt-6">
                    <h4 className="mb-3 text-sm font-semibold text-slate-700">{t('issueHistory')}</h4>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-slate-50"><th className="px-3 py-2 text-left text-xs font-medium text-slate-500">{t('studentName')}</th><th className="px-3 py-2 text-left text-xs font-medium text-slate-500">{t('issueDate')}</th><th className="px-3 py-2 text-left text-xs font-medium text-slate-500">{t('returnDate')}</th><th className="px-3 py-2 text-center text-xs font-medium text-slate-500">{t('statusLabel')}</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {hist.slice(0, 10).map((h: any) => (
                            <tr key={h.id}>
                              <td className="px-3 py-2 text-slate-700">{h.student_name}</td>
                              <td className="px-3 py-2 text-slate-500">{new Date(h.issue_date).toLocaleDateString('en-GB')}</td>
                              <td className="px-3 py-2 text-slate-500">{h.return_date ? new Date(h.return_date).toLocaleDateString('en-GB') : '—'}</td>
                              <td className="px-3 py-2 text-center"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${h.status === 'returned' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{h.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ); })()}
          </div>
        </div>
      )}
    </div>
  );
}