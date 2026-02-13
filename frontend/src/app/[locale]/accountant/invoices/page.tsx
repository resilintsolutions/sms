'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  FileText, DollarSign, Plus, Search, Filter, Eye, Trash2,
  X, Receipt, ChevronDown, Printer, AlertCircle, CheckCircle2,
  Clock, Users,
} from 'lucide-react';

type FeeHead = { id: number; name: string; name_bn: string | null; frequency: string };
type StudentRow = { id: number; name: string; name_bn?: string; student_id: string; photo?: string; class_name?: string; section_name?: string };
type SessionItem = { id: number; name: string };
type ClassItem = { id: number; name: string };
type InvoiceItem = { id: number; fee_head_id: number; amount: string; fee_head?: FeeHead };
type Payment = { id: number; amount: string; method: string; payment_date: string; receipt_no?: string };
type Invoice = {
  id: number;
  invoice_no: string;
  total_amount: string;
  paid_amount: string;
  due_amount: string;
  sub_total?: string;
  discount_amount?: string;
  status: string;
  due_date?: string;
  month?: string;
  student_id: number;
  academic_session_id: number;
  student?: { id: number; name: string; name_bn?: string; student_id?: string };
  academic_session?: { name: string };
  items?: InvoiceItem[];
  payments?: Payment[];
};

