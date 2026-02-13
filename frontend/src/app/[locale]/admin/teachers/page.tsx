'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  Trash2,
  Users,
  GraduationCap,
  BookOpen,
  ChevronRight,
  CheckCircle,
  Search,
  X,
  UserPlus,
} from 'lucide-react';

type Teacher = {
  id: number;
  name: string;
  name_bn?: string;
  employee_id: string;
  designation: string;
  department: string;
};
type ClassItem = {
  id: number;
  name: string;
  numeric_name?: number;
  sections?: { id: number; name: string }[];
};
type Subject = { id: number; name: string; name_bn?: string; code?: string };
type ClassSubjectRow = {
  id: number;
  class_id: number;
  subject_id: number;
  full_marks?: number;
  subject?: Subject;
};
type Session = { id: number; name: string; is_current?: boolean };
type TeacherAssignmentRow = {
  id: number;
  employee_id: number;
  section_id: number;
  subject_id: number;
  academic_session_id: number;
  is_class_teacher: boolean;
  employee?: {
    id: number;
    name: string;
    name_bn?: string;
    employee_id: string;
    designation: string;
  };
  section?: { id: number; name: string; class?: { id: number; name: string } };
  subject?: Subject;
  academic_session?: { id: number; name: string };
};

export default function TeacherAssignmentsPage() {
  const t = useTranslations('common');
  const queryClient = useQueryClient();

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [classTeacherId, setClassTeacherId] = useState('');
  const [subjectTeacherMap, setSubjectTeacherMap] = useState<Record<number, string>>({});
  const [teacherSearch, setTeacherSearch] = useState('');

  // Filters
  const [filterSession, setFilterSession] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [viewMode, setViewMode] = useState<'byClass' | 'byTeacher'>('byClass');

  // Data queries
  const { data: teacherData } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => api<{ data: Teacher[] }>('/teachers'),
  });
  const teachers = (teacherData as { data?: Teacher[] })?.data ?? [];

  const { data: clsData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api<{ data: ClassItem[] }>('/classes'),
  });
  const rawClasses = (clsData as { data?: ClassItem[] | { data?: ClassItem[] } })?.data;
  const classes: ClassItem[] = Array.isArray(rawClasses)
    ? rawClasses
    : (rawClasses as { data?: ClassItem[] })?.data ?? [];

  const { data: sessData } = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: () => api<{ data: Session[] | { data: Session[] } }>('/academic-sessions?per_page=100'),
  });
  const rawSess = (sessData as { data?: Session[] | { data?: Session[] } })?.data;
  const sessionsList: Session[] = Array.isArray(rawSess)
    ? rawSess
    : (rawSess as { data?: Session[] })?.data ?? [];

  // Class-subjects for wizard step 2
  const { data: csData } = useQuery({
    queryKey: ['class-subjects', selectedClassId],
    queryFn: () => api<{ data: ClassSubjectRow[] }>(`/class-subjects?class_id=${selectedClassId}`),
    enabled: !!selectedClassId,
  });
  const classSubjects = (csData as { data?: ClassSubjectRow[] })?.data ?? [];

  // Assignment list query
  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (filterSession) p.set('academic_session_id', filterSession);
    if (filterTeacher) p.set('employee_id', filterTeacher);
    return p.toString();
  }, [filterSession, filterTeacher]);

  const { data: taData, isLoading } = useQuery({
    queryKey: ['teacher-assignments', queryParams],
    queryFn: () => api<{ data: TeacherAssignmentRow[] }>(`/teacher-assignments?${queryParams}`),
  });
  const allAssignments = (taData as { data?: TeacherAssignmentRow[] })?.data ?? [];

  const assignments = useMemo(() => {
    if (!filterClass) return allAssignments;
    return allAssignments.filter((a) => String(a.section?.class?.id) === filterClass);
  }, [allAssignments, filterClass]);

  const deleteMut = useMutation({
    mutationFn: (id: number) => api(`/teacher-assignments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      toast.success(t('deletedSuccessfully'));
    },
    onError: () => toast.error(t('deleteFailed')),
  });

  const openWizard = () => {
    const current = sessionsList.find((s) => s.is_current);
    setSelectedClassId('');
    setSelectedSectionId('');
    setSelectedSessionId(current ? String(current.id) : '');
    setClassTeacherId('');
    setSubjectTeacherMap({});
    setTeacherSearch('');
    setWizardStep(1);
    setWizardOpen(true);
  };

  const goToStep2 = () => {
    if (!selectedClassId || !selectedSectionId || !selectedSessionId) return;
    // Pre-fill from existing assignments
    const existing = allAssignments.filter(
      (a) => String(a.section_id) === selectedSectionId && String(a.academic_session_id) === selectedSessionId,
    );
    const map: Record<number, string> = {};
    let ct = '';
    existing.forEach((a) => {
      map[a.subject_id] = String(a.employee_id);
      if (a.is_class_teacher) ct = String(a.employee_id);
    });
    setSubjectTeacherMap(map);
    setClassTeacherId(ct);
    setWizardStep(2);
  };

  const [saving, setSaving] = useState(false);
  const saveAssignments = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(subjectTeacherMap).filter(([, tid]) => tid);
      let count = 0;
      for (const [subId, teacherId] of entries) {
        await api('/teacher-assignments', {
          method: 'POST',
          body: JSON.stringify({
            employee_id: parseInt(teacherId),
            section_id: parseInt(selectedSectionId),
            subject_id: parseInt(subId),
            academic_session_id: parseInt(selectedSessionId),
            is_class_teacher: teacherId === classTeacherId,
          }),
        });
        count++;
      }
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      toast.success(`${count} subject(s) assigned successfully`);
      setWizardOpen(false);
    } catch {
      toast.error(t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // Group by class
  const groupedByClass = useMemo(() => {
    const map: Record<
      string,
      {
        className: string;
        sectionName: string;
        sectionId: number;
        sessionName: string;
        subjects: { assignment: TeacherAssignmentRow; teacher: TeacherAssignmentRow['employee'] }[];
        classTeacher?: TeacherAssignmentRow['employee'];
      }
    > = {};
    assignments.forEach((a) => {
      const key = `${a.section_id}-${a.academic_session_id}`;
      if (!map[key]) {
        map[key] = {
          className: a.section?.class?.name ?? '',
          sectionName: a.section?.name ?? '',
          sectionId: a.section_id,
          sessionName: a.academic_session?.name ?? '',
          subjects: [],
        };
      }
      map[key].subjects.push({ assignment: a, teacher: a.employee });
      if (a.is_class_teacher) map[key].classTeacher = a.employee;
    });
    return Object.values(map).sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));
  }, [assignments]);

  // Group by teacher
  const groupedByTeacher = useMemo(() => {
    const map: Record<number, { teacher: TeacherAssignmentRow['employee']; items: TeacherAssignmentRow[] }> = {};
    assignments.forEach((a) => {
      const eid = a.employee_id;
      if (!map[eid]) map[eid] = { teacher: a.employee, items: [] };
      map[eid].items.push(a);
    });
    return Object.values(map).sort((a, b) => (a.teacher?.name ?? '').localeCompare(b.teacher?.name ?? ''));
  }, [assignments]);

  const filteredTeachers = useMemo(() => {
    if (!teacherSearch) return teachers;
    const q = teacherSearch.toLowerCase();
    return teachers.filter(
      (tc) =>
        tc.name.toLowerCase().includes(q) ||
        (tc.name_bn && tc.name_bn.includes(teacherSearch)) ||
        tc.employee_id.toLowerCase().includes(q) ||
        tc.designation.toLowerCase().includes(q),
    );
  }, [teachers, teacherSearch]);

  const selectedClass = classes.find((c) => String(c.id) === selectedClassId);
  const selectedSections = selectedClass?.sections ?? [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            <Users className="mr-2 inline h-6 w-6 text-primary-600" />
            Teacher Assignments
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Assign teachers to subjects for each class section. Each subject can have its own teacher.
          </p>
        </div>
        <button onClick={openWizard} className="btn btn-primary flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Assign Teachers to Class
        </button>
      </div>

      {/* Filters + View Toggle */}
      <div className="card-accent mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Session</label>
            <select value={filterSession} onChange={(e) => setFilterSession(e.target.value)} className="input mt-1 w-44">
              <option value="">All Sessions</option>
              {sessionsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.is_current ? '✓' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Class</label>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="input mt-1 w-44">
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Class {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Teacher</label>
            <select value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)} className="input mt-1 w-52">
              <option value="">All Teachers</option>
              {teachers.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.name} ({tc.employee_id})
                </option>
              ))}
            </select>
          </div>
          <div className="ml-auto flex overflow-hidden rounded-lg border border-slate-200 bg-white">
            <button
              onClick={() => setViewMode('byClass')}
              className={`px-3 py-2 text-sm font-medium transition ${viewMode === 'byClass' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              By Class
            </button>
            <button
              onClick={() => setViewMode('byTeacher')}
              className={`px-3 py-2 text-sm font-medium transition ${viewMode === 'byTeacher' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              By Teacher
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="card flex flex-col items-center py-16">
          <GraduationCap className="h-16 w-16 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-600">No Assignments Yet</h3>
          <p className="mt-1 text-sm text-slate-400">
            Click &ldquo;Assign Teachers to Class&rdquo; to link teachers to subjects for each class.
          </p>
        </div>
      ) : viewMode === 'byClass' ? (
        <div className="space-y-4">
          {groupedByClass.map((g) => (
            <div key={`${g.sectionId}-${g.sessionName}`} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">
                      Class {g.className} — Section {g.sectionName}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {g.sessionName} · {g.subjects.length} subject(s)
                    </p>
                  </div>
                </div>
                {g.classTeacher && (
                  <div className="flex items-center gap-2 rounded-full bg-yellow-50 px-3 py-1.5 text-sm">
                    <GraduationCap className="h-4 w-4 text-yellow-600" />
                    <span className="text-yellow-700">
                      Class Teacher: <strong>{g.classTeacher.name_bn || g.classTeacher.name}</strong>
                    </span>
                  </div>
                )}
              </div>
              <div className="divide-y divide-slate-50">
                {g.subjects.map(({ assignment: a, teacher: tch }) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                        {a.subject?.code || a.subject?.name?.charAt(0) || '?'}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{a.subject?.name ?? '—'}</p>
                        {a.subject?.name_bn && <p className="text-xs text-slate-400">{a.subject.name_bn}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-700">{tch?.name_bn || tch?.name}</p>
                        <p className="text-xs text-slate-400">{tch?.designation} · {tch?.employee_id}</p>
                      </div>
                      <button
                        onClick={() => confirm('Remove this assignment?') && deleteMut.mutate(a.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByTeacher.map((g) => (
            <div key={g.teacher?.id ?? 0} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <div className="rounded-xl bg-primary-100 p-2.5 text-primary-700">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{g.teacher?.name_bn || g.teacher?.name}</h3>
                  <p className="text-sm text-slate-500">
                    {g.teacher?.designation} · {g.teacher?.employee_id} · {g.items.length} subject(s)
                  </p>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {g.items.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-600">
                        {a.subject?.name?.charAt(0) || '?'}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          Class {a.section?.class?.name} — {a.section?.name}
                        </p>
                        <p className="text-xs text-slate-500">{a.subject?.name ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {a.is_class_teacher && (
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                          Class Teacher
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{a.academic_session?.name}</span>
                      <button
                        onClick={() => confirm('Remove this assignment?') && deleteMut.mutate(a.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── WIZARD MODAL ─── */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <button
              onClick={() => setWizardOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-slate-100 px-6 pt-6 pb-4">
              <h3 className="text-lg font-bold text-slate-800">Assign Teachers to Class</h3>
              <div className="mt-3 flex items-center gap-2">
                <StepBadge step={1} current={wizardStep} label="Select Class" />
                <ChevronRight className="h-4 w-4 text-slate-300" />
                <StepBadge step={2} current={wizardStep} label="Assign Teachers" />
              </div>
            </div>

            <div className="p-6">
              {wizardStep === 1 ? (
                <div className="space-y-5">
                  <p className="text-sm text-slate-500">
                    Choose a class, section, and session. On the next step you&apos;ll pick a teacher for
                    each subject.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Academic Session *</label>
                    <select
                      value={selectedSessionId}
                      onChange={(e) => setSelectedSessionId(e.target.value)}
                      className="input mt-1 w-full"
                    >
                      <option value="">Select session</option>
                      {sessionsList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.is_current ? '(Current)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Class *</label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => {
                        setSelectedClassId(e.target.value);
                        setSelectedSectionId('');
                      }}
                      className="input mt-1 w-full"
                    >
                      <option value="">Select class</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          Class {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Section *</label>
                    <select
                      value={selectedSectionId}
                      onChange={(e) => setSelectedSectionId(e.target.value)}
                      className="input mt-1 w-full"
                      disabled={!selectedClassId}
                    >
                      <option value="">Select section</option>
                      {selectedSections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {selectedClassId && selectedSections.length === 0 && (
                      <p className="mt-1 text-xs text-amber-600">No sections found for this class.</p>
                    )}
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={goToStep2}
                      disabled={!selectedClassId || !selectedSectionId || !selectedSessionId}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      Next: Assign Teachers <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-xl bg-blue-50 px-4 py-3">
                    <p className="text-sm font-medium text-blue-700">
                      Class {selectedClass?.name} — Section{' '}
                      {selectedSections.find((s) => String(s.id) === selectedSectionId)?.name} —{' '}
                      {sessionsList.find((s) => String(s.id) === selectedSessionId)?.name}
                    </p>
                    <p className="mt-0.5 text-xs text-blue-500">
                      Select a different teacher for each subject from the dropdown below.
                    </p>
                  </div>

                  {/* Class Teacher */}
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                    <label className="block text-sm font-medium text-yellow-800">
                      <GraduationCap className="mr-1 inline h-4 w-4" />
                      Class Teacher (optional)
                    </label>
                    <select
                      value={classTeacherId}
                      onChange={(e) => setClassTeacherId(e.target.value)}
                      className="input mt-2 w-full"
                    >
                      <option value="">— No class teacher —</option>
                      {teachers.map((tc) => (
                        <option key={tc.id} value={tc.id}>
                          {tc.name} ({tc.employee_id}) — {tc.designation}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject → Teacher */}
                  {classSubjects.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                      <p className="text-sm text-amber-700">
                        No subjects mapped to this class yet. Go to{' '}
                        <strong>Subjects</strong> page to add subject–class mappings first.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-700">
                          Subjects ({classSubjects.length})
                        </h4>
                        <div className="relative w-56">
                          <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            value={teacherSearch}
                            onChange={(e) => setTeacherSearch(e.target.value)}
                            placeholder="Search teachers..."
                            className="input w-full pl-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        {classSubjects.map((cs) => {
                          const sub = cs.subject;
                          if (!sub) return null;
                          const hasTch = !!subjectTeacherMap[sub.id];
                          return (
                            <div
                              key={cs.id}
                              className={`rounded-xl border p-4 transition ${
                                hasTch ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-500">
                                    {sub.code || sub.name.charAt(0)}
                                  </span>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-700">{sub.name}</p>
                                    {sub.name_bn && (
                                      <p className="text-xs text-slate-400">{sub.name_bn}</p>
                                    )}
                                  </div>
                                </div>
                                {hasTch && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                              </div>
                              <div className="mt-3">
                                <select
                                  value={subjectTeacherMap[sub.id] || ''}
                                  onChange={(e) =>
                                    setSubjectTeacherMap((m) => ({ ...m, [sub.id]: e.target.value }))
                                  }
                                  className="input w-full text-sm"
                                >
                                  <option value="">— Select Teacher —</option>
                                  {(teacherSearch ? filteredTeachers : teachers).map((tc) => (
                                    <option key={tc.id} value={tc.id}>
                                      {tc.name}
                                      {tc.name_bn ? ` (${tc.name_bn})` : ''} — {tc.designation} [{tc.employee_id}]
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <button onClick={() => setWizardStep(1)} className="btn text-sm">
                      ← Back
                    </button>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">
                        {Object.values(subjectTeacherMap).filter(Boolean).length} of{' '}
                        {classSubjects.length} assigned
                      </span>
                      <button
                        onClick={saveAssignments}
                        disabled={saving || Object.values(subjectTeacherMap).filter(Boolean).length === 0}
                        className="btn btn-primary"
                      >
                        {saving ? 'Saving...' : 'Save Assignments'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepBadge({ step, current, label }: { step: number; current: number; label: string }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
          done ? 'bg-emerald-500 text-white' : active ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'
        }`}
      >
        {done ? <CheckCircle className="h-4 w-4" /> : step}
      </span>
      <span className={`text-sm font-medium ${active ? 'text-primary-700' : 'text-slate-500'}`}>{label}</span>
    </div>
  );
}
