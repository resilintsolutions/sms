'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';
import {
  CalendarDays, Clock, User, BookOpen, MapPin,
  GraduationCap, AlertCircle, ChevronRight, Timer
} from 'lucide-react';

/* ── types ── */
type ClassRoutine = {
  id: number; day: string; period_number: number;
  start_time: string; end_time: string; room?: string;
  subject?: { id: number; name: string; name_bn?: string };
  teacher?: { id: number; name: string; name_bn?: string };
  class?: { id: number; name: string };
  section?: { id: number; name: string };
};
type ExamRoutine = {
  id: number; exam_date: string; start_time?: string; end_time?: string; full_marks?: number;
  subject?: { id: number; name: string; name_bn?: string };
  exam_term?: { id: number; name: string; name_bn?: string };
  class?: { id: number; name: string };
};
type Child = { id: number; student_id: string; name: string; name_bn?: string; pending_due: number; enrollment: { class_name: string; section_name: string } | null };

const DAYS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday'] as const;
const DAY_COLORS: Record<string, string> = {
  saturday: 'from-violet-500 to-purple-600', sunday: 'from-blue-500 to-indigo-600',
  monday: 'from-emerald-500 to-teal-600', tuesday: 'from-amber-500 to-orange-600',
  wednesday: 'from-rose-500 to-pink-600', thursday: 'from-cyan-500 to-sky-600',
};
const SUBJECT_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200', 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-purple-100 text-purple-700 border-purple-200', 'bg-amber-100 text-amber-700 border-amber-200',
  'bg-rose-100 text-rose-700 border-rose-200', 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'bg-teal-100 text-teal-700 border-teal-200', 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-pink-100 text-pink-700 border-pink-200', 'bg-lime-100 text-lime-700 border-lime-200',
];

