'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { downloadCSV, downloadPDF } from '@/lib/export';
import { Plus, Pencil, Trash2, FileText, FileDown, Search } from 'lucide-react';

type Guardian = {
  id?: number;
  name: string;
  name_bn?: string;
  relation: string;
  phone: string;
  email?: string;
  nid?: string;
  address?: string;
  occupation?: string;
};

type Student = {
  id: number;
  student_id: string;
  name: string;
  name_bn: string | null;
  date_of_birth: string | null;
  gender: string | null;
  birth_reg_no: string | null;
  nid: string | null;
  address: string | null;
  blood_group: string | null;
  status: string;
  admission_date: string | null;
  guardians?: Guardian[];
};

function getStudentsList(res: unknown): Student[] {
  const d = (res as { data?: Student[] | { data?: Student[] } })?.data;
  return Array.isArray(d) ? d : (d as { data?: Student[] })?.data ?? [];
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GUARDIAN_RELATIONS = ['father', 'mother', 'guardian', 'other'];

const emptyGuardian: Guardian = { name: '', relation: 'father', phone: '' };

export default function StudentsPage() {
  const t = useTranslations('common');
  const tNav = useTranslations('nav');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState({
    student_id: '',
    name: '',
    name_bn: '',
    date_of_birth: '',
    gender: '',
    birth_reg_no: '',
    nid: '',
    address: '',
    blood_group: '',
    admission_date: '',
    status: 'active',
    guardians: [{ ...emptyGuardian }] as Guardian[],
  });
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterSectionId, setFilterSectionId] = useState<string>('');
  const [filterSessionId, setFilterSessionId] = useState<string>('');

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set('per_page', '100');
    if (search.trim()) p.set('search', search.trim());
    if (filterStatus) p.set('status', filterStatus);
    if (filterGender) p.set('gender', filterGender);
    if (filterSectionId && filterSessionId) {
      p.set('section_id', filterSectionId);
      p.set('academic_session_id', filterSessionId);
    }
    return p.toString();
  }, [search, filterStatus, filterGender, filterSectionId, filterSessionId]);

  const { data, isLoading } = useQuery({
    queryKey: ['students', queryParams],
    queryFn: () => api<{ data: Student[] }>(`/students?${queryParams}`),
  });
  const students = getStudentsList(data?.data ?? data);

  const { data: sessionsData } = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: () => api<{ data?: { data?: { id: number; name: string }[] } }>('/academic-sessions?per_page=100'),
  });
  const sessionsPayload = (sessionsData as { data?: unknown })?.data;
  const sessionsList = Array.isArray(sessionsPayload)
    ? (sessionsPayload as { id: number; name: string }[])
    : ((sessionsPayload as { data?: { id: number; name: string }[] })?.data ?? []);

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api<{ data?: { id: number; name: string; sections?: { id: number; name: string }[] }[] }>('/classes'),
  });
  const classesList = (classesData as { data?: { data?: { id: number; name: string; sections?: { id: number; name: string }[] }[] } })?.data?.data ?? [];
  const sectionsList = useMemo(() => classesList.flatMap((c) => (c.sections ?? []).map((s) => ({ ...s, className: c.name }))), [classesList]);

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api('/students', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['students'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); toast.success(t('savedSuccessfully')); setModalOpen(false); },
    onError: () => toast.error(t('saveFailed')),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) =>
      api(`/students/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['students'] }); toast.success(t('savedSuccessfully')); setModalOpen(false); setEditing(null); },
    onError: () => toast.error(t('saveFailed')),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/students/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['students'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); toast.success(t('deletedSuccessfully')); },
    onError: () => toast.error(t('deleteFailed')),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      student_id: '',
      name: '',
      name_bn: '',
      date_of_birth: '',
      gender: '',
      birth_reg_no: '',
      nid: '',
      address: '',
      blood_group: '',
      admission_date: new Date().toISOString().slice(0, 10),
      status: 'active',
      guardians: [{ ...emptyGuardian }],
    });
    setModalOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    const guardians = (s.guardians && s.guardians.length > 0)
      ? s.guardians.map((g) => ({ name: g.name, name_bn: g.name_bn ?? '', relation: g.relation, phone: g.phone, email: g.email ?? '', nid: g.nid ?? '', address: g.address ?? '', occupation: g.occupation ?? '' }))
      : [{ ...emptyGuardian }];
    setForm({
      student_id: s.student_id,
      name: s.name,
      name_bn: s.name_bn ?? '',
      date_of_birth: s.date_of_birth ?? '',
      gender: s.gender ?? '',
      birth_reg_no: s.birth_reg_no ?? '',
      nid: s.nid ?? '',
      address: s.address ?? '',
      blood_group: s.blood_group ?? '',
      admission_date: s.admission_date ?? '',
      status: s.status,
      guardians,
    });
    setModalOpen(true);
  };

  const setStudentField = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));
  const setGuardianField = (index: number, field: keyof Guardian, value: string) => {
    setForm((f) => {
      const g = [...f.guardians];
      g[index] = { ...g[index], [field]: value };
      return { ...f, guardians: g };
    });
  };
  const addGuardian = () => setForm((f) => ({ ...f, guardians: [...f.guardians, { ...emptyGuardian }] }));
  const removeGuardian = (index: number) => {
    if (form.guardians.length <= 1) return;
    setForm((f) => ({ ...f, guardians: f.guardians.filter((_, i) => i !== index) }));
  };

  const submit = () => {
    const payload = {
      institution_id: 1,
      student_id: form.student_id || undefined,
      name: form.name,
      name_bn: form.name_bn || undefined,
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      birth_reg_no: form.birth_reg_no || undefined,
      nid: form.nid || undefined,
      address: form.address || undefined,
      blood_group: form.blood_group || undefined,
      admission_date: form.admission_date,
      status: form.status,
      guardians: form.guardians.map((g) => ({
        name: g.name,
        name_bn: g.name_bn || undefined,
        relation: g.relation,
        phone: g.phone,
        email: g.email || undefined,
        nid: g.nid || undefined,
        address: g.address || undefined,
        occupation: g.occupation || undefined,
      })),
    };
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        student_id: form.student_id,
        name: form.name,
        name_bn: form.name_bn || undefined,
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        birth_reg_no: form.birth_reg_no || undefined,
        nid: form.nid || undefined,
        address: form.address || undefined,
        blood_group: form.blood_group || undefined,
        admission_date: form.admission_date || undefined,
        status: form.status,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const canSubmit = editing
    ? !!form.name
    : !!form.name && !!form.date_of_birth && !!form.gender && !!form.admission_date &&
      form.guardians.length >= 1 && form.guardians.every((g) => g.name && g.relation && g.phone);

  const cols = [
    { key: 'student_id' as const, label: 'Student ID' },
    { key: 'name' as const, label: t('name') },
    { key: 'status' as const, label: 'Status' },
  ];
  const rows = students.map((s) => ({ student_id: s.student_id, name: s.name_bn || s.name, status: s.status }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">{tNav('students')}</h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => downloadPDF(tNav('students'), cols, rows)} className="btn flex items-center gap-2">
            <FileText className="h-4 w-4" /> {t('exportPdf')}
          </button>
          <button type="button" onClick={() => downloadCSV('students.csv', rows, cols)} className="btn flex items-center gap-2">
            <FileDown className="h-4 w-4" /> {t('exportCsv')}
          </button>
          <button type="button" onClick={openAdd} className="btn btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> {t('add')} {tNav('students')}
          </button>
        </div>
      </div>

      <div className="card-accent mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="block text-sm font-medium text-slate-700">{t('search')} (Name / Student ID)</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type name or student ID..."
                className="input w-full pl-9"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input mt-1 w-40">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="passed_out">Passed out</option>
              <option value="transferred">Transferred</option>
              <option value="dropped">Dropped</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Gender</label>
            <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} className="input mt-1 w-32">
              <option value="">All</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Session</label>
            <select value={filterSessionId} onChange={(e) => setFilterSessionId(e.target.value)} className="input mt-1 w-36">
              <option value="">All</option>
              {sessionsList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Section</label>
            <select value={filterSectionId} onChange={(e) => setFilterSectionId(e.target.value)} className="input mt-1 w-44">
              <option value="">All</option>
              {sectionsList.map((s) => (
                <option key={s.id} value={s.id}>Class {s.className} - {s.name}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterGender(''); setFilterSectionId(''); setFilterSessionId(''); }}
            className="btn mt-1"
          >
            Clear filters
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-slate-500">{t('loading')}</p>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Student ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">{t('name')}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">DOB</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Gender</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Admission</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">{t('noData')}</td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="table-row-hover">
                    <td className="px-4 py-3 font-mono text-sm font-medium">{s.student_id}</td>
                    <td className="px-4 py-3">{s.name_bn || s.name}</td>
                    <td className="px-4 py-3 text-sm">{s.date_of_birth ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">{s.gender ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">{s.admission_date ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => openEdit(s)} className="mr-2 text-slate-600 hover:text-primary-600"><Pencil className="h-4 w-4 inline" /></button>
                      <button type="button" onClick={() => confirm(t('delete')) && deleteMutation.mutate(s.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4 inline" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800">{editing ? t('edit') : 'Register'} {tNav('students')}</h3>
            <p className="mt-1 text-sm text-slate-500">Student ID is the primary identifier. Leave blank on add to auto-generate.</p>

            <div className="mt-6 space-y-6">
              {/* Student ID (primary identifier) */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Student ID (primary key)</label>
                <input
                  type="text"
                  value={form.student_id}
                  onChange={(e) => setStudentField('student_id', e.target.value)}
                  className="input mt-1 w-full"
                  placeholder={editing ? undefined : "Auto-generated if left blank"}
                  readOnly={!!editing}
                />
              </div>

              {/* Personal information */}
              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="font-medium text-slate-800">Personal information</h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">{t('name')} *</label>
                    <input type="text" value={form.name} onChange={(e) => setStudentField('name', e.target.value)} className="input mt-1 w-full" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Name (Bangla)</label>
                    <input type="text" value={form.name_bn} onChange={(e) => setStudentField('name_bn', e.target.value)} className="input mt-1 w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Date of birth *</label>
                    <input type="date" value={form.date_of_birth} onChange={(e) => setStudentField('date_of_birth', e.target.value)} className="input mt-1 w-full" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Gender *</label>
                    <select value={form.gender} onChange={(e) => setStudentField('gender', e.target.value)} className="input mt-1 w-full" required>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Birth registration no.</label>
                    <input type="text" value={form.birth_reg_no} onChange={(e) => setStudentField('birth_reg_no', e.target.value)} className="input mt-1 w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">NID</label>
                    <input type="text" value={form.nid} onChange={(e) => setStudentField('nid', e.target.value)} className="input mt-1 w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Blood group</label>
                    <select value={form.blood_group} onChange={(e) => setStudentField('blood_group', e.target.value)} className="input mt-1 w-full">
                      <option value="">—</option>
                      {BLOOD_GROUPS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Admission date *</label>
                    <input type="date" value={form.admission_date} onChange={(e) => setStudentField('admission_date', e.target.value)} className="input mt-1 w-full" required />
                  </div>
                  {editing && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-700">Status</label>
                      <select value={form.status} onChange={(e) => setStudentField('status', e.target.value)} className="input mt-1 w-full">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="passed_out">Passed out</option>
                        <option value="transferred">Transferred</option>
                        <option value="dropped">Dropped</option>
                      </select>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Address</label>
                    <textarea value={form.address} onChange={(e) => setStudentField('address', e.target.value)} className="input mt-1 w-full min-h-[80px]" rows={2} />
                  </div>
                </div>
              </div>

              {/* Guardians (required at least one) */}
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-800">Guardian(s) * (at least one)</h4>
                  {!editing && (
                    <button type="button" onClick={addGuardian} className="btn text-sm">Add guardian</button>
                  )}
                </div>
                {form.guardians.map((g, idx) => (
                  <div key={idx} className="mt-4 rounded border border-slate-100 bg-slate-50/50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">Guardian {idx + 1}</span>
                      {!editing && form.guardians.length > 1 && (
                        <button type="button" onClick={() => removeGuardian(idx)} className="text-sm text-red-600 hover:underline">Remove</button>
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-600">Name *</label>
                        <input type="text" value={g.name} onChange={(e) => setGuardianField(idx, 'name', e.target.value)} className="input mt-0.5 w-full py-1.5 text-sm" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">Name (Bangla)</label>
                        <input type="text" value={g.name_bn ?? ''} onChange={(e) => setGuardianField(idx, 'name_bn', e.target.value)} className="input mt-0.5 w-full py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">Relation *</label>
                        <select value={g.relation} onChange={(e) => setGuardianField(idx, 'relation', e.target.value)} className="input mt-0.5 w-full py-1.5 text-sm" required>
                          {GUARDIAN_RELATIONS.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">Phone *</label>
                        <input type="text" value={g.phone} onChange={(e) => setGuardianField(idx, 'phone', e.target.value)} className="input mt-0.5 w-full py-1.5 text-sm" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">Email</label>
                        <input type="email" value={g.email ?? ''} onChange={(e) => setGuardianField(idx, 'email', e.target.value)} className="input mt-0.5 w-full py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">NID</label>
                        <input type="text" value={g.nid ?? ''} onChange={(e) => setGuardianField(idx, 'nid', e.target.value)} className="input mt-0.5 w-full py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">Occupation</label>
                        <input type="text" value={g.occupation ?? ''} onChange={(e) => setGuardianField(idx, 'occupation', e.target.value)} className="input mt-0.5 w-full py-1.5 text-sm" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600">Address</label>
                        <input type="text" value={g.address ?? ''} onChange={(e) => setGuardianField(idx, 'address', e.target.value)} className="input mt-0.5 w-full py-1.5 text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="btn">{t('cancel')}</button>
              <button type="button" onClick={submit} disabled={createMutation.isPending || updateMutation.isPending || !canSubmit} className="btn btn-primary">{t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
