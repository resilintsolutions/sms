'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Settings2,
  Plus,
  Trash2,
  Save,
  Loader2,
  BookOpen,
  FileText,
  BarChart3,
  Wand2,
  ChevronDown,
  Check,
  X,
  AlertTriangle,
  Pencil,
  RefreshCcw,
  GraduationCap,
  ClipboardList,
  Calculator,
  Layers,
} from 'lucide-react';

/* ═══════════════ Types ═══════════════ */

type ExamComponent = {
  id: number;
  name: string;
  name_bn?: string;
  short_code?: string;
  sort_order: number;
  is_active: boolean;
};

type SubjectRule = {
  id: number;
  exam_term_id: number;
  class_id: number;
  subject_id: number;
  component_id: number;
  max_marks: number;
  weight: number;
  is_optional: boolean;
  component?: ExamComponent;
  subject?: { id: number; name: string };
};

type ResultConfig = {
  id: number;
  name: string;
  fail_criteria: string;
  pass_marks_percent: number;
  min_gpa?: number;
  max_fail_subjects: number;
  use_component_marks: boolean;
  is_active: boolean;
  class_id?: number;
  academic_session_id?: number;
};

type ComponentMarkEntry = {
  student_enrollment_id: number;
  subject_id: number;
  component_id: number;
  marks_obtained: number | null;
  max_marks: number;
  absent_code?: string | null;
};

type ClassItem = { id: number; name: string };
type SectionItem = { id: number; name: string; class_id: number };
type SubjectItem = { id: number; name: string };
type ExamTerm = { id: number; name: string };
type SessionItem = { id: number; name: string; is_current?: boolean };

type EnrollmentInfo = {
  id: number;
  roll_no?: number;
  student: { id: number; name: string; student_id: string };
};

type ComponentMarkRow = {
  enrollment_id: number;
  student_name: string;
  student_id: string;
  roll_no?: number;
  marks: Record<number, { marks_obtained: number | null; max_marks: number; absent_code?: string | null; id?: number }>;
};

/* ═══════════════ Constants ═══════════════ */

const TABS = [
  { key: 'components', label: 'Exam Components', icon: Layers },
  { key: 'rules', label: 'Subject Rules', icon: FileText },
  { key: 'marks', label: 'Marks Entry', icon: Pencil },
  { key: 'config', label: 'Result Config', icon: Settings2 },
  { key: 'generate', label: 'Generate Results', icon: Calculator },
] as const;

type TabKey = typeof TABS[number]['key'];

const FAIL_CRITERIA_OPTIONS = [
  { value: 'any_subject_below_pass', label: 'Fail if any subject below pass marks' },
  { value: 'gpa_below_threshold', label: 'Fail if GPA below threshold' },
  { value: 'fail_count_exceeds', label: 'Fail if fail count exceeds limit' },
  { value: 'custom', label: 'Custom rules (JSON)' },
];

/* ═══════════════ Main Page ═══════════════ */

