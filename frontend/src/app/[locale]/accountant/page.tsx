'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslations } from 'next-intl';
import {
  DollarSign,
  TrendingUp,
  FileText,
  Wallet,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Receipt,
  Clock,
  CreditCard,
} from 'lucide-react';

type AccountantDashData = {
  total_due_amount: number;
  collected_this_month: number;
  pending_invoices: number;
  total_invoices: number;
  total_students: number;
  collection_rate: number;
  recent_payments: {
    id: number;
    amount: string;
    method: string;
    payment_date: string;
    invoice?: { invoice_no: string; student?: { name: string } };
  }[];
  overdue_invoices: {
    id: number;
    invoice_no: string;
    due_amount: string;
    due_date: string;
    student?: { name: string };
  }[];
  monthly_collection: { month: string; amount: number }[];
};

export default function AccountantDashboard() {
  const params = useParams();
  const locale = (params?.locale as string) || 'bn';
  const { user } = useAuth();
  const t = useTranslations('accountant');
  const tc = useTranslations('common');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard/accountant'],
    queryFn: () => api<AccountantDashData>('/dashboard/accountant'),
  });

  const d = data?.data;
  const today = new Date().toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header / Welcome */}
      <div className="rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-700 p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold">
          {t('welcome', { name: user?.name || '' })}
        </h2>
        <p className="mt-1 text-cyan-100">{today}</p>
        <p className="mt-2 text-sm text-cyan-200">{t('dashboardSubtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-red-100 p-3 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t('totalDue')}</p>
            <p className="text-2xl font-bold text-slate-800">৳{(d?.total_due_amount ?? 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t('collectedThisMonth')}</p>
            <p className="text-2xl font-bold text-slate-800">৳{(d?.collected_this_month ?? 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-amber-100 p-3 text-amber-600">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t('pendingInvoices')}</p>
            <p className="text-2xl font-bold text-slate-800">{d?.pending_invoices ?? 0}</p>
            <p className="text-xs text-slate-400">{t('outOf', { total: d?.total_invoices ?? 0 })}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className={`rounded-xl p-3 ${(d?.collection_rate ?? 0) >= 70 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t('collectionRate')}</p>
            <p className="text-2xl font-bold text-slate-800">{d?.collection_rate ?? 0}%</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <CreditCard className="h-5 w-5 text-cyan-500" />
          {t('quickActions')}
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href={`/${locale}/accountant/fees`}
            className="flex items-center gap-3 rounded-xl bg-cyan-50 px-4 py-4 text-sm font-medium text-cyan-600 transition-all hover:bg-cyan-100"
          >
            <DollarSign className="h-5 w-5 shrink-0" />
            {t('manageFees')}
          </Link>
          <Link
            href={`/${locale}/accountant/invoices`}
            className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-4 text-sm font-medium text-blue-600 transition-all hover:bg-blue-100"
          >
            <FileText className="h-5 w-5 shrink-0" />
            {t('viewInvoices')}
          </Link>
          <Link
            href={`/${locale}/accountant/payments`}
            className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-600 transition-all hover:bg-emerald-100"
          >
            <Receipt className="h-5 w-5 shrink-0" />
            {t('collectPayment')}
          </Link>
          <Link
            href={`/${locale}/accountant/reports`}
            className="flex items-center gap-3 rounded-xl bg-violet-50 px-4 py-4 text-sm font-medium text-violet-600 transition-all hover:bg-violet-100"
          >
            <TrendingUp className="h-5 w-5 shrink-0" />
            {t('feeReports')}
          </Link>
        </div>
      </div>

      {/* Bottom: Recent Payments + Overdue Invoices */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Payments */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              {t('recentPayments')}
            </h3>
            <Link
              href={`/${locale}/accountant/payments`}
              className="flex items-center gap-1 text-sm font-medium text-cyan-600 hover:text-cyan-700"
            >
              {t('viewAll')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {d?.recent_payments && d.recent_payments.length > 0 ? (
            <ul className="space-y-3">
              {d.recent_payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {p.invoice?.student?.name ?? '—'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.invoice?.invoice_no} • {p.method}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">৳{Number(p.amount).toLocaleString()}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(p.payment_date).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Receipt className="h-12 w-12 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">{t('noRecentPayments')}</p>
            </div>
          )}
        </div>

        {/* Overdue Invoices */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <Clock className="h-5 w-5 text-red-500" />
              {t('overdueInvoices')}
            </h3>
            <Link
              href={`/${locale}/accountant/invoices`}
              className="flex items-center gap-1 text-sm font-medium text-cyan-600 hover:text-cyan-700"
            >
              {t('viewAll')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {d?.overdue_invoices && d.overdue_invoices.length > 0 ? (
            <ul className="space-y-3">
              {d.overdue_invoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{inv.student?.name ?? '—'}</p>
                    <p className="text-xs text-slate-500">{inv.invoice_no}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">৳{Number(inv.due_amount).toLocaleString()}</p>
                    <p className="text-xs text-red-400">
                      {t('dueBy')} {new Date(inv.due_date).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-12 w-12 text-emerald-300" />
              <p className="mt-2 text-sm text-slate-500">{t('noOverdueInvoices')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
