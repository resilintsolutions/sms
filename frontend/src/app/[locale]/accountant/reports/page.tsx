'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { downloadCSV, downloadPDF } from '@/lib/export';
import { FileBarChart, FileText, FileDown } from 'lucide-react';

type Invoice = {
  id: number;
  invoice_no: string;
  total_amount: string;
  paid_amount: string;
  due_amount: string;
  status: string;
  student?: { name: string };
};

export default function AccountantReportsPage() {
  const t = useTranslations('common');
  const tReports = useTranslations('reports');
  const tFees = useTranslations('fees');
  const tAcc = useTranslations('accountant');

  const { data: sessionsData } = useQuery({ queryKey: ['academic-sessions'], queryFn: () => api<{ data: { id: number; name: string; is_current?: boolean }[] }>('/academic-sessions?per_page=100') });
  const sessionsPayload = (sessionsData as { data?: { data?: { id: number; name: string; is_current?: boolean }[] } | { id: number; name: string; is_current?: boolean }[] })?.data;
  const sessions = Array.isArray(sessionsPayload) ? sessionsPayload : (sessionsPayload as { data?: { id: number; name: string; is_current?: boolean }[] })?.data ?? [];

  const { data: classesData } = useQuery({ queryKey: ['classes'], queryFn: () => api<{ data: { id: number; name: string }[] }>('/classes') });
  const classes = (classesData as { data?: { data?: { id: number; name: string }[] } })?.data?.data ?? [];

  const [reportSessionId, setReportSessionId] = useState<number>(0);
  const [reportClassId, setReportClassId] = useState<number | ''>('');
  const [feeReportData, setFeeReportData] = useState<{ data: Invoice[]; summary?: { total_invoices: number; total_amount: number; total_paid: number; total_due: number } } | null>(null);

  // Auto-select current session
  useEffect(() => {
    if (sessions.length > 0 && reportSessionId === 0) {
      const current = sessions.find(s => s.is_current) ?? sessions[0];
      setReportSessionId(current.id);
    }
  }, [sessions, reportSessionId]);

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
  const reportExportRows = reportRows.map((inv) => ({
    invoice_no: inv.invoice_no,
    student_name: inv.student?.name ?? '—',
    total_amount: inv.total_amount,
    paid_amount: inv.paid_amount,
    due_amount: inv.due_amount,
    status: inv.status,
  }));
  const reportCols = [
    { key: 'invoice_no' as const, label: tFees('invoiceNo') },
    { key: 'student_name' as const, label: tFees('student') },
    { key: 'total_amount' as const, label: tFees('total') },
    { key: 'paid_amount' as const, label: tFees('paid') },
    { key: 'due_amount' as const, label: tFees('due') },
    { key: 'status' as const, label: tFees('statusLabel') },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{tReports('feeCollectionReport')}</h2>
        <p className="mt-1 text-sm text-slate-500">{tReports('feeCollectionDesc')}</p>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{tFees('session')}</label>
            <select value={reportSessionId} onChange={(e) => setReportSessionId(Number(e.target.value))} className="input w-48 rounded-lg border px-3 py-2 text-sm">
              {sessions.map((s: { id: number; name: string }) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{tFees('class')}</label>
            <select value={reportClassId} onChange={(e) => setReportClassId(e.target.value ? Number(e.target.value) : '')} className="input w-48 rounded-lg border px-3 py-2 text-sm">
              <option value="">{tFees('allClasses')}</option>
              {classes.map((c: { id: number; name: string }) => <option key={c.id} value={c.id}>{tFees('classPrefix')}{c.name}</option>)}
            </select>
          </div>
          <button onClick={fetchFeeReport} className="rounded-lg bg-cyan-600 px-6 py-2 text-sm font-medium text-white hover:bg-cyan-700">
            {tReports('generateReport')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {feeReportData?.summary && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
            <p className="text-sm text-slate-500">{tFees('totalInvoices')}</p>
            <p className="text-2xl font-bold text-slate-800">{feeReportData.summary.total_invoices}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
            <p className="text-sm text-slate-500">{tFees('totalAmount')}</p>
            <p className="text-2xl font-bold text-slate-800">৳{feeReportData.summary.total_amount?.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
            <p className="text-sm text-slate-500">{tFees('totalPaid')}</p>
            <p className="text-2xl font-bold text-emerald-600">৳{feeReportData.summary.total_paid?.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
            <p className="text-sm text-slate-500">{tFees('totalDue')}</p>
            <p className="text-2xl font-bold text-red-600">৳{feeReportData.summary.total_due?.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Report Table */}
      {reportRows.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
            <span className="text-sm text-slate-500">{reportRows.length} records</span>
            <div className="flex gap-2">
              <button onClick={() => downloadCSV('fee-report', reportExportRows, reportCols)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm hover:bg-slate-200">
                <FileDown className="h-4 w-4" /> CSV
              </button>
              <button onClick={() => downloadPDF(tReports('feeCollectionReport'), reportCols, reportExportRows)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm hover:bg-slate-200">
                <FileText className="h-4 w-4" /> PDF
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {reportCols.map((c) => (
                    <th key={c.key} className="px-4 py-3 text-left text-sm font-semibold text-slate-600">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportExportRows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-sm font-mono text-slate-700">{row.invoice_no}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-700">{row.student_name}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-700">৳{Number(row.total_amount).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-sm text-emerald-600">৳{Number(row.paid_amount).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-sm text-red-600">৳{Number(row.due_amount).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-sm capitalize text-slate-600">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
