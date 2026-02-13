'use client';

import { Suspense, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  Save,
  ClipboardList,
  Search,
  CheckCircle2,
  AlertCircle,
  UserX,
  BarChart3,
  ArrowUpDown,
  RotateCcw,
  ChevronDown,
  User,
  Upload,
  Table2,
  FileSpreadsheet,
  Download,
  X,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react';

/* ─── Types ─── */
type Assignment = {
  id: number;
  section?: { id: number; name: string; class?: { id: number; name: string } };
  subject?: { id: number; name: string; name_bn?: string };
  academic_session?: { id: number; name: string };
};

type ExamTerm = { id: number; name: string; publish_status?: string };

type MarkRow = {
  student_enrollment_id: number;
  student?: { id: number; name: string; name_bn?: string };
  roll_no: number;
  marks_obtained: number | null;
  full_marks: number;
  absent_code: string | null;
};

type LocalEntry = {
  marks: string;
  fullMarks: string;
  absent: boolean;
};

type InputMode = 'single' | 'bulk' | 'table';

type BulkRow = {
  roll_no: number;
  marks: number | null;
  full_marks: number;
  absent: boolean;
  matched?: MarkRow;
  error?: string;
};

/* ─── Main Component ─── */
function TeacherMarksContent() {
  const t = useTranslations('common');
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Selection state
  const [sectionId, setSectionId] = useState(searchParams.get('section_id') || '');
  const [examTermId, setExamTermId] = useState('');
  const [subjectId, setSubjectId] = useState(searchParams.get('subject_id') || '');
  const [defaultFullMarks, setDefaultFullMarks] = useState('100');

  // Input mode
  const [inputMode, setInputMode] = useState<InputMode>('table');

  // Table mode state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'roll' | 'name' | 'marks'>('roll');
  const [sortAsc, setSortAsc] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [localEntries, setLocalEntries] = useState<Record<number, LocalEntry>>({});
  const [isDirty, setIsDirty] = useState(false);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Single entry mode state
  const [singleRollSearch, setSingleRollSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<MarkRow | null>(null);
  const [singleMarks, setSingleMarks] = useState('');
  const [singleFullMarks, setSingleFullMarks] = useState('100');
  const [singleAbsent, setSingleAbsent] = useState(false);
  const [singleSaveHistory, setSingleSaveHistory] = useState<
    { studentName: string; roll: number; marks: number | null; time: string }[]
  >([]);

  // Bulk upload state
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [bulkParsedRows, setBulkParsedRows] = useState<BulkRow[]>([]);
  const [bulkParseError, setBulkParseError] = useState('');
  const [bulkStep, setBulkStep] = useState<'input' | 'preview'>('input');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Data Queries ───
  const { data: assignData } = useQuery({
    queryKey: ['portal/teacher/assignments'],
    queryFn: () => api<{ data: Assignment[] }>('/portal/teacher/assignments'),
  });
  const assignments = (assignData as { data?: Assignment[] })?.data ?? [];

  const sectionOptions = useMemo(() => {
    const map = new Map<number, { id: number; name: string; className: string }>();
    assignments.forEach((a) => {
      if (a.section) {
        map.set(a.section.id, {
          id: a.section.id,
          name: a.section.name,
          className: a.section.class?.name ?? '',
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.className.localeCompare(b.className, undefined, { numeric: true }),
    );
  }, [assignments]);

  const subjectOptions = useMemo(() => {
    if (!sectionId) return [];
    const map = new Map<number, { id: number; name: string; name_bn?: string }>();
    assignments
      .filter((a) => String(a.section?.id) === sectionId && a.subject)
      .forEach((a) => {
        map.set(a.subject!.id, { id: a.subject!.id, name: a.subject!.name, name_bn: a.subject!.name_bn });
      });
    return Array.from(map.values());
  }, [assignments, sectionId]);

  const { data: termsData } = useQuery({
    queryKey: ['exam-terms'],
    queryFn: () => api<{ data: ExamTerm[] | { data: ExamTerm[] } }>('/exam-terms?per_page=100'),
  });
  const rawTerms = (termsData as { data?: ExamTerm[] | { data?: ExamTerm[] } })?.data;
  const examTerms: ExamTerm[] = Array.isArray(rawTerms) ? rawTerms : (rawTerms as { data?: ExamTerm[] })?.data ?? [];

  const canFetch = !!examTermId && !!sectionId && !!subjectId;
  const { data: marksData, isLoading, isFetching } = useQuery({
    queryKey: ['marks', examTermId, sectionId, subjectId],
    queryFn: () =>
      api<{ data: MarkRow[] }>(`/marks?exam_term_id=${examTermId}&section_id=${sectionId}&subject_id=${subjectId}`),
    enabled: canFetch,
  });
  const rows = (marksData as { data?: MarkRow[] })?.data ?? [];

  // Initialize local entries when rows change (for table mode)
  useEffect(() => {
    if (rows.length > 0) {
      const entries: Record<number, LocalEntry> = {};
      rows.forEach((r) => {
        entries[r.student_enrollment_id] = {
          marks: r.marks_obtained !== null ? String(r.marks_obtained) : '',
          fullMarks: String(r.full_marks ?? 100),
          absent: !!r.absent_code,
        };
      });
      setLocalEntries(entries);
      setIsDirty(false);
      if (rows[0]) setDefaultFullMarks(String(rows[0].full_marks ?? 100));
    }
  }, [rows]);

  // ─── Table Mode Helpers ───
  const getEntry = useCallback(
    (enId: number): LocalEntry => localEntries[enId] ?? { marks: '', fullMarks: defaultFullMarks, absent: false },
    [localEntries, defaultFullMarks],
  );

  const updateEntry = useCallback((enId: number, patch: Partial<LocalEntry>) => {
    setLocalEntries((prev) => ({
      ...prev,
      [enId]: { ...prev[enId], ...patch },
    }));
    setIsDirty(true);
  }, []);

  const toggleAbsent = useCallback(
    (enId: number) => {
      const current = getEntry(enId);
      updateEntry(enId, { absent: !current.absent, marks: !current.absent ? '' : current.marks });
    },
    [getEntry, updateEntry],
  );

  const processedRows = useMemo(() => {
    let list = [...rows];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          (r.student?.name ?? '').toLowerCase().includes(q) ||
          (r.student?.name_bn ?? '').includes(searchTerm) ||
          String(r.roll_no).includes(q),
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'roll') cmp = (a.roll_no ?? 0) - (b.roll_no ?? 0);
      else if (sortBy === 'name') cmp = (a.student?.name ?? '').localeCompare(b.student?.name ?? '');
      else {
        const mA = parseFloat(getEntry(a.student_enrollment_id).marks) || 0;
        const mB = parseFloat(getEntry(b.student_enrollment_id).marks) || 0;
        cmp = mA - mB;
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [rows, searchTerm, sortBy, sortAsc, getEntry]);

  // ─── Stats ───
  const stats = useMemo(() => {
    if (rows.length === 0) return null;
    const entered: number[] = [];
    let absentCount = 0;
    let notEntered = 0;
    rows.forEach((r) => {
      const e = getEntry(r.student_enrollment_id);
      if (e.absent) absentCount++;
      else if (e.marks !== '' && !isNaN(parseFloat(e.marks))) entered.push(parseFloat(e.marks));
      else notEntered++;
    });
    const total = rows.length;
    const filledCount = entered.length;
    const highest = entered.length > 0 ? Math.max(...entered) : 0;
    const lowest = entered.length > 0 ? Math.min(...entered) : 0;
    const average = entered.length > 0 ? entered.reduce((a, b) => a + b, 0) / entered.length : 0;
    const fm = parseInt(defaultFullMarks) || 100;
    const passCount = entered.filter((m) => m >= fm * 0.33).length;
    const failCount = entered.filter((m) => m < fm * 0.33).length;
    const progress = Math.round(((filledCount + absentCount) / total) * 100);
    return {
      total, filledCount, absentCount, notEntered, highest, lowest,
      average: Math.round(average * 100) / 100, passCount, failCount, progress,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, localEntries, getEntry, defaultFullMarks]);

  // ─── Save Mutation (shared) ───
  const saveMutation = useMutation({
    mutationFn: (body: {
      exam_term_id: number;
      subject_id: number;
      marks: { student_enrollment_id: number; marks_obtained: number | null; full_marks: number; absent_code?: string }[];
    }) => api('/marks', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marks'] });
      toast.success(t('savedSuccessfully'));
      setIsDirty(false);
    },
    onError: () => toast.error(t('saveFailed')),
  });

  // ── Table Save ──
  const saveMarks = () => {
    if (!examTermId || !sectionId || !subjectId) return;
    const marks = rows.map((r) => {
      const e = getEntry(r.student_enrollment_id);
      const fm = parseInt(e.fullMarks) || parseInt(defaultFullMarks) || 100;
      if (e.absent) {
        return { student_enrollment_id: r.student_enrollment_id, marks_obtained: null, full_marks: fm, absent_code: 'AB' };
      }
      return { student_enrollment_id: r.student_enrollment_id, marks_obtained: e.marks !== '' ? parseFloat(e.marks) : null, full_marks: fm };
    });
    saveMutation.mutate({ exam_term_id: parseInt(examTermId), subject_id: parseInt(subjectId), marks });
  };

  const resetMarks = () => {
    if (rows.length > 0) {
      const entries: Record<number, LocalEntry> = {};
      rows.forEach((r) => {
        entries[r.student_enrollment_id] = {
          marks: r.marks_obtained !== null ? String(r.marks_obtained) : '',
          fullMarks: String(r.full_marks ?? 100),
          absent: !!r.absent_code,
        };
      });
      setLocalEntries(entries);
      setIsDirty(false);
    }
  };

  const applyFullMarksToAll = () => {
    const fm = defaultFullMarks;
    setLocalEntries((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        updated[parseInt(key)] = { ...updated[parseInt(key)], fullMarks: fm };
      });
      return updated;
    });
    setIsDirty(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent, _enId: number, idx: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRow = processedRows[idx + 1];
      if (nextRow) inputRefs.current[nextRow.student_enrollment_id]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = processedRows[idx - 1];
      if (prevRow) inputRefs.current[prevRow.student_enrollment_id]?.focus();
    }
  };

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(true); }
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) => (
    <ArrowUpDown className={`ml-1 inline h-3.5 w-3.5 ${sortBy === col ? 'text-primary-600' : 'text-slate-300'}`} />
  );

  // ─── Single Entry Logic ───
  const filteredStudentsForSingle = useMemo(() => {
    if (!singleRollSearch.trim() || rows.length === 0) return [];
    const q = singleRollSearch.toLowerCase().trim();
    return rows.filter(
      (r) =>
        String(r.roll_no).includes(q) ||
        (r.student?.name ?? '').toLowerCase().includes(q) ||
        (r.student?.name_bn ?? '').includes(singleRollSearch.trim()),
    ).slice(0, 8);
  }, [rows, singleRollSearch]);

  const selectStudent = (r: MarkRow) => {
    setSelectedStudent(r);
    setSingleRollSearch('');
    setSingleMarks(r.marks_obtained !== null ? String(r.marks_obtained) : '');
    setSingleFullMarks(String(r.full_marks ?? defaultFullMarks));
    setSingleAbsent(!!r.absent_code);
  };

  const saveSingleMark = () => {
    if (!selectedStudent || !examTermId || !subjectId) return;
    const fm = parseInt(singleFullMarks) || parseInt(defaultFullMarks) || 100;
    const marksPayload = singleAbsent
      ? { student_enrollment_id: selectedStudent.student_enrollment_id, marks_obtained: null, full_marks: fm, absent_code: 'AB' }
      : {
          student_enrollment_id: selectedStudent.student_enrollment_id,
          marks_obtained: singleMarks !== '' ? parseFloat(singleMarks) : null,
          full_marks: fm,
        };

    saveMutation.mutate(
      { exam_term_id: parseInt(examTermId), subject_id: parseInt(subjectId), marks: [marksPayload] },
      {
        onSuccess: () => {
          setSingleSaveHistory((prev) => [
            {
              studentName: selectedStudent.student?.name ?? `Roll ${selectedStudent.roll_no}`,
              roll: selectedStudent.roll_no,
              marks: singleAbsent ? null : (singleMarks !== '' ? parseFloat(singleMarks) : null),
              time: new Date().toLocaleTimeString(),
            },
            ...prev,
          ].slice(0, 20));
          setSelectedStudent(null);
          setSingleMarks('');
          setSingleAbsent(false);
          queryClient.invalidateQueries({ queryKey: ['marks'] });
          toast.success(t('savedSuccessfully'));
        },
      },
    );
  };

  // Check for duplicate (already has marks)
  const singleHasExisting = selectedStudent
    ? selectedStudent.marks_obtained !== null || !!selectedStudent.absent_code
    : false;

  // ─── Bulk Upload Logic ───
  const parseCsv = (txt: string) => {
    setBulkParseError('');
    const lines = txt.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) { setBulkParseError('No data found in CSV.'); return; }

    // Detect header
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('roll') || firstLine.includes('name') || firstLine.includes('marks');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    if (dataLines.length === 0) { setBulkParseError('No data rows found after header.'); return; }

    const parsed: BulkRow[] = [];
    const errors: string[] = [];
    const seenRolls = new Set<number>();

    dataLines.forEach((line, idx) => {
      const cols = line.split(/[,\t;]/).map((c) => c.trim());
      // Expect: roll_no, marks (or "AB"), [full_marks]
      if (cols.length < 2) { errors.push(`Row ${idx + 1}: Need at least roll and marks`); return; }
      const roll = parseInt(cols[0]);
      if (isNaN(roll)) { errors.push(`Row ${idx + 1}: Invalid roll "${cols[0]}"`); return; }
      if (seenRolls.has(roll)) { errors.push(`Row ${idx + 1}: Duplicate roll ${roll}`); return; }
      seenRolls.add(roll);

      const isAbsent = cols[1].toUpperCase() === 'AB' || cols[1].toUpperCase() === 'ABSENT';
      const marksVal = isAbsent ? null : parseFloat(cols[1]);
      if (!isAbsent && isNaN(marksVal!)) { errors.push(`Row ${idx + 1}: Invalid marks "${cols[1]}"`); return; }

      const fm = cols[2] ? parseInt(cols[2]) : parseInt(defaultFullMarks) || 100;

      // Match to student
      const match = rows.find((r) => r.roll_no === roll);

      parsed.push({
        roll_no: roll,
        marks: marksVal,
        full_marks: fm,
        absent: isAbsent,
        matched: match,
        error: match ? undefined : `Roll ${roll} not found in this section`,
      });
    });

    if (errors.length > 0) {
      setBulkParseError(errors.join('\n'));
      return;
    }

    setBulkParsedRows(parsed);
    setBulkStep('preview');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setBulkCsvText(text);
      parseCsv(text);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveBulkMarks = () => {
    if (!examTermId || !subjectId) return;
    const validRows = bulkParsedRows.filter((r) => r.matched && !r.error);
    if (validRows.length === 0) { toast.error('No valid rows to save'); return; }

    const marks = validRows.map((r) => {
      if (r.absent) {
        return { student_enrollment_id: r.matched!.student_enrollment_id, marks_obtained: null, full_marks: r.full_marks, absent_code: 'AB' };
      }
      return { student_enrollment_id: r.matched!.student_enrollment_id, marks_obtained: r.marks, full_marks: r.full_marks };
    });

    saveMutation.mutate(
      { exam_term_id: parseInt(examTermId), subject_id: parseInt(subjectId), marks },
      {
        onSuccess: () => {
          setBulkStep('input');
          setBulkCsvText('');
          setBulkParsedRows([]);
          queryClient.invalidateQueries({ queryKey: ['marks'] });
          toast.success(`${validRows.length} mark(s) saved successfully`);
        },
      },
    );
  };

  const downloadTemplate = () => {
    const header = 'roll_no,marks,full_marks';
    const dataRows = rows.map((r) => `${r.roll_no},,${defaultFullMarks}`);
    const csv = [header, ...dataRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'marks_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // Selected labels
  const selectedSection = sectionOptions.find((s) => String(s.id) === sectionId);
  const selectedSubject = subjectOptions.find((s) => String(s.id) === subjectId);
  const selectedTerm = examTerms.find((et) => String(et.id) === examTermId);

  // ─── Mode Config ───
  const modes: { key: InputMode; label: string; desc: string; icon: React.ReactNode }[] = [
    { key: 'single', label: 'Single Student', desc: 'Enter marks for one student at a time', icon: <User className="h-5 w-5" /> },
    { key: 'bulk', label: 'Bulk Upload', desc: 'Upload marks via CSV file or paste data', icon: <Upload className="h-5 w-5" /> },
    { key: 'table', label: 'Table Entry', desc: 'Enter marks for all students in a table', icon: <Table2 className="h-5 w-5" /> },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            <ClipboardList className="mr-2 inline h-6 w-6 text-primary-600" />
            Enter Marks
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Select a class section, exam term, and subject — then choose your preferred input method.
          </p>
        </div>
        {/* Context save button for table mode */}
        {canFetch && rows.length > 0 && inputMode === 'table' && (
          <div className="flex items-center gap-2">
            {isDirty && (
              <button onClick={resetMarks} className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            )}
            <button onClick={saveMarks} disabled={saveMutation.isPending || rows.length === 0} className="btn btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? 'Saving...' : 'Save All Marks'}
            </button>
          </div>
        )}
      </div>

      {/* ─── Selection Panel ─── */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Class & Section</label>
            <select
              value={sectionId}
              onChange={(e) => { setSectionId(e.target.value); setSubjectId(''); setLocalEntries({}); setIsDirty(false); setSelectedStudent(null); setBulkStep('input'); setBulkParsedRows([]); }}
              className="input w-full"
            >
              <option value="">Select class section</option>
              {sectionOptions.map((s) => (
                <option key={s.id} value={s.id}>Class {s.className} — Section {s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Subject</label>
            <select
              value={subjectId}
              onChange={(e) => { setSubjectId(e.target.value); setLocalEntries({}); setIsDirty(false); setSelectedStudent(null); setBulkStep('input'); setBulkParsedRows([]); }}
              className="input w-full"
              disabled={!sectionId}
            >
              <option value="">Select subject</option>
              {subjectOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.name} {s.name_bn ? `(${s.name_bn})` : ''}</option>
              ))}
            </select>
            {sectionId && subjectOptions.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">No subjects assigned for this section.</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Exam Term</label>
            <select
              value={examTermId}
              onChange={(e) => { setExamTermId(e.target.value); setLocalEntries({}); setIsDirty(false); setSelectedStudent(null); setBulkStep('input'); setBulkParsedRows([]); }}
              className="input w-full"
            >
              <option value="">Select exam term</option>
              {examTerms.map((et) => (
                <option key={et.id} value={et.id}>{et.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Marks (default)</label>
            <div className="flex gap-2">
              <input type="number" min={1} value={defaultFullMarks} onChange={(e) => setDefaultFullMarks(e.target.value)} className="input w-full" />
              {canFetch && rows.length > 0 && inputMode === 'table' && (
                <button onClick={applyFullMarksToAll} className="whitespace-nowrap rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200" title="Apply to all">
                  Apply All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Context Banner */}
        {canFetch && selectedSection && selectedSubject && selectedTerm && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-primary-50 px-4 py-2.5 text-sm">
            <span className="font-medium text-primary-700">Class {selectedSection.className} — Section {selectedSection.name}</span>
            <ChevronDown className="h-3 w-3 rotate-[-90deg] text-primary-300" />
            <span className="font-medium text-primary-700">{selectedSubject.name}</span>
            <ChevronDown className="h-3 w-3 rotate-[-90deg] text-primary-300" />
            <span className="font-medium text-primary-700">{selectedTerm.name}</span>
            {rows.length > 0 && <span className="ml-auto text-xs text-primary-500">{rows.length} student(s)</span>}
          </div>
        )}
      </div>

      {/* ─── Input Mode Selector ─── */}
      {canFetch && (
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-slate-700">Result Input Method</label>
          <div className="grid gap-3 sm:grid-cols-3">
            {modes.map((m) => (
              <button
                key={m.key}
                onClick={() => setInputMode(m.key)}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                  inputMode === m.key
                    ? 'border-primary-500 bg-primary-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  inputMode === m.key ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {m.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${inputMode === m.key ? 'text-primary-700' : 'text-slate-700'}`}>
                    {m.label}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{m.desc}</p>
                </div>
                {inputMode === m.key && (
                  <Check className="h-5 w-5 flex-shrink-0 text-primary-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
           MODE 1: SINGLE STUDENT ENTRY
         ════════════════════════════════════ */}
      {canFetch && inputMode === 'single' && (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Entry Form */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                <User className="h-5 w-5 text-primary-600" />
                Single Student Mark Entry
              </h3>

              {isLoading || isFetching ? (
                <div className="space-y-4 py-4">
                  <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
                  <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
                </div>
              ) : rows.length === 0 ? (
                <div className="py-8 text-center">
                  <User className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">No students found in this section.</p>
                </div>
              ) : !selectedStudent ? (
                /* Search / Select Student */
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Search by Roll Number or Name
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={singleRollSearch}
                      onChange={(e) => setSingleRollSearch(e.target.value)}
                      placeholder="Type roll number or student name..."
                      className="input w-full py-2.5 pl-9 text-sm"
                      autoFocus
                    />
                  </div>

                  {/* Search Results */}
                  {singleRollSearch.trim() && (
                    <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200">
                      {filteredStudentsForSingle.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-slate-400">No students found</div>
                      ) : (
                        filteredStudentsForSingle.map((r) => {
                          const hasExisting = r.marks_obtained !== null || !!r.absent_code;
                          return (
                            <button
                              key={r.student_enrollment_id}
                              onClick={() => selectStudent(r)}
                              className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 last:border-0"
                            >
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                                {r.roll_no}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800">{r.student?.name ?? '—'}</p>
                                {r.student?.name_bn && <p className="text-xs text-slate-400">{r.student.name_bn}</p>}
                              </div>
                              {hasExisting ? (
                                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                  <AlertTriangle className="h-3 w-3" />
                                  {r.absent_code ? 'Absent' : `${r.marks_obtained}/${r.full_marks}`}
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                  Not entered
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Quick hint */}
                  {!singleRollSearch.trim() && (
                    <div className="mt-6 rounded-xl bg-slate-50 p-4 text-center">
                      <Search className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-2 text-sm text-slate-500">
                        Start typing a roll number or name to find a student.
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        You can also click any student below to select them.
                      </p>
                      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                        {rows.slice(0, 12).map((r) => (
                          <button
                            key={r.student_enrollment_id}
                            onClick={() => selectStudent(r)}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition hover:bg-white ${
                              r.marks_obtained !== null || r.absent_code
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-600'
                            }`}
                          >
                            <span className="font-bold">{r.roll_no}</span>
                            {(r.marks_obtained !== null || r.absent_code) && <Check className="h-3 w-3" />}
                          </button>
                        ))}
                        {rows.length > 12 && (
                          <span className="px-2 py-1 text-xs text-slate-400">+{rows.length - 12} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Student Selected — Enter Mark */
                <div>
                  {/* Student Info */}
                  <div className="mb-5 flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-lg font-bold text-primary-700">
                      {selectedStudent.roll_no}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{selectedStudent.student?.name ?? '—'}</p>
                      {selectedStudent.student?.name_bn && (
                        <p className="text-sm text-slate-500">{selectedStudent.student.name_bn}</p>
                      )}
                      <p className="text-xs text-slate-400">Roll #{selectedStudent.roll_no}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedStudent(null); setSingleMarks(''); setSingleAbsent(false); }}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                      title="Change student"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Duplicate Warning */}
                  {singleHasExisting && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">Existing marks found</p>
                        <p className="text-xs text-amber-600">
                          This student already has{' '}
                          {selectedStudent.absent_code
                            ? 'an absent mark'
                            : `${selectedStudent.marks_obtained}/${selectedStudent.full_marks} marks`}{' '}
                          recorded. Saving will <span className="font-bold">update</span> the existing entry.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Mark Entry */}
                  <div className="space-y-4">
                    {/* Absent toggle */}
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Mark as Absent</p>
                        <p className="text-xs text-slate-400">If absent, marks won&apos;t be recorded</p>
                      </div>
                      <button
                        onClick={() => { setSingleAbsent(!singleAbsent); if (!singleAbsent) setSingleMarks(''); }}
                        className={`relative h-7 w-12 rounded-full transition ${singleAbsent ? 'bg-red-500' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${singleAbsent ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                    </div>

                    {!singleAbsent && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">Marks Obtained</label>
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={singleMarks}
                            onChange={(e) => setSingleMarks(e.target.value)}
                            className="input w-full py-3 text-center text-lg font-bold"
                            placeholder="Enter marks"
                            autoFocus
                          />
                          {singleMarks && parseFloat(singleMarks) > (parseInt(singleFullMarks) || 100) && (
                            <p className="mt-1 text-xs font-medium text-amber-600">Exceeds full marks!</p>
                          )}
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Marks</label>
                          <input
                            type="number"
                            min={1}
                            value={singleFullMarks}
                            onChange={(e) => setSingleFullMarks(e.target.value)}
                            className="input w-full py-3 text-center text-lg"
                          />
                        </div>
                      </div>
                    )}

                    {/* Percentage preview */}
                    {!singleAbsent && singleMarks && !isNaN(parseFloat(singleMarks)) && (
                      <div className="rounded-xl bg-slate-50 p-3 text-center">
                        {(() => {
                          const p = Math.round((parseFloat(singleMarks) / (parseInt(singleFullMarks) || 100)) * 100);
                          const color = p >= 80 ? 'emerald' : p >= 60 ? 'blue' : p >= 33 ? 'amber' : 'red';
                          return (
                            <span className={`text-2xl font-bold text-${color}-600`}>{p}%</span>
                          );
                        })()}
                      </div>
                    )}

                    {singleAbsent && (
                      <div className="rounded-xl bg-red-50 p-4 text-center">
                        <UserX className="mx-auto h-8 w-8 text-red-400" />
                        <p className="mt-1 text-sm font-medium text-red-600">Student will be marked as Absent</p>
                      </div>
                    )}

                    {/* Save */}
                    <button
                      onClick={saveSingleMark}
                      disabled={saveMutation.isPending || (!singleAbsent && singleMarks === '')}
                      className="btn btn-primary flex w-full items-center justify-center gap-2 py-3"
                    >
                      <Save className="h-4 w-4" />
                      {saveMutation.isPending ? 'Saving...' : singleHasExisting ? 'Update Mark' : 'Save Mark'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Save History Side Panel */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Recent Entries This Session
              </h4>
              {singleSaveHistory.length === 0 ? (
                <div className="py-6 text-center">
                  <ClipboardList className="mx-auto h-10 w-10 text-slate-200" />
                  <p className="mt-2 text-xs text-slate-400">Saved marks will appear here.</p>
                </div>
              ) : (
                <div className="max-h-[400px] space-y-2 overflow-y-auto">
                  {singleSaveHistory.map((h, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700">
                        {h.roll}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-slate-700">{h.studentName}</p>
                        <p className="text-[10px] text-slate-400">{h.time}</p>
                      </div>
                      {h.marks !== null ? (
                        <span className="font-semibold text-slate-700">{h.marks}</span>
                      ) : (
                        <span className="text-xs font-semibold text-red-500">AB</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Summary */}
              {rows.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-xs font-medium text-slate-500">Section Progress</p>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-semibold text-emerald-600">
                      {rows.filter((r) => r.marks_obtained !== null || r.absent_code).length}
                    </span>
                    / {rows.length} entered
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${Math.round((rows.filter((r) => r.marks_obtained !== null || r.absent_code).length / rows.length) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
           MODE 2: BULK UPLOAD
         ════════════════════════════════════ */}
      {canFetch && inputMode === 'bulk' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <Upload className="h-5 w-5 text-primary-600" />
              Bulk Result Upload
            </h3>
            <p className="mt-1 text-sm text-slate-500">Upload a CSV file or paste mark data to save multiple results at once.</p>
          </div>

          {isLoading || isFetching ? (
            <div className="space-y-4 p-6">
              <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center">
              <Upload className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">No students found in this section.</p>
            </div>
          ) : bulkStep === 'input' ? (
            <div className="p-6">
              {/* Format info */}
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">CSV Format</p>
                  <p className="mt-0.5 text-xs text-blue-600">
                    Each row: <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px]">roll_no, marks, full_marks(optional)</code>
                    <br />
                    Use <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px]">AB</code> or <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px]">ABSENT</code> for absent students.
                    Duplicate roll numbers are not allowed.
                  </p>
                  <p className="mt-1 text-[10px] text-blue-500">Example: 1, 85, 100</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* File upload */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Upload CSV File</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-10 transition hover:border-primary-400 hover:bg-primary-50"
                  >
                    <FileSpreadsheet className="h-10 w-10 text-slate-400" />
                    <p className="mt-2 text-sm font-medium text-slate-600">Click to browse or drag & drop</p>
                    <p className="text-xs text-slate-400">.csv, .txt files supported</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button onClick={downloadTemplate} className="mt-3 flex items-center gap-1.5 text-sm text-primary-600 hover:underline">
                    <Download className="h-3.5 w-3.5" /> Download template with roll numbers
                  </button>
                </div>

                {/* Paste CSV */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Or Paste Data</label>
                  <textarea
                    value={bulkCsvText}
                    onChange={(e) => { setBulkCsvText(e.target.value); setBulkParseError(''); }}
                    placeholder={`roll_no, marks, full_marks\n1, 85, 100\n2, 78, 100\n3, AB\n...`}
                    className="input h-48 w-full resize-none font-mono text-sm"
                  />
                  <button
                    onClick={() => parseCsv(bulkCsvText)}
                    disabled={!bulkCsvText.trim()}
                    className="btn btn-primary mt-3 w-full"
                  >
                    Parse & Preview
                  </button>
                </div>
              </div>

              {/* Parse Errors */}
              {bulkParseError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                    <AlertCircle className="h-4 w-4" /> Parse Errors
                  </div>
                  <pre className="mt-1 whitespace-pre-wrap text-xs text-red-600">{bulkParseError}</pre>
                </div>
              )}
            </div>
          ) : (
            /* Preview Step */
            <div className="p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700">Preview — {bulkParsedRows.length} rows parsed</h4>
                  <p className="text-xs text-slate-400">
                    {bulkParsedRows.filter((r) => r.matched && !r.error).length} valid ·{' '}
                    {bulkParsedRows.filter((r) => r.error).length} with errors
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setBulkStep('input'); setBulkParsedRows([]); }} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
                    Back to Edit
                  </button>
                  <button
                    onClick={saveBulkMarks}
                    disabled={saveMutation.isPending || bulkParsedRows.filter((r) => r.matched && !r.error).length === 0}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saveMutation.isPending ? 'Saving...' : `Save ${bulkParsedRows.filter((r) => r.matched && !r.error).length} Mark(s)`}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">Roll</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">Student</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase text-slate-500">Marks</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase text-slate-500">Full</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bulkParsedRows.map((r, i) => {
                      const hasOld = r.matched && (r.matched.marks_obtained !== null || r.matched.absent_code);
                      return (
                        <tr key={i} className={r.error ? 'bg-red-50' : hasOld ? 'bg-amber-50/40' : ''}>
                          <td className="px-4 py-2.5">
                            {r.error ? (
                              <X className="h-4 w-4 text-red-500" />
                            ) : hasOld ? (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            ) : (
                              <Check className="h-4 w-4 text-emerald-500" />
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-sm">{r.roll_no}</td>
                          <td className="px-4 py-2.5 text-sm">{r.matched?.student?.name ?? '—'}</td>
                          <td className="px-4 py-2.5 text-center text-sm font-medium">
                            {r.absent ? <span className="text-red-600">AB</span> : r.marks ?? '—'}
                          </td>
                          <td className="px-4 py-2.5 text-center text-sm">{r.full_marks}</td>
                          <td className="px-4 py-2.5 text-xs">
                            {r.error ? (
                              <span className="text-red-600">{r.error}</span>
                            ) : hasOld ? (
                              <span className="text-amber-600">
                                Will update ({r.matched!.absent_code ? 'AB' : r.matched!.marks_obtained} → {r.absent ? 'AB' : r.marks})
                              </span>
                            ) : (
                              <span className="text-emerald-600">New entry</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════
           MODE 3: TABLE ENTRY (existing)
         ════════════════════════════════════ */}
      {canFetch && inputMode === 'table' && (
        <>
          {/* Stats Panel */}
          {stats && showStats && (
            <div className="mb-6">
              <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Entry Progress</span>
                  <span className="text-sm font-semibold text-primary-700">{stats.progress}%</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${stats.progress === 100 ? 'bg-emerald-500' : 'bg-primary-500'}`}
                    style={{ width: `${stats.progress}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{stats.filledCount} entered</span>
                  <span className="flex items-center gap-1"><UserX className="h-3.5 w-3.5 text-red-400" />{stats.absentCount} absent</span>
                  <span className="flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5 text-amber-400" />{stats.notEntered} remaining</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { label: 'Total', val: stats.total, color: 'text-slate-700' },
                  { label: 'Highest', val: stats.highest, color: 'text-emerald-600' },
                  { label: 'Lowest', val: stats.lowest, color: 'text-red-500' },
                  { label: 'Average', val: stats.average, color: 'text-blue-600' },
                  { label: 'Pass', val: stats.passCount, color: 'text-emerald-600' },
                  { label: 'Fail', val: stats.failCount, color: 'text-red-500' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                    <p className="text-xs text-slate-500">{s.label}</p>
                    <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Table Toolbar */}
            {rows.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name or roll..." className="input w-full pl-9 text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowStats(!showStats)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${showStats ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}`}
                  >
                    <BarChart3 className="h-3.5 w-3.5" /> Statistics
                  </button>
                </div>
              </div>
            )}

            {isLoading || isFetching ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-5 w-12 animate-pulse rounded bg-slate-100" />
                    <div className="h-5 flex-1 animate-pulse rounded bg-slate-100" />
                    <div className="h-8 w-24 animate-pulse rounded bg-slate-100" />
                    <div className="h-8 w-16 animate-pulse rounded bg-slate-100" />
                    <div className="h-8 w-16 animate-pulse rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center py-16">
                <ClipboardList className="h-16 w-16 text-slate-300" />
                <h3 className="mt-4 text-lg font-semibold text-slate-600">No Students Found</h3>
                <p className="mt-1 max-w-sm text-center text-sm text-slate-400">No students enrolled in this section.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="w-12 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">#</th>
                      <th className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700" onClick={() => toggleSort('roll')}>
                        Roll <SortIcon col="roll" />
                      </th>
                      <th className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700" onClick={() => toggleSort('name')}>
                        Student Name <SortIcon col="name" />
                      </th>
                      <th className="cursor-pointer px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700" onClick={() => toggleSort('marks')}>
                        Marks Obtained <SortIcon col="marks" />
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Full Marks</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Absent</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {processedRows.map((r, idx) => {
                      const e = getEntry(r.student_enrollment_id);
                      const fm = parseInt(e.fullMarks) || parseInt(defaultFullMarks) || 100;
                      const marksVal = parseFloat(e.marks);
                      const hasMarks = e.marks !== '' && !isNaN(marksVal);
                      const pct = hasMarks ? Math.round((marksVal / fm) * 100) : null;
                      const isOver = hasMarks && marksVal > fm;
                      let rowBg = '';
                      if (e.absent) rowBg = 'bg-red-50/50';
                      else if (isOver) rowBg = 'bg-amber-50/50';
                      else if (hasMarks && pct !== null && pct < 33) rowBg = 'bg-red-50/30';
                      else if (hasMarks) rowBg = 'bg-emerald-50/30';
                      return (
                        <tr key={r.student_enrollment_id} className={`transition-colors ${rowBg}`}>
                          <td className="px-5 py-3 text-sm text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">{r.roll_no}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-800">{r.student?.name ?? '—'}</p>
                            {r.student?.name_bn && <p className="text-xs text-slate-400">{r.student.name_bn}</p>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              ref={(el) => { inputRefs.current[r.student_enrollment_id] = el; }}
                              type="number" min={0} step={0.5} value={e.marks} disabled={e.absent}
                              onChange={(ev) => updateEntry(r.student_enrollment_id, { marks: ev.target.value })}
                              onKeyDown={(ev) => handleKeyDown(ev, r.student_enrollment_id, idx)}
                              className={`input mx-auto w-24 py-1.5 text-center text-sm font-medium ${
                                e.absent ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                                : isOver ? 'border-amber-300 bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                : hasMarks && pct !== null && pct < 33 ? 'border-red-200 text-red-600' : ''
                              }`}
                              placeholder="—"
                            />
                            {isOver && <p className="mt-0.5 text-[10px] font-medium text-amber-600">Exceeds full marks!</p>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input type="number" min={1} value={e.fullMarks} onChange={(ev) => updateEntry(r.student_enrollment_id, { fullMarks: ev.target.value })} className="input mx-auto w-20 py-1.5 text-center text-sm" />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => toggleAbsent(r.student_enrollment_id)}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold transition ${
                                e.absent ? 'bg-red-100 text-red-600 ring-2 ring-red-200' : 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-400'
                              }`}
                              title={e.absent ? 'Mark as present' : 'Mark as absent'}
                            >
                              {e.absent ? 'AB' : '—'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {e.absent ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600"><UserX className="h-3 w-3" /> AB</span>
                            ) : pct !== null ? (
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                pct >= 80 ? 'bg-emerald-100 text-emerald-700' : pct >= 60 ? 'bg-blue-100 text-blue-700' : pct >= 33 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
                              }`}>{pct}%</span>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Save Bar */}
            {rows.length > 0 && (
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-5 py-3">
                <div className="text-sm text-slate-500">
                  {processedRows.length} student(s) shown
                  {searchTerm && ` (filtered from ${rows.length})`}
                </div>
                <div className="flex items-center gap-3">
                  {isDirty && (
                    <span className="flex items-center gap-1.5 text-xs text-amber-600">
                      <AlertCircle className="h-3.5 w-3.5" /> Unsaved changes
                    </span>
                  )}
                  <button onClick={saveMarks} disabled={saveMutation.isPending || rows.length === 0} className="btn btn-primary flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {saveMutation.isPending ? 'Saving...' : 'Save All Marks'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── Empty state when nothing selected ─── */}
      {!canFetch && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white py-16">
          <ClipboardList className="h-16 w-16 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-600">Select to Begin</h3>
          <p className="mt-1 max-w-md text-center text-sm text-slate-400">
            Choose a class section, subject, and exam term from the filters above to load the student
            list and start entering marks.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1.5"><User className="mr-1 inline h-3 w-3" /> Single entry for quick input</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5"><Upload className="mr-1 inline h-3 w-3" /> Bulk CSV upload</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5"><Table2 className="mr-1 inline h-3 w-3" /> Full table entry</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeacherMarksPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    }>
      <TeacherMarksContent />
    </Suspense>
  );
}
