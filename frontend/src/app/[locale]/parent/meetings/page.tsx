'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import {
  Calendar, User, BookOpen, Clock, MapPin, Users,
  School, Sparkles, Bell, MessageSquare, Video, Phone
} from 'lucide-react';

type Child = { id: number; student_id: string; name: string; name_bn?: string; pending_due: number; enrollment: { class_name: string; section_name: string } | null };
type ClassRoutine = {
  id: number; day: string; period_number: number;
  start_time: string; end_time: string; room?: string;
  subject?: { id: number; name: string; name_bn?: string };
  teacher?: { id: number; name: string; name_bn?: string };
};

export default function ParentMeetingsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const t = useTranslations('parent');
  const [selectedChild, setSelectedChild] = useState<number | null>(null);

  const { data: parentData, isLoading: loadingParent } = useQuery({
    queryKey: ['dashboard/parent'],
    queryFn: () => api<{ children: Child[] }>('/dashboard/parent'),
  });
  const children: Child[] = (parentData as any)?.data?.children ?? [];

  /* Fetch class routines to extract teacher info */
  const { data: routineData, isLoading: loadingRoutines } = useQuery({
    queryKey: ['portal/parent/class-routines', selectedChild],
    queryFn: () => api<{ data: ClassRoutine[]; meta: { class: string; section: string } }>(`/portal/parent/class-routines?student_id=${selectedChild}`),
    enabled: !!selectedChild,
  });
  const routines: ClassRoutine[] = (routineData as any)?.data ?? [];
  const meta = (routineData as any)?.meta;

  /* Extract unique teachers with their subjects */
  const teacherMap = new Map<number, { id: number; name: string; name_bn?: string; subjects: string[]; periodsPerWeek: number }>();
  routines.forEach(r => {
    if (!r.teacher) return;
    const existing = teacherMap.get(r.teacher.id);
    if (existing) {
      if (r.subject?.name && !existing.subjects.includes(r.subject.name)) {
        existing.subjects.push(r.subject.name);
      }
      existing.periodsPerWeek++;
    } else {
      teacherMap.set(r.teacher.id, {
        id: r.teacher.id,
        name: r.teacher.name,
        name_bn: r.teacher.name_bn,
        subjects: r.subject?.name ? [r.subject.name] : [],
        periodsPerWeek: 1,
      });
    }
  });
  const teachers = Array.from(teacherMap.values());

  const FEATURES = [
    { icon: Video, title: t('meetingFeature1'), desc: t('meetingFeature1Desc'), color: 'bg-blue-100 text-blue-600' },
    { icon: Calendar, title: t('meetingFeature2'), desc: t('meetingFeature2Desc'), color: 'bg-emerald-100 text-emerald-600' },
    { icon: MessageSquare, title: t('meetingFeature3'), desc: t('meetingFeature3Desc'), color: 'bg-purple-100 text-purple-600' },
    { icon: Bell, title: t('meetingFeature4'), desc: t('meetingFeature4Desc'), color: 'bg-amber-100 text-amber-600' },
  ];

  if (loadingParent) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        {[1, 2].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{t('meetingsTitle')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('meetingsDesc')}</p>
      </div>

      {/* Teachers Directory */}
      {children.length > 0 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{t('teachersDirectory')}</h3>
            <p className="mt-0.5 text-sm text-slate-500">{t('teachersDirectoryDesc')}</p>
          </div>

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
                    <p className="font-semibold text-slate-800">{locale === 'bn' ? (child.name_bn || child.name) : child.name}</p>
                    <p className="text-xs text-slate-500">{child.enrollment ? `${t('classLabel')} ${child.enrollment.class_name} — ${child.enrollment.section_name}` : child.student_id}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedChild && (
            <>
              {loadingRoutines ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}</div>
              ) : teachers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
                  <Users className="h-12 w-12 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">{t('noTeachersFound')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {meta && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800">
                      <School className="mr-1 inline h-4 w-4" /> {t('classLabel')} {meta.class} — {t('sectionLabel')} {meta.section} • {teachers.length} {t('teachersCount')}
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {teachers.map(teacher => (
                      <div key={teacher.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                            <User className="h-7 w-7" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-slate-800">{locale === 'bn' ? (teacher.name_bn || teacher.name) : teacher.name}</h4>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {teacher.subjects.map((sub, i) => (
                                <span key={i} className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                  <BookOpen className="h-3 w-3" /> {sub}
                                </span>
                              ))}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              <Clock className="mr-0.5 inline h-3 w-3" /> {teacher.periodsPerWeek} {t('periodsPerWeek')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Coming Soon - Meeting Scheduling */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-8 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <Sparkles className="h-8 w-8" />
          <div>
            <h3 className="text-xl font-bold">{t('meetingComingSoon')}</h3>
            <p className="mt-1 text-amber-100">{t('meetingComingSoonDesc')}</p>
          </div>
        </div>
      </div>

      {/* Feature Preview */}
      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((feat, i) => {
          const Icon = feat.icon;
          return (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className={`rounded-xl p-2.5 ${feat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">{feat.title}</h4>
                  <p className="mt-1 text-sm text-slate-500">{feat.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}