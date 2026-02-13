'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { downloadCSV, downloadPDF } from '@/lib/export';
import { FileText, FileDown, Save } from 'lucide-react';

type ClassItem = { id: number; name: string; sections?: { id: number; name: string; class_id: number }[] };
type Section = { id: number; name: string };
type EnrollmentRow = { student_enrollment_id: number; student: { id: number; name: string }; roll_no: number; status: string | null; remark?: string };
type ReportRow = { date: string; present: number; absent: number; leave: number; total_marked: number };

export default function AttendancePage() {
  const t = useTranslations('common');
  const tNav = useTranslations('nav');
  const tReports = useTranslations('reports');
  const tAtt = useTranslations('attendance');
  const [sectionId, setSectionId] = useState<number | ''>('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportFrom, setReportFrom] = useState(() => new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  const [reportTo, setReportTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportData, setReportData] = useState<ReportRow[] | null>(null);
  const queryClient = useQueryClient();

  const { data: classesData } = useQuery({ queryKey: ['classes'], queryFn: () => api<{ data: ClassItem[] }>('/classes') });
  const classes = (classesData as { data?: ClassItem[] })?.data ?? [];
  const sections = classes.flatMap((c) => (c.sections ?? []).map((s) => ({ ...s, classId: c.id, className: c.name })));

  const { data: attData, isLoading } = useQuery({
    queryKey: ['attendance', sectionId, date],
    queryFn: () => api<{ data: EnrollmentRow[] }>(`/attendance?section_id=${sectionId}&date=${date}`),
    enabled: !!sectionId && !!date,
  });
  const rows = (attData as { data?: EnrollmentRow[] })?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: (body: { section_id: number; date: string; attendances: { student_enrollment_id: number; status: string; remark?: string }[] }) =>
      api('/attendance', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); toast.success(t('savedSuccessfully')); },
    onError: () => toast.error(t('saveFailed')),
  });

  const [localStatus, setLocalStatus] = useState<Record<number, string>>({});
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

  const fetchReport = async () => {
    const res = await api<{ data: ReportRow[] }>(`/attendance/report?from_date=${reportFrom}&to_date=${reportTo}${sectionId ? `&section_id=${sectionId}` : ''}`);
    const d = (res as { data?: ReportRow[] })?.data;
    setReportData(Array.isArray(d) ? d : []);
    if (res.success) toast.success(`${tReports('attendanceReport')}${tReports('ready')}`);
    else toast.error(t('saveFailed'));
  };

  const reportCols = [
    { key: 'date' as const, label: tAtt('date') },
    { key: 'present' as const, label: tAtt('present') },
    { key: 'absent' as const, label: tAtt('absent') },
    { key: 'leave' as const, label: tAtt('leave') },
  ];
  const exportReport = () => {
    if (!reportData?.length) return;
    downloadPDF(tReports('attendanceReport'), reportCols, reportData);
  };
  const exportReportCsv = () => {
    if (!reportData?.length) return;
    downloadCSV('attendance_report.csv', reportData, reportCols);
  };

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-slate-800">{tNav('attendance')}</h2>

      <div className="card-accent mb-6">
        <h3 className="font-semibold text-slate-800">{tAtt('markAttendance')}</h3>
        <div className="mt-4 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">{tReports('section')}</label>
            <select value={sectionId} onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : '')} className="input mt-1 min-w-[180px]">
              <option value="">{tAtt('selectSection')}</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{tAtt('classPrefix')}{s.className} - {s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">{tAtt('date')}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input mt-1" />
          </div>
        </div>
        {sectionId && (
          <div className="mt-4">
            <button type="button" onClick={saveAttendance} disabled={saveMutation.isPending || !rows.length} className="btn btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" /> {t('save')}
            </button>
          </div>
        )}
      </div>

      {sectionId && date && (
        <div className="card overflow-hidden p-0 mb-6">
          {isLoading ? (
            <p className="p-4 text-slate-500">{t('loading')}</p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-slate-500">{t('noData')} ({tAtt('noEnrollments')})</p>
          ) : (
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">{tAtt('roll')}</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">{t('name')}</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">{tAtt('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((r) => (
                  <tr key={r.student_enrollment_id} className="table-row-hover">
                    <td className="px-4 py-3">{r.roll_no}</td>
                    <td className="px-4 py-3">{r.student?.name}</td>
                    <td className="px-4 py-3">
                      <select value={getStatus(r.student_enrollment_id)} onChange={(e) => setStatus(r.student_enrollment_id, e.target.value)} className="input py-1 text-sm">
                        <option value="present">{tAtt('present')}</option>
                        <option value="absent">{tAtt('absent')}</option>
                        <option value="late">{tAtt('late')}</option>
                        <option value="leave">{tAtt('leave')}</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-slate-800">{t('report')}: {tReports('attendanceReport')}</h3>
        <div className="mt-4 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">{tReports('fromDate')}</label>
            <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="input mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">{tReports('toDate')}</label>
            <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="input mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">{tReports('section')}</label>
            <select value={sectionId} onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : '')} className="input mt-1 min-w-[180px]">
              <option value="">{tAtt('all')}</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{tAtt('classPrefix')}{s.className} - {s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" onClick={fetchReport} className="btn btn-primary">{tReports('generate')}</button>
          </div>
        </div>
        {reportData && (
          <div className="mt-4">
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={exportReport} className="btn flex items-center gap-2"><FileText className="h-4 w-4" /> {t('exportPdf')}</button>
              <button type="button" onClick={exportReportCsv} className="btn flex items-center gap-2"><FileDown className="h-4 w-4" /> {t('exportCsv')}</button>
            </div>
            <table className="w-full border border-slate-200">
              <thead className="table-header">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">{tAtt('date')}</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">{tAtt('present')}</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">{tAtt('absent')}</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">{tAtt('leave')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reportData.map((r) => (
                  <tr key={r.date} className="table-row-hover">
                    <td className="px-4 py-2">{r.date}</td>
                    <td className="px-4 py-2">{r.present}</td>
                    <td className="px-4 py-2">{r.absent}</td>
                    <td className="px-4 py-2">{r.leave}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
