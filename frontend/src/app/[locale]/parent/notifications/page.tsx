'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import {
  Megaphone, Calendar, Search, Filter, Eye, X,
  Users, GraduationCap, UserCheck, Bell, ChevronDown
} from 'lucide-react';

type Notice = {
  id: number; title: string; title_bn?: string;
  body?: string; body_bn?: string;
  audience?: string; published_at: string;
  attachments?: string[];
};

const AUDIENCE_BADGES: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
  all: { icon: Users, bg: 'bg-blue-100', text: 'text-blue-700' },
  students: { icon: GraduationCap, bg: 'bg-emerald-100', text: 'text-emerald-700' },
  parents: { icon: UserCheck, bg: 'bg-amber-100', text: 'text-amber-700' },
  teachers: { icon: Users, bg: 'bg-purple-100', text: 'text-purple-700' },
};

export default function ParentNotificationsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const t = useTranslations('parent');

  const [search, setSearch] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<string>('all_filter');
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['reports/notices'],
    queryFn: () => api<Notice[]>('/reports/notices'),
  });
  const notices: Notice[] = (data as any)?.data ?? [];

  const filtered = useMemo(() => {
    let list = notices;
    if (audienceFilter !== 'all_filter') list = list.filter(n => n.audience === audienceFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.title_bn?.toLowerCase().includes(q) ||
        n.body?.toLowerCase().includes(q) ||
        n.body_bn?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [notices, audienceFilter, search]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{t('notificationsTitle')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('notificationsDesc')}</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="rounded-xl bg-pink-100 p-2.5 text-pink-600"><Bell className="h-5 w-5" /></div>
          <div>
            <p className="text-xs text-slate-500">{t('totalNotices')}</p>
            <p className="text-2xl font-bold text-slate-800">{notices.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="rounded-xl bg-amber-100 p-2.5 text-amber-600"><UserCheck className="h-5 w-5" /></div>
          <div>
            <p className="text-xs text-slate-500">{t('forParents')}</p>
            <p className="text-2xl font-bold text-amber-700">{notices.filter(n => n.audience === 'parents' || n.audience === 'all').length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="rounded-xl bg-blue-100 p-2.5 text-blue-600"><Calendar className="h-5 w-5" /></div>
          <div>
            <p className="text-xs text-slate-500">{t('thisMonth')}</p>
            <p className="text-2xl font-bold text-blue-700">
              {notices.filter(n => {
                const d = new Date(n.published_at);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              }).length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchNotices')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
          />
        </div>
        <select
          value={audienceFilter}
          onChange={e => setAudienceFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all_filter">{t('allAudiences')}</option>
          <option value="all">{t('audienceAll')}</option>
          <option value="parents">{t('audienceParents')}</option>
          <option value="students">{t('audienceStudents')}</option>
          <option value="teachers">{t('audienceTeachers')}</option>
        </select>
        {(search || audienceFilter !== 'all_filter') && (
          <button
            type="button"
            onClick={() => { setSearch(''); setAudienceFilter('all_filter'); }}
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 hover:bg-slate-200"
          >
            {t('clearFilters')}
          </button>
        )}
      </div>

      {/* Notice List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <Megaphone className="h-16 w-16 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-700">{t('noNotices')}</h3>
          <p className="mt-2 text-sm text-slate-500">{t('noNoticesDesc')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(notice => {
            const aud = AUDIENCE_BADGES[notice.audience ?? 'all'] ?? AUDIENCE_BADGES.all;
            const AudIcon = aud.icon;
            return (
              <div key={notice.id} className="group rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 rounded-xl bg-pink-100 p-2.5 text-pink-600">
                      <Megaphone className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-semibold text-slate-800">
                          {locale === 'bn' ? (notice.title_bn || notice.title) : notice.title}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setSelectedNotice(notice)}
                          className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-amber-100 hover:text-amber-600"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                      {(notice.body_bn || notice.body) && (
                        <p className="mt-2 text-sm leading-relaxed text-slate-600 line-clamp-3">
                          {locale === 'bn' ? (notice.body_bn || notice.body) : notice.body}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(notice.published_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        {notice.audience && (
                          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${aud.bg} ${aud.text}`}>
                            <AudIcon className="h-3 w-3" /> {notice.audience}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedNotice(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-800">{t('noticeDetail')}</h3>
              <button type="button" onClick={() => setSelectedNotice(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-6">
              <h2 className="text-xl font-bold text-slate-800">
                {locale === 'bn' ? (selectedNotice.title_bn || selectedNotice.title) : selectedNotice.title}
              </h2>
              <div className="mt-2 flex items-center gap-3 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(selectedNotice.published_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                {selectedNotice.audience && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${(AUDIENCE_BADGES[selectedNotice.audience] ?? AUDIENCE_BADGES.all).bg} ${(AUDIENCE_BADGES[selectedNotice.audience] ?? AUDIENCE_BADGES.all).text}`}>
                    {selectedNotice.audience}
                  </span>
                )}
              </div>
              <div className="mt-6 prose prose-slate max-w-none">
                <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                  {locale === 'bn' ? (selectedNotice.body_bn || selectedNotice.body) : selectedNotice.body}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}