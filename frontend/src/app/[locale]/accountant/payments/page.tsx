'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Receipt, Search, Printer, Eye, DollarSign,
  Calendar, CreditCard, Banknote, Smartphone,
  TrendingUp, Filter, X,
} from 'lucide-react';

type Payment = {
  id: number;
  amount: string;
  method: string;
  payment_date: string;
  receipt_no?: string;
  reference?: string;
  note?: string;
  invoice?: {
    invoice_no: string;
    total_amount?: string;
    student?: { name: string; name_bn?: string; student_id?: string };
  };
};

export default function AccountantPaymentsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const t = useTranslations('common');
  const tAcc = useTranslations('accountant');
  const tFees = useTranslations('fees');

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['payments-list'],
    queryFn: () => api<{ data: Payment[] }>('/dashboard/accountant/payments'),
  });
  const allPayments: Payment[] = (data as { data?: Payment[] })?.data ?? [];

  const payments = useMemo(() => {
    let filtered = allPayments;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.invoice?.student?.name?.toLowerCase().includes(q) ||
        p.invoice?.invoice_no?.toLowerCase().includes(q) ||
        p.receipt_no?.toLowerCase().includes(q) ||
        p.invoice?.student?.student_id?.toLowerCase().includes(q)
      );
    }
    if (methodFilter) {
      filtered = filtered.filter(p => p.method === methodFilter);
    }
    if (dateFrom) {
      filtered = filtered.filter(p => p.payment_date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(p => p.payment_date <= dateTo);
    }
    return filtered;
  }, [allPayments, searchQuery, methodFilter, dateFrom, dateTo]);

  const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const methodBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach(p => { map[p.method] = (map[p.method] || 0) + Number(p.amount); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [payments]);

  const hasFilters = searchQuery || methodFilter || dateFrom || dateTo;
  const clearFilters = () => { setSearchQuery(''); setMethodFilter(''); setDateFrom(''); setDateTo(''); };

  const methodIcon = (m: string) => {
    switch (m) {
      case 'cash': return Banknote;
      case 'bank': return CreditCard;
      case 'bkash': case 'nagad': return Smartphone;
      default: return DollarSign;
    }
  };

  const methodColor = (m: string) => {
    switch (m) {
      case 'cash': return 'bg-emerald-100 text-emerald-700';
      case 'bank': return 'bg-blue-100 text-blue-700';
      case 'bkash': return 'bg-pink-100 text-pink-700';
      case 'nagad': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const printReceipt = (p: Payment) => {
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
      .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
      .header h2 { margin: 0 0 4px; font-size: 16px; }
      .row { display: flex; justify-content: space-between; margin: 6px 0; }
      .divider { border-top: 1px dashed #999; margin: 10px 0; }
      .total { font-weight: bold; font-size: 16px; margin-top: 8px; }
      @media print { body { padding: 10px; } }
    </style></head><body>
    <div class="header">
      <h2>Payment Receipt</h2>
      <p style="font-size: 10px; color: #666;">${p.receipt_no || '—'}</p>
    </div>
    <div class="row"><span>Student:</span><span>${p.invoice?.student?.name || '—'}</span></div>
    <div class="row"><span>Student ID:</span><span>${p.invoice?.student?.student_id || '—'}</span></div>
    <div class="row"><span>Invoice No:</span><span>${p.invoice?.invoice_no || '—'}</span></div>
    <div class="divider"></div>
    <div class="row"><span>Payment Method:</span><span style="text-transform:capitalize">${p.method}</span></div>
    <div class="row"><span>Payment Date:</span><span>${new Date(p.payment_date).toLocaleDateString('en-GB')}</span></div>
    ${p.reference ? `<div class="row"><span>Reference:</span><span>${p.reference}</span></div>` : ''}
    ${p.note ? `<div class="row"><span>Note:</span><span>${p.note}</span></div>` : ''}
    <div class="divider"></div>
    <div class="row total"><span>Amount Paid:</span><span>৳${Number(p.amount).toLocaleString()}</span></div>
    <div class="divider"></div>
    <p style="text-align:center;color:#666;margin-top:20px;font-size:10px;">Thank you for your payment</p>
    <p style="text-align:center;color:#999;font-size:9px;">Generated on ${new Date().toLocaleString('en-GB')}</p>
    <script>window.print();</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Receipt className="h-7 w-7 text-cyan-600" />
          {tAcc('payments')}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{tAcc('paymentsDesc')}</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="rounded-lg bg-emerald-50 p-2"><TrendingUp className="h-5 w-5 text-emerald-600" /></div>
          <div>
            <p className="text-xs text-slate-500">{tAcc('totalCollected')}</p>
            <p className="text-lg font-bold text-emerald-600">৳{totalCollected.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="rounded-lg bg-blue-50 p-2"><Receipt className="h-5 w-5 text-blue-600" /></div>
          <div>
            <p className="text-xs text-slate-500">{tAcc('totalTransactions')}</p>
            <p className="text-lg font-bold text-slate-800">{payments.length}</p>
          </div>
        </div>
        {methodBreakdown.slice(0, 2).map(([method, amount]) => {
          const MIcon = methodIcon(method);
          return (
            <div key={method} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className={`rounded-lg p-2 ${methodColor(method).split(' ')[0]}`}><MIcon className={`h-5 w-5 ${methodColor(method).split(' ')[1]}`} /></div>
              <div>
                <p className="text-xs text-slate-500 capitalize">{method}</p>
                <p className="text-lg font-bold text-slate-800">৳{amount.toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={tAcc('searchPayments')}
            className="input pl-10 w-full"
          />
        </div>
        <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="input w-36">
          <option value="">{tFees('allMethods')}</option>
          <option value="cash">{tFees('cash')}</option>
          <option value="bank">{tFees('bank')}</option>
          <option value="bkash">{tFees('bkash')}</option>
          <option value="nagad">{tFees('nagad')}</option>
          <option value="other">{tFees('other')}</option>
        </select>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input w-36" placeholder="From" />
          <span className="text-slate-300">—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input w-36" placeholder="To" />
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-red-500 hover:underline flex items-center gap-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Payment Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{tFees('dateLabel')}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{tAcc('receiptNo')}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{tFees('student')}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{tFees('invoiceNo')}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{tFees('amount')}</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{tFees('method')}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payments.map(p => {
                const MIcon = methodIcon(p.method);
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {new Date(p.payment_date).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB')}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-slate-500">{p.receipt_no || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="text-sm font-medium text-slate-700">{locale === 'bn' ? (p.invoice?.student?.name_bn || p.invoice?.student?.name) : p.invoice?.student?.name ?? '—'}</div>
                      <div className="text-xs text-slate-400">{p.invoice?.student?.student_id}</div>
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-slate-500">{p.invoice?.invoice_no ?? '—'}</td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-emerald-600">৳{Number(p.amount).toLocaleString()}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${methodColor(p.method)}`}>
                        <MIcon className="w-3 h-3" />
                        {p.method}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setDetailPayment(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50" title="Details">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => printReceipt(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Print Receipt">
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {payments.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Receipt className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">{tAcc('noRecentPayments')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Detail Modal */}
      {detailPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setDetailPayment(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">{tAcc('paymentDetails')}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => printReceipt(detailPayment)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                  <Printer className="w-4 h-4" />
                </button>
                <button onClick={() => setDetailPayment(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-center py-4">
                <p className="text-3xl font-bold text-emerald-600">৳{Number(detailPayment.amount).toLocaleString()}</p>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize mt-2 ${methodColor(detailPayment.method)}`}>
                  {detailPayment.method}
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">{tAcc('receiptNo')}</span><span className="font-mono text-slate-700">{detailPayment.receipt_no || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{tFees('dateLabel')}</span><span className="text-slate-700">{new Date(detailPayment.payment_date).toLocaleDateString('en-GB')}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{tFees('student')}</span><span className="text-slate-700">{detailPayment.invoice?.student?.name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{tFees('invoiceNo')}</span><span className="font-mono text-slate-700">{detailPayment.invoice?.invoice_no || '—'}</span></div>
                {detailPayment.reference && (
                  <div className="flex justify-between"><span className="text-slate-500">{tFees('reference')}</span><span className="text-slate-700">{detailPayment.reference}</span></div>
                )}
                {detailPayment.note && (
                  <div className="flex justify-between"><span className="text-slate-500">{tFees('note')}</span><span className="text-slate-700">{detailPayment.note}</span></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}