export default function AccountantInvoicesPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const t = useTranslations('common');
  const tFees = useTranslations('fees');
  const tAcc = useTranslations('accountant');
  const queryClient = useQueryClient();

  // ─── Filter state ───
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sessionFilter, setSessionFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Payment modal ───
  const [paymentModal, setPaymentModal] = useState<Invoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_date: new Date().toISOString().slice(0, 10), method: 'cash', reference: '', note: '' });

  // ─── Invoice detail modal ───
  const [detailModal, setDetailModal] = useState<Invoice | null>(null);

  // ─── Create invoice modal ───
  const [createModal, setCreateModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [invoiceSessionId, setInvoiceSessionId] = useState<number>(0);
  const [invoiceMonth, setInvoiceMonth] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [invoiceDiscount, setInvoiceDiscount] = useState('0');
  const [lineItems, setLineItems] = useState<{ fee_head_id: number; amount: string }[]>([]);

  // ─── Queries ───
  const { data: sessionsData } = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: () => api<{ data: SessionItem[] }>('/academic-sessions?per_page=100'),
  });
  const sessionsPayload = (sessionsData as { data?: { data?: SessionItem[] } | SessionItem[] })?.data;
  const sessions: SessionItem[] = Array.isArray(sessionsPayload) ? sessionsPayload : (sessionsPayload as { data?: SessionItem[] })?.data ?? [];

  if (sessions.length > 0 && invoiceSessionId === 0) {
    setInvoiceSessionId(sessions[0].id);
  }
  if (sessions.length > 0 && sessionFilter === 0) {
    setSessionFilter(sessions[0].id);
  }

  const { data: headsData } = useQuery({
    queryKey: ['fee-heads'],
    queryFn: () => api<{ data: FeeHead[] }>('/fee-heads'),
  });
  const heads: FeeHead[] = (headsData as { data?: FeeHead[] })?.data ?? [];

  const invoicesUrl = `/invoices?per_page=200${sessionFilter ? `&academic_session_id=${sessionFilter}` : ''}${statusFilter ? `&status=${statusFilter}` : ''}`;
  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', sessionFilter, statusFilter],
    queryFn: () => api<{ data: { data?: Invoice[] } }>(invoicesUrl),
  });
  const invoicesPayload = (invoicesData as { data?: { data?: Invoice[] } })?.data;
  const allInvoices: Invoice[] = Array.isArray(invoicesPayload) ? invoicesPayload : (invoicesPayload as { data?: Invoice[] })?.data ?? [];

  const invoices = useMemo(() => {
    if (!searchQuery.trim()) return allInvoices;
    const q = searchQuery.toLowerCase();
    return allInvoices.filter(inv =>
      inv.invoice_no.toLowerCase().includes(q) ||
      inv.student?.name?.toLowerCase().includes(q) ||
      inv.student?.student_id?.toLowerCase().includes(q)
    );
  }, [allInvoices, searchQuery]);

  const { data: studentsData } = useQuery({
    queryKey: ['students', studentSearch],
    queryFn: () => api<{ data: { data?: StudentRow[] } }>(`/students?search=${studentSearch}&per_page=20`),
    enabled: createModal,
  });
  const studentsPayload = (studentsData as { data?: { data?: StudentRow[] } })?.data;
  const students: StudentRow[] = Array.isArray(studentsPayload) ? studentsPayload : (studentsPayload as { data?: StudentRow[] })?.data ?? [];

  // ─── Mutations ───
  const collectPaymentMutation = useMutation({
    mutationFn: (body: { invoice_id: number; amount: number; payment_date: string; method: string; reference?: string; note?: string }) =>
      api('/payments', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard/accountant'] });
      queryClient.invalidateQueries({ queryKey: ['payments-list'] });
      toast.success(tAcc('paymentCollected'));
      setPaymentModal(null);
    },
    onError: () => toast.error(t('saveFailed')),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (body: {
      institution_id: number;
      student_id: number;
      academic_session_id: number;
      month?: string;
      due_date?: string;
      discount_amount?: number;
      items: { fee_head_id: number; amount: number }[];
    }) => api('/invoices', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(tAcc('invoiceCreated'));
      setCreateModal(false);
      resetCreateForm();
    },
    onError: () => toast.error(t('saveFailed')),
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: number) => api(`/invoices/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(t('deletedSuccessfully'));
    },
    onError: () => toast.error(t('deleteFailed')),
  });

  // ─── Helpers ───
  const resetCreateForm = () => {
    setSelectedStudent(null);
    setStudentSearch('');
    setLineItems([]);
    setInvoiceDiscount('0');
    setInvoiceMonth('');
    setInvoiceDueDate(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  };

  const addLineItem = () => {
    setLineItems(items => [...items, { fee_head_id: heads[0]?.id || 0, amount: '' }]);
  };

  const removeLineItem = (idx: number) => {
    setLineItems(items => items.filter((_, i) => i !== idx));
  };

  const updateLineItem = (idx: number, field: 'fee_head_id' | 'amount', value: string | number) => {
    setLineItems(items => items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const lineSubtotal = lineItems.reduce((sum, li) => sum + (parseFloat(li.amount) || 0), 0);
  const discount = parseFloat(invoiceDiscount) || 0;
  const lineTotal = Math.max(0, lineSubtotal - discount);

  const handleCreateInvoice = () => {
    if (!selectedStudent || lineItems.length === 0) return;
    createInvoiceMutation.mutate({
      institution_id: 1,
      student_id: selectedStudent.id,
      academic_session_id: invoiceSessionId,
      month: invoiceMonth || undefined,
      due_date: invoiceDueDate || undefined,
      discount_amount: discount > 0 ? discount : undefined,
      items: lineItems.map(li => ({ fee_head_id: li.fee_head_id, amount: parseFloat(li.amount) || 0 })),
    });
  };

  const openPayment = (inv: Invoice) => {
    setPaymentModal(inv);
    setPaymentForm({ amount: inv.due_amount, payment_date: new Date().toISOString().slice(0, 10), method: 'cash', reference: '', note: '' });
  };

  const handleCollect = () => {
    if (!paymentModal) return;
    collectPaymentMutation.mutate({
      invoice_id: paymentModal.id,
      amount: parseFloat(paymentForm.amount),
      payment_date: paymentForm.payment_date,
      method: paymentForm.method,
      reference: paymentForm.reference || undefined,
      note: paymentForm.note || undefined,
    });
  };

  const fetchInvoiceDetail = async (inv: Invoice) => {
    const res = await api<{ data: Invoice }>(`/invoices/${inv.id}`);
    const detail = (res as { data?: Invoice })?.data;
    if (detail) setDetailModal(detail);
  };

  const printReceipt = (inv: Invoice, payment?: Payment) => {
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
      .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
      .header h2 { margin: 0 0 4px; font-size: 16px; }
      .row { display: flex; justify-content: space-between; margin: 4px 0; }
      .divider { border-top: 1px dashed #999; margin: 10px 0; }
      .total { font-weight: bold; font-size: 14px; }
      @media print { body { padding: 10px; } }
    </style></head><body>
    <div class="header">
      <h2>Payment Receipt</h2>
      <p>${payment?.receipt_no || inv.invoice_no}</p>
    </div>
    <div class="row"><span>Student:</span><span>${inv.student?.name || '—'}</span></div>
    <div class="row"><span>ID:</span><span>${inv.student?.student_id || '—'}</span></div>
    <div class="row"><span>Invoice No:</span><span>${inv.invoice_no}</span></div>
    <div class="divider"></div>
    <div class="row"><span>Total Amount:</span><span>৳${Number(inv.total_amount).toLocaleString()}</span></div>
    <div class="row"><span>Paid Amount:</span><span>৳${Number(inv.paid_amount).toLocaleString()}</span></div>
    <div class="row total"><span>Due Amount:</span><span>৳${Number(inv.due_amount).toLocaleString()}</span></div>
    ${payment ? `
    <div class="divider"></div>
    <div class="row"><span>Payment:</span><span>৳${Number(payment.amount).toLocaleString()}</span></div>
    <div class="row"><span>Method:</span><span>${payment.method}</span></div>
    <div class="row"><span>Date:</span><span>${payment.payment_date}</span></div>
    ` : ''}
    <div class="divider"></div>
    <p style="text-align:center;color:#666;margin-top:20px;">Thank you for your payment</p>
    <script>window.print();</script></body></html>`);
    w.document.close();
  };

  const statusColor: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700',
    partial: 'bg-amber-100 text-amber-700',
    pending: 'bg-red-100 text-red-700',
    draft: 'bg-slate-100 text-slate-600',
  };

  const statusIcon: Record<string, typeof CheckCircle2> = {
    paid: CheckCircle2,
    partial: Clock,
    pending: AlertCircle,
  };

  // Stats
  const totalAmount = invoices.reduce((s, inv) => s + Number(inv.total_amount), 0);
  const totalPaid = invoices.reduce((s, inv) => s + Number(inv.paid_amount), 0);
  const totalDue = invoices.reduce((s, inv) => s + Number(inv.due_amount), 0);
  const pendingCount = invoices.filter(inv => inv.status === 'pending' || inv.status === 'partial').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-7 w-7 text-cyan-600" />
            {tFees('invoices')}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{tAcc('invoicesDesc')}</p>
        </div>
        <button onClick={() => { resetCreateForm(); setCreateModal(true); }} className="btn btn-primary flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm text-white hover:bg-cyan-700">
          <Plus className="h-4 w-4" /> {tAcc('createInvoice')}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="rounded-lg bg-blue-50 p-2"><FileText className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-xs text-slate-500">{tFees('totalInvoices')}</p><p className="text-lg font-bold text-slate-800">{invoices.length}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="rounded-lg bg-cyan-50 p-2"><DollarSign className="h-5 w-5 text-cyan-600" /></div>
          <div><p className="text-xs text-slate-500">{tFees('totalAmount')}</p><p className="text-lg font-bold text-slate-800">৳{totalAmount.toLocaleString()}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="rounded-lg bg-emerald-50 p-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
          <div><p className="text-xs text-slate-500">{tFees('totalPaid')}</p><p className="text-lg font-bold text-emerald-600">৳{totalPaid.toLocaleString()}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="rounded-lg bg-red-50 p-2"><AlertCircle className="h-5 w-5 text-red-500" /></div>
          <div><p className="text-xs text-slate-500">{tFees('totalDue')}</p><p className="text-lg font-bold text-red-600">৳{totalDue.toLocaleString()}</p></div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={tAcc('searchInvoices')}
            className="input pl-10 w-full"
          />
        </div>
        <select value={sessionFilter} onChange={e => setSessionFilter(Number(e.target.value))} className="input w-44">
          <option value={0}>{tFees('allSessions')}</option>
          {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-36">
          <option value="">{tFees('allStatuses')}</option>
          <option value="pending">{tFees('statusPending')}</option>
          <option value="partial">{tFees('statusPartial')}</option>
          <option value="paid">{tFees('statusPaid')}</option>
        </select>
        {pendingCount > 0 && (
          <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2.5 py-1 font-medium">
            {pendingCount} {tFees('pendingLabel')}
          </span>
        )}
      </div>

      {/* Invoice Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{tFees('invoiceNo')}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{tFees('student')}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{tFees('total')}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{tFees('paid')}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{tFees('due')}</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{tFees('statusLabel')}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{tFees('dueDate')}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.map(inv => {
                const SIcon = statusIcon[inv.status] || FileText;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-sm font-mono text-slate-700">{inv.invoice_no}</td>
                    <td className="px-5 py-3">
                      <div className="text-sm font-medium text-slate-700">{locale === 'bn' ? (inv.student?.name_bn || inv.student?.name) : inv.student?.name ?? '—'}</div>
                      <div className="text-xs text-slate-400">{inv.student?.student_id}</div>
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-slate-700">৳{Number(inv.total_amount).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-sm text-emerald-600 font-medium">৳{Number(inv.paid_amount).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-sm text-red-600 font-semibold">৳{Number(inv.due_amount).toLocaleString()}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[inv.status] || 'bg-slate-100 text-slate-600'}`}>
                        <SIcon className="w-3 h-3" />
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB') : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => fetchInvoiceDetail(inv)} className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50" title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {Number(inv.due_amount) > 0 && (
                          <button onClick={() => openPayment(inv)} className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50" title="Collect Payment">
                            <DollarSign className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => printReceipt(inv)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Print">
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                        {inv.status === 'pending' && (
                          <button onClick={() => { if (confirm(t('confirmDelete'))) deleteInvoiceMutation.mutate(inv.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {invoices.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <FileText className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">{t('noData')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════ Create Invoice Modal ═══════ */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-600" /> {tAcc('createInvoice')}
              </h3>
              <button onClick={() => setCreateModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Student Search */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{tFees('student')}</label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{selectedStudent.name}</p>
                      <p className="text-xs text-slate-500">ID: {selectedStudent.student_id} {selectedStudent.class_name ? `• ${selectedStudent.class_name}` : ''}</p>
                    </div>
                    <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        placeholder={tAcc('searchStudentPlaceholder')}
                        className="input pl-10 w-full"
                      />
                    </div>
                    {students.length > 0 && studentSearch.trim() && (
                      <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                        {students.map(s => (
                          <button
                            key={s.id}
                            onClick={() => { setSelectedStudent(s); setStudentSearch(''); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left"
                          >
                            <Users className="w-4 h-4 text-slate-400 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-slate-700">{s.name}</p>
                              <p className="text-xs text-slate-400">{s.student_id} {s.class_name ? `• ${s.class_name}` : ''}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Session + Month + Due Date */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{tFees('session')}</label>
                  <select value={invoiceSessionId} onChange={e => setInvoiceSessionId(Number(e.target.value))} className="input w-full">
                    {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{tFees('month')} ({tFees('optional')})</label>
                  <input type="month" value={invoiceMonth} onChange={e => setInvoiceMonth(e.target.value)} className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{tFees('dueDate')}</label>
                  <input type="date" value={invoiceDueDate} onChange={e => setInvoiceDueDate(e.target.value)} className="input w-full" />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-600">{tAcc('lineItems')}</label>
                  <button onClick={addLineItem} className="text-xs text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1">
                    <Plus className="w-3 h-3" /> {tAcc('addItem')}
                  </button>
                </div>
                {lineItems.length === 0 && (
                  <div className="text-center py-6 rounded-xl border border-dashed border-slate-300 bg-slate-50">
                    <Receipt className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-1 text-xs text-slate-400">{tAcc('noLineItems')}</p>
                    <button onClick={addLineItem} className="mt-2 text-xs text-cyan-600 hover:underline font-medium">{tAcc('addFirstItem')}</button>
                  </div>
                )}
                <div className="space-y-2">
                  {lineItems.map((li, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={li.fee_head_id}
                        onChange={e => updateLineItem(idx, 'fee_head_id', Number(e.target.value))}
                        className="input flex-1"
                      >
                        <option value={0} disabled>— {tFees('selectFeeHead')} —</option>
                        {heads.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                      <input
                        type="number"
                        value={li.amount}
                        onChange={e => updateLineItem(idx, 'amount', e.target.value)}
                        placeholder="৳ 0"
                        className="input w-32"
                      />
                      <button onClick={() => removeLineItem(idx)} className="p-1.5 text-slate-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount + Summary */}
              {lineItems.length > 0 && (
                <div className="rounded-xl bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{tFees('subtotal')}</span>
                    <span className="text-slate-700">৳{lineSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">{tFees('discount')}</span>
                    <input
                      type="number"
                      value={invoiceDiscount}
                      onChange={e => setInvoiceDiscount(e.target.value)}
                      className="input w-24 text-right text-sm"
                      placeholder="0"
                    />
                    <span className="text-sm text-slate-400">৳</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold border-t border-slate-200 pt-2">
                    <span className="text-slate-800">{tFees('total')}</span>
                    <span className="text-cyan-700">৳{lineTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setCreateModal(false)} className="btn text-xs border-slate-200">{t('cancel')}</button>
                <button
                  onClick={handleCreateInvoice}
                  disabled={!selectedStudent || lineItems.length === 0 || createInvoiceMutation.isPending}
                  className="btn btn-primary text-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" /> {tAcc('generateInvoice')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Payment Collection Modal ═══════ */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setPaymentModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" /> {tFees('collectPayment')}
              </h3>
              <button onClick={() => setPaymentModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 mb-4">
              <div className="flex justify-between text-sm"><span className="text-slate-500">{tFees('invoiceNo')}</span><span className="font-mono text-slate-700">{paymentModal.invoice_no}</span></div>
              <div className="flex justify-between text-sm mt-1"><span className="text-slate-500">{tFees('student')}</span><span className="text-slate-700">{paymentModal.student?.name}</span></div>
              <div className="flex justify-between text-sm mt-1"><span className="text-slate-500">{tFees('due')}</span><span className="font-bold text-red-600">৳{Number(paymentModal.due_amount).toLocaleString()}</span></div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{tFees('amount')}</label>
                <input type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} className="input w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{tFees('dateLabel')}</label>
                  <input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))} className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{tFees('method')}</label>
                  <select value={paymentForm.method} onChange={e => setPaymentForm(f => ({ ...f, method: e.target.value }))} className="input w-full">
                    <option value="cash">{tFees('cash')}</option>
                    <option value="bank">{tFees('bank')}</option>
                    <option value="bkash">{tFees('bkash')}</option>
                    <option value="nagad">{tFees('nagad')}</option>
                    <option value="other">{tFees('other')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{tFees('reference')} ({tFees('optional')})</label>
                <input type="text" value={paymentForm.reference} onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))} placeholder="TXN-123456" className="input w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{tFees('note')} ({tFees('optional')})</label>
                <input type="text" value={paymentForm.note} onChange={e => setPaymentForm(f => ({ ...f, note: e.target.value }))} className="input w-full" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setPaymentModal(null)} className="btn text-xs border-slate-200">{t('cancel')}</button>
              <button
                onClick={handleCollect}
                disabled={!paymentForm.amount || collectPaymentMutation.isPending}
                className="btn text-xs bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                <DollarSign className="w-3.5 h-3.5" /> {tFees('collectPayment')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Invoice Detail Modal ═══════ */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setDetailModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">{tFees('invoiceDetails')}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => printReceipt(detailModal)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                  <Printer className="w-4 h-4" />
                </button>
                <button onClick={() => setDetailModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-500">{tFees('invoiceNo')}:</span> <span className="font-mono font-medium text-slate-700">{detailModal.invoice_no}</span></div>
                  <div><span className="text-slate-500">{tFees('statusLabel')}:</span> <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[detailModal.status]}`}>{detailModal.status}</span></div>
                  <div><span className="text-slate-500">{tFees('student')}:</span> <span className="text-slate-700">{detailModal.student?.name}</span></div>
                  <div><span className="text-slate-500">{tFees('dueDate')}:</span> <span className="text-slate-700">{detailModal.due_date ? new Date(detailModal.due_date).toLocaleDateString('en-GB') : '—'}</span></div>
                </div>
              </div>

              {/* Items */}
              {detailModal.items && detailModal.items.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{tAcc('lineItems')}</h4>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="px-4 py-2 text-left text-xs font-medium text-slate-500">{tFees('feeHead')}</th><th className="px-4 py-2 text-right text-xs font-medium text-slate-500">{tFees('amount')}</th></tr></thead>
                      <tbody>
                        {detailModal.items.map((item, i) => (
                          <tr key={i} className="border-b border-slate-50"><td className="px-4 py-2 text-slate-700">{item.fee_head?.name ?? '—'}</td><td className="px-4 py-2 text-right text-slate-700">৳{Number(item.amount).toLocaleString()}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-right">
                    {detailModal.discount_amount && Number(detailModal.discount_amount) > 0 && (
                      <p className="text-slate-500">{tFees('discount')}: -৳{Number(detailModal.discount_amount).toLocaleString()}</p>
                    )}
                    <p className="font-bold text-slate-800">{tFees('total')}: ৳{Number(detailModal.total_amount).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Payments */}
              {detailModal.payments && detailModal.payments.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{tAcc('paymentHistory')}</h4>
                  <div className="space-y-2">
                    {detailModal.payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-emerald-700">৳{Number(p.amount).toLocaleString()}</p>
                          <p className="text-xs text-emerald-500">{p.receipt_no} • {p.method}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">{new Date(p.payment_date).toLocaleDateString('en-GB')}</p>
                          <button onClick={() => printReceipt(detailModal, p)} className="text-xs text-blue-500 hover:underline mt-0.5">{tAcc('printReceipt')}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="rounded-xl bg-slate-50 p-4 space-y-1">
                <div className="flex justify-between text-sm"><span className="text-slate-500">{tFees('totalPaid')}</span><span className="font-medium text-emerald-600">৳{Number(detailModal.paid_amount).toLocaleString()}</span></div>
                <div className="flex justify-between text-sm font-bold"><span className="text-slate-700">{tFees('totalDue')}</span><span className="text-red-600">৳{Number(detailModal.due_amount).toLocaleString()}</span></div>
              </div>

              {Number(detailModal.due_amount) > 0 && (
                <button
                  onClick={() => { setDetailModal(null); openPayment(detailModal); }}
                  className="w-full btn btn-primary text-sm flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  <DollarSign className="w-4 h-4" /> {tFees('collectPayment')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}