'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Building2, Users, GraduationCap, Power, PowerOff, Settings, Save, Globe, Plus, X } from 'lucide-react';
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
                      <span className="text-slate-600">{inst.subdomain}.yourschools.com</span>
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
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-800">{t('dnsTitle')}</h3>
            <p className="text-sm text-slate-500">{t('dnsDesc')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('school')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('customDomain')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('subdomain')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('dnsRecord')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('configure')}</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((inst) => (
                  <tr key={inst.id} className="table-row-hover border-b border-slate-100">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{inst.name}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">
                      {inst.custom_domain || (
                        <span className="text-slate-400">{t('notSet')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">
                      {inst.subdomain ? (
                        <span>{inst.subdomain}.yourschools.com</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {inst.custom_domain ? (
                        <code className="rounded bg-slate-100 px-2 py-1">
                          {inst.custom_domain} CNAME → your-app.example.com
                        </code>
                      ) : (
                        <span className="text-slate-400">{t('addDomainToSee')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/${locale}/super-admin/school/${inst.id}`}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50"
                      >
                        <Globe className="h-4 w-4" /> {t('editConfig')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                      .yourschools.com
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
