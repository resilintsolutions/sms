'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import CommunityFeed from '@/components/community/CommunityFeed';
import {
  Shield,
  AlertTriangle,
  Check,
  X,
  Trash2,
  BarChart3,
  FileText,
  Flag,
  MessageCircle,
  Globe,
  Settings,
  Building2,
  ToggleLeft,
  ToggleRight,
  Users,
  TrendingUp,
} from 'lucide-react';

/* ══════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════ */

type Report = {
  id: number;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter: { id: number; name: string; name_bn: string | null } | null;
  reportable: { id: number; title?: string; body?: string; moderation_status?: string } | null;
  reportable_type: string;
  reviewer: { id: number; name: string; name_bn: string | null } | null;
  reviewed_at: string | null;
};

type FlaggedPost = {
  id: number;
  title: string;
  title_bn: string | null;
  body: string | null;
  moderation_status: string;
  author: { id: number; name: string; name_bn: string | null } | null;
  institution: { id: number; name: string; name_bn: string | null } | null;
};

type FlaggedComment = {
  id: number;
  body: string;
  moderation_status: string;
  user: { id: number; name: string; name_bn: string | null } | null;
  institution: { id: number; name: string; name_bn: string | null } | null;
  post: { id: number; title: string } | null;
};

type ModerationStats = {
  total_posts: number;
  published_posts: number;
  flagged_posts: number;
  removed_posts: number;
  total_comments: number;
  flagged_comments: number;
  pending_reports: number;
  reviewed_reports: number;
};

type AuditEntry = {
  id: number;
  action: string;
  institution_id: number;
  created_at: string;
  meta: Record<string, unknown> | null;
  user: { id: number; name: string; name_bn: string | null } | null;
};

type SchoolSettings = {
  id: number;
  institution_id: number;
  enable_community: boolean;
  who_can_post: string;
  allow_cross_school_comments: boolean;
  moderation_level: string;
  institution?: { id: number; name: string; name_bn: string | null } | null;
};

type PaginatedRes<T> = { data: T[] };

function unwrap<T>(res: unknown): T[] {
  const d = (res as { data?: T[] | { data?: T[] } })?.data;
  return Array.isArray(d) ? d : (d as { data?: T[] })?.data ?? [];
}

/* ══════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════ */

type Tab = 'overview' | 'feed' | 'schools' | 'reports' | 'flagged' | 'audit';

