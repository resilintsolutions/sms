'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Search, Users, GraduationCap, BookOpen, X, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

type StudentInfo = {
  id: number; student_id: string; name: string; name_bn?: string;
  class_name?: string; section_name?: string; status: string;
};

type StudentBook = {
  id: number; book_title: string; issue_date: string; due_date: string;
  return_date: string | null; fine_amount: number; fine_paid: boolean;
  status: string; is_overdue: boolean;
};

export default function LibrarianStudentsPage() {
  const t = useTranslations('librarian');
  const tc = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => api<{ data: { data?: StudentInfo[] } }>('/students?per_page=200'),
  });

  const { data: booksData, isLoading: booksLoading } = useQuery({
    queryKey: ['library/student-books', selectedStudent?.id],
    queryFn: () => api<StudentBook[]>(`/library/students/${selectedStudent!.id}/books`),
    enabled: selectedStudent !== null,
  });

  const studentsPayload = (data as { data?: { data?: StudentInfo[] } })?.data;
  const students = Array.isArray(studentsPayload) ? studentsPayload : (studentsPayload as { data?: StudentInfo[] })?.data ?? [];
  const studentBooks = (booksData as any)?.data ?? [];

  const filtered = searchQuery
    ? students.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.name_bn && s.name_bn.includes(searchQuery))
      )
    : students;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{t('studentLookup')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('studentLookupDesc')}</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchStudents')}
          className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200" />
      </div>

      {/* Students Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{t('studentId')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{tc('name')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{t('class')}</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">{t('statusLabel')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">{t('bookHistory')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                [1,2,3,4,5].map(i => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-6 animate-pulse rounded bg-slate-100" /></td></tr>)
              ) : filtered.length > 0 ? filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-500">{s.student_id}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{s.name} {s.name_bn ? <span className="text-slate-400 text-xs">({s.name_bn})</span> : ''}</td>
                  <td className="px-4 py-3 text-slate-500">{s.class_name ? `${s.class_name} - ${s.section_name}` : '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelectedStudent(s)}
                      className="flex items-center gap-1.5 ml-auto rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors">
                      <BookOpen className="h-3 w-3" /> {t('viewBooks')}
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-4 py-12 text-center">
                  <GraduationCap className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">{tc('noData')}</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Book History Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedStudent(null)}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{t('bookHistoryFor')} {selectedStudent.name}</h3>
                <p className="text-sm text-slate-500">{selectedStudent.student_id} | {selectedStudent.class_name} - {selectedStudent.section_name}</p>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            {booksLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div>
            ) : studentBooks.length > 0 ? (
              <div className="space-y-3">
                {studentBooks.map((book: StudentBook) => (
                  <div key={book.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{book.book_title}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <span>{t('issueDate')}: {new Date(book.issue_date).toLocaleDateString('en-GB')}</span>
                        <span>{t('dueDate')}: {new Date(book.due_date).toLocaleDateString('en-GB')}</span>
                        {book.return_date && <span>{t('returnDate')}: {new Date(book.return_date).toLocaleDateString('en-GB')}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {book.fine_amount > 0 && (
                        <span className={`text-sm font-medium ${book.fine_paid ? 'text-emerald-600' : 'text-red-600'}`}>৳{book.fine_amount}</span>
                      )}
                      {book.is_overdue ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"><AlertTriangle className="h-3 w-3" /> {t('overdue')}</span>
                      ) : book.status === 'returned' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"><CheckCircle className="h-3 w-3" /> {t('returned')}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"><Clock className="h-3 w-3" /> {t('issued')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">{t('noBooksIssued')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}