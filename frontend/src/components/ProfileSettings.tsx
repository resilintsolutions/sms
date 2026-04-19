'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { User, Lock, Save, Eye, EyeOff } from 'lucide-react';

export default function ProfileSettingsPage() {
  const t = useTranslations('common');
  const { user, refresh } = useAuth();
  const qc = useQueryClient();

  /* ── Profile form ── */
  const [profile, setProfile] = useState({
    name: '',
    name_bn: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name ?? '',
        name_bn: (user as unknown as Record<string, string | null>).name_bn ?? '',
        email: user.email ?? '',
        phone: (user as unknown as Record<string, string | null>).phone ?? '',
      });
    }
  }, [user]);

  const profileMut = useMutation({
    mutationFn: () =>
      api('/profile', { method: 'PATCH', body: JSON.stringify(profile) }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message ?? t('savedSuccessfully'));
        refresh();
        qc.invalidateQueries({ queryKey: ['user'] });
      } else {
        toast.error(res.message ?? t('saveFailed'));
      }
    },
    onError: () => toast.error(t('saveFailed')),
  });

  /* ── Password form ── */
  const [pw, setPw] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const pwMut = useMutation({
    mutationFn: () =>
      api('/change-password', { method: 'POST', body: JSON.stringify(pw) }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message ?? 'Password changed');
        setPw({ current_password: '', new_password: '', new_password_confirmation: '' });
      } else {
        const msg = res.errors?.current_password?.[0] ?? res.errors?.new_password?.[0] ?? res.message ?? 'Failed';
        toast.error(msg);
      }
    },
    onError: () => toast.error('Failed to change password'),
  });

  const pwMatch = pw.new_password === pw.new_password_confirmation;
  const pwValid = pw.current_password.length > 0 && pw.new_password.length >= 8 && pwMatch;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h2 className="text-2xl font-bold text-slate-800">Profile Settings</h2>

      {/* ── Profile Card ── */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Profile Information</h3>
            <p className="text-sm text-slate-500">Update your name, email, and contact details</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name (বাংলা)</label>
              <input
                type="text"
                value={profile.name_bn}
                onChange={(e) => setProfile((p) => ({ ...p, name_bn: e.target.value }))}
                className="input w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              type="text"
              value={profile.phone}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              className="input w-full"
              placeholder="+880…"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => profileMut.mutate()}
              disabled={profileMut.isPending || !profile.name || !profile.email}
              className="btn btn-primary flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {profileMut.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Password Card ── */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Change Password</h3>
            <p className="text-sm text-slate-500">You will need to enter your current password</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Current password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={pw.current_password}
                onChange={(e) => setPw((p) => ({ ...p, current_password: e.target.value }))}
                className="input w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={pw.new_password}
                onChange={(e) => setPw((p) => ({ ...p, new_password: e.target.value }))}
                className="input w-full pr-10"
                placeholder="Min. 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pw.new_password.length > 0 && pw.new_password.length < 8 && (
              <p className="mt-1 text-xs text-red-500">Password must be at least 8 characters</p>
            )}
          </div>

          {/* Confirm new password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={pw.new_password_confirmation}
              onChange={(e) => setPw((p) => ({ ...p, new_password_confirmation: e.target.value }))}
              className="input w-full"
            />
            {pw.new_password_confirmation.length > 0 && !pwMatch && (
              <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => pwMut.mutate()}
              disabled={pwMut.isPending || !pwValid}
              className="btn btn-primary flex items-center gap-2"
            >
              <Lock className="h-4 w-4" />
              {pwMut.isPending ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
