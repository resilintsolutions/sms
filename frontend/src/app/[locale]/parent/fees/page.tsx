'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { Wallet, DollarSign, CheckCircle, AlertTriangle, User, Clock, Receipt, ChevronDown, ChevronUp } from 'lucide-react';

type PaymentItem = { receipt_no: string; amount: number; payment_date: string; method: string };
type FeeItem = { fee_head: string; amount: number };
type InvoiceItem = {
  id: number; invoice_no: string; session: string; month?: string;
  total_amount: number; paid_amount: number; due_amount: number; discount: number;
  status: string; due_date?: string; items: FeeItem[]; payments: PaymentItem[];
};
type Child = { id: number; student_id: string; name: string; name_bn?: string };
type FeeData = {
  student: Child;
  invoices: InvoiceItem[];
  summary: { total_invoices: number; total_amount: number; total_paid: number; total_due: number };
};

export default function ParentFeesPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const t = useTranslations('parent');
  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  const [expandedInvoice, setExpandedInvoice] = useState<number | null>(null);

  const { data: parentData, isLoading: loadingParent } = useQuery({
    queryKey: ['dashboard/parent'],
    queryFn: () => api<{ children: { id: number; student_id: string; name: string; name_bn?: string; pending_due: number; enrollment: { class_name: string; section_name: string } | null }[] }>('/dashboard/parent'),
  });
  const children = (parentData as any)?.data?.children ?? [];

  const { data: feeData, isLoading: loadingFees } = useQuery({
    queryKey: ['reports/student/fees', selectedChild],
    queryFn: () => api<FeeData>(`/reports/student/fees?student_id=${selectedChild}`),
    enabled: !!selectedChild,
  });

  const fees = (feeData as any)?.data;
  const invoices: InvoiceItem[] = fees?.invoices ?? [];
  const summary = fees?.summary;

  if (loadingParent) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        {[1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{t('feesTitle')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('feesDesc')}</p>
      </div>

      {children.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <User className="h-16 w-16 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-700">{t('noChildrenFound')}</h3>
          <p className="mt-2 text-sm text-slate-500">{t('noChildrenDesc')}</p>
        </div>
      ) : (
        <>
          {/* Child Selector */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child: any) => (
              <button
                key={child.id}
                type="button"
                onClick={() => setSelectedChild(child.id)}
                className={`rounded-2xl border p-5 text-left transition-all ${
                  selectedChild === child.id
                    ? 'border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-200'
                    : 'border-slate-200 bg-white shadow-sm hover:border-amber-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{locale === 'bn' ? (child.name_bn || child.name) : child.name}</p>
                    <p className="text-xs text-slate-500">
                      {child.student_id}
                      {child.enrollment && ` • ${t('classLabel')} ${child.enrollment.class_name}`}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Wallet className={`h-4 w-4 ${child.pending_due > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                  <span className={`text-sm font-semibold ${child.pending_due > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    ৳ {Number(child.pending_due).toLocaleString()} {t('dueLabel')}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Fee Details */}
          {selectedChild && (
            <>
              {loadingFees ? (
                <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
              ) : (
                <div className="space-y-6">
                  {/* Summary */}
                  {summary && (
                    <div className="grid gap-4 sm:grid-cols-4">
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <Receipt className="h-5 w-5 text-blue-500" />
                        <div><p className="text-xs text-slate-500">{t('invoices')}</p><p className="text-lg font-bold text-slate-800">{summary.total_invoices}</p></div>
                      </div>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <DollarSign className="h-5 w-5 text-slate-500" />
                        <div><p className="text-xs text-slate-500">{t('totalFees')}</p><p className="text-lg font-bold text-slate-800">৳ {Number(summary.total_amount).toLocaleString()}</p></div>
                      </div>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                        <div><p className="text-xs text-slate-500">{t('totalPaid')}</p><p className="text-lg font-bold text-emerald-700">৳ {Number(summary.total_paid).toLocaleString()}</p></div>
                      </div>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <AlertTriangle className={`h-5 w-5 ${summary.total_due > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                        <div><p className="text-xs text-slate-500">{t('totalDue')}</p><p className={`text-lg font-bold ${summary.total_due > 0 ? 'text-red-700' : 'text-emerald-700'}`}>৳ {Number(summary.total_due).toLocaleString()}</p></div>
                      </div>
                    </div>
                  )}

                  {/* Invoices */}
                  {invoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
                      <CheckCircle className="h-12 w-12 text-emerald-300" />
                      <p className="mt-2 text-sm text-slate-500">{t('noInvoices')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invoices.map((inv) => (
                        <div key={inv.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                          <button
                            type="button"
                            onClick={() => setExpandedInvoice(expandedInvoice === inv.id ? null : inv.id)}
                            className="flex w-full items-center justify-between p-5 text-left hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`rounded-xl p-2.5 ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                <Receipt className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-mono text-sm font-semibold text-slate-800">{inv.invoice_no}</p>
                                <p className="text-xs text-slate-500">{inv.session}{inv.month ? ` • ${inv.month}` : ''}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm font-semibold text-slate-800">৳ {Number(inv.total_amount).toLocaleString()}</p>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                  inv.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}>{inv.status === 'paid' ? t('statusPaid') : inv.status === 'partial' ? t('statusPartial') : t('statusUnpaid')}</span>
                              </div>
                              {expandedInvoice === inv.id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </div>
                          </button>

                          {expandedInvoice === inv.id && (
                            <div className="border-t border-slate-100 p-5">
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                  <h5 className="mb-2 text-sm font-semibold text-slate-600">{t('feeBreakdown')}</h5>
                                  {inv.items.length > 0 ? (
                                    <div className="space-y-1">
                                      {inv.items.map((it, i) => (
                                        <div key={i} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                          <span className="text-slate-600">{it.fee_head}</span>
                                          <span className="font-medium">৳ {Number(it.amount).toLocaleString()}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-400">{t('noBreakdown')}</p>
                                  )}
                                  <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-sm">
                                    <span className="text-slate-600">{t('totalFees')}: ৳ {Number(inv.total_amount).toLocaleString()}</span>
                                    <span className="text-emerald-600">{t('totalPaid')}: ৳ {Number(inv.paid_amount).toLocaleString()}</span>
                                    <span className={`font-semibold ${Number(inv.due_amount) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                      {t('totalDue')}: ৳ {Number(inv.due_amount).toLocaleString()}
                                    </span>
                                  </div>
                                  {inv.due_date && (
                                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                      <Clock className="h-3 w-3" /> {t('dueBy')}: {new Date(inv.due_date).toLocaleDateString('en-GB')}
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <h5 className="mb-2 text-sm font-semibold text-slate-600">{t('payments')}</h5>
                                  {inv.payments.length > 0 ? (
                                    <div className="space-y-1">
                                      {inv.payments.map((p, pi) => (
                                        <div key={pi} className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm">
                                          <div>
                                            <span className="font-mono text-xs text-slate-500">{p.receipt_no}</span>
                                            <span className="ml-2 text-slate-600">{new Date(p.payment_date).toLocaleDateString('en-GB')}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] uppercase">{p.method}</span>
                                            <span className="font-semibold text-emerald-700">৳ {Number(p.amount).toLocaleString()}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-400">{t('noPayments')}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}