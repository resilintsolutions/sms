'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft, Save, Plus, X, KeyRound, UserCog, Power, PowerOff,
  Shield, Eye, EyeOff, Copy, Check, Mail, Phone, Clock, User,
} from 'lucide-react';

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
};

type Config = {
  site?: { logoUrl?: string; schoolName?: string; schoolName_bn?: string };
  hero?: { title?: string; title_bn?: string; subtitle?: string };
  about?: { heading?: string; body?: string };
  contact?: { email?: string; phone?: string; address?: string };
};

type AdminUser = {
  id: number;
  name: string;
  name_bn?: string | null;
  email: string;
  phone?: string | null;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
};

type NewAdminForm = {
  name: string;
  name_bn: string;
  email: string;
  phone: string;
  password: string;
};

const emptyAdmin: NewAdminForm = { name: '', name_bn: '', email: '', phone: '', password: '' };

const FEATURE_KEYS = ['fees', 'attendance', 'exams', 'notices', 'landing_page'] as const;

export default function SuperAdminSchoolConfigPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const id = Number(params?.id);
  const queryClient = useQueryClient();
  const t = useTranslations('superAdmin');
  const tc = useTranslations('common');

  const [instForm, setInstForm] = useState<Partial<Institution>>({});
  const [configForm, setConfigForm] = useState<Config>({});
  const [activeSection, setActiveSection] = useState<'institution' | 'features' | 'admins' | 'website'>('institution');

  // Admin management state
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState<NewAdminForm>(emptyAdmin);
  const [resetPasswordId, setResetPasswordId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<number | null>(null);
  const [editAdminForm, setEditAdminForm] = useState<Partial<AdminUser>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-school', id],
    queryFn: async () => {
      const res = await api<{ institution: Institution; landing_config: Config }>(`/super-admin/institutions/${id}`);
      if (!res.success || !res.data) throw new Error('Failed to load');
      return res.data;
    },
    enabled: !!id && !isNaN(id),
  });

  const { data: adminsData, isLoading: adminsLoading } = useQuery({
    queryKey: ['super-admin-school-admins', id],
    queryFn: async () => {
      const res = await api<AdminUser[]>(`/super-admin/institutions/${id}/admins`);
      return res.data ?? [];
    },
    enabled: !!id && !isNaN(id),
  });
  const admins = adminsData ?? [];

  useEffect(() => {
    if (data?.institution) {
      setInstForm({
        name: data.institution.name,
        name_bn: data.institution.name_bn ?? '',
        email: data.institution.email ?? '',
        phone: data.institution.phone ?? '',
        custom_domain: data.institution.custom_domain ?? '',
        subdomain: data.institution.subdomain ?? '',
        subscription_status: data.institution.subscription_status,
        is_active: data.institution.is_active,
        feature_flags: { ...data.institution.feature_flags },
      });
    }
    if (data?.landing_config) {
      setConfigForm({
        site: { ...data.landing_config.site },
        hero: { ...data.landing_config.hero },
        about: { ...data.landing_config.about },
        contact: { ...data.landing_config.contact },
      });
    }
  }, [data]);

  const updateInstMutation = useMutation({
    mutationFn: (body: Partial<Institution>) =>
      api(`/super-admin/institutions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-school', id] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-institutions'] });
      toast.success(t('schoolUpdated'));
    },
    onError: (err: { message?: string }) => toast.error(err?.message || t('failedToUpdate')),
  });

  const updateConfigMutation = useMutation({
    mutationFn: (config: Config) =>
      api<{ data: Config }>(`/super-admin/institutions/${id}/config`, { method: 'PUT', body: JSON.stringify({ config }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-school', id] });
      toast.success(t('websiteConfigUpdated'));
    },
    onError: (err: { message?: string }) => toast.error(err?.message || t('failedToUpdate')),
  });

  const addAdminMutation = useMutation({
    mutationFn: (body: NewAdminForm) =>
      api(`/super-admin/institutions/${id}/admins`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-school-admins', id] });
      toast.success(t('adminCreated'));
      setShowAddAdmin(false);
      setNewAdmin(emptyAdmin);
    },
    onError: (err: { message?: string; errors?: Record<string, string[]> }) => {
      const firstError = err?.errors ? Object.values(err.errors)[0]?.[0] : null;
      toast.error(firstError || err?.message || t('failedToCreate'));
    },
  });

  const updateAdminMutation = useMutation({
    mutationFn: ({ userId, ...body }: { userId: number } & Partial<AdminUser>) =>
      api(`/super-admin/institutions/${id}/admins/${userId}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-school-admins', id] });
      toast.success(t('adminUpdatedSuccess'));
      setEditingAdminId(null);
    },
    onError: (err: { message?: string }) => toast.error(err?.message || t('failedToUpdate')),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: number; password: string }) =>
      api(`/super-admin/institutions/${id}/admins/${userId}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }),
    onSuccess: () => {
      toast.success(t('passwordResetSuccess'));
      setResetPasswordId(null);
      setNewPassword('');
    },
    onError: (err: { message?: string }) => toast.error(err?.message || t('failedToUpdate')),
  });

  const toggleAdminMutation = useMutation({
    mutationFn: (userId: number) =>
      api(`/super-admin/institutions/${id}/admins/${userId}/toggle-active`, { method: 'PATCH' }),
    onSuccess: (res: { message?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-school-admins', id] });
      toast.success(res?.message || t('adminUpdatedSuccess'));
    },
    onError: (err: { message?: string }) => toast.error(err?.message || t('failedToUpdate')),
  });

  const setFeature = (key: string, value: boolean) => {
    setInstForm((f) => ({
      ...f,
      feature_flags: { ...(f.feature_flags ?? {}), [key]: value },
    }));
  };

  const handleSaveInst = () => {
    updateInstMutation.mutate({
      ...instForm,
      custom_domain: instForm.custom_domain || undefined,
      subdomain: instForm.subdomain || undefined,
    });
  };

  const handleSaveConfig = () => {
    updateConfigMutation.mutate(configForm);
  };

  const handleAddAdmin = () => {
    if (!newAdmin.name.trim() || !newAdmin.email.trim() || !newAdmin.password.trim()) {
      toast.error(t('adminFieldsRequired'));
      return;
    }
    addAdminMutation.mutate(newAdmin);
  };

  const handleResetPassword = () => {
    if (!resetPasswordId || newPassword.length < 6) {
      toast.error(t('passwordMinLength'));
      return;
    }
    resetPasswordMutation.mutate({ userId: resetPasswordId, password: newPassword });
  };

  const generatePassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let pw = '';
    for (let i = 0; i < 12; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
    return pw;
  };

  const copyToClipboard = (text: string, adminId: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(adminId);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success(t('copiedToClipboard'));
    });
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-slate-500">{tc('loading')}</p>
      </div>
    );
  }

  const institution = data.institution;

  const tabLabels = {
    institution: t('institutionTab'),
    features: t('featuresTab'),
    admins: t('adminsTab'),
    website: t('websiteTab'),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/super-admin`}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> {t('backToDashboard')}
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-slate-800">{institution.name} — {t('configuration')}</h2>

      <div className="flex gap-2 border-b border-slate-200">
        {(['institution', 'features', 'admins', 'website'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveSection(s)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
              activeSection === s
                ? 'border-b-2 border-primary-600 bg-white text-primary-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tabLabels[s]}
          </button>
        ))}
      </div>

      {/* ─── Institution Tab ─── */}
      {activeSection === 'institution' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">{t('schoolAndDns')}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">{t('schoolName')}</label>
              <input type="text" value={instForm.name ?? ''} onChange={(e) => setInstForm((f) => ({ ...f, name: e.target.value }))} className="input mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">{t('nameBangla')}</label>
              <input type="text" value={instForm.name_bn ?? ''} onChange={(e) => setInstForm((f) => ({ ...f, name_bn: e.target.value }))} className="input mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">{t('email')}</label>
              <input type="email" value={instForm.email ?? ''} onChange={(e) => setInstForm((f) => ({ ...f, email: e.target.value }))} className="input mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">{t('phone')}</label>
              <input type="text" value={instForm.phone ?? ''} onChange={(e) => setInstForm((f) => ({ ...f, phone: e.target.value }))} className="input mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">{t('customDomain')}</label>
              <input type="text" value={instForm.custom_domain ?? ''} onChange={(e) => setInstForm((f) => ({ ...f, custom_domain: e.target.value }))} className="input mt-1" placeholder="school.example.com" />
              <p className="mt-1 text-xs text-slate-500">{t('dnsHint')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">{t('subdomain')}</label>
              <input type="text" value={instForm.subdomain ?? ''} onChange={(e) => setInstForm((f) => ({ ...f, subdomain: e.target.value }))} className="input mt-1" placeholder="school" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">{t('subscription')}</label>
              <select value={instForm.subscription_status ?? 'active'} onChange={(e) => setInstForm((f) => ({ ...f, subscription_status: e.target.value }))} className="input mt-1">
                <option value="active">{t('active')}</option>
                <option value="trial">{t('trial')}</option>
                <option value="suspended">{t('suspended')}</option>
                <option value="cancelled">{t('cancelled')}</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="is_active" checked={(instForm.is_active ?? true) === true} onChange={(e) => setInstForm((f) => ({ ...f, is_active: e.target.checked }))} />
              <label htmlFor="is_active" className="text-sm text-slate-700">{t('active')}</label>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={handleSaveInst} disabled={updateInstMutation.isPending} className="btn btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" /> {t('save')}
            </button>
          </div>
        </div>
      )}

      {/* ─── Features Tab ─── */}
      {activeSection === 'features' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">{t('featureFlags')}</h3>
          <div className="space-y-2">
            {FEATURE_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <input type="checkbox" id={`feat-${key}`} checked={(instForm.feature_flags?.[key] ?? true) === true} onChange={(e) => setFeature(key, e.target.checked)} />
                <label htmlFor={`feat-${key}`} className="text-sm text-slate-700">{key.replace(/_/g, ' ')}</label>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={handleSaveInst} disabled={updateInstMutation.isPending} className="btn btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" /> {t('save')}
            </button>
          </div>
        </div>
      )}

      {/* ─── Admins Tab ─── */}
      {activeSection === 'admins' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">{t('manageAdmins')}</h3>
              <p className="mt-1 text-sm text-slate-500">{t('manageAdminsDesc')}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddAdmin(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> {t('addAdminBtn')}
            </button>
          </div>

          {/* Admin cards */}
          {adminsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          ) : admins.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
              <UserCog className="h-16 w-16 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-700">{t('noAdminsFound')}</h3>
              <p className="mt-2 text-sm text-slate-500">{t('noAdminsDesc')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {admins.map((admin) => (
                <div key={admin.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${admin.is_active ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-800">{admin.name_bn || admin.name}</h4>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${admin.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {admin.is_active ? t('active') : t('inactive')}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                          <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {admin.email}</span>
                          {admin.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {admin.phone}</span>}
                          {admin.last_login_at && (
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {t('lastLogin')}: {new Date(admin.last_login_at).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setEditingAdminId(admin.id); setEditAdminForm({ name: admin.name, name_bn: admin.name_bn || '', email: admin.email, phone: admin.phone || '' }); }}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        title={t('editAdmin')}
                      >
                        <UserCog className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setResetPasswordId(admin.id); setNewPassword(''); setShowNewPassword(false); }}
                        className="rounded-lg p-2 text-amber-500 hover:bg-amber-50 hover:text-amber-700"
                        title={t('resetPassword')}
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleAdminMutation.mutate(admin.id)}
                        disabled={toggleAdminMutation.isPending}
                        className={`rounded-lg p-2 ${admin.is_active ? 'text-red-500 hover:bg-red-50 hover:text-red-700' : 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700'}`}
                        title={admin.is_active ? t('deactivateAdmin') : t('activateAdmin')}
                      >
                        {admin.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(admin.email, admin.id)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title={t('copyEmail')}
                      >
                        {copiedId === admin.id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Inline Edit Admin */}
                  {editingAdminId === admin.id && (
                    <div className="border-t border-slate-200 bg-slate-50 p-5">
                      <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <UserCog className="h-4 w-4" /> {t('editAdminDetails')}
                      </h5>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-600">{t('adminName')}</label>
                          <input type="text" value={editAdminForm.name ?? ''} onChange={(e) => setEditAdminForm((f) => ({ ...f, name: e.target.value }))} className="input mt-1 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600">{t('nameBangla')}</label>
                          <input type="text" value={editAdminForm.name_bn ?? ''} onChange={(e) => setEditAdminForm((f) => ({ ...f, name_bn: e.target.value }))} className="input mt-1 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600">{t('adminEmail')}</label>
                          <input type="email" value={editAdminForm.email ?? ''} onChange={(e) => setEditAdminForm((f) => ({ ...f, email: e.target.value }))} className="input mt-1 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600">{t('phone')}</label>
                          <input type="text" value={editAdminForm.phone ?? ''} onChange={(e) => setEditAdminForm((f) => ({ ...f, phone: e.target.value }))} className="input mt-1 text-sm" />
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingAdminId(null)} className="btn text-sm">{t('cancel')}</button>
                        <button
                          type="button"
                          onClick={() => updateAdminMutation.mutate({ userId: admin.id, ...editAdminForm })}
                          disabled={updateAdminMutation.isPending}
                          className="btn btn-primary flex items-center gap-1 text-sm"
                        >
                          <Save className="h-3.5 w-3.5" /> {t('save')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline Reset Password */}
                  {resetPasswordId === admin.id && (
                    <div className="border-t border-amber-200 bg-amber-50 p-5">
                      <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
                        <KeyRound className="h-4 w-4" /> {t('resetPasswordFor')} {admin.name}
                      </h5>
                      <p className="mb-3 text-xs text-amber-700">{t('resetPasswordWarning')}</p>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="input pr-10 text-sm"
                            placeholder={t('newPasswordPlaceholder')}
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const pw = generatePassword();
                            setNewPassword(pw);
                            setShowNewPassword(true);
                          }}
                          className="btn flex items-center gap-1 text-sm"
                        >
                          {t('generateBtn')}
                        </button>
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <button type="button" onClick={() => { setResetPasswordId(null); setNewPassword(''); }} className="btn text-sm">{t('cancel')}</button>
                        <button
                          type="button"
                          onClick={handleResetPassword}
                          disabled={resetPasswordMutation.isPending || newPassword.length < 6}
                          className="btn flex items-center gap-1 bg-amber-600 text-sm text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          <KeyRound className="h-3.5 w-3.5" /> {t('resetPasswordBtn')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Admin Modal */}
          {showAddAdmin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                <button
                  type="button"
                  onClick={() => { setShowAddAdmin(false); setNewAdmin(emptyAdmin); }}
                  className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>

                <h3 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-800">
                  <Shield className="h-5 w-5 text-indigo-500" /> {t('addNewAdmin')}
                </h3>
                <p className="mb-5 text-sm text-slate-500">{t('addNewAdminDesc')}</p>

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">{t('adminName')} <span className="text-red-500">*</span></label>
                      <input type="text" value={newAdmin.name} onChange={(e) => setNewAdmin((f) => ({ ...f, name: e.target.value }))} className="input mt-1" placeholder="e.g. Admin User" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">{t('nameBangla')}</label>
                      <input type="text" value={newAdmin.name_bn} onChange={(e) => setNewAdmin((f) => ({ ...f, name_bn: e.target.value }))} className="input mt-1" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">{t('adminEmail')} <span className="text-red-500">*</span></label>
                    <input type="email" value={newAdmin.email} onChange={(e) => setNewAdmin((f) => ({ ...f, email: e.target.value }))} className="input mt-1" placeholder="e.g. admin@school.edu.bd" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">{t('phone')}</label>
                    <input type="text" value={newAdmin.phone} onChange={(e) => setNewAdmin((f) => ({ ...f, phone: e.target.value }))} className="input mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">{t('adminPassword')} <span className="text-red-500">*</span></label>
                    <div className="relative mt-1">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newAdmin.password}
                        onChange={(e) => setNewAdmin((f) => ({ ...f, password: e.target.value }))}
                        className="input pr-24"
                        placeholder={t('passwordMinPlaceholder')}
                      />
                      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="rounded p-1 text-slate-400 hover:text-slate-600">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setNewAdmin((f) => ({ ...f, password: generatePassword() })); setShowPassword(true); }}
                          className="rounded px-2 py-0.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                        >
                          {t('generateBtn')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                  <button type="button" onClick={() => { setShowAddAdmin(false); setNewAdmin(emptyAdmin); }} className="btn">{t('cancel')}</button>
                  <button
                    type="button"
                    onClick={handleAddAdmin}
                    disabled={addAdminMutation.isPending}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    {addAdminMutation.isPending ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {t('creating')}
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" /> {t('addAdminBtn')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Website Tab ─── */}
      {activeSection === 'website' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">{t('websiteTab')}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">{t('schoolNameWebsite')}</label>
              <input type="text" value={configForm.site?.schoolName ?? ''} onChange={(e) => setConfigForm((c) => ({ ...c, site: { ...c.site, schoolName: e.target.value } }))} className="input mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">{t('heroTitle')}</label>
              <input type="text" value={configForm.hero?.title ?? ''} onChange={(e) => setConfigForm((c) => ({ ...c, hero: { ...c.hero, title: e.target.value } }))} className="input mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">{t('heroSubtitle')}</label>
              <input type="text" value={configForm.hero?.subtitle ?? ''} onChange={(e) => setConfigForm((c) => ({ ...c, hero: { ...c.hero, subtitle: e.target.value } }))} className="input mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">{t('contactEmail')}</label>
              <input type="email" value={configForm.contact?.email ?? ''} onChange={(e) => setConfigForm((c) => ({ ...c, contact: { ...c.contact, email: e.target.value } }))} className="input mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">{t('contactPhone')}</label>
              <input type="text" value={configForm.contact?.phone ?? ''} onChange={(e) => setConfigForm((c) => ({ ...c, contact: { ...c.contact, phone: e.target.value } }))} className="input mt-1" />
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">{t('websiteFullEditNote')}</p>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={handleSaveConfig} disabled={updateConfigMutation.isPending} className="btn btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" /> {t('save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
