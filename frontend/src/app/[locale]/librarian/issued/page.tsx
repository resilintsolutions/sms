'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BookOpen, Search, Plus, Undo2, X, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

type Issue = {
  id: number; book_id: number; student_id: number; issue_date: string; due_date: string;
  return_date: string | null; fine_amount: number; fine_paid: boolean; status: string;
  remarks: string | null; book_title: string; student_name: string; student_roll: string;
  class_name: string; section_name: string; is_overdue: boolean;
};

type Book = { id: number; title: string; available_copies: number; };
type Student = { id: number; name: string; roll: string; class_name: string; section_name: string; };

export default function LibrarianIssuedPage() {
  const t = useTranslations('librarian');
  const tc = useTranslations('common');
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState<Issue | null>(null);
  const [bookSearch, setBookSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  const { data: issuesData, isLoading } = useQuery({
    queryKey: ['library/issues', search, statusFilter],
    queryFn: () => api<Issue[]>(`/library/issues?search=${search}&status=${statusFilter}`),
  });

  const { data: booksData } = useQuery({
    queryKey: ['library/books', bookSearch],
    queryFn: () => api<Book[]>(`/library/books?search=${bookSearch}`),
    enabled: showIssueModal,
  });

  const { data: studentsData } = useQuery({
    queryKey: ['students', studentSearch],
    queryFn: () => api<Student[]>(`/students?search=${studentSearch}`),
    enabled: showIssueModal,
  });

  const issues = (issuesData as any)?.data ?? [];
  const availableBooks = ((booksData as any)?.data ?? []).filter((b: Book) => b.available_copies > 0);
  const students = (studentsData as any)?.data ?? [];

  const issueMut = useMutation({
    mutationFn: (d: any) => api('/library/issues', { method: 'POST', body: JSON.stringify(d) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library/issues'] });
      qc.invalidateQueries({ queryKey: ['library/books'] });
      qc.invalidateQueries({ queryKey: ['dashboard/librarian'] });
      toast.success(t('bookIssued'));
      closeIssueModal();
    },
    onError: (e: any) => toast.error(e?.message || tc('error')),
  });

  const returnMut = useMutation({
    mutationFn: (id: number) => api(`/library/issues/${id}/return`, { method: 'PUT' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library/issues'] });
      qc.invalidateQueries({ queryKey: ['library/books'] });
      qc.invalidateQueries({ queryKey: ['dashboard/librarian'] });
      toast.success(t('bookReturned'));
      setShowReturnModal(null);
    },
    onError: (e: any) => toast.error(e?.message || tc('error')),
  });

  const closeIssueModal = () => {
    setShowIssueModal(false); setSelectedBook(null); setSelectedStudent(null);
    setBookSearch(''); setStudentSearch('');
  };

  const handleIssue = () => {
    if (!selectedBook || !selectedStudent) { toast.error(t('selectBookAndStudent')); return; }
    issueMut.mutate({ book_id: selectedBook, student_id: selectedStudent, due_date: dueDate });
  };

  const statusCounts = {
    all: issues.length,
    issued: issues.filter((i: Issue) => i.status === 'issued' && !i.is_overdue).length,
    overdue: issues.filter((i: Issue) => i.is_overdue).length,
    returned: issues.filter((i: Issue) => i.status === 'returned').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('issuedBooks')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('issuedBooksDesc')}</p>
        </div>
        <button onClick={() => setShowIssueModal(true)} className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-700 transition-colors">
          <Plus className="h-4 w-4" /> {t('issueBook')}
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-px">
        {(['', 'issued', 'overdue', 'returned'] as const).map(s => {
          const label = s === '' ? t('all') : s === 'issued' ? t('issued') : s === 'overdue' ? t('overdue') : t('returned');
          const count = s === '' ? statusCounts.all : s === 'issued' ? statusCounts.issued : s === 'overdue' ? statusCounts.overdue : statusCounts.returned;
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${statusFilter === s ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {label} <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchIssues')}
          className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200" />
      </div>

      {/* Issues Table */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div>
      ) : issues.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{t('bookTitle')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{t('studentName')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{t('classSection')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{t('issueDate')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{t('dueDate')}</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">{t('statusLabel')}</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">{t('fine')}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">{t('actions')}</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {issues.map((issue: Issue) => (
                <tr key={issue.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{issue.book_title}</td>
                  <td className="px-4 py-3 text-slate-600">{issue.student_name}</td>
                  <td className="px-4 py-3 text-slate-500">{issue.class_name} - {issue.section_name}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(issue.issue_date).toLocaleDateString('en-GB')}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(issue.due_date).toLocaleDateString('en-GB')}</td>
                  <td className="px-4 py-3 text-center">
                    {issue.is_overdue ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"><AlertTriangle className="h-3 w-3" /> {t('overdue')}</span>
                    ) : issue.status === 'returned' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"><CheckCircle className="h-3 w-3" /> {t('returned')}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"><Clock className="h-3 w-3" /> {t('issued')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {issue.fine_amount > 0 ? (
                      <span className={`text-sm font-medium ${issue.fine_paid ? 'text-emerald-600' : 'text-red-600'}`}>৳{issue.fine_amount}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {issue.status === 'issued' && (
                      <button onClick={() => setShowReturnModal(issue)} className="flex items-center gap-1.5 ml-auto rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
                        <Undo2 className="h-3 w-3" /> {t('returnBook')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-16 w-16 text-slate-300" />
          <p className="mt-4 text-sm text-slate-500">{t('noIssuesFound')}</p>
        </div>
      )}

      {/* Issue Book Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">{t('issueBook')}</h3>
              <button onClick={closeIssueModal} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              {/* Book Search & Select */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('selectBook')} *</label>
                <input value={bookSearch} onChange={e => { setBookSearch(e.target.value); setSelectedBook(null); }} placeholder={t('searchBooks')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none" />
                {bookSearch && !selectedBook && availableBooks.length > 0 && (
                  <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                    {availableBooks.slice(0, 8).map((b: Book) => (
                      <button key={b.id} onClick={() => { setSelectedBook(b.id); setBookSearch(b.title); }}
                        className="flex w-full items-center justify-between px-3 py-2 text-sm text-left hover:bg-purple-50">
                        <span>{b.title}</span>
                        <span className="text-xs text-emerald-600">{b.available_copies} {t('available')}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedBook && <p className="mt-1 text-xs text-emerald-600">{t('bookSelected')}</p>}
              </div>

              {/* Student Search & Select */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('selectStudent')} *</label>
                <input value={studentSearch} onChange={e => { setStudentSearch(e.target.value); setSelectedStudent(null); }} placeholder={t('searchStudents')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none" />
                {studentSearch && !selectedStudent && students.length > 0 && (
                  <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                    {students.slice(0, 8).map((s: Student) => (
                      <button key={s.id} onClick={() => { setSelectedStudent(s.id); setStudentSearch(`${s.name} (${s.roll})`); }}
                        className="flex w-full items-center justify-between px-3 py-2 text-sm text-left hover:bg-purple-50">
                        <span>{s.name}</span>
                        <span className="text-xs text-slate-400">{s.class_name} | {s.roll}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedStudent && <p className="mt-1 text-xs text-emerald-600">{t('studentSelected')}</p>}
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('dueDate')} *</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none" />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={closeIssueModal} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">{tc('cancel')}</button>
              <button onClick={handleIssue} disabled={issueMut.isPending || !selectedBook || !selectedStudent}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                {issueMut.isPending ? tc('saving') : t('issueBook')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Book Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowReturnModal(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">{t('returnBook')}</h3>
              <button onClick={() => setShowReturnModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="text-slate-500">{t('bookTitle')}:</span> <strong>{showReturnModal.book_title}</strong></p>
              <p><span className="text-slate-500">{t('studentName')}:</span> <strong>{showReturnModal.student_name}</strong></p>
              <p><span className="text-slate-500">{t('issueDate')}:</span> {new Date(showReturnModal.issue_date).toLocaleDateString('en-GB')}</p>
              <p><span className="text-slate-500">{t('dueDate')}:</span> {new Date(showReturnModal.due_date).toLocaleDateString('en-GB')}</p>
              {showReturnModal.is_overdue && (
                <div className="mt-3 rounded-lg bg-red-50 p-3 text-red-700">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">{t('overdueWarning')}</span>
                  </div>
                  <p className="mt-1 text-xs">{t('fineWillBeCalculated')}</p>
                </div>
              )}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={() => setShowReturnModal(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">{tc('cancel')}</button>
              <button onClick={() => returnMut.mutate(showReturnModal.id)} disabled={returnMut.isPending}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                <Undo2 className="h-4 w-4" /> {returnMut.isPending ? tc('saving') : t('confirmReturn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}