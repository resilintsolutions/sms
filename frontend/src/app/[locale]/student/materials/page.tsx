'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  BookOpen,
  ExternalLink,
  Search,
  FolderOpen,
  Video,
  Globe,
  FileText,
  HardDrive,
  Cloud,
  Link2,
} from 'lucide-react';

type StudyMaterial = {
  id: number;
  title: string;
  title_bn?: string;
  description?: string;
  type: string;
  link: string;
  file_name?: string;
  file_type?: string;
  class_model?: { id: number; name: string };
  subject?: { id: number; name: string; name_bn?: string };
  creator?: { id: number; name: string };
  created_at?: string;
};

const typeConfig: Record<string, { icon: typeof HardDrive; label: string; color: string }> = {
  google_drive: { icon: HardDrive, label: 'Google Drive', color: 'text-green-600 bg-green-50' },
  dropbox: { icon: Cloud, label: 'Dropbox', color: 'text-blue-600 bg-blue-50' },
  youtube: { icon: Video, label: 'YouTube', color: 'text-red-600 bg-red-50' },
  website: { icon: Globe, label: 'Website', color: 'text-purple-600 bg-purple-50' },
  document: { icon: FileText, label: 'Document', color: 'text-amber-600 bg-amber-50' },
  other: { icon: Link2, label: 'Link', color: 'text-slate-600 bg-slate-100' },
};

export default function StudentMaterialsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterType, setFilterType] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['student-study-materials'],
    queryFn: () => api<{ data: StudyMaterial[] }>('/portal/student/study-materials'),
  });
  const materials = (data as { data?: StudyMaterial[] })?.data ?? [];

  // Get unique subjects for filter
  const subjectOptions = useMemo(() => {
    const map = new Map<number, string>();
    materials.forEach((m) => {
      if (m.subject) map.set(m.subject.id, m.subject.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [materials]);

  const filtered = useMemo(() => {
    let list = materials;
    if (filterSubject) list = list.filter((m) => String(m.subject?.id) === filterSubject);
    if (filterType) list = list.filter((m) => m.type === filterType);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q)) ||
          (m.title_bn && m.title_bn.includes(searchTerm)),
      );
    }
    return list;
  }, [materials, filterSubject, filterType, searchTerm]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">
          <BookOpen className="mr-2 inline h-6 w-6 text-primary-600" />
          Study Materials
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Access study materials and resources shared by your teachers.
        </p>
      </div>

      {/* Filters */}
      <div className="card-accent mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search materials..."
              className="input w-full pl-9"
            />
          </div>
          <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="input w-44">
            <option value="">All Subjects</option>
            {subjectOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input w-44">
            <option value="">All Types</option>
            {Object.entries(typeConfig).map(([val, cfg]) => <option key={val} value={val}>{cfg.label}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white py-16">
          <FolderOpen className="h-16 w-16 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-600">No Materials Available</h3>
          <p className="mt-1 text-sm text-slate-400">
            Study materials shared by your teachers will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => {
            const tc = typeConfig[m.type] || typeConfig.other;
            const Icon = tc.icon;
            return (
              <div key={m.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                <div className="flex-1 p-5">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-xl p-2.5 ${tc.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 line-clamp-2">{m.title}</h3>
                      {m.title_bn && <p className="mt-0.5 text-xs text-slate-400">{m.title_bn}</p>}
                      <p className="mt-1 text-xs text-slate-500">
                        {tc.label} · by {m.creator?.name}
                      </p>
                    </div>
                  </div>
                  {m.description && (
                    <p className="mt-3 text-sm text-slate-500 line-clamp-3">{m.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-600">
                      {m.subject?.name}
                    </span>
                    {m.file_type && (
                      <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                        {m.file_type}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                  <span className="text-xs text-slate-400">
                    {m.created_at ? new Date(m.created_at).toLocaleDateString() : ''}
                  </span>
                  <a
                    href={m.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-100"
                  >
                    <ExternalLink className="h-4 w-4" /> Open
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
