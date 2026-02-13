'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Calendar, Clock, Plus, Trash2, Save, BookOpen } from 'lucide-react';

/* ───── Types ───── */
type ClassItem = { id: number; name: string; sections?: SectionItem[] };
type SectionItem = { id: number; name: string; class_id: number };
type SubjectItem = { id: number; name: string; name_bn?: string; code?: string };
type TeacherItem = { id: number; name: string; name_bn?: string; employee_id?: string };
type SessionItem = { id: number; name: string; is_current: boolean };
type ExamTermItem = { id: number; name: string; academic_session_id: number };

type ClassRoutineEntry = {
  id: number;
  section_id: number;
  subject_id: number;
  teacher_id: number | null;
  day: string;
  period_number: number;
  start_time: string;
  end_time: string;
  room: string | null;
  subject?: SubjectItem;
  teacher?: TeacherItem;
  section?: SectionItem;
  class?: ClassItem;
};

type ExamRoutineEntry = {
  id: number;
  exam_term_id: number;
  class_id: number;
  subject_id: number;
  exam_date: string;
  start_time: string | null;
  end_time: string | null;
  full_marks: number;
  subject?: SubjectItem;
  class?: ClassItem;
  exam_term?: ExamTermItem;
};

const DAYS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday'] as const;

export default function AdminRoutinePage() {
  const t = useTranslations('common');
  const tNav = useTranslations('nav');
  const tR = useTranslations('routine');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'class' | 'exam'>('class');

  /* ───── Shared data queries ───── */
  const { data: classesData } = useQuery({ queryKey: ['classes'], queryFn: () => api<{ data: ClassItem[] }>('/classes') });
  const classes = (classesData as { data?: ClassItem[] })?.data ?? [];
  const allSections = classes.flatMap((c) => (c.sections ?? []).map((s) => ({ ...s, className: c.name, classId: c.id })));

  const { data: subjectsData } = useQuery({ queryKey: ['subjects'], queryFn: () => api<{ data: SubjectItem[] }>('/subjects') });
  const subjects = (subjectsData as { data?: SubjectItem[] })?.data ?? [];

  const { data: sessionsData } = useQuery({ queryKey: ['academic-sessions'], queryFn: () => api<{ data: SessionItem[] }>('/academic-sessions?per_page=100') });
  const rawSessions = (sessionsData as { data?: SessionItem[] | { data: SessionItem[] } })?.data;
  const sessions: SessionItem[] = Array.isArray(rawSessions) ? rawSessions : (rawSessions as { data: SessionItem[] })?.data ?? [];
  const currentSession = sessions.find((s) => s.is_current) ?? sessions[0];

  const { data: examTermsData } = useQuery({ queryKey: ['examTerms'], queryFn: () => api<{ data: ExamTermItem[] }>('/exam-terms') });
  const rawTerms = (examTermsData as { data?: ExamTermItem[] | { data: ExamTermItem[] } })?.data;
  const examTerms: ExamTermItem[] = Array.isArray(rawTerms) ? rawTerms : (rawTerms as { data: ExamTermItem[] })?.data ?? [];

  const institutionId = (user as unknown as { institution_id?: number })?.institution_id ?? 1;

  /* ─────────────────────────────────────────────────────────────────────
     TAB 1: CLASS ROUTINE
  ───────────────────────────────────────────────────────────────────── */
  const [classFilter, setClassFilter] = useState<number | ''>('');
  const [sectionFilter, setSectionFilter] = useState<number | ''>('');
  const [sessionFilter, setSessionFilter] = useState<number | ''>('');

  // Auto-select current session
  useEffect(() => {
    if (!sessionFilter && currentSession) setSessionFilter(currentSession.id);
  }, [currentSession, sessionFilter]);

  const filteredSections = classFilter
    ? allSections.filter((s) => s.classId === classFilter)
    : allSections;

  const { data: classRoutineData, isLoading: classRoutineLoading } = useQuery({
    queryKey: ['classRoutines', sectionFilter, sessionFilter],
    queryFn: () => api<{ data: ClassRoutineEntry[] }>(`/class-routines?section_id=${sectionFilter}&academic_session_id=${sessionFilter}`),
    enabled: !!sectionFilter && !!sessionFilter,
  });
  const classRoutines = (classRoutineData as { data?: ClassRoutineEntry[] })?.data ?? [];

  // Group by day -> period
  const routineGrid = useMemo(() => {
    const grid: Record<string, Record<number, ClassRoutineEntry>> = {};
    DAYS.forEach((d) => (grid[d] = {}));
    classRoutines.forEach((r) => {
      if (grid[r.day]) grid[r.day][r.period_number] = r;
    });
    return grid;
  }, [classRoutines]);

  // Determine max periods
  const maxPeriod = useMemo(() => {
    const periods = classRoutines.map((r) => r.period_number);
    return periods.length > 0 ? Math.max(...periods) : 8;
  }, [classRoutines]);
  const periodNumbers = Array.from({ length: Math.max(maxPeriod, 8) }, (_, i) => i + 1);

  // ─── Add class routine entry form ───
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    day: 'saturday' as string,
    period_number: 1,
    subject_id: '' as number | '',
    teacher_id: '' as number | '',
    start_time: '08:00',
    end_time: '08:45',
    room: '',
  });

  const addRoutineMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api('/class-routines', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classRoutines'] });
      toast.success(t('savedSuccessfully'));
      setShowAddForm(false);
    },
    onError: () => toast.error(t('saveFailed')),
  });

  const deleteRoutineMutation = useMutation({
    mutationFn: (id: number) => api(`/class-routines/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classRoutines'] });
      toast.success(tR('deleted'));
    },
    onError: () => toast.error(t('saveFailed')),
  });

  const handleAddClassRoutine = () => {
    if (!sectionFilter || !sessionFilter || !newEntry.subject_id) {
      toast.error(tR('fillRequired'));
      return;
    }
    addRoutineMutation.mutate({
      institution_id: institutionId,
      academic_session_id: sessionFilter,
      class_id: classFilter || (allSections.find((s) => s.id === sectionFilter)?.classId ?? 0),
      section_id: sectionFilter,
      subject_id: newEntry.subject_id,
      teacher_id: newEntry.teacher_id || null,
      day: newEntry.day,
      period_number: newEntry.period_number,
      start_time: newEntry.start_time,
      end_time: newEntry.end_time,
      room: newEntry.room || null,
    });
  };

  /* ─────────────────────────────────────────────────────────────────────
     TAB 2: EXAM ROUTINE
  ───────────────────────────────────────────────────────────────────── */
  const [examTermFilter, setExamTermFilter] = useState<number | ''>('');
  const [examClassFilter, setExamClassFilter] = useState<number | ''>('');

  const { data: examRoutineData, isLoading: examRoutineLoading } = useQuery({
    queryKey: ['examRoutines', examTermFilter, examClassFilter],
    queryFn: () => {
      let url = '/exam-routines?';
      if (examTermFilter) url += `exam_term_id=${examTermFilter}&`;
      if (examClassFilter) url += `class_id=${examClassFilter}`;
      return api<{ data: ExamRoutineEntry[] }>(url);
    },
    enabled: !!examTermFilter,
  });
  const examRoutines = (examRoutineData as { data?: ExamRoutineEntry[] })?.data ?? [];

  const [showExamForm, setShowExamForm] = useState(false);
  const [examEntry, setExamEntry] = useState({
    exam_term_id: '' as number | '',
    class_id: '' as number | '',
    subject_id: '' as number | '',
    exam_date: '',
    start_time: '09:00',
    end_time: '12:00',
    full_marks: 100,
  });

  const addExamRoutineMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api('/exam-routines', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examRoutines'] });
      toast.success(t('savedSuccessfully'));
      setShowExamForm(false);
    },
    onError: () => toast.error(t('saveFailed')),
  });

  const deleteExamRoutineMutation = useMutation({
    mutationFn: (id: number) => api(`/exam-routines/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examRoutines'] });
      toast.success(tR('deleted'));
    },
    onError: () => toast.error(t('saveFailed')),
  });

  const handleAddExamRoutine = () => {
    if (!examEntry.exam_term_id || !examEntry.class_id || !examEntry.subject_id || !examEntry.exam_date) {
      toast.error(tR('fillRequired'));
      return;
    }
    addExamRoutineMutation.mutate({
      exam_term_id: examEntry.exam_term_id,
      class_id: examEntry.class_id,
      subject_id: examEntry.subject_id,
      exam_date: examEntry.exam_date,
      start_time: examEntry.start_time,
      end_time: examEntry.end_time,
      full_marks: examEntry.full_marks,
    });
  };

  /* ───── Render ───── */
  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-slate-800">
        <Calendar className="inline-block h-7 w-7 mr-2 text-primary-600" />
        {tNav('routine')}
      </h2>

      {/* Tab switcher */}
      <div className="flex gap-0 mb-6 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('class')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'class'
              ? 'border-primary-600 text-primary-700 bg-primary-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="inline-block h-4 w-4 mr-1.5" />
          {tR('classRoutine')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('exam')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'exam'
              ? 'border-primary-600 text-primary-700 bg-primary-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Clock className="inline-block h-4 w-4 mr-1.5" />
          {tR('examRoutine')}
        </button>
      </div>

      {/* ════════════════════ CLASS ROUTINE TAB ════════════════════ */}
      {activeTab === 'class' && (
        <div>
          {/* Filters */}
          <div className="card-accent mb-6">
            <h3 className="font-semibold text-slate-800 mb-4">{tR('filterRoutine')}</h3>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">{tR('academicSession')}</label>
                <select
                  value={sessionFilter}
                  onChange={(e) => setSessionFilter(e.target.value ? Number(e.target.value) : '')}
                  className="input mt-1 min-w-[160px]"
                >
                  <option value="">{tR('selectSession')}</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{s.is_current ? ` (${tR('current')})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">{tR('class')}</label>
                <select
                  value={classFilter}
                  onChange={(e) => { setClassFilter(e.target.value ? Number(e.target.value) : ''); setSectionFilter(''); }}
                  className="input mt-1 min-w-[140px]"
                >
                  <option value="">{tR('allClasses')}</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">{tR('section')}</label>
                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value ? Number(e.target.value) : '')}
                  className="input mt-1 min-w-[180px]"
                >
                  <option value="">{tR('selectSection')}</option>
                  {filteredSections.map((s) => (
                    <option key={s.id} value={s.id}>{s.className} - {s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Timetable Grid */}
          {sectionFilter && sessionFilter ? (
            classRoutineLoading ? (
              <p className="p-4 text-slate-500">{t('loading')}</p>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-700">
                    {tR('weeklySchedule')}
                    {allSections.find((s) => s.id === sectionFilter) &&
                      ` — ${allSections.find((s) => s.id === sectionFilter)!.className} (${allSections.find((s) => s.id === sectionFilter)!.name})`}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" /> {tR('addPeriod')}
                  </button>
                </div>

                {/* Add form */}
                {showAddForm && (
                  <div className="card mb-4 border-2 border-primary-200 bg-primary-50/30">
                    <h4 className="font-semibold text-slate-700 mb-3">{tR('addNewPeriod')}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600">{tR('day')}</label>
                        <select value={newEntry.day} onChange={(e) => setNewEntry({ ...newEntry, day: e.target.value })} className="input mt-1 text-sm">
                          {DAYS.map((d) => (
                            <option key={d} value={d}>{tR(d)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">{tR('periodNumber')}</label>
                        <input type="number" min={1} max={12} value={newEntry.period_number} onChange={(e) => setNewEntry({ ...newEntry, period_number: Number(e.target.value) })} className="input mt-1 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">{tR('subject')}</label>
                        <select value={newEntry.subject_id} onChange={(e) => setNewEntry({ ...newEntry, subject_id: e.target.value ? Number(e.target.value) : '' })} className="input mt-1 text-sm">
                          <option value="">{tR('selectSubject')}</option>
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">{tR('startTime')}</label>
                        <input type="time" value={newEntry.start_time} onChange={(e) => setNewEntry({ ...newEntry, start_time: e.target.value })} className="input mt-1 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">{tR('endTime')}</label>
                        <input type="time" value={newEntry.end_time} onChange={(e) => setNewEntry({ ...newEntry, end_time: e.target.value })} className="input mt-1 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">{tR('room')}</label>
                        <input type="text" value={newEntry.room} onChange={(e) => setNewEntry({ ...newEntry, room: e.target.value })} className="input mt-1 text-sm" placeholder={tR('roomPlaceholder')} />
                      </div>
                      <div className="flex items-end gap-2 col-span-2">
                        <button type="button" onClick={handleAddClassRoutine} disabled={addRoutineMutation.isPending} className="btn btn-primary flex items-center gap-2">
                          <Save className="h-4 w-4" /> {t('save')}
                        </button>
                        <button type="button" onClick={() => setShowAddForm(false)} className="btn">{t('cancel')}</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timetable */}
                <div className="card overflow-x-auto p-0">
                  <table className="w-full min-w-[700px]">
                    <thead className="table-header">
                      <tr>
                        <th className="px-3 py-3 text-left text-sm font-semibold w-28">{tR('day')}</th>
                        {periodNumbers.map((p) => (
                          <th key={p} className="px-2 py-3 text-center text-sm font-semibold">
                            {tR('periodLabel')} {p}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {DAYS.map((day) => (
                        <tr key={day} className="table-row-hover">
                          <td className="px-3 py-3 font-semibold text-slate-700 text-sm bg-slate-50">
                            {tR(day)}
                          </td>
                          {periodNumbers.map((p) => {
                            const entry = routineGrid[day]?.[p];
                            return (
                              <td key={p} className="px-1 py-1 text-center">
                                {entry ? (
                                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-2 relative group min-h-[60px]">
                                    <p className="font-semibold text-xs text-primary-800 leading-tight">
                                      {entry.subject?.name ?? `#${entry.subject_id}`}
                                    </p>
                                    {entry.teacher && (
                                      <p className="text-[10px] text-slate-500 mt-0.5">{entry.teacher.name}</p>
                                    )}
                                    <p className="text-[10px] text-slate-400">
                                      {String(entry.start_time).slice(0, 5)}-{String(entry.end_time).slice(0, 5)}
                                    </p>
                                    {entry.room && <p className="text-[10px] text-slate-400">{entry.room}</p>}
                                    <button
                                      type="button"
                                      onClick={() => deleteRoutineMutation.mutate(entry.id)}
                                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                                      title={tR('delete')}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-slate-300 text-xs min-h-[60px] flex items-center justify-center">—</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {classRoutines.length === 0 && (
                  <p className="text-center text-slate-400 mt-4">{tR('noRoutineData')}</p>
                )}
              </>
            )
          ) : (
            <div className="card text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="text-slate-500">{tR('selectSectionPrompt')}</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════ EXAM ROUTINE TAB ════════════════════ */}
      {activeTab === 'exam' && (
        <div>
          {/* Filters */}
          <div className="card-accent mb-6">
            <h3 className="font-semibold text-slate-800 mb-4">{tR('filterExamRoutine')}</h3>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">{tR('examTerm')}</label>
                <select
                  value={examTermFilter}
                  onChange={(e) => setExamTermFilter(e.target.value ? Number(e.target.value) : '')}
                  className="input mt-1 min-w-[200px]"
                >
                  <option value="">{tR('selectExamTerm')}</option>
                  {examTerms.map((et) => (
                    <option key={et.id} value={et.id}>{et.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">{tR('class')}</label>
                <select
                  value={examClassFilter}
                  onChange={(e) => setExamClassFilter(e.target.value ? Number(e.target.value) : '')}
                  className="input mt-1 min-w-[140px]"
                >
                  <option value="">{tR('allClasses')}</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {examTermFilter ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-700">{tR('examSchedule')}</h3>
                <button
                  type="button"
                  onClick={() => setShowExamForm(!showExamForm)}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> {tR('addExamEntry')}
                </button>
              </div>

              {/* Add exam routine form */}
              {showExamForm && (
                <div className="card mb-4 border-2 border-primary-200 bg-primary-50/30">
                  <h4 className="font-semibold text-slate-700 mb-3">{tR('addExamRoutineEntry')}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600">{tR('examTerm')}</label>
                      <select value={examEntry.exam_term_id} onChange={(e) => setExamEntry({ ...examEntry, exam_term_id: e.target.value ? Number(e.target.value) : '' })} className="input mt-1 text-sm">
                        <option value="">{tR('selectExamTerm')}</option>
                        {examTerms.map((et) => (
                          <option key={et.id} value={et.id}>{et.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600">{tR('class')}</label>
                      <select value={examEntry.class_id} onChange={(e) => setExamEntry({ ...examEntry, class_id: e.target.value ? Number(e.target.value) : '' })} className="input mt-1 text-sm">
                        <option value="">{tR('selectClass')}</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600">{tR('subject')}</label>
                      <select value={examEntry.subject_id} onChange={(e) => setExamEntry({ ...examEntry, subject_id: e.target.value ? Number(e.target.value) : '' })} className="input mt-1 text-sm">
                        <option value="">{tR('selectSubject')}</option>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600">{tR('examDate')}</label>
                      <input type="date" value={examEntry.exam_date} onChange={(e) => setExamEntry({ ...examEntry, exam_date: e.target.value })} className="input mt-1 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600">{tR('startTime')}</label>
                      <input type="time" value={examEntry.start_time} onChange={(e) => setExamEntry({ ...examEntry, start_time: e.target.value })} className="input mt-1 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600">{tR('endTime')}</label>
                      <input type="time" value={examEntry.end_time} onChange={(e) => setExamEntry({ ...examEntry, end_time: e.target.value })} className="input mt-1 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600">{tR('fullMarks')}</label>
                      <input type="number" min={1} value={examEntry.full_marks} onChange={(e) => setExamEntry({ ...examEntry, full_marks: Number(e.target.value) })} className="input mt-1 text-sm" />
                    </div>
                    <div className="flex items-end gap-2">
                      <button type="button" onClick={handleAddExamRoutine} disabled={addExamRoutineMutation.isPending} className="btn btn-primary flex items-center gap-2">
                        <Save className="h-4 w-4" /> {t('save')}
                      </button>
                      <button type="button" onClick={() => setShowExamForm(false)} className="btn">{t('cancel')}</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Exam routine table */}
              <div className="card overflow-hidden p-0">
                {examRoutineLoading ? (
                  <p className="p-4 text-slate-500">{t('loading')}</p>
                ) : examRoutines.length === 0 ? (
                  <p className="p-4 text-slate-500">{tR('noExamRoutine')}</p>
                ) : (
                  <table className="w-full">
                    <thead className="table-header">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">{tR('examDate')}</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">{tR('class')}</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">{tR('subject')}</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">{tR('time')}</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">{tR('fullMarks')}</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">{tR('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {examRoutines.map((er) => (
                        <tr key={er.id} className="table-row-hover">
                          <td className="px-4 py-3 font-medium">{er.exam_date?.toString().slice(0, 10)}</td>
                          <td className="px-4 py-3">{er.class?.name ?? `#${er.class_id}`}</td>
                          <td className="px-4 py-3">{er.subject?.name ?? `#${er.subject_id}`}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {er.start_time ? `${String(er.start_time).slice(0, 5)} - ${String(er.end_time).slice(0, 5)}` : '—'}
                          </td>
                          <td className="px-4 py-3">{er.full_marks}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => deleteExamRoutineMutation.mutate(er.id)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title={tR('delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div className="card text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="text-slate-500">{tR('selectExamTermPrompt')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