function formatTime(t?: string) {
  if (!t) return '';
  const parts = t.includes('T') ? t.split('T')[1]?.slice(0, 5) : t.slice(0, 5);
  const [h, m] = parts.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function daysUntil(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function ParentSchedulePage() {
  const t = useTranslations('parent');
  const tc = useTranslations('common');
  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'timetable' | 'exams'>('timetable');

  /* ── fetch children ── */
  const { data: parentData, isLoading: loadingParent } = useQuery({
    queryKey: ['dashboard/parent'],
    queryFn: () => api<{ children: Child[] }>('/dashboard/parent'),
  });
  const children: Child[] = (parentData as any)?.data?.children ?? [];

  /* ── fetch class routines ── */
  const { data: routineData, isLoading: loadingRoutines } = useQuery({
    queryKey: ['portal/parent/class-routines', selectedChild],
    queryFn: () => api<{ data: ClassRoutine[]; meta: { class: string; section: string } }>(`/portal/parent/class-routines?student_id=${selectedChild}`),
    enabled: !!selectedChild,
  });
  const routines: ClassRoutine[] = (routineData as any)?.data ?? [];
  const routineMeta = (routineData as any)?.meta;

  /* ── fetch exam routines ── */
  const { data: examData, isLoading: loadingExams } = useQuery({
    queryKey: ['portal/parent/exam-routines', selectedChild],
    queryFn: () => api<{ data: ExamRoutine[] }>(`/portal/parent/exam-routines?student_id=${selectedChild}`),
    enabled: !!selectedChild,
  });
  const exams: ExamRoutine[] = (examData as any)?.data ?? [];

  /* ── organize routines by day ── */
  const routinesByDay = useMemo(() => {
    const map: Record<string, ClassRoutine[]> = {};
    DAYS.forEach(d => { map[d] = []; });
    routines.forEach(r => { if (map[r.day]) map[r.day].push(r); });
    return map;
  }, [routines]);

  /* ── subject color map ── */
  const subjectColorMap = useMemo(() => {
    const subjects = [...new Set(routines.map(r => r.subject?.id))];
    const map: Record<number, string> = {};
    subjects.forEach((sid, i) => { if (sid) map[sid] = SUBJECT_COLORS[i % SUBJECT_COLORS.length]; });
    return map;
  }, [routines]);

  /* ── upcoming exams ── */
  const upcomingExams = useMemo(() =>
    exams.filter(e => daysUntil(e.exam_date) >= 0).sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()),
    [exams]
  );
  const pastExams = useMemo(() =>
    exams.filter(e => daysUntil(e.exam_date) < 0).sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime()),
    [exams]
  );

  /* ── today's day ── */
  const todayDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];

  if (loadingParent) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        {[1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{t('scheduleTitle')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('scheduleDesc')}</p>
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
            {children.map(child => (
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
                    <p className="font-semibold text-slate-800">{child.name_bn || child.name}</p>
                    <p className="text-xs text-slate-500">{child.student_id}{child.enrollment ? ` • ${t('classLabel')} ${child.enrollment.class_name}` : ''}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedChild && (
            <>
              {/* View Toggle */}
              <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setActiveView('timetable')}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
                    activeView === 'timetable' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CalendarDays className="h-4 w-4" /> {t('classTimetable')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('exams')}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
                    activeView === 'exams' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <GraduationCap className="h-4 w-4" /> {t('examSchedule')}
                  {upcomingExams.length > 0 && (
                    <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">{upcomingExams.length}</span>
                  )}
                </button>
              </div>

              {/* ═══════ TIMETABLE VIEW ═══════ */}
              {activeView === 'timetable' && (
                <div className="space-y-4">
                  {loadingRoutines ? (
                    <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}</div>
                  ) : routines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
                      <CalendarDays className="h-16 w-16 text-slate-300" />
                      <h3 className="mt-4 text-lg font-semibold text-slate-700">{t('noRoutineFound')}</h3>
                      <p className="mt-2 text-sm text-slate-500">{t('noRoutineDesc')}</p>
                    </div>
                  ) : (
                    <>
                      {routineMeta && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800">
                          📋 {t('classLabel')} {routineMeta.class} — {t('sectionLabel')} {routineMeta.section}
                        </div>
                      )}
                      {DAYS.map(day => {
                        const dayRoutines = routinesByDay[day];
                        if (dayRoutines.length === 0) return null;
                        const isToday = day === todayDay;
                        return (
                          <div key={day} className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${isToday ? 'border-amber-400 ring-2 ring-amber-200' : 'border-slate-200'}`}>
                            <div className={`bg-gradient-to-r ${DAY_COLORS[day]} px-6 py-3 text-white`}>
                              <div className="flex items-center justify-between">
                                <h3 className="font-semibold capitalize">{day}{isToday ? ` — ${t('today')}` : ''}</h3>
                                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs backdrop-blur-sm">{dayRoutines.length} {t('classes')}</span>
                              </div>
                            </div>
                            <div className="divide-y divide-slate-100 p-2">
                              {dayRoutines.map(r => (
                                <div key={r.id} className={`flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-slate-50 ${isToday ? 'bg-amber-50/50' : ''}`}>
                                  <div className="flex flex-col items-center text-center">
                                    <span className="text-xs font-bold text-slate-400">P{r.period_number}</span>
                                    <span className="mt-0.5 text-[11px] text-slate-500">{formatTime(r.start_time)}</span>
                                    <span className="text-[10px] text-slate-400">{formatTime(r.end_time)}</span>
                                  </div>
                                  <div className={`rounded-xl border px-4 py-2.5 flex-1 ${subjectColorMap[r.subject?.id ?? 0] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4" />
                                        <span className="font-semibold">{r.subject?.name ?? '—'}</span>
                                      </div>
                                      {r.room && (
                                        <span className="flex items-center gap-1 text-xs opacity-80">
                                          <MapPin className="h-3 w-3" /> {r.room}
                                        </span>
                                      )}
                                    </div>
                                    {r.teacher && (
                                      <p className="mt-1 text-xs opacity-75">{r.teacher.name}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}

              {/* ═══════ EXAM SCHEDULE VIEW ═══════ */}
              {activeView === 'exams' && (
                <div className="space-y-6">
                  {loadingExams ? (
                    <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}</div>
                  ) : exams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
                      <GraduationCap className="h-16 w-16 text-slate-300" />
                      <h3 className="mt-4 text-lg font-semibold text-slate-700">{t('noExamsScheduled')}</h3>
                      <p className="mt-2 text-sm text-slate-500">{t('noExamsDesc')}</p>
                    </div>
                  ) : (
                    <>
                      {/* Upcoming Exams */}
                      {upcomingExams.length > 0 && (
                        <div>
                          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-800">
                            <AlertCircle className="h-5 w-5 text-red-500" /> {t('upcomingExams')} ({upcomingExams.length})
                          </h3>
                          <div className="space-y-3">
                            {upcomingExams.map(e => {
                              const days = daysUntil(e.exam_date);
                              return (
                                <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                                  <div className="flex items-center gap-4">
                                    <div className={`flex flex-col items-center rounded-xl px-4 py-3 text-center ${
                                      days <= 3 ? 'bg-red-100 text-red-700' : days <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      <span className="text-2xl font-bold">{new Date(e.exam_date).getDate()}</span>
                                      <span className="text-xs">{new Date(e.exam_date).toLocaleDateString('en-GB', { month: 'short' })}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <h4 className="text-lg font-semibold text-slate-800">{e.subject?.name ?? '—'}</h4>
                                      <p className="text-sm text-slate-500">{e.exam_term?.name ?? ''}</p>
                                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                        {(e.start_time || e.end_time) && (
                                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(e.start_time)} — {formatTime(e.end_time)}</span>
                                        )}
                                        {e.full_marks && <span className="rounded bg-slate-100 px-1.5 py-0.5">{t('fullMarks')}: {e.full_marks}</span>}
                                      </div>
                                    </div>
                                    <div className={`rounded-xl px-3 py-2 text-center ${
                                      days === 0 ? 'bg-red-500 text-white' : days <= 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      <Timer className="mx-auto h-4 w-4" />
                                      <p className="mt-0.5 text-sm font-bold">{days === 0 ? t('today') : `${days}d`}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Past Exams */}
                      {pastExams.length > 0 && (
                        <div>
                          <h3 className="mb-3 text-lg font-semibold text-slate-800">{t('pastExams')} ({pastExams.length})</h3>
                          <div className="space-y-2">
                            {pastExams.map(e => (
                              <div key={e.id} className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                                <div className="text-center">
                                  <span className="text-sm font-bold text-slate-500">{new Date(e.exam_date).getDate()}</span>
                                  <span className="ml-1 text-xs text-slate-400">{new Date(e.exam_date).toLocaleDateString('en-GB', { month: 'short' })}</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-300" />
                                <span className="font-medium text-slate-600">{e.subject?.name ?? '—'}</span>
                                <span className="text-xs text-slate-400">{e.exam_term?.name ?? ''}</span>
                                {e.full_marks && <span className="ml-auto text-xs text-slate-400">{t('fullMarks')}: {e.full_marks}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
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