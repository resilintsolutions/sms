'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Building2, Users, GraduationCap, Power, PowerOff, Settings, Save, Globe, Plus, X, CheckCircle2, AlertCircle, ExternalLink, Copy, RefreshCw, Server, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Institution = {
  id: number;
  name: string;
  name_bn: string | null;
  email: string | null;
  phone: string | null;
  custom_domain: string | null;
  subdomain: string | null;
  is_active: boolean;
  subscription_status: string;
  feature_flags: Record<string, boolean> | null;
  users_count?: number;
  students_count?: number;
  created_at: string;
};

type NewSchoolForm = {
  name: string;
  name_bn: string;
  eiin: string;
  address: string;
  email: string;
  phone: string;
  custom_domain: string;
  subdomain: string;
  subscription_status: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
};

const emptyNewSchool: NewSchoolForm = {
  name: '',
  name_bn: '',
  eiin: '',
  address: '',
  email: '',
  phone: '',
  custom_domain: '',
  subdomain: '',
  subscription_status: 'active',
  admin_name: '',
  admin_email: '',
  admin_password: '',
};

const FEATURE_KEYS = ['fees', 'attendance', 'exams', 'notices', 'landing_page'] as const;

const SERVER_IP = process.env.NEXT_PUBLIC_SERVER_IP || '127.0.0.1';
const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'school.local';

type DomainVerification = {
  domain: string;
  server_ip: string;
  verified: boolean;
  resolved_ip: string | null;
  dns_records: Array<{ type: string; value: string }>;
};

