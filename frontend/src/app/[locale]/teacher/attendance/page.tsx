'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Save } from 'lucide-react';

type ClassItem = { id: number; name: string; sections?: { id: number; name: string }[] };
type EnrollmentRow = { student_enrollment_id: number; student?: { name: string }; roll_no: number; status: string | null };

function TeacherAttendanceContent() {
  const t = useTranslations('common');
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [sectionId, setSectionId] = useState<string>(searchParams.get('section_id') || '');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [localStatus, setLocalStatus] = useState<Record<number, string>>({});

  const { data: classesData } = useQuery({ queryKey: ['classes'], queryFn: () => api<{ data: ClassItem[] }>('/classes') });
  const classes = (classesData as { data?: ClassItem[] })?.data ?? [];
  const sections = classes.flatMap((c) => (c.sections ?? []).map((s) => ({ ...s, className: c.name })));

  const { data: attData, isLoading } = useQuery({
    queryKey: ['attendance', sectionId, date],
    queryFn: () => api<{ data: EnrollmentRow[] }>(`/attendance?section_id=${sectionId}&date=${date}`),
    enabled: !!sectionId && !!date,
  });
  const rows = (attData as { data?: EnrollmentRow[] })?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: (body: { section_id: number; date: string; attendances: { student_enrollment_id: number; status: string }[] }) =>
      api('/attendance', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance'] }); toast.success(t('savedSuccessfully')); },
    onError: () => toast.error(t('saveFailed')),
  });

  const getStatus = (enId: number) => localStatus[enId] ?? rows.find((r) => r.student_enrollment_id === enId)?.status ?? 'present';
  const setStatus = (enId: number, status: string) => setLocalStatus((s) => ({ ...s, [enId]: status }));

  const saveAttendance = () => {
    if (!sectionId || !date) return;
    saveMutation.mutate({
      section_id: Number(sectionId),
      date,
      attendances: rows.map((r) => ({ student_enrollment_id: r.student_enrollment_id, status: getStatus(r.student_enrollment_id) })),
    });
  };

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-slate-800">Mark attendance</h2>
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Section</label>
            <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="input mt-1 min-w-[200px]">
              <option value="">Select section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>Class {s.className} - {s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input mt-1" />
          </div>
          {sectionId && (
            <div className="flex items-end">
              <button type="button" onClick={saveAttendance} disabled={saveMutation.isPending || !rows.length} className="btn btn-primary flex items-center gap-2">
                <Save className="h-4 w-4" /> Save
              </button>
            </div>
          )}
        </div>
      </div>
      {sectionId && date && (
        <div className="card overflow-hidden p-0">
          {isLoading ? (
            <p className="p-4 text-slate-500">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-slate-500">No enrollments in this section for current session.</p>
          ) : (
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Roll</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((r) => (
                  <tr key={r.student_enrollment_id}>
                    <td className="px-4 py-3">{r.roll_no}</td>
                    <td className="px-4 py-3">{r.student?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <select value={getStatus(r.student_enrollment_id)} onChange={(e) => setStatus(r.student_enrollment_id, e.target.value)} className="input py-1 text-sm">
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                        <option value="leave">Leave</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default function TeacherAttendancePage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading...</p>}>
      <TeacherAttendanceContent />
    </Suspense>
  );
}