export default function SuperAdminCommunityPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const qc = useQueryClient();

  /* ── Global community status ── */
  const { data: allSettingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['community-all-settings'],
    queryFn: () => api<SchoolSettings[]>('/community/settings/all'),
  });
  const allSettings = unwrap<SchoolSettings>(allSettingsData);
  const enabledCount = allSettings.filter((s) => s.enable_community).length;
  const totalCount = allSettings.length;
  const allEnabled = totalCount > 0 && enabledCount === totalCount;

  const toggleAllMut = useMutation({
    mutationFn: (enable: boolean) =>
      api('/community/settings/toggle-all', {
        method: 'POST',
        body: JSON.stringify({ enable_community: enable }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-all-settings'] });
      qc.invalidateQueries({ queryKey: ['community-status'] });
      qc.invalidateQueries({ queryKey: ['community-mod-stats'] });
      toast.success(allEnabled ? 'Community disabled for all schools' : 'Community enabled for all schools');
    },
    onError: () => toast.error('Failed to toggle community'),
  });

  const tabs: { key: Tab; label: string; icon: typeof Shield }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'feed', label: 'Global Feed', icon: Globe },
    { key: 'schools', label: 'School Settings', icon: Building2 },
    { key: 'reports', label: 'Reports', icon: Flag },
    { key: 'flagged', label: 'Flagged Content', icon: AlertTriangle },
    { key: 'audit', label: 'Audit Log', icon: FileText },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Community Management</h2>
          <p className="text-sm text-slate-500 mt-1">Manage community across all schools</p>
        </div>

        {/* Global Enable / Disable Toggle */}
        {!settingsLoading && totalCount > 0 && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">
                {enabledCount}/{totalCount} schools enabled
              </p>
              <p className="text-xs text-slate-400">
                {allEnabled ? 'Community is ON for all schools' : enabledCount === 0 ? 'Community is OFF for all schools' : 'Partially enabled'}
              </p>
            </div>
            <button
              type="button"
              disabled={toggleAllMut.isPending}
              onClick={() => toggleAllMut.mutate(!allEnabled)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition-all ${
                allEnabled
                  ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {allEnabled ? (
                <>
                  <ToggleRight className="h-5 w-5" />
                  {toggleAllMut.isPending ? 'Disabling…' : 'Disable All'}
                </>
              ) : (
                <>
                  <ToggleLeft className="h-5 w-5" />
                  {toggleAllMut.isPending ? 'Enabling…' : 'Enable All'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 p-1 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              tab === key
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'feed' && <FeedTab />}
      {tab === 'schools' && <SchoolSettingsTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'flagged' && <FlaggedTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}

/* ══════════════════════════════════════════
   OVERVIEW TAB — Enhanced Dashboard
   ══════════════════════════════════════════ */

function OverviewTab() {
  const t = useTranslations('common');

  const { data, isLoading } = useQuery({
    queryKey: ['community-mod-stats'],
    queryFn: () => api<ModerationStats>('/community/moderation/stats'),
  });

  const stats = (data?.data as unknown as ModerationStats) ?? null;

  const { data: schoolsData } = useQuery({
    queryKey: ['community-all-settings'],
    queryFn: () => api<SchoolSettings[]>('/community/settings/all'),
  });
  const schoolSettings = unwrap<SchoolSettings>(schoolsData);

  if (isLoading) return <p className="text-slate-500">{t('loading')}</p>;
  if (!stats) return <p className="text-slate-500">Unable to load stats</p>;

  const enabledSchools = schoolSettings.filter((s) => s.enable_community).length;
  const totalSchools = schoolSettings.length;

  const cards = [
    { label: 'Total Posts', value: stats.total_posts, color: 'bg-blue-50 text-blue-700', icon: FileText },
    { label: 'Published', value: stats.published_posts, color: 'bg-green-50 text-green-700', icon: Check },
    { label: 'Flagged Posts', value: stats.flagged_posts, color: 'bg-yellow-50 text-yellow-700', icon: AlertTriangle },
    { label: 'Removed Posts', value: stats.removed_posts, color: 'bg-red-50 text-red-700', icon: Trash2 },
    { label: 'Total Comments', value: stats.total_comments, color: 'bg-indigo-50 text-indigo-700', icon: MessageCircle },
    { label: 'Flagged Comments', value: stats.flagged_comments, color: 'bg-orange-50 text-orange-700', icon: AlertTriangle },
    { label: 'Pending Reports', value: stats.pending_reports, color: 'bg-amber-50 text-amber-700', icon: Flag },
    { label: 'Reviewed Reports', value: stats.reviewed_reports, color: 'bg-emerald-50 text-emerald-700', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`rounded-xl p-5 ${c.color}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium opacity-80">{c.label}</p>
                <Icon className="h-5 w-5 opacity-50" />
              </div>
              <p className="mt-1 text-3xl font-bold">{c.value}</p>
            </div>
          );
        })}
      </div>

      {/* School community status */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-indigo-600" />
          Community Adoption
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-indigo-50 p-4 text-center">
            <p className="text-3xl font-bold text-indigo-700">{totalSchools}</p>
            <p className="text-sm text-indigo-600 mt-1">Total Schools</p>
          </div>
          <div className="rounded-lg bg-green-50 p-4 text-center">
            <p className="text-3xl font-bold text-green-700">{enabledSchools}</p>
            <p className="text-sm text-green-600 mt-1">Community Enabled</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-center">
            <p className="text-3xl font-bold text-slate-700">{totalSchools - enabledSchools}</p>
            <p className="text-sm text-slate-600 mt-1">Community Disabled</p>
          </div>
        </div>
        {totalSchools > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
              <span>Adoption Rate</span>
              <span className="font-medium">{Math.round((enabledSchools / totalSchools) * 100)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-indigo-500 transition-all"
                style={{ width: `${totalSchools > 0 ? (enabledSchools / totalSchools) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Activity summary */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          Engagement Summary
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">{stats.total_posts}</p>
              <p className="text-xs text-slate-500">Posts Created</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
              <MessageCircle className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">{stats.total_comments}</p>
              <p className="text-xs text-slate-500">Comments Made</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
              <Flag className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">{stats.pending_reports}</p>
              <p className="text-xs text-slate-500">Pending Reports</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">
                {stats.total_posts > 0 ? Math.round(((stats.total_posts - stats.flagged_posts - stats.removed_posts) / stats.total_posts) * 100) : 100}%
              </p>
              <p className="text-xs text-slate-500">Content Health</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   GLOBAL FEED TAB
   ══════════════════════════════════════════ */

function FeedTab() {
  return (
    <CommunityFeed
      canPost={true}
      showCompetitions={true}
      title="Global Community Feed"
      accentClass="text-indigo-700"
    />
  );
}

/* ══════════════════════════════════════════
   SCHOOL SETTINGS TAB — Manage all schools
   ══════════════════════════════════════════ */

function SchoolSettingsTab() {
  const t = useTranslations('common');
  const qc = useQueryClient();
  const [searchQ, setSearchQ] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<'' | 'enabled' | 'disabled'>('');

  const { data, isLoading } = useQuery({
    queryKey: ['community-all-settings'],
    queryFn: () => api<SchoolSettings[]>('/community/settings/all'),
  });
  const allSettings = unwrap<SchoolSettings>(data);

  const filtered = useMemo(() => {
    let result = allSettings;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      result = result.filter(
        (s) =>
          s.institution?.name?.toLowerCase().includes(q) ||
          s.institution?.name_bn?.toLowerCase().includes(q) ||
          String(s.institution_id).includes(q)
      );
    }
    if (filterEnabled === 'enabled') result = result.filter((s) => s.enable_community);
    if (filterEnabled === 'disabled') result = result.filter((s) => !s.enable_community);
    return result;
  }, [allSettings, searchQ, filterEnabled]);

  const toggleMut = useMutation({
    mutationFn: ({ institutionId, field, value }: { institutionId: number; field: string; value: unknown }) =>
      api('/community/settings', {
        method: 'PATCH',
        body: JSON.stringify({ [field]: value }),
        headers: { 'X-Institution-Id': String(institutionId) } as Record<string, string>,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-all-settings'] });
      toast.success('Setting updated');
    },
    onError: () => toast.error('Failed to update setting'),
  });

  const whoCanPostLabels: Record<string, string> = {
    SCHOOL_ADMIN_ONLY: 'Admin Only',
    TEACHERS_ONLY: 'Teachers & Admins',
    ALL_VERIFIED_USERS: 'All Users',
  };

  const moderationLabels: Record<string, string> = {
    AUTO_FLAG: 'Auto Flag',
    MANUAL_REVIEW: 'Manual Review',
    AUTO_REMOVE: 'Auto Remove',
  };

  if (isLoading) return <p className="text-slate-500">{t('loading')}</p>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search schools..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="input w-full pl-9"
          />
        </div>
        <select
          value={filterEnabled}
          onChange={(e) => setFilterEnabled(e.target.value as '' | 'enabled' | 'disabled')}
          className="input"
        >
          <option value="">All Schools</option>
          <option value="enabled">Community Enabled</option>
          <option value="disabled">Community Disabled</option>
        </select>
        <span className="text-sm text-slate-500">{filtered.length} school(s)</span>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <Building2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-lg font-medium">No schools found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((school) => (
            <div key={school.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-slate-800">
                      {school.institution?.name_bn ?? school.institution?.name ?? `School #${school.institution_id}`}
                    </h4>
                    {school.enable_community ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                        <ToggleRight className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        <ToggleLeft className="h-3 w-3" /> Inactive
                      </span>
                    )}
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">
                        Post Access: <strong>{whoCanPostLabels[school.who_can_post] ?? school.who_can_post}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">
                        Cross-School Comments: <strong>{school.allow_cross_school_comments ? 'Yes' : 'No'}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">
                        Moderation: <strong>{moderationLabels[school.moderation_level] ?? school.moderation_level}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      toggleMut.mutate({
                        institutionId: school.institution_id,
                        field: 'enable_community',
                        value: !school.enable_community,
                      })
                    }
                    className={`btn text-xs px-3 ${school.enable_community ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                  >
                    {school.enable_community ? 'Disable' : 'Enable'}
                  </button>
                  <SchoolSettingsDropdown school={school} onUpdate={(field, value) =>
                    toggleMut.mutate({ institutionId: school.institution_id, field, value })
                  } />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Mini dropdown for editing a single school's community settings */
function SchoolSettingsDropdown({
  school,
  onUpdate,
}: {
  school: SchoolSettings;
  onUpdate: (field: string, value: unknown) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="btn text-xs flex items-center gap-1 px-3"
      >
        <Settings className="h-3 w-3" /> Edit
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-800">Edit Settings</h4>
            <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Who Can Post</label>
            <select
              value={school.who_can_post}
              onChange={(e) => { onUpdate('who_can_post', e.target.value); }}
              className="input w-full text-sm"
            >
              <option value="SCHOOL_ADMIN_ONLY">Admin Only</option>
              <option value="TEACHERS_ONLY">Teachers & Admins</option>
              <option value="ALL_VERIFIED_USERS">All Users</option>
            </select>
          </div>

          <label className="flex items-center justify-between">
            <span className="text-xs text-slate-700">Cross-School Comments</span>
            <input
              type="checkbox"
              checked={school.allow_cross_school_comments}
              onChange={(e) => onUpdate('allow_cross_school_comments', e.target.checked)}
              className="rounded h-4 w-4"
            />
          </label>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Moderation</label>
            <select
              value={school.moderation_level}
              onChange={(e) => { onUpdate('moderation_level', e.target.value); }}
              className="input w-full text-sm"
            >
              <option value="AUTO_FLAG">Auto Flag</option>
              <option value="MANUAL_REVIEW">Manual Review</option>
              <option value="AUTO_REMOVE">Auto Remove</option>
            </select>
          </div>

          <button type="button" onClick={() => setOpen(false)} className="btn btn-primary text-xs w-full">
            Done
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   REPORTS TAB
   ══════════════════════════════════════════ */

function ReportsTab() {
  const t = useTranslations('common');
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (statusFilter) p.set('status', statusFilter);
    p.set('per_page', '20');
    return p.toString();
  }, [statusFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['community-reports', params],
    queryFn: () => api<PaginatedRes<Report>>(`/community/moderation/reports?${params}`),
  });
  const reports = unwrap<Report>(data?.data ?? data);

  const reviewMut = useMutation({
    mutationFn: ({ id, ...body }: { id: number; status: string; action?: string }) =>
      api(`/community/moderation/reports/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-reports'] });
      qc.invalidateQueries({ queryKey: ['community-mod-stats'] });
      toast.success('Report reviewed');
    },
    onError: () => toast.error('Failed to review report'),
  });

  const reasonColors: Record<string, string> = {
    SPAM: 'bg-orange-100 text-orange-700',
    INAPPROPRIATE: 'bg-red-100 text-red-700',
    HARASSMENT: 'bg-red-100 text-red-700',
    MISINFORMATION: 'bg-yellow-100 text-yellow-700',
    OTHER: 'bg-slate-100 text-slate-600',
  };

  const statusColors: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    REVIEWED: 'bg-blue-100 text-blue-700',
    DISMISSED: 'bg-slate-100 text-slate-600',
    ACTION_TAKEN: 'bg-green-100 text-green-700',
  };

  return (
    <div>
      <div className="mb-4 flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="DISMISSED">Dismissed</option>
          <option value="ACTION_TAKEN">Action Taken</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-slate-500">{t('loading')}</p>
      ) : reports.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <Flag className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-lg font-medium">No reports found</p>
          <p className="text-sm">Community is clean!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${reasonColors[report.reason] ?? ''}`}>
                      {report.reason}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[report.status] ?? ''}`}>
                      {report.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      {report.reportable_type.includes('Post') ? 'Post' : 'Comment'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">
                    Reported by: <strong>{report.reporter?.name_bn ?? report.reporter?.name ?? 'Unknown'}</strong>
                  </p>
                  {report.details && <p className="text-sm text-slate-500 mt-1">{report.details}</p>}
                  {report.reportable && (
                    <div className="mt-2 rounded bg-slate-50 p-2 text-sm text-slate-600">
                      {report.reportable.title ?? report.reportable.body ?? 'Content unavailable'}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
                    {new Date(report.created_at).toLocaleString()}
                    {report.reviewer && ` • Reviewed by ${report.reviewer.name_bn ?? report.reviewer.name}`}
                  </p>
                </div>

                {report.status === 'PENDING' && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => reviewMut.mutate({ id: report.id, status: 'ACTION_TAKEN', action: 'REMOVE_CONTENT' })}
                      className="btn text-xs flex items-center gap-1 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewMut.mutate({ id: report.id, status: 'DISMISSED' })}
                      className="btn text-xs flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   FLAGGED CONTENT TAB
   ══════════════════════════════════════════ */

function FlaggedTab() {
  const t = useTranslations('common');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['community-flagged'],
    queryFn: () => api<{ posts: FlaggedPost[]; comments: FlaggedComment[] }>('/community/moderation/flagged'),
  });

  const flaggedData = (data?.data as unknown as { posts: FlaggedPost[]; comments: FlaggedComment[] }) ?? { posts: [], comments: [] };

  const removePostMut = useMutation({
    mutationFn: (id: number) =>
      api(`/community/moderation/posts/${id}/remove`, { method: 'POST', body: JSON.stringify({ reason: 'Flagged content' }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-flagged'] });
      qc.invalidateQueries({ queryKey: ['community-mod-stats'] });
      toast.success('Post removed');
    },
  });

  const restorePostMut = useMutation({
    mutationFn: (id: number) => api(`/community/moderation/posts/${id}/restore`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-flagged'] });
      qc.invalidateQueries({ queryKey: ['community-mod-stats'] });
      toast.success('Post restored');
    },
  });

  const removeCommentMut = useMutation({
    mutationFn: (id: number) => api(`/community/moderation/comments/${id}/remove`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-flagged'] });
      qc.invalidateQueries({ queryKey: ['community-mod-stats'] });
      toast.success('Comment removed');
    },
  });

  if (isLoading) return <p className="text-slate-500">{t('loading')}</p>;

  return (
    <div className="space-y-6">
      {/* Flagged Posts */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Flagged Posts ({flaggedData.posts.length})
        </h3>
        {flaggedData.posts.length === 0 ? (
          <div className="card p-6 text-center text-slate-500">
            <Check className="mx-auto h-8 w-8 text-green-400 mb-2" />
            <p className="text-sm">No flagged posts — all clear!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {flaggedData.posts.map((post) => (
              <div key={post.id} className="card p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-800">{post.title_bn ?? post.title}</h4>
                  <p className="text-sm text-slate-500">
                    {post.author?.name_bn ?? post.author?.name ?? 'Unknown'}
                    {' • '}
                    {post.institution?.name_bn ?? post.institution?.name ?? ''}
                  </p>
                  {post.body && <p className="text-sm text-slate-600 mt-1 line-clamp-2">{post.body}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => restorePostMut.mutate(post.id)}
                    className="btn text-xs flex items-center gap-1 text-green-600"
                  >
                    <Check className="h-3 w-3" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => removePostMut.mutate(post.id)}
                    className="btn text-xs flex items-center gap-1 text-red-600"
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Flagged Comments */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Flagged Comments ({flaggedData.comments.length})
        </h3>
        {flaggedData.comments.length === 0 ? (
          <div className="card p-6 text-center text-slate-500">
            <Check className="mx-auto h-8 w-8 text-green-400 mb-2" />
            <p className="text-sm">No flagged comments — all clear!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {flaggedData.comments.map((comment) => (
              <div key={comment.id} className="card p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">{comment.body}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {comment.user?.name_bn ?? comment.user?.name ?? 'Unknown'}
                    {' • '}
                    {comment.institution?.name_bn ?? comment.institution?.name ?? ''}
                    {comment.post && ` • on "${comment.post.title}"`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeCommentMut.mutate(comment.id)}
                  className="btn text-xs flex items-center gap-1 text-red-600 shrink-0"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   AUDIT LOG TAB
   ══════════════════════════════════════════ */

function AuditTab() {
  const t = useTranslations('common');

  const { data, isLoading } = useQuery({
    queryKey: ['community-audit-log'],
    queryFn: () => api<PaginatedRes<AuditEntry>>('/community/moderation/audit-log?per_page=50'),
  });
  const entries = unwrap<AuditEntry>(data?.data ?? data);

  if (isLoading) return <p className="text-slate-500">{t('loading')}</p>;

  const actionColors: Record<string, string> = {
    POST_REMOVED: 'bg-red-100 text-red-700',
    POST_RESTORED: 'bg-green-100 text-green-700',
    COMMENT_REMOVED: 'bg-orange-100 text-orange-700',
    REPORT_REVIEWED: 'bg-blue-100 text-blue-700',
    SETTINGS_UPDATED: 'bg-indigo-100 text-indigo-700',
  };

  return (
    <div>
      {entries.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-lg font-medium">No audit entries</p>
          <p className="text-sm">All community actions will be logged here</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Action</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">School ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Details</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {entries.map((entry) => (
                <tr key={entry.id} className="table-row-hover">
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${actionColors[entry.action] ?? 'bg-slate-100 text-slate-700'}`}>
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{entry.user?.name_bn ?? entry.user?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{entry.institution_id}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate">
                    {entry.meta ? JSON.stringify(entry.meta).slice(0, 80) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{new Date(entry.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