export default function ExamConfigPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('components');

  // Shared filter state
  const [selectedSession, setSelectedSession] = useState<number | ''>('');
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [selectedExam, setSelectedExam] = useState<number | ''>('');

  // ─── Sessions, Classes, Exams ───
  const { data: sessionsData } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api<SessionItem[]>('/sessions'),
  });
  const sessions = sessionsData?.data ?? [];

  // Auto-select current session
  useEffect(() => {
    if (sessions.length > 0 && selectedSession === '') {
      const current = sessions.find(s => s.is_current);
      setSelectedSession(current?.id ?? sessions[0].id);
    }
  }, [sessions, selectedSession]);

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api<ClassItem[]>('/classes'),
  });
  const classes = classesData?.data ?? [];

  const { data: examsData } = useQuery({
    queryKey: ['exam-terms', selectedSession],
    queryFn: () => api<ExamTerm[]>(`/exam-terms?session_id=${selectedSession}`),
    enabled: !!selectedSession,
  });
  const exams = examsData?.data ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-100 p-2">
            <ClipboardList className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Exam Configuration</h1>
            <p className="text-sm text-gray-500">Configure exam components, rules, marks entry & result generation</p>
          </div>
        </div>
      </div>

      {/* Shared Filters */}
      <div className="border-b bg-white px-6 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">Session</label>
            <select
              value={selectedSession}
              onChange={e => { setSelectedSession(Number(e.target.value)); setSelectedExam(''); }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select Session</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">Class</label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">Exam</label>
            <select
              value={selectedExam}
              onChange={e => setSelectedExam(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select Exam</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-white px-6">
        <div className="flex gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'components' && <ComponentsTab queryClient={queryClient} />}
        {activeTab === 'rules' && <SubjectRulesTab selectedExam={selectedExam} selectedClass={selectedClass} queryClient={queryClient} />}
        {activeTab === 'marks' && <MarksEntryTab selectedExam={selectedExam} selectedClass={selectedClass} queryClient={queryClient} />}
        {activeTab === 'config' && <ResultConfigTab queryClient={queryClient} />}
        {activeTab === 'generate' && <GenerateResultsTab selectedExam={selectedExam} selectedClass={selectedClass} selectedSession={selectedSession} queryClient={queryClient} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB 1: EXAM COMPONENTS
   ═══════════════════════════════════════════ */

function ComponentsTab({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', name_bn: '', short_code: '', sort_order: 0 });

  const { data, isLoading } = useQuery({
    queryKey: ['exam-components'],
    queryFn: () => api<ExamComponent[]>('/result-cards/components'),
  });
  const components = data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: (payload: typeof form & { id?: number }) => {
      if (payload.id) {
        return api(`/result-cards/components/${payload.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      }
      return api('/result-cards/components', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-components'] });
      toast.success(editId ? 'Component updated' : 'Component created');
      resetForm();
    },
    onError: () => toast.error('Failed to save component'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/result-cards/components/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-components'] });
      toast.success('Component deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const resetForm = () => {
    setForm({ name: '', name_bn: '', short_code: '', sort_order: 0 });
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (c: ExamComponent) => {
    setForm({ name: c.name, name_bn: c.name_bn ?? '', short_code: c.short_code ?? '', sort_order: c.sort_order });
    setEditId(c.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Exam Components</h2>
          <p className="text-sm text-gray-500">Define exam components like Written, Class Test, Practical, Viva, Assignment</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Component
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{editId ? 'Edit Component' : 'New Component'}</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name (English) *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Written"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name (Bangla)</label>
              <input
                value={form.name_bn}
                onChange={e => setForm(f => ({ ...f, name_bn: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. লিখিত"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Short Code</label>
              <input
                value={form.short_code}
                onChange={e => setForm(f => ({ ...f, short_code: e.target.value.toUpperCase() }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. WR"
                maxLength={5}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sort Order</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                min={0}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => saveMutation.mutate({ ...form, id: editId ?? undefined })}
              disabled={!form.name || saveMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editId ? 'Update' : 'Save'}
            </button>
            <button onClick={resetForm} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : components.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Layers className="mx-auto h-10 w-10 mb-2 opacity-50" />
            <p>No components defined yet. Click &quot;Add Component&quot; to start.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Name (BN)</th>
                <th className="px-4 py-3 w-20">Code</th>
                <th className="px-4 py-3 w-16">Order</th>
                <th className="px-4 py-3 w-16">Status</th>
                <th className="px-4 py-3 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {components.map((c, i) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.name_bn || '—'}</td>
                  <td className="px-4 py-3"><span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs">{c.short_code || '—'}</span></td>
                  <td className="px-4 py-3 text-gray-500">{c.sort_order}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(c)} className="rounded p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => { if (confirm('Delete this component?')) deleteMutation.mutate(c.id); }} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB 2: SUBJECT RULES
   ═══════════════════════════════════════════ */

function SubjectRulesTab({ selectedExam, selectedClass, queryClient }: { selectedExam: number | ''; selectedClass: number | ''; queryClient: ReturnType<typeof useQueryClient> }) {
  const needsFilter = !selectedExam || !selectedClass;

  const { data: componentsData } = useQuery({
    queryKey: ['exam-components'],
    queryFn: () => api<ExamComponent[]>('/result-cards/components'),
  });
  const components = componentsData?.data ?? [];

  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ['subject-rules', selectedExam, selectedClass],
    queryFn: () => api<SubjectRule[]>(`/result-cards/subject-rules?exam_term_id=${selectedExam}&class_id=${selectedClass}`),
    enabled: !needsFilter,
  });
  const rules = rulesData?.data ?? [];

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api<SubjectItem[]>('/subjects'),
  });
  const subjects = subjectsData?.data ?? [];

  // ─── Add rule form ───
  const [showAdd, setShowAdd] = useState(false);
  const [newRule, setNewRule] = useState({ subject_id: '', component_id: '', max_marks: 100, weight: 1.0, is_optional: false });

  const saveMutation = useMutation({
    mutationFn: (payload: object) => api('/result-cards/subject-rules', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-rules'] });
      toast.success('Rule saved');
      setShowAdd(false);
      setNewRule({ subject_id: '', component_id: '', max_marks: 100, weight: 1.0, is_optional: false });
    },
    onError: () => toast.error('Failed to save rule'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/result-cards/subject-rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-rules'] });
      toast.success('Rule deleted');
    },
  });

  const autoGenMutation = useMutation({
    mutationFn: () => api('/result-cards/subject-rules/auto-generate', {
      method: 'POST',
      body: JSON.stringify({ exam_term_id: selectedExam, class_id: selectedClass }),
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['subject-rules'] });
      toast.success(res?.message || 'Rules auto-generated');
    },
    onError: () => toast.error('Auto-generate failed'),
  });

  // Group rules by subject
  const rulesBySubject = useMemo(() => {
    const map: Record<number, { subject_name: string; rules: SubjectRule[] }> = {};
    rules.forEach(r => {
      const sid = r.subject_id;
      if (!map[sid]) map[sid] = { subject_name: r.subject?.name || `Subject ${sid}`, rules: [] };
      map[sid].rules.push(r);
    });
    return Object.values(map);
  }, [rules]);

  if (needsFilter) {
    return (
      <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-400 mb-3" />
        <p className="text-gray-600 font-medium">Select an Exam and Class from the filters above</p>
        <p className="text-sm text-gray-400 mt-1">Subject rules are specific to each exam and class combination</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Subject Rules</h2>
          <p className="text-sm text-gray-500">Define which components apply to each subject with max marks &amp; weight</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => autoGenMutation.mutate()}
            disabled={autoGenMutation.isPending}
            className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
          >
            {autoGenMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Auto-Generate
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Add Rule
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Subject Rule</h3>
          <div className="grid grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
              <select
                value={newRule.subject_id}
                onChange={e => setNewRule(r => ({ ...r, subject_id: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Component</label>
              <select
                value={newRule.component_id}
                onChange={e => setNewRule(r => ({ ...r, component_id: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                {components.map(c => <option key={c.id} value={c.id}>{c.name} ({c.short_code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Marks</label>
              <input type="number" value={newRule.max_marks} onChange={e => setNewRule(r => ({ ...r, max_marks: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" min={1} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Weight (0–1)</label>
              <input type="number" step="0.01" value={newRule.weight} onChange={e => setNewRule(r => ({ ...r, weight: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" min={0} max={1} />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => saveMutation.mutate({
                  exam_term_id: selectedExam,
                  class_id: selectedClass,
                  rules: [{ subject_id: Number(newRule.subject_id), component_id: Number(newRule.component_id), max_marks: newRule.max_marks, weight: newRule.weight }],
                })}
                disabled={!newRule.subject_id || !newRule.component_id || saveMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules grouped by subject */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {rulesLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
        ) : rulesBySubject.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <FileText className="mx-auto h-10 w-10 mb-2 opacity-50" />
            <p>No rules defined. Use &quot;Auto-Generate&quot; or add manually.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Component</th>
                <th className="px-4 py-3 text-center w-24">Max Marks</th>
                <th className="px-4 py-3 text-center w-20">Weight</th>
                <th className="px-4 py-3 text-center w-28">Effective Max</th>
                <th className="px-4 py-3 w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rulesBySubject.map(group => (
                <Fragment key={group.subject_name}>
                  {group.rules.map((r, i) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      {i === 0 && (
                        <td className="px-4 py-3 font-semibold text-gray-800" rowSpan={group.rules.length}>
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-indigo-500" />
                            {group.subject_name}
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-xs text-indigo-700">{r.component?.short_code || '?'}</span>
                          {r.component?.name || `Component ${r.component_id}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">{r.max_marks}</td>
                      <td className="px-4 py-3 text-center">{(r.weight * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-center font-semibold text-indigo-600">{(r.max_marks * r.weight).toFixed(0)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => { if (confirm('Delete this rule?')) deleteMutation.mutate(r.id); }}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB 3: COMPONENT MARKS ENTRY
   ═══════════════════════════════════════════ */

function MarksEntryTab({ selectedExam, selectedClass, queryClient }: { selectedExam: number | ''; selectedClass: number | ''; queryClient: ReturnType<typeof useQueryClient> }) {
  const [selectedSubject, setSelectedSubject] = useState<number | ''>('');
  const [selectedSection, setSelectedSection] = useState<number | ''>('');
  const [marksState, setMarksState] = useState<Record<string, { marks: number | null; absent: boolean }>>({});

  const needsFilter = !selectedExam || !selectedClass;

  const { data: sectionsData } = useQuery({
    queryKey: ['sections', selectedClass],
    queryFn: () => api<SectionItem[]>(`/sections?class_id=${selectedClass}`),
    enabled: !!selectedClass,
  });
  const sections = sectionsData?.data ?? [];

  const { data: subjectsData } = useQuery({
    queryKey: ['class-subjects', selectedClass],
    queryFn: () => api<SubjectItem[]>(`/subjects?class_id=${selectedClass}`),
    enabled: !!selectedClass,
  });
  const subjects = subjectsData?.data ?? [];

  const { data: componentsData } = useQuery({
    queryKey: ['exam-components'],
    queryFn: () => api<ExamComponent[]>('/result-cards/components'),
  });
  const components = componentsData?.data ?? [];

  // Get existing marks
  const canFetchMarks = !!selectedExam && !!selectedSubject && !!selectedSection;
  const { data: existingMarksData, isLoading: marksLoading } = useQuery({
    queryKey: ['component-marks', selectedExam, selectedSubject, selectedSection],
    queryFn: () => api<{ enrollments: EnrollmentInfo[]; marks: ComponentMarkEntry[]; rules: SubjectRule[] }>(
      `/result-cards/component-marks?exam_term_id=${selectedExam}&subject_id=${selectedSubject}&section_id=${selectedSection}`
    ),
    enabled: canFetchMarks,
  });

  const enrollments = existingMarksData?.data?.enrollments ?? [];
  const existingMarks = existingMarksData?.data?.marks ?? [];
  const subjectRules = existingMarksData?.data?.rules ?? [];

  // Build rows — enrollment × component
  const rows = useMemo(() => {
    if (!enrollments.length) return [];

    const activeComponents = subjectRules.map(r => ({
      component_id: r.component_id,
      max_marks: r.max_marks,
      component_name: components.find(c => c.id === r.component_id)?.name || `Comp ${r.component_id}`,
      short_code: components.find(c => c.id === r.component_id)?.short_code || '?',
    }));

    return enrollments.map(en => {
      const row: ComponentMarkRow = {
        enrollment_id: en.id,
        student_name: en.student.name,
        student_id: en.student.student_id,
        roll_no: en.roll_no,
        marks: {},
      };
      activeComponents.forEach(ac => {
        const existing = existingMarks.find(
          m => m.student_enrollment_id === en.id && m.component_id === ac.component_id
        );
        row.marks[ac.component_id] = {
          marks_obtained: existing?.marks_obtained ?? null,
          max_marks: ac.max_marks,
          absent_code: existing?.absent_code ?? null,
        };
      });
      return { row, activeComponents };
    });
  }, [enrollments, existingMarks, subjectRules, components]);

  const activeComponents = rows.length > 0 ? rows[0].activeComponents : [];

  // Initialize local state from existing marks
  useEffect(() => {
    if (rows.length === 0) return;
    const state: typeof marksState = {};
    rows.forEach(({ row }) => {
      Object.entries(row.marks).forEach(([compId, m]) => {
        const key = `${row.enrollment_id}-${compId}`;
        state[key] = { marks: m.marks_obtained, absent: !!m.absent_code };
      });
    });
    setMarksState(state);
  }, [rows]);

  const saveMutation = useMutation({
    mutationFn: (payload: object) => api('/result-cards/component-marks', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['component-marks'] });
      toast.success('Marks saved successfully');
    },
    onError: () => toast.error('Failed to save marks'),
  });

  const handleSave = () => {
    const marksPayload: ComponentMarkEntry[] = [];
    rows.forEach(({ row }) => {
      activeComponents.forEach(ac => {
        const key = `${row.enrollment_id}-${ac.component_id}`;
        const val = marksState[key];
        if (!val) return;
        marksPayload.push({
          student_enrollment_id: row.enrollment_id,
          subject_id: Number(selectedSubject),
          component_id: ac.component_id,
          marks_obtained: val.absent ? null : val.marks,
          max_marks: ac.max_marks,
          absent_code: val.absent ? 'AB' : null,
        });
      });
    });
    saveMutation.mutate({
      exam_term_id: selectedExam,
      subject_id: selectedSubject,
      marks: marksPayload,
    });
  };

  if (needsFilter) {
    return (
      <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-400 mb-3" />
        <p className="text-gray-600 font-medium">Select Exam and Class from the filters above</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Component Marks Entry</h2>
          <p className="text-sm text-gray-500">Enter marks per component for each student</p>
        </div>
      </div>

      {/* Sub-filters: Section & Subject */}
      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
          <select
            value={selectedSection}
            onChange={e => setSelectedSection(Number(e.target.value))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[150px]"
          >
            <option value="">Select Section</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(Number(e.target.value))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[200px]"
          >
            <option value="">Select Subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {rows.length > 0 && (
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save All Marks
          </button>
        )}
      </div>

      {/* Marks grid */}
      {!canFetchMarks ? (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-400">
          <Pencil className="mx-auto h-8 w-8 mb-2 opacity-50" />
          <p>Select a section and subject to enter marks</p>
        </div>
      ) : marksLoading ? (
        <div className="rounded-xl border bg-white p-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-500" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-400">
          <p>No students found or no subject rules defined for this combination.</p>
          <p className="text-xs mt-1">Make sure Subject Rules are configured in the &quot;Subject Rules&quot; tab.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                <th className="px-3 py-3 text-left w-12">Roll</th>
                <th className="px-3 py-3 text-left">Student</th>
                {activeComponents.map(ac => (
                  <th key={ac.component_id} className="px-3 py-3 text-center w-28">
                    <div>{ac.component_name}</div>
                    <div className="text-[10px] text-gray-400 font-normal normal-case">Max: {ac.max_marks}</div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center w-20">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(({ row }) => {
                let total = 0;
                let totalMax = 0;
                return (
                  <tr key={row.enrollment_id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-700">{row.roll_no ?? '—'}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-800">{row.student_name}</div>
                      <div className="text-xs text-gray-400 font-mono">{row.student_id}</div>
                    </td>
                    {activeComponents.map(ac => {
                      const key = `${row.enrollment_id}-${ac.component_id}`;
                      const val = marksState[key] ?? { marks: null, absent: false };
                      if (!val.absent && val.marks !== null) {
                        total += val.marks;
                      }
                      totalMax += ac.max_marks;
                      return (
                        <td key={ac.component_id} className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={val.absent ? '' : (val.marks ?? '')}
                              onChange={e => {
                                const v = e.target.value === '' ? null : Math.min(Number(e.target.value), ac.max_marks);
                                setMarksState(prev => ({ ...prev, [key]: { marks: v, absent: false } }));
                              }}
                              disabled={val.absent}
                              min={0}
                              max={ac.max_marks}
                              className="w-16 rounded border border-gray-300 px-2 py-1 text-sm text-center focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                              placeholder="—"
                            />
                            <label className="flex items-center gap-0.5 text-xs text-gray-400 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={val.absent}
                                onChange={e => setMarksState(prev => ({ ...prev, [key]: { marks: null, absent: e.target.checked } }))}
                                className="rounded"
                              />
                              AB
                            </label>
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-bold text-indigo-700">{total}/{totalMax}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB 4: RESULT CONFIG
   ═══════════════════════════════════════════ */

function ResultConfigTab({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '', fail_criteria: 'any_subject_below_pass', pass_marks_percent: 33,
    min_gpa: '', max_fail_subjects: 0, use_component_marks: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['result-configs'],
    queryFn: () => api<ResultConfig[]>('/result-cards/result-configs'),
  });
  const configs = data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: (payload: object) => {
      if (editId) return api(`/result-cards/result-configs/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
      return api('/result-cards/result-configs', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['result-configs'] });
      toast.success(editId ? 'Config updated' : 'Config created');
      resetForm();
    },
    onError: () => toast.error('Failed to save config'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/result-cards/result-configs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['result-configs'] });
      toast.success('Config deleted');
    },
  });

  const resetForm = () => {
    setForm({ name: '', fail_criteria: 'any_subject_below_pass', pass_marks_percent: 33, min_gpa: '', max_fail_subjects: 0, use_component_marks: true });
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (c: ResultConfig) => {
    setForm({
      name: c.name,
      fail_criteria: c.fail_criteria,
      pass_marks_percent: c.pass_marks_percent,
      min_gpa: c.min_gpa?.toString() ?? '',
      max_fail_subjects: c.max_fail_subjects,
      use_component_marks: c.use_component_marks,
    });
    setEditId(c.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Result Configuration</h2>
          <p className="text-sm text-gray-500">Set up promotion rules, pass marks, and fail criteria</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Add Config
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">{editId ? 'Edit Config' : 'New Config'}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Config Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. Default Bangladesh Rules" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fail Criteria</label>
              <select value={form.fail_criteria} onChange={e => setForm(f => ({ ...f, fail_criteria: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {FAIL_CRITERIA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pass Marks %</label>
              <input type="number" value={form.pass_marks_percent} onChange={e => setForm(f => ({ ...f, pass_marks_percent: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" min={0} max={100} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Min GPA (optional)</label>
              <input type="number" step="0.01" value={form.min_gpa} onChange={e => setForm(f => ({ ...f, min_gpa: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. 2.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Fail Subjects</label>
              <input type="number" value={form.max_fail_subjects} onChange={e => setForm(f => ({ ...f, max_fail_subjects: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" min={0} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.use_component_marks}
                  onChange={e => setForm(f => ({ ...f, use_component_marks: e.target.checked }))}
                  className="rounded" />
                <span className="text-sm text-gray-600">Use component marks (new system)</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => saveMutation.mutate({
                ...form,
                min_gpa: form.min_gpa ? Number(form.min_gpa) : null,
              })}
              disabled={!form.name || saveMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editId ? 'Update' : 'Save'}
            </button>
            <button onClick={resetForm} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Configs list */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
        ) : configs.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Settings2 className="mx-auto h-10 w-10 mb-2 opacity-50" />
            <p>No result configs yet. Add your first one above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Fail Criteria</th>
                <th className="px-4 py-3 text-center">Pass %</th>
                <th className="px-4 py-3 text-center">Min GPA</th>
                <th className="px-4 py-3 text-center">Max Fails</th>
                <th className="px-4 py-3 text-center">Component Marks</th>
                <th className="px-4 py-3 text-center">Active</th>
                <th className="px-4 py-3 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {configs.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {FAIL_CRITERIA_OPTIONS.find(o => o.value === c.fail_criteria)?.label || c.fail_criteria}
                  </td>
                  <td className="px-4 py-3 text-center">{c.pass_marks_percent}%</td>
                  <td className="px-4 py-3 text-center">{c.min_gpa ?? '—'}</td>
                  <td className="px-4 py-3 text-center">{c.max_fail_subjects}</td>
                  <td className="px-4 py-3 text-center">
                    {c.use_component_marks ? <Check className="mx-auto h-4 w-4 text-green-600" /> : <X className="mx-auto h-4 w-4 text-gray-300" />}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.is_active ? 'Active' : 'Off'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(c)} className="rounded p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => { if (confirm('Delete this config?')) deleteMutation.mutate(c.id); }}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB 5: GENERATE RESULTS
   ═══════════════════════════════════════════ */

function GenerateResultsTab({ selectedExam, selectedClass, selectedSession, queryClient }: {
  selectedExam: number | '';
  selectedClass: number | '';
  selectedSession: number | '';
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [lastGenResult, setLastGenResult] = useState<{ message: string; count: number } | null>(null);

  // Summaries
  const { data: summariesData, isLoading: summariesLoading, refetch: refetchSummaries } = useQuery({
    queryKey: ['result-summaries', selectedExam, selectedClass],
    queryFn: () => api<{ id: number; student_enrollment_id: number; total_marks: number; gpa: number; letter_grade: string; position: number; status: string; promoted: boolean; enrollment?: { roll_no?: number; student?: { name: string; student_id: string } } }[]>(
      `/result-cards/summaries?exam_term_id=${selectedExam}${selectedClass ? `&class_id=${selectedClass}` : ''}`
    ),
    enabled: !!selectedExam,
  });
  const summaries = summariesData?.data ?? [];

  const generateMutation = useMutation({
    mutationFn: (payload: object) => api<{ message: string; count: number }>('/result-cards/generate', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (res) => {
      setLastGenResult(res?.data ?? null);
      queryClient.invalidateQueries({ queryKey: ['result-summaries'] });
      toast.success(res?.data?.message || 'Results generated');
    },
    onError: () => toast.error('Failed to generate results'),
  });

  const generateAnnualMutation = useMutation({
    mutationFn: (payload: object) => api<{ message: string; count: number }>('/result-cards/generate-annual', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (res) => {
      setLastGenResult(res?.data ?? null);
      queryClient.invalidateQueries({ queryKey: ['result-summaries'] });
      toast.success(res?.data?.message || 'Annual results generated');
    },
    onError: () => toast.error('Failed to generate annual results'),
  });

  const stats = useMemo(() => {
    if (!summaries.length) return null;
    const passed = summaries.filter(s => s.status === 'pass').length;
    const failed = summaries.filter(s => s.status === 'fail').length;
    const avgGpa = summaries.reduce((acc, s) => acc + (s.gpa ?? 0), 0) / summaries.length;
    const gpa5 = summaries.filter(s => s.gpa === 5.0).length;
    return { total: summaries.length, passed, failed, avgGpa: avgGpa.toFixed(2), gpa5 };
  }, [summaries]);

  return (
    <div className="space-y-6">
      {/* Generate Actions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-blue-100 p-2"><Calculator className="h-5 w-5 text-blue-600" /></div>
            <div>
              <h3 className="font-semibold text-gray-900">Generate Exam Results</h3>
              <p className="text-xs text-gray-500">Calculate results for a specific exam term</p>
            </div>
          </div>
          {!selectedExam ? (
            <p className="text-sm text-amber-600 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Select an exam from the filters above</p>
          ) : (
            <button
              onClick={() => generateMutation.mutate({ exam_term_id: selectedExam, class_id: selectedClass || undefined })}
              disabled={generateMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 w-full justify-center"
            >
              {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              Generate Results
            </button>
          )}
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-purple-100 p-2"><GraduationCap className="h-5 w-5 text-purple-600" /></div>
            <div>
              <h3 className="font-semibold text-gray-900">Generate Annual Results</h3>
              <p className="text-xs text-gray-500">Aggregate all exam terms for the session</p>
            </div>
          </div>
          {!selectedSession ? (
            <p className="text-sm text-amber-600 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Select a session from the filters</p>
          ) : (
            <button
              onClick={() => generateAnnualMutation.mutate({ session_id: selectedSession, class_id: selectedClass || undefined })}
              disabled={generateAnnualMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 w-full justify-center"
            >
              {generateAnnualMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
              Generate Annual Results
            </button>
          )}
        </div>
      </div>

      {/* Last generation result */}
      {lastGenResult && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">{lastGenResult.message}</p>
            <p className="text-xs text-green-600">{lastGenResult.count} result(s) generated</p>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-800', bg: 'bg-gray-50' },
            { label: 'Passed', value: stats.passed, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Failed', value: stats.failed, color: 'text-red-700', bg: 'bg-red-50' },
            { label: 'Avg GPA', value: stats.avgGpa, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'GPA 5.0', value: stats.gpa5, color: 'text-purple-700', bg: 'bg-purple-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border ${s.bg} p-4 text-center`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs font-semibold text-gray-500 uppercase">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Summaries table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">Result Summaries</h3>
          <button onClick={() => refetchSummaries()} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            <RefreshCcw className="h-3 w-3" /> Refresh
          </button>
        </div>
        {summariesLoading ? (
          <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-500" /></div>
        ) : summaries.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <BarChart3 className="mx-auto h-10 w-10 mb-2 opacity-50" />
            <p>No results yet. Generate results using the buttons above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                <th className="px-4 py-3 w-16">Pos</th>
                <th className="px-4 py-3 w-16">Roll</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3 text-center">Total</th>
                <th className="px-4 py-3 text-center">GPA</th>
                <th className="px-4 py-3 text-center">Grade</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Promoted</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {summaries.map(s => (
                <tr key={s.id} className={`hover:bg-gray-50 ${s.status === 'fail' ? 'bg-red-50/40' : ''}`}>
                  <td className="px-4 py-3 font-bold text-indigo-700">{s.position ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{s.enrollment?.roll_no ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{s.enrollment?.student?.name ?? '—'}</div>
                    <div className="text-xs text-gray-400 font-mono">{s.enrollment?.student?.student_id ?? ''}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{s.total_marks}</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-700">{s.gpa?.toFixed(2) ?? '—'}</td>
                  <td className="px-4 py-3 text-center font-bold">{s.letter_grade ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      s.status === 'pass' ? 'bg-green-100 text-green-700' :
                      s.status === 'fail' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {s.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.promoted ? <Check className="mx-auto h-4 w-4 text-green-600" /> : <X className="mx-auto h-4 w-4 text-red-400" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
