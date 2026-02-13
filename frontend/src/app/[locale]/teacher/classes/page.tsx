'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  BookOpen,
  Users,
  ClipboardList,
  FileEdit,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
} from 'lucide-react';

type Assignment = {
  id: number;
  is_class_teacher?: boolean;
  section?: { id: number; name: string; class?: { id: number; name: string } };
  subject?: { id: number; name: string; name_bn?: string; code?: string };
  academic_session?: { id: number; name: string };
};

type SectionGroup = {
  sectionId: number;
  sectionName: string;
  className: string;
  classId: number;
  sessionName: string;
  isClassTeacher: boolean;
  subjects: { id: number; name: string; name_bn?: string; code?: string }[];
  assignments: Assignment[];
};

export default function TeacherClassesPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data, isLoading } = useQuery({
    queryKey: ['portal/teacher/assignments'],
    queryFn: () => api<{ data: Assignment[] }>('/portal/teacher/assignments'),
  });
  const assignments = (data as { data?: Assignment[] })?.data ?? [];

  const groups: SectionGroup[] = useMemo(() => {
    const map: Record<number, SectionGroup> = {};
    assignments.forEach((a) => {
      const sid = a.section?.id ?? 0;
      if (!map[sid]) {
        map[sid] = {
          sectionId: sid,
          sectionName: a.section?.name ?? '',
          className: a.section?.class?.name ?? '',
          classId: a.section?.class?.id ?? 0,
          sessionName: a.academic_session?.name ?? '',
          isClassTeacher: false,
          subjects: [],
          assignments: [],
        };
      }
      if (a.is_class_teacher) map[sid].isClassTeacher = true;
      if (a.subject) {
        const exists = map[sid].subjects.find((s) => s.id === a.subject!.id);
        if (!exists) map[sid].subjects.push(a.subject as SectionGroup['subjects'][0]);
      }
      map[sid].assignments.push(a);
    });
    return Object.values(map).sort((a, b) =>
      a.className.localeCompare(b.className, undefined, { numeric: true }),
    );
  }, [assignments]);

  const totalSubjects = useMemo(
    () => new Set(assignments.map((a) => a.subject?.id).filter(Boolean)).size,
    [assignments],
  );

  const toggle = (id: number) => setExpandedId(expandedId === id ? null : id);

  const colors = [
    { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', light: 'bg-blue-50' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', light: 'bg-emerald-50' },
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', light: 'bg-purple-50' },
    { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', light: 'bg-amber-50' },
    { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', light: 'bg-rose-50' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', light: 'bg-cyan-50' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            <BookOpen className="mr-2 inline h-6 w-6 text-primary-600" />
            My Classes
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Overview of all your assigned classes and subjects
          </p>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 transition ${viewMode === 'grid' ? 'bg-primary-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            title="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 transition ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {!isLoading && groups.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{groups.length}</p>
            <p className="text-xs text-slate-500">Class Sections</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{totalSubjects}</p>
            <p className="text-xs text-slate-500">Subjects</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{assignments.length}</p>
            <p className="text-xs text-slate-500">Total Assignments</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {groups.filter((g) => g.isClassTeacher).length}
            </p>
            <p className="text-xs text-slate-500">Class Teacher Of</p>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white py-16">
          <GraduationCap className="h-16 w-16 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-600">No Classes Assigned Yet</h3>
          <p className="mt-1 text-sm text-slate-400">
            Your class assignments will appear here once an admin assigns you.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ─── GRID VIEW ─── */
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((g, idx) => {
            const c = colors[idx % colors.length];
            const isOpen = expandedId === g.sectionId;
            return (
              <div
                key={g.sectionId}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${c.border}`}
              >
                {/* Card Header */}
                <div className={`${c.light} px-5 py-4`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-xl ${c.bg} p-2.5 ${c.text}`}>
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">
                          Class {g.className}
                        </h3>
                        <p className="text-sm text-slate-500">
                          Section {g.sectionName} · {g.sessionName}
                        </p>
                      </div>
                    </div>
                    {g.isClassTeacher && (
                      <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-700">
                        Class Teacher
                      </span>
                    )}
                  </div>
                </div>

                {/* Subjects */}
                <div className="px-5 py-3">
                  <button
                    onClick={() => toggle(g.sectionId)}
                    className="flex w-full items-center justify-between text-sm font-medium text-slate-600"
                  >
                    <span>
                      {g.subjects.length} Subject{g.subjects.length !== 1 ? 's' : ''}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {!isOpen && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {g.subjects.map((sub) => (
                        <span
                          key={sub.id}
                          className={`rounded-lg ${c.bg} ${c.text} px-2.5 py-1 text-xs font-medium`}
                        >
                          {sub.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {isOpen && (
                    <div className="mt-2 space-y-2">
                      {g.subjects.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-md ${c.bg} text-xs font-bold ${c.text}`}
                            >
                              {sub.code || sub.name.charAt(0)}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-slate-700">{sub.name}</p>
                              {sub.name_bn && (
                                <p className="text-xs text-slate-400">{sub.name_bn}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="border-t border-slate-100 px-5 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/${locale}/teacher/attendance?section_id=${g.sectionId}`}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Attendance
                    </Link>
                    <Link
                      href={`/${locale}/teacher/marks?section_id=${g.sectionId}`}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      Marks
                    </Link>
                    <Link
                      href={`/${locale}/teacher/assignments?section_id=${g.sectionId}`}
                      className="flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-2 text-xs font-medium text-purple-700 transition hover:bg-purple-100"
                    >
                      <FileEdit className="h-3.5 w-3.5" />
                      Assignments
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── LIST VIEW ─── */
        <div className="space-y-3">
          {groups.map((g, idx) => {
            const c = colors[idx % colors.length];
            return (
              <div
                key={g.sectionId}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-xl ${c.bg} p-2.5 ${c.text}`}>
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800">
                          Class {g.className} — Section {g.sectionName}
                        </h3>
                        {g.isClassTeacher && (
                          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                            Class Teacher
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">{g.sessionName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {g.subjects.map((sub) => (
                        <span
                          key={sub.id}
                          className={`rounded-lg ${c.bg} ${c.text} px-2.5 py-1 text-xs font-medium`}
                        >
                          {sub.name}
                        </span>
                      ))}
                    </div>
                    <div className="ml-2 flex gap-2">
                      <Link
                        href={`/${locale}/teacher/attendance?section_id=${g.sectionId}`}
                        className="rounded-lg bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-100"
                        title="Attendance"
                      >
                        <Users className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/${locale}/teacher/marks?section_id=${g.sectionId}`}
                        className="rounded-lg bg-emerald-50 p-2 text-emerald-600 transition hover:bg-emerald-100"
                        title="Marks"
                      >
                        <ClipboardList className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/${locale}/teacher/assignments?section_id=${g.sectionId}`}
                        className="rounded-lg bg-purple-50 p-2 text-purple-600 transition hover:bg-purple-100"
                        title="Assignments"
                      >
                        <FileEdit className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
