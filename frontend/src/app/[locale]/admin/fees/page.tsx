'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { downloadCSV, downloadPDF } from '@/lib/export';
import { Plus, Pencil, Trash2, FileText, FileDown, DollarSign } from 'lucide-react';

type FeeHead = { id: number; name: string; name_bn: string | null; frequency: string };
type FeeStructure = { id: number; amount: string; fee_head?: FeeHead; class?: { name: string }; academic_session?: { name: string } };
type Invoice = { id: number; invoice_no: string; total_amount: string; paid_amount: string; due_amount: string; status: string; student?: { name: string }; academic_session?: { name: string } };

export default function FeesPage() {
  const t = useTranslations('common');
  const tNav = useTranslations('nav');
  const tReports = useTranslations('reports');
  const tFees = useTranslations('fees');
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<number>(0);
  const [classId, setClassId] = useState<number | ''>('');
  const [reportSessionId, setReportSessionId] = useState<number>(0);
  const [reportClassId, setReportClassId] = useState<number | ''>('');
  const [feeReportData, setFeeReportData] = useState<{ data: Invoice[]; summary?: { total_invoices: number; total_amount: number; total_paid: number; total_due: number } } | null>(null);
  const [headModal, setHeadModal] = useState(false);
  const [headForm, setHeadForm] = useState({ name: '', name_bn: '', frequency: 'monthly' });
  const [paymentModal, setPaymentModal] = useState<Invoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_date: new Date().toISOString().slice(0, 10), method: 'cash' as string });

  const { data: sessionsData } = useQuery({ queryKey: ['academic-sessions'], queryFn: () => api<{ data: { id: number; name: string; is_current?: boolean }[] }>('/academic-sessions?per_page=100') });
  const sessionsPayload = (sessionsData as { data?: { data?: { id: number; name: string; is_current?: boolean }[] } | { id: number; name: string; is_current?: boolean }[] })?.data;
  const sessions = Array.isArray(sessionsPayload) ? sessionsPayload : (sessionsPayload as { data?: { id: number; name: string; is_current?: boolean }[] })?.data ?? [];

  // Auto-select current session
  useEffect(() => {
    if (sessions.length > 0) {
      const current = sessions.find(s => s.is_current) ?? sessions[0];
      if (sessionId === 0) setSessionId(current.id);
      if (reportSessionId === 0) setReportSessionId(current.id);
    }
  }, [sessions, sessionId, reportSessionId]);
  const { data: classesData } = useQuery({ queryKey: ['classes'], queryFn: () => api<{ data: { id: number; name: string }[] }>('/classes') });
  const classes = (classesData as { data?: { data?: { id: number; name: string }[] } })?.data?.data ?? [];

  const { data: headsData } = useQuery({ queryKey: ['fee-heads'], queryFn: () => api<{ data: FeeHead[] }>('/fee-heads') });
  const heads = (headsData as { data?: FeeHead[] })?.data ?? [];

  const { data: structuresData } = useQuery({
    queryKey: ['fee-structures', sessionId, classId],
    queryFn: () => api<{ data: FeeStructure[] }>(`/fee-structures?academic_session_id=${sessionId}${classId ? `&class_id=${classId}` : ''}`),
  });
  const structures = (structuresData as { data?: FeeStructure[] })?.data ?? [];

  const { data: invoicesData } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api<{ data: { data?: Invoice[] } }>('/invoices?per_page=100'),
  });
  const invoicesPayload = (invoicesData as { data?: { data?: Invoice[] } })?.data;
  const invoices = Array.isArray(invoicesPayload) ? invoicesPayload : (invoicesPayload as { data?: Invoice[] })?.data ?? [];

  const createHeadMutation = useMutation({
    mutationFn: (body: { institution_id: number; name: string; name_bn?: string; frequency: string }) =>
      api('/fee-heads', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fee-heads'] }); queryClient.invalidateQueries({ queryKey: ['fee-structures'] }); toast.success(t('savedSuccessfully')); setHeadModal(false); setHeadForm({ name: '', name_bn: '', frequency: 'monthly' }); },
    onError: () => toast.error(t('saveFailed')),
  });
  const deleteHeadMutation = useMutation({
    mutationFn: (id: number) => api(`/fee-heads/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fee-heads'] }); queryClient.invalidateQueries({ queryKey: ['fee-structures'] }); toast.success(t('deletedSuccessfully')); },
    onError: () => toast.error(t('deleteFailed')),
  });

  const collectPaymentMutation = useMutation({
    mutationFn: (body: { invoice_id: number; amount: number; payment_date: string; method: string }) =>
      api('/payments', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); toast.success(t('savedSuccessfully')); setPaymentModal(null); },
    onError: () => toast.error(t('saveFailed')),
  });

  const fetchFeeReport = async () => {
    const res = await api<{ data: Invoice[]; summary: { total_invoices: number; total_amount: number; total_paid: number; total_due: number } }>(
      `/fees/report?academic_session_id=${reportSessionId}${reportClassId ? `&class_id=${reportClassId}` : ''}`
    );
    const r = res as { data?: Invoice[]; summary?: { total_invoices: number; total_amount: number; total_paid: number; total_due: number } };
    setFeeReportData({ data: r.data ?? [], summary: r.summary });
    if (res.success) toast.success(`${tReports('feeReport')}${tReports('ready')}`);
    else toast.error(t('saveFailed'));
  };

  const reportRows = feeReportData?.data ?? [];
  const reportCols = [
    { key: 'invoice_no' as const, label: tFees('invoiceNo') },
    { key: 'student_name' as const, label: tFees('student') },
    { key: 'total_amount' as const, label: tFees('total') },
    { key: 'paid_amount' as const, label: tFees('paid') },
    { key: 'due_amount' as const, label: tFees('due') },
    { key: 'status' as const, label: tFees('statusLabel') },
  ];
  const reportExportRows = reportRows.map((inv) => ({
    invoice_no: inv.invoice_no,
    student_name: (inv as Invoice & { student_name?: string }).student?.name ?? '—',
    total_amount: inv.total_amount,
    paid_amount: inv.paid_amount,
    due_amount: inv.due_amount,
    status: inv.status,
  }));

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-slate-800">{tNav('fees')}</h2>

      <div className="card-accent mb-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">{tFees('feeHeads')}</h3>
          <button type="button" onClick={() => setHeadModal(true)} className="btn btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> {t('add')}
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">{t('name')}</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">{tFees('frequency')}</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {heads.map((h) => (
                <tr key={h.id} className="table-row-hover">
                  <td className="px-4 py-2">{h.name_bn || h.name}</td>
                  <td className="px-4 py-2 text-sm">{h.frequency}</td>
                  <td className="px-4 py-2 text-right">
                    <button type="button" onClick={() => confirm(t('delete')) && deleteHeadMutation.mutate(h.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4 inline" /></button>
                  </td>
                </tr>
              ))}
              {heads.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-500">{t('noData')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="font-semibold text-slate-800">{tFees('feeStructures')}</h3>
        <div className="mt-2 flex gap-2">
          <select value={sessionId} onChange={(e) => setSessionId(Number(e.target.value))} className="input">
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select value={classId} onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : '')} className="input">
            <option value="">{tFees('allClasses')}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{tFees('classPrefix')}{c.name}</option>
            ))}
          </select>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">{tFees('feeHead')}</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">{tFees('class')}</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">{tFees('amountBDT')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {structures.map((s) => (
                <tr key={s.id} className="table-row-hover">
                  <td className="px-4 py-2">{s.fee_head?.name ?? '—'}</td>
                  <td className="px-4 py-2">{s.class?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-right">{s.amount}</td>
                </tr>
              ))}
              {structures.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-500">{t('noData')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="font-semibold text-slate-800">{tFees('invoices')}</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">{tFees('invoiceNo')}</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">{tFees('student')}</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">{tFees('total')}</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">{tFees('paid')}</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">{tFees('due')}</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">{tFees('statusLabel')}</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoices.map((inv) => (
                <tr key={inv.id} className="table-row-hover">
                  <td className="px-4 py-2 font-mono text-sm">{inv.invoice_no}</td>
                  <td className="px-4 py-2">{inv.student?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-right">{inv.total_amount} ৳</td>
                  <td className="px-4 py-2 text-right">{inv.paid_amount} ৳</td>
                  <td className="px-4 py-2 text-right">{inv.due_amount} ৳</td>
                  <td className="px-4 py-2"><span className={`rounded px-2 py-0.5 text-xs ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</span></td>
                  <td className="px-4 py-2 text-right">
                    {inv.status !== 'paid' && (
                      <button type="button" onClick={() => { setPaymentModal(inv); setPaymentForm({ amount: inv.due_amount, payment_date: new Date().toISOString().slice(0, 10), method: 'cash' }); }} className="btn text-sm flex items-center gap-1">
                        <DollarSign className="h-4 w-4" /> {tFees('pay')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-4 text-center text-slate-500">{t('noData')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-800">{tReports('feeReport')}</h3>
        <div className="mt-4 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">{tFees('session')}</label>
            <select value={reportSessionId} onChange={(e) => setReportSessionId(Number(e.target.value))} className="input mt-1">
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">{tFees('class')}</label>
            <select value={reportClassId} onChange={(e) => setReportClassId(e.target.value ? Number(e.target.value) : '')} className="input mt-1">
              <option value="">{tFees('all')}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{tFees('classPrefix')}{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" onClick={fetchFeeReport} className="btn btn-primary">{tReports('generate')}</button>
          </div>
        </div>
        {feeReportData && (
          <div className="mt-4">
            {feeReportData.summary && (
              <div className="mb-4 flex flex-wrap gap-4 rounded bg-slate-50 p-4 text-sm">
                <span>{tFees('totalInvoices')}<strong>{feeReportData.summary.total_invoices}</strong></span>
                <span>{tFees('totalAmount')}<strong>{feeReportData.summary.total_amount} ৳</strong></span>
                <span>{tFees('totalPaid')}<strong>{feeReportData.summary.total_paid} ৳</strong></span>
                <span>{tFees('totalDue')}<strong>{feeReportData.summary.total_due} ৳</strong></span>
              </div>
            )}
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => downloadPDF(tReports('feeReport'), reportCols, reportExportRows)} className="btn flex items-center gap-2"><FileText className="h-4 w-4" /> {t('exportPdf')}</button>
              <button type="button" onClick={() => downloadCSV('fee_report.csv', reportExportRows, reportCols)} className="btn flex items-center gap-2"><FileDown className="h-4 w-4" /> {t('exportCsv')}</button>
            </div>
            <table className="w-full border border-slate-200">
              <thead className="table-header">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">{tFees('invoiceNo')}</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">{tFees('student')}</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">{tFees('total')}</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">{tFees('paid')}</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">{tFees('due')}</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">{tFees('statusLabel')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reportRows.map((inv) => (
                  <tr key={inv.id} className="table-row-hover">
                    <td className="px-4 py-2 font-mono text-sm">{inv.invoice_no}</td>
                    <td className="px-4 py-2">{inv.student?.name ?? '—'}</td>
                    <td className="px-4 py-2 text-right">{inv.total_amount}</td>
                    <td className="px-4 py-2 text-right">{inv.paid_amount}</td>
                    <td className="px-4 py-2 text-right">{inv.due_amount}</td>
                    <td className="px-4 py-2">{inv.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {headModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800">{tFees('addFeeHead')}</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700">{t('name')}</label>
              <input type="text" value={headForm.name} onChange={(e) => setHeadForm((f) => ({ ...f, name: e.target.value }))} className="input w-full" />
              <label className="block text-sm font-medium text-slate-700">{tFees('nameBangla')}</label>
              <input type="text" value={headForm.name_bn} onChange={(e) => setHeadForm((f) => ({ ...f, name_bn: e.target.value }))} className="input w-full" />
              <label className="block text-sm font-medium text-slate-700">{tFees('frequency')}</label>
              <select value={headForm.frequency} onChange={(e) => setHeadForm((f) => ({ ...f, frequency: e.target.value }))} className="input w-full">
                <option value="one_time">{tFees('oneTime')}</option>
                <option value="monthly">{tFees('monthly')}</option>
                <option value="annual">{tFees('annual')}</option>
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setHeadModal(false)} className="btn">{t('cancel')}</button>
              <button type="button" onClick={() => createHeadMutation.mutate({ institution_id: 1, ...headForm })} disabled={createHeadMutation.isPending || !headForm.name} className="btn btn-primary">{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800">{tFees('collectPayment')}{paymentModal.invoice_no}</h3>
            <p className="mt-1 text-sm text-slate-600">{tFees('dueLabel')}{paymentModal.due_amount} ৳</p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700">{tFees('amount')}</label>
              <input type="number" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))} className="input w-full" />
              <label className="block text-sm font-medium text-slate-700">{tFees('dateLabel')}</label>
              <input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm((f) => ({ ...f, payment_date: e.target.value }))} className="input w-full" />
              <label className="block text-sm font-medium text-slate-700">{tFees('method')}</label>
              <select value={paymentForm.method} onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))} className="input w-full">
                <option value="cash">{tFees('cash')}</option>
                <option value="bank">{tFees('bank')}</option>
                <option value="bkash">{tFees('bkash')}</option>
                <option value="nagad">{tFees('nagad')}</option>
                <option value="other">{tFees('other')}</option>
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setPaymentModal(null)} className="btn">{t('cancel')}</button>
              <button type="button" onClick={() => collectPaymentMutation.mutate({ invoice_id: paymentModal.id, amount: parseFloat(paymentForm.amount), payment_date: paymentForm.payment_date, method: paymentForm.method })} disabled={collectPaymentMutation.isPending || !paymentForm.amount} className="btn btn-primary">{t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
