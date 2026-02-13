'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  Plus, Trash2, DollarSign, Pencil, Search, ChevronRight,
  Layers, Settings, BookOpen, X, Check, AlertCircle,
} from 'lucide-react';

type FeeHead = { id: number; name: string; name_bn: string | null; frequency: string };
type FeeStructure = {
  id: number;
  amount: string;
  fee_head_id: number;
  class_id: number | null;
  academic_session_id: number;
  fee_head?: FeeHead;
  class?: { id: number; name: string };
  academic_session?: { id: number; name: string };
};
type ClassItem = { id: number; name: string };
type SessionItem = { id: number; name: string; is_current?: boolean };

export default function AccountantFeesPage() {
  const t = useTranslations('common');
  const tFees = useTranslations('fees');
  const queryClient = useQueryClient();

  // ─── Tab state ───
  const [activeTab, setActiveTab] = useState<'heads' | 'structures'>('heads');

  // ─── Fee Heads ───
  const [headModal, setHeadModal] = useState(false);
  const [editingHead, setEditingHead] = useState<FeeHead | null>(null);
  const [headForm, setHeadForm] = useState({ name: '', name_bn: '', frequency: 'monthly' });
  const [headSearch, setHeadSearch] = useState('');

  // ─── Fee Structures ───
  const [structSessionId, setStructSessionId] = useState<number>(0);
  const [structClassId, setStructClassId] = useState<number | ''>('');
  const [structModal, setStructModal] = useState(false);
  const [editingStruct, setEditingStruct] = useState<FeeStructure | null>(null);
  const [structForm, setStructForm] = useState({ fee_head_id: 0, class_id: '' as number | '', academic_session_id: 0, amount: '' });

  // ─── Queries ───
  const { data: sessionsData } = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: () => api<{ data: SessionItem[] }>('/academic-sessions?per_page=100'),
  });
  const sessionsPayload = (sessionsData as { data?: { data?: SessionItem[] } | SessionItem[] })?.data;
  const sessions: SessionItem[] = Array.isArray(sessionsPayload) ? sessionsPayload : (sessionsPayload as { data?: SessionItem[] })?.data ?? [];

  // Auto-select current session
  useEffect(() => {
    if (sessions.length > 0 && structSessionId === 0) {
      const current = sessions.find(s => s.is_current) ?? sessions[0];
      setStructSessionId(current.id);
      setStructForm(f => ({ ...f, academic_session_id: current.id }));
    }
  }, [sessions, structSessionId]);

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api<{ data: ClassItem[] }>('/classes'),
  });
  const classes: ClassItem[] = ((classesData as { data?: { data?: ClassItem[] } })?.data?.data ?? []);

  const { data: headsData } = useQuery({
    queryKey: ['fee-heads'],
    queryFn: () => api<{ data: FeeHead[] }>('/fee-heads'),
  });
  const heads: FeeHead[] = (headsData as { data?: FeeHead[] })?.data ?? [];

  const filteredHeads = useMemo(() => {
    if (!headSearch.trim()) return heads;
    const q = headSearch.toLowerCase();
    return heads.filter(h => h.name.toLowerCase().includes(q) || h.name_bn?.toLowerCase().includes(q));
  }, [heads, headSearch]);

  const { data: structuresData } = useQuery({
    queryKey: ['fee-structures', structSessionId, structClassId],
    queryFn: () => api<{ data: FeeStructure[] }>(`/fee-structures?academic_session_id=${structSessionId}${structClassId ? `&class_id=${structClassId}` : ''}`),
    enabled: structSessionId > 0,
  });
  const structures: FeeStructure[] = (structuresData as { data?: FeeStructure[] })?.data ?? [];

  // ─── Fee Head mutations ───
  const createHeadMutation = useMutation({
    mutationFn: (body: { institution_id: number; name: string; name_bn?: string; frequency: string }) =>
      api('/fee-heads', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-heads'] });
      toast.success(t('savedSuccessfully'));
      setHeadModal(false);
      setEditingHead(null);
      setHeadForm({ name: '', name_bn: '', frequency: 'monthly' });
    },
    onError: () => toast.error(t('saveFailed')),
  });

  const updateHeadMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { name: string; name_bn?: string; frequency: string } }) =>
      api(`/fee-heads/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-heads'] });
      toast.success(t('savedSuccessfully'));
      setHeadModal(false);
      setEditingHead(null);
      setHeadForm({ name: '', name_bn: '', frequency: 'monthly' });
    },
    onError: () => toast.error(t('saveFailed')),
  });

  const deleteHeadMutation = useMutation({
    mutationFn: (id: number) => api(`/fee-heads/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-heads'] });
      toast.success(t('deletedSuccessfully'));
    },
    onError: () => toast.error(t('deleteFailed')),
  });

  // ─── Fee Structure mutations ───
  const createStructMutation = useMutation({
    mutationFn: (body: { institution_id: number; fee_head_id: number; class_id?: number; academic_session_id: number; amount: number }) =>
      api('/fee-structures', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      toast.success(t('savedSuccessfully'));
      setStructModal(false);
      setEditingStruct(null);
      setStructForm({ fee_head_id: 0, class_id: '', academic_session_id: structSessionId, amount: '' });
    },
    onError: () => toast.error(t('saveFailed')),
  });

  const updateStructMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { fee_head_id: number; class_id?: number; academic_session_id: number; amount: number } }) =>
      api(`/fee-structures/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      toast.success(t('savedSuccessfully'));
      setStructModal(false);
      setEditingStruct(null);
      setStructForm({ fee_head_id: 0, class_id: '', academic_session_id: structSessionId, amount: '' });
    },
    onError: () => toast.error(t('saveFailed')),
  });

  const deleteStructMutation = useMutation({
    mutationFn: (id: number) => api(`/fee-structures/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      toast.success(t('deletedSuccessfully'));
    },
    onError: () => toast.error(t('deleteFailed')),
  });

  // ─── Helpers ───
  const openHeadEdit = (h: FeeHead) => {
    setEditingHead(h);
    setHeadForm({ name: h.name, name_bn: h.name_bn || '', frequency: h.frequency });
    setHeadModal(true);
  };
  const openHeadCreate = () => {
    setEditingHead(null);
    setHeadForm({ name: '', name_bn: '', frequency: 'monthly' });
    setHeadModal(true);
  };
  const saveHead = () => {
    if (editingHead) {
      updateHeadMutation.mutate({ id: editingHead.id, body: { name: headForm.name, name_bn: headForm.name_bn || undefined, frequency: headForm.frequency } });
    } else {
      createHeadMutation.mutate({ institution_id: 1, name: headForm.name, name_bn: headForm.name_bn || undefined, frequency: headForm.frequency });
    }
  };

  const openStructEdit = (s: FeeStructure) => {
    setEditingStruct(s);
    setStructForm({ fee_head_id: s.fee_head_id, class_id: s.class_id ?? '', academic_session_id: s.academic_session_id, amount: s.amount });
    setStructModal(true);
  };
  const openStructCreate = () => {
    setEditingStruct(null);
    setStructForm({ fee_head_id: heads[0]?.id || 0, class_id: '', academic_session_id: structSessionId, amount: '' });
    setStructModal(true);
  };
  const saveStruct = () => {
    const body = {
      fee_head_id: structForm.fee_head_id,
      class_id: structForm.class_id || undefined,
      academic_session_id: structForm.academic_session_id,
      amount: parseFloat(structForm.amount),
    };
    if (editingStruct) {
      updateStructMutation.mutate({ id: editingStruct.id, body: body as { fee_head_id: number; class_id?: number; academic_session_id: number; amount: number } });
    } else {
      createStructMutation.mutate({ institution_id: 1, ...body } as { institution_id: number; fee_head_id: number; class_id?: number; academic_session_id: number; amount: number });
    }
  };

  const freqLabel = (f: string) => {
    switch (f) {
      case 'monthly': return tFees('monthly');
      case 'annual': return tFees('annual');
      case 'one_time': return tFees('oneTime');
      default: return f;
    }
  };

  const freqColor = (f: string) => {
    switch (f) {
      case 'monthly': return 'bg-blue-100 text-blue-700';
      case 'annual': return 'bg-purple-100 text-purple-700';
      case 'one_time': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const totalStructAmount = structures.reduce((sum, s) => sum + Number(s.amount), 0);

  const tabs = [
    { key: 'heads' as const, label: tFees('feeHeads'), icon: Settings, count: heads.length },
    { key: 'structures' as const, label: tFees('feeStructures'), icon: Layers, count: structures.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <DollarSign className="h-7 w-7 text-cyan-600" />
          {tFees('feeManagement')}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{tFees('feeManagementDesc')}</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === key
                ? 'bg-white text-cyan-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              activeTab === key ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-200 text-slate-500'
            }`}>{count}</span>
          </button>
        ))}
      </div>

      {/* ═══════ Fee Heads Tab ═══════ */}
      {activeTab === 'heads' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={headSearch}
                onChange={e => setHeadSearch(e.target.value)}
                placeholder={tFees('searchFeeHeads')}
                className="input pl-10 w-64"
              />
            </div>
            <button onClick={openHeadCreate} className="btn btn-primary flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm text-white hover:bg-cyan-700">
              <Plus className="h-4 w-4" /> {tFees('addFeeHead')}
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('name')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{tFees('nameBangla')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{tFees('frequency')}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredHeads.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-cyan-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-800">{h.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{h.name_bn || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${freqColor(h.frequency)}`}>
                        {freqLabel(h.frequency)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openHeadEdit(h)} className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => { if (confirm(t('confirmDelete'))) deleteHeadMutation.mutate(h.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredHeads.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-12">
                      <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="mt-2 text-sm text-slate-500">{t('noData')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════ Fee Structures Tab ═══════ */}
      {activeTab === 'structures' && (
        <div className="space-y-4">
          {/* Filters + Add Button */}
          <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{tFees('session')}</label>
              <select
                value={structSessionId}
                onChange={e => setStructSessionId(Number(e.target.value))}
                className="input w-48"
              >
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{tFees('class')}</label>
              <select
                value={structClassId}
                onChange={e => setStructClassId(e.target.value ? Number(e.target.value) : '')}
                className="input w-48"
              >
                <option value="">{tFees('allClasses')}</option>
                {classes.map(c => <option key={c.id} value={c.id}>{tFees('classPrefix')}{c.name}</option>)}
              </select>
            </div>
            <div className="ml-auto">
              <button onClick={openStructCreate} className="btn btn-primary flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm text-white hover:bg-cyan-700">
                <Plus className="h-4 w-4" /> {tFees('addStructure')}
              </button>
            </div>
          </div>

          {/* Summary bar */}
          {structures.length > 0 && (
            <div className="flex items-center gap-4 rounded-xl bg-cyan-50 border border-cyan-200 px-5 py-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-600" />
                <span className="text-sm font-medium text-cyan-800">{structures.length} {tFees('structuresFound')}</span>
              </div>
              <div className="h-4 w-px bg-cyan-200" />
              <span className="text-sm text-cyan-700">{tFees('totalAmount')}: <strong>৳{totalStructAmount.toLocaleString()}</strong></span>
            </div>
          )}

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{tFees('feeHead')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{tFees('class')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{tFees('session')}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{tFees('amountBDT')}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {structures.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-700">{s.fee_head?.name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{s.class ? `${tFees('classPrefix')}${s.class.name}` : tFees('allClasses')}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{s.academic_session?.name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-right text-sm font-semibold text-slate-800">৳{Number(s.amount).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openStructEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => { if (confirm(t('confirmDelete'))) deleteStructMutation.mutate(s.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {structures.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <Layers className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="mt-2 text-sm text-slate-500">{t('noData')}</p>
                      <button onClick={openStructCreate} className="mt-3 text-xs text-cyan-600 hover:underline font-medium">
                        {tFees('addStructure')}
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════ Fee Head Modal ═══════ */}
      {headModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setHeadModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                {editingHead ? tFees('editFeeHead') : tFees('addFeeHead')}
              </h3>
              <button onClick={() => setHeadModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('name')} (English)</label>
                <input
                  type="text"
                  value={headForm.name}
                  onChange={e => setHeadForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Tuition Fee"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{tFees('nameBangla')}</label>
                <input
                  type="text"
                  value={headForm.name_bn}
                  onChange={e => setHeadForm(f => ({ ...f, name_bn: e.target.value }))}
                  placeholder="যেমন: টিউশন ফি"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{tFees('frequency')}</label>
                <select
                  value={headForm.frequency}
                  onChange={e => setHeadForm(f => ({ ...f, frequency: e.target.value }))}
                  className="input w-full"
                >
                  <option value="monthly">{tFees('monthly')}</option>
                  <option value="annual">{tFees('annual')}</option>
                  <option value="one_time">{tFees('oneTime')}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setHeadModal(false)} className="btn text-xs border-slate-200">{t('cancel')}</button>
                <button
                  onClick={saveHead}
                  disabled={!headForm.name.trim()}
                  className="btn btn-primary text-xs disabled:opacity-50"
                >
                  {editingHead ? t('update') : t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Fee Structure Modal ═══════ */}
      {structModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setStructModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                {editingStruct ? tFees('editStructure') : tFees('addStructure')}
              </h3>
              <button onClick={() => setStructModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{tFees('feeHead')}</label>
                <select
                  value={structForm.fee_head_id}
                  onChange={e => setStructForm(f => ({ ...f, fee_head_id: Number(e.target.value) }))}
                  className="input w-full"
                >
                  <option value={0} disabled>— {tFees('selectFeeHead')} —</option>
                  {heads.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{tFees('session')}</label>
                <select
                  value={structForm.academic_session_id}
                  onChange={e => setStructForm(f => ({ ...f, academic_session_id: Number(e.target.value) }))}
                  className="input w-full"
                >
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{tFees('class')} ({tFees('optional')})</label>
                <select
                  value={structForm.class_id}
                  onChange={e => setStructForm(f => ({ ...f, class_id: e.target.value ? Number(e.target.value) : '' }))}
                  className="input w-full"
                >
                  <option value="">{tFees('allClasses')}</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{tFees('classPrefix')}{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{tFees('amountBDT')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={structForm.amount}
                  onChange={e => setStructForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="input w-full"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setStructModal(false)} className="btn text-xs border-slate-200">{t('cancel')}</button>
                <button
                  onClick={saveStruct}
                  disabled={!structForm.fee_head_id || !structForm.amount}
                  className="btn btn-primary text-xs disabled:opacity-50"
                >
                  {editingStruct ? t('update') : t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}