export default function SuperAdminPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const queryClient = useQueryClient();
  const t = useTranslations('superAdmin');
  const tc = useTranslations('common');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Institution>>({});
  const [activeTab, setActiveTab] = useState<'schools' | 'dns'>('schools');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSchool, setNewSchool] = useState<NewSchoolForm>(emptyNewSchool);
  const [verifying, setVerifying] = useState<number | null>(null);
  const [verificationResults, setVerificationResults] = useState<Record<number, DomainVerification>>({});
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const { data: statsData } = useQuery({
    queryKey: ['super-admin-stats'],
    queryFn: () => api<{ total_schools: number; active_schools: number; suspended_schools: number; total_users: number }>('/super-admin/stats'),
  });
  const stats = statsData?.data;

  const { data: institutionsData, isLoading } = useQuery({
    queryKey: ['super-admin-institutions'],
    queryFn: () => api<Institution[]>('/super-admin/institutions'),
  });
  const institutions = institutionsData?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Partial<Institution>) =>
      api(`/super-admin/institutions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-institutions'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-stats'] });
      toast.success(t('schoolUpdated'));
      setEditingId(null);
    },
    onError: (err: { message?: string }) => toast.error(err?.message || t('failedToUpdate')),
  });

  const createMutation = useMutation({
    mutationFn: (body: NewSchoolForm) =>
      api<Institution>('/super-admin/institutions', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-institutions'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-stats'] });
      toast.success(res?.message || t('schoolCreated'));
      setShowAddModal(false);
      setNewSchool(emptyNewSchool);
    },
    onError: (err: { message?: string; errors?: Record<string, string[]> }) => {
      if (err?.errors) {
        const firstError = Object.values(err.errors)[0]?.[0];
        toast.error(firstError || err?.message || t('failedToCreate'));
      } else {
        toast.error(err?.message || t('failedToCreate'));
      }
    },
  });

  const openEdit = (inst: Institution) => {
    setEditingId(inst.id);
    setEditForm({
      is_active: inst.is_active,
      subscription_status: inst.subscription_status,
      custom_domain: inst.custom_domain ?? '',
      subdomain: inst.subdomain ?? '',
      feature_flags: { ...inst.feature_flags },
    });
  };

  const setFeature = (key: string, value: boolean) => {
    setEditForm((f) => ({
      ...f,
      feature_flags: { ...(f.feature_flags ?? {}), [key]: value },
    }));
  };

  const handleSave = () => {
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      ...editForm,
      custom_domain: editForm.custom_domain || undefined,
      subdomain: editForm.subdomain || undefined,
    });
  };

  const toggleActive = (inst: Institution) => {
    updateMutation.mutate({
      id: inst.id,
      is_active: !inst.is_active,
    });
  };

  const handleCreateSchool = () => {
    if (!newSchool.name.trim()) {
      toast.error(t('schoolNameRequired'));
      return;
    }
    createMutation.mutate(newSchool);
  };

  const handleVerifyDomain = async (inst: Institution) => {
    setVerifying(inst.id);
    try {
      const res = await api<DomainVerification>(`/super-admin/institutions/${inst.id}/verify-domain`);
      if (res.success && res.data) {
        setVerificationResults((prev) => ({ ...prev, [inst.id]: res.data! }));
        if (res.data.verified) {
          toast.success(`${inst.custom_domain} — DNS verified! Domain is pointing to the server.`);
        } else {
          toast.error(`${inst.custom_domain} — DNS not verified. Domain is not pointing to ${SERVER_IP}.`);
        }
      }
    } catch {
      toast.error('Failed to verify domain');
    }
    setVerifying(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
      toast.success('Copied to clipboard');
    });
  };

  if (isLoading) {
    return <p className="text-slate-500">{tc('loading')}</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">{t('dashboard')}</h2>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> {t('addNewSchool')}
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('schools')}
          className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
            activeTab === 'schools' ? 'border-b-2 border-primary-600 bg-white text-primary-600' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          {t('schoolsTab')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dns')}
          className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
            activeTab === 'dns' ? 'border-b-2 border-primary-600 bg-white text-primary-600' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          {t('dnsTab')}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Building2 className="h-10 w-10 text-primary-600" />
            <div>
              <p className="text-sm text-slate-500">{t('totalSchools')}</p>
              <p className="text-2xl font-bold text-slate-800">{stats?.total_schools ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Power className="h-10 w-10 text-emerald-600" />
            <div>
              <p className="text-sm text-slate-500">{t('activeSchools')}</p>
              <p className="text-2xl font-bold text-slate-800">{stats?.active_schools ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <PowerOff className="h-10 w-10 text-amber-600" />
            <div>
              <p className="text-sm text-slate-500">{t('suspended')}</p>
              <p className="text-2xl font-bold text-slate-800">{stats?.suspended_schools ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Users className="h-10 w-10 text-indigo-600" />
            <div>
              <p className="text-sm text-slate-500">{t('totalUsers')}</p>
              <p className="text-2xl font-bold text-slate-800">{stats?.total_users ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'schools' && (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-800">{t('allSchools')}</h3>
          <p className="text-sm text-slate-500">{t('allSchoolsDesc')}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">{t('school')}</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">{t('email')}</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">{t('domain')}</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">{t('status')}</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">{t('users')}</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">{t('studentsCol')}</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {institutions.map((inst) => (
                <tr key={inst.id} className="table-row-hover border-b border-slate-100">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{inst.name}</p>
                    {inst.name_bn && <p className="text-xs text-slate-500">{inst.name_bn}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{inst.email ?? '—'}</td>
                  <td className="px-6 py-4 text-sm">
                    {inst.custom_domain ? (
                      <span className="text-slate-700">{inst.custom_domain}</span>
                    ) : inst.subdomain ? (
                      <span className="text-slate-600">{inst.subdomain}.{PLATFORM_DOMAIN}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${inst.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {inst.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="ml-1 rounded-full px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600">
                      {inst.subscription_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{inst.users_count ?? 0}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{inst.students_count ?? 0}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/${locale}/super-admin/school/${inst.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50"
                      >
                        <Globe className="h-4 w-4" /> {t('config')}
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleActive(inst)}
                        disabled={updateMutation.isPending}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                        title={inst.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {inst.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(inst)}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                        title="Edit domain & features"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {activeTab === 'dns' && (
        <div className="space-y-6">
          {/* Server Info Card */}
          <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <Server className="mt-0.5 h-8 w-8 text-indigo-600" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-indigo-900">{t('serverConfig')}</h3>
                <p className="mt-1 text-sm text-indigo-700">{t('serverConfigDesc')}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-white/80 px-4 py-3 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('serverIp')}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="text-lg font-bold text-slate-800">{SERVER_IP}</code>
                      <button type="button" onClick={() => copyToClipboard(SERVER_IP)} className="rounded p-1 text-slate-400 hover:text-indigo-600" title="Copy">
                        {copiedText === SERVER_IP ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/80 px-4 py-3 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('platformDomain')}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="text-lg font-bold text-slate-800">{PLATFORM_DOMAIN}</code>
                      <button type="button" onClick={() => copyToClipboard(PLATFORM_DOMAIN)} className="rounded p-1 text-slate-400 hover:text-indigo-600" title="Copy">
                        {copiedText === PLATFORM_DOMAIN ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/80 px-4 py-3 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('portalUrl')}</p>
                    <code className="mt-1 block text-lg font-bold text-slate-800">https://{PLATFORM_DOMAIN}</code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DNS Setup Instructions */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-6 w-6 text-amber-600" />
              <div>
                <h4 className="font-semibold text-amber-900">{t('dnsSetupGuide')}</h4>
                <div className="mt-3 space-y-3 text-sm text-amber-800">
                  <div className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">1</span>
                    <div>
                      <p className="font-medium">{t('dnsStep1Title')}</p>
                      <p className="text-amber-700">{t('dnsStep1Desc')}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">2</span>
                    <div>
                      <p className="font-medium">{t('dnsStep2Title')}</p>
                      <p className="text-amber-700">{t('dnsStep2Desc')}</p>
                      <div className="mt-2 rounded border border-amber-300 bg-white/50 px-3 py-2 font-mono text-xs">
                        <p>Type: <strong>A Record</strong> | Host: <strong>@</strong> | Value: <strong>{SERVER_IP}</strong></p>
                        <p className="mt-1">Type: <strong>A Record</strong> | Host: <strong>www</strong> | Value: <strong>{SERVER_IP}</strong></p>
                        <p className="mt-2 text-amber-600">— OR for subdomains —</p>
                        <p className="mt-1">Type: <strong>CNAME</strong> | Host: <strong>www</strong> | Value: <strong>{PLATFORM_DOMAIN}</strong></p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">3</span>
                    <div>
                      <p className="font-medium">{t('dnsStep3Title')}</p>
                      <p className="text-amber-700">{t('dnsStep3Desc')}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">4</span>
                    <div>
                      <p className="font-medium">{t('dnsStep4Title')}</p>
                      <p className="text-amber-700">{t('dnsStep4Desc')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Domain Management Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-800">{t('domainManagement')}</h3>
              <p className="text-sm text-slate-500">{t('domainManagementDesc')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-header">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">{t('school')}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">{t('customDomain')}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">{t('subdomainUrl')}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">{t('dnsStatus')}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">{t('landingPageUrl')}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((inst) => {
                    const verification = verificationResults[inst.id];
                    const subdomainUrl = inst.subdomain ? `${inst.subdomain}.${PLATFORM_DOMAIN}` : null;
                    const landingUrl = inst.custom_domain
                      ? `https://${inst.custom_domain}`
                      : subdomainUrl
                        ? `https://${subdomainUrl}`
                        : null;

                    return (
                      <tr key={inst.id} className="table-row-hover border-b border-slate-100">
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800">{inst.name}</p>
                          {inst.name_bn && <p className="text-xs text-slate-500">{inst.name_bn}</p>}
                          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${inst.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {inst.is_active ? t('active') : t('inactive')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {inst.custom_domain ? (
                            <div className="flex items-center gap-2">
                              <code className="rounded bg-slate-100 px-2 py-1 text-sm font-medium text-slate-800">{inst.custom_domain}</code>
                              <button type="button" onClick={() => copyToClipboard(inst.custom_domain!)} className="rounded p-1 text-slate-400 hover:text-indigo-600">
                                {copiedText === inst.custom_domain ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">{t('notConfigured')}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {subdomainUrl ? (
                            <div className="flex items-center gap-2">
                              <code className="rounded bg-blue-50 px-2 py-1 text-sm font-medium text-blue-700">{subdomainUrl}</code>
                              <button type="button" onClick={() => copyToClipboard(subdomainUrl)} className="rounded p-1 text-slate-400 hover:text-indigo-600">
                                {copiedText === subdomainUrl ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {inst.custom_domain ? (
                            verification ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  {verification.verified ? (
                                    <>
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                      <span className="text-sm font-medium text-emerald-700">{t('dnsVerified')}</span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle className="h-4 w-4 text-red-500" />
                                      <span className="text-sm font-medium text-red-700">{t('dnsNotVerified')}</span>
                                    </>
                                  )}
                                </div>
                                {verification.resolved_ip && (
                                  <p className="text-xs text-slate-500">
                                    Resolves to: <code className="rounded bg-slate-100 px-1">{verification.resolved_ip}</code>
                                    {verification.resolved_ip !== SERVER_IP && (
                                      <span className="ml-1 text-red-500">(expected: {SERVER_IP})</span>
                                    )}
                                  </p>
                                )}
                                {verification.dns_records.length > 0 && (
                                  <div className="text-xs text-slate-500">
                                    {verification.dns_records.map((r, i) => (
                                      <span key={i} className="mr-2">{r.type}: {r.value}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">{t('notChecked')}</span>
                            )
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {landingUrl ? (
                            <a
                              href={landingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              {t('visitSite')} <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="text-sm text-slate-400">{t('noDomainSet')}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {inst.custom_domain && (
                              <button
                                type="button"
                                onClick={() => handleVerifyDomain(inst)}
                                disabled={verifying === inst.id}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                              >
                                <RefreshCw className={`h-3.5 w-3.5 ${verifying === inst.id ? 'animate-spin' : ''}`} />
                                {t('verifyDns')}
                              </button>
                            )}
                            <Link
                              href={`/${locale}/super-admin/school/${inst.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50"
                            >
                              <Settings className="h-3.5 w-3.5" /> {t('editConfig')}
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit School Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-slate-800">{t('editSchool')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">{t('customDomain')}</label>
                <input
                  type="text"
                  value={editForm.custom_domain ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, custom_domain: e.target.value }))}
                  className="input mt-1"
                  placeholder="school.example.com"
                />
                <p className="mt-1 text-xs text-slate-500">{t('dnsHint')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">{t('subdomain')}</label>
                <input
                  type="text"
                  value={editForm.subdomain ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, subdomain: e.target.value }))}
                  className="input mt-1"
                  placeholder="school"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">{t('subscriptionStatus')}</label>
                <select
                  value={editForm.subscription_status ?? 'active'}
                  onChange={(e) => setEditForm((f) => ({ ...f, subscription_status: e.target.value }))}
                  className="input mt-1"
                >
                  <option value="active">{t('active')}</option>
                  <option value="trial">{t('trial')}</option>
                  <option value="suspended">{t('suspended')}</option>
                  <option value="cancelled">{t('cancelled')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">{t('featureFlags')}</label>
                <div className="mt-2 space-y-2">
                  {FEATURE_KEYS.map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`feat-${key}`}
                        checked={(editForm.feature_flags?.[key] ?? true) === true}
                        onChange={(e) => setFeature(key, e.target.checked)}
                      />
                      <label htmlFor={`feat-${key}`} className="text-sm text-slate-700">
                        {key.replace(/_/g, ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingId(null)} className="btn">
                {t('cancel')}
              </button>
              <button type="button" onClick={handleSave} disabled={updateMutation.isPending} className="btn btn-primary flex items-center gap-2">
                <Save className="h-4 w-4" /> {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New School Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => { setShowAddModal(false); setNewSchool(emptyNewSchool); }}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="mb-1 text-xl font-bold text-slate-800">{t('createSchoolTitle')}</h3>
            <p className="mb-6 text-sm text-slate-500">{t('createSchoolDesc')}</p>

            {/* School Information */}
            <div className="mb-6">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                <Building2 className="h-4 w-4" /> {t('schoolInfo')}
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">{t('schoolName')} <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newSchool.name}
                    onChange={(e) => setNewSchool((f) => ({ ...f, name: e.target.value }))}
                    className="input mt-1"
                    placeholder="e.g. Dhaka Model School"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">{t('nameBangla')}</label>
                  <input
                    type="text"
                    value={newSchool.name_bn}
                    onChange={(e) => setNewSchool((f) => ({ ...f, name_bn: e.target.value }))}
                    className="input mt-1"
                    placeholder="e.g. ঢাকা মডেল স্কুল"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">{t('eiin')}</label>
                  <input
                    type="text"
                    value={newSchool.eiin}
                    onChange={(e) => setNewSchool((f) => ({ ...f, eiin: e.target.value }))}
                    className="input mt-1"
                    placeholder="e.g. 123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">{t('phone')}</label>
                  <input
                    type="text"
                    value={newSchool.phone}
                    onChange={(e) => setNewSchool((f) => ({ ...f, phone: e.target.value }))}
                    className="input mt-1"
                    placeholder="e.g. +880-2-1234567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">{t('email')}</label>
                  <input
                    type="email"
                    value={newSchool.email}
                    onChange={(e) => setNewSchool((f) => ({ ...f, email: e.target.value }))}
                    className="input mt-1"
                    placeholder="e.g. info@school.edu.bd"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">{t('subscription')}</label>
                  <select
                    value={newSchool.subscription_status}
                    onChange={(e) => setNewSchool((f) => ({ ...f, subscription_status: e.target.value }))}
                    className="input mt-1"
                  >
                    <option value="active">{t('active')}</option>
                    <option value="trial">{t('trial')}</option>
                    <option value="suspended">{t('suspended')}</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">{t('address')}</label>
                  <input
                    type="text"
                    value={newSchool.address}
                    onChange={(e) => setNewSchool((f) => ({ ...f, address: e.target.value }))}
                    className="input mt-1"
                    placeholder="e.g. 123 School Road, Dhaka"
                  />
                </div>
              </div>
            </div>

            {/* Domain Settings */}
            <div className="mb-6">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                <Globe className="h-4 w-4" /> {t('domainSettings')}
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">{t('customDomain')}</label>
                  <input
                    type="text"
                    value={newSchool.custom_domain}
                    onChange={(e) => setNewSchool((f) => ({ ...f, custom_domain: e.target.value }))}
                    className="input mt-1"
                    placeholder="e.g. school.example.com"
                  />
                  <p className="mt-1 text-xs text-slate-500">{t('dnsHint')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">{t('subdomain')}</label>
                  <div className="mt-1 flex items-center">
                    <input
                      type="text"
                      value={newSchool.subdomain}
                      onChange={(e) => setNewSchool((f) => ({ ...f, subdomain: e.target.value }))}
                      className="input rounded-r-none"
                      placeholder="e.g. dhaka-model"
                    />
                    <span className="inline-flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      .{PLATFORM_DOMAIN}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Account */}
            <div className="mb-6">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                <Users className="h-4 w-4" /> {t('adminAccount')} <span className="text-xs font-normal normal-case text-slate-400">{t('adminOptional')}</span>
              </h4>
              <p className="mb-3 text-xs text-slate-500">{t('adminDesc')}</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">{t('adminName')}</label>
                  <input
                    type="text"
                    value={newSchool.admin_name}
                    onChange={(e) => setNewSchool((f) => ({ ...f, admin_name: e.target.value }))}
                    className="input mt-1"
                    placeholder="e.g. Admin User"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">{t('adminEmail')}</label>
                  <input
                    type="email"
                    value={newSchool.admin_email}
                    onChange={(e) => setNewSchool((f) => ({ ...f, admin_email: e.target.value }))}
                    className="input mt-1"
                    placeholder="e.g. admin@school.edu.bd"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">{t('adminPassword')}</label>
                  <input
                    type="password"
                    value={newSchool.admin_password}
                    onChange={(e) => setNewSchool((f) => ({ ...f, admin_password: e.target.value }))}
                    className="input mt-1"
                    placeholder="Min 6 characters"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setNewSchool(emptyNewSchool); }}
                className="btn"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleCreateSchool}
                disabled={createMutation.isPending}
                className="btn btn-primary flex items-center gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t('creating')}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> {t('createSchool')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
