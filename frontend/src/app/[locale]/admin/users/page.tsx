'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  Users, Plus, X, Save, Search, Shield, ShieldCheck, ShieldAlert,
  UserCheck, UserX, Pencil, Trash2, Eye, EyeOff, ChevronDown,
} from 'lucide-react';

/* ─── Types ─── */
type RoleDef = { id: number; name: string; label: string; description: string | null };
type UserRole = { id: number; name: string; label: string };
type UserRecord = {
  id: number;
  name: string;
  name_bn: string | null;
  email: string;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  roles: UserRole[];
  employee_count?: number;
  guardian_count?: number;
  student_count?: number;
};
type NewUserForm = {
  name: string;
  name_bn: string;
  email: string;
  password: string;
  phone: string;
  is_active: boolean;
  roles: string[];
  employee_id_num: string;
  designation: string;
  department: string;
  is_teacher: boolean;
  join_date: string;
  relation: string;
  nid: string;
  address: string;
  occupation: string;
};
type EditUserForm = {
  name: string;
  name_bn: string;
  email: string;
  password: string;
  phone: string;
  is_active: boolean;
  roles: string[];
};

const emptyNew: NewUserForm = {
  name: '', name_bn: '', email: '', password: '', phone: '',
  is_active: true, roles: [],
  employee_id_num: '', designation: '', department: 'Academic', is_teacher: false, join_date: '',
  relation: 'father', nid: '', address: '', occupation: '',
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700',
  admin: 'bg-indigo-100 text-indigo-700',
  teacher: 'bg-emerald-100 text-emerald-700',
  parent: 'bg-amber-100 text-amber-700',
  student: 'bg-sky-100 text-sky-700',
  accountant: 'bg-violet-100 text-violet-700',
  librarian: 'bg-pink-100 text-pink-700',
};
const ROLE_ICONS: Record<string, typeof Shield> = {
  super_admin: ShieldAlert,
  admin: ShieldCheck,
  teacher: UserCheck,
  parent: Users,
};

/* ─── Component ─── */
export default function AdminUsersPage() {
  const t = useTranslations('common');
  const tNav = useTranslations('nav');
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [newForm, setNewForm] = useState<NewUserForm>(emptyNew);
  const [editForm, setEditForm] = useState<EditUserForm>({
    name: '', name_bn: '', email: '', password: '', phone: '', is_active: true, roles: [],
  });
  const [showRoleModal, setShowRoleModal] = useState<UserRecord | null>(null);
  const [roleForm, setRoleForm] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  /* ─── Queries ─── */
  const { data: rolesData } = useQuery({
    queryKey: ['user-mgmt-roles'],
    queryFn: () => api<RoleDef[]>('/user-management/roles'),
  });
  const allRoles = rolesData?.data ?? [];
  const assignableRoles = allRoles.filter((r) => r.name !== 'super_admin');

  const buildParams = () => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (roleFilter) p.set('role', roleFilter);
    if (statusFilter === 'active') p.set('is_active', '1');
    if (statusFilter === 'inactive') p.set('is_active', '0');
    return p.toString() ? `?${p}` : '';
  };

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['user-mgmt-users', search, roleFilter, statusFilter],
    queryFn: () => api<UserRecord[]>(`/user-management/users${buildParams()}`),
  });
  const users = usersData?.data ?? [];

  /* ─── Mutations ─── */
  const createMutation = useMutation({
    mutationFn: (body: NewUserForm) =>
      api<UserRecord>('/user-management/users', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['user-mgmt-users'] });
      toast.success(res?.message || 'User created successfully');
      setShowAdd(false);
      setNewForm(emptyNew);
    },
    onError: (err: { message?: string; errors?: Record<string, string[]> }) => {
      const first = err?.errors ? Object.values(err.errors)[0]?.[0] : null;
      toast.error(first || err?.message || 'Failed to create user');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: EditUserForm & { id: number }) =>
      api<UserRecord>(`/user-management/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['user-mgmt-users'] });
      toast.success(res?.message || 'User updated');
      setEditUser(null);
    },
    onError: (err: { message?: string; errors?: Record<string, string[]> }) => {
      const first = err?.errors ? Object.values(err.errors)[0]?.[0] : null;
      toast.error(first || err?.message || 'Failed to update user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      api(`/user-management/users/${id}`, { method: 'DELETE' }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['user-mgmt-users'] });
      toast.success(res?.message || 'User deleted');
    },
    onError: (err: { message?: string }) => toast.error(err?.message || 'Failed to delete user'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) =>
      api(`/user-management/users/${id}/toggle-active`, { method: 'PATCH' }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['user-mgmt-users'] });
      toast.success(res?.message || 'Status toggled');
    },
    onError: (err: { message?: string }) => toast.error(err?.message || 'Failed to toggle status'),
  });

  const rolesMutation = useMutation({
    mutationFn: ({ id, roles }: { id: number; roles: string[] }) =>
      api(`/user-management/users/${id}/roles`, { method: 'PUT', body: JSON.stringify({ roles }) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['user-mgmt-users'] });
      toast.success(res?.message || 'Roles updated');
      setShowRoleModal(null);
    },
    onError: (err: { message?: string }) => toast.error(err?.message || 'Failed to update roles'),
  });

  /* ─── Handlers ─── */
  const openEdit = (u: UserRecord) => {
    setEditUser(u);
    setEditForm({
      name: u.name, name_bn: u.name_bn ?? '', email: u.email, password: '',
      phone: u.phone ?? '', is_active: u.is_active,
      roles: u.roles.map((r) => r.name),
    });
  };

  const openRoleModal = (u: UserRecord) => {
    setShowRoleModal(u);
    setRoleForm(u.roles.map((r) => r.name));
  };

  const toggleRole = (name: string) => {
    setRoleForm((prev) =>
      prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]
    );
  };

  const handleCreate = () => {
    if (!newForm.name.trim() || !newForm.email.trim() || !newForm.password.trim()) {
      toast.error('Name, email and password are required');
      return;
    }
    if (newForm.roles.length === 0) {
      toast.error('Select at least one role');
      return;
    }
    createMutation.mutate(newForm);
  };

  const handleUpdate = () => {
    if (!editUser) return;
    if (editForm.roles.length === 0) {
      toast.error('Select at least one role');
      return;
    }
    const payload: Record<string, unknown> = { id: editUser.id, ...editForm };
    if (!editForm.password) delete payload.password;
    updateMutation.mutate(payload as EditUserForm & { id: number });
  };

  const confirmDelete = (u: UserRecord) => {
    if (window.confirm(`Are you sure you want to delete "${u.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(u.id);
    }
  };

  const needsEmployeeFields = newForm.roles.includes('teacher') || newForm.roles.includes('admin');
  const needsGuardianFields = newForm.roles.includes('parent');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{tNav('users')}</h2>
          <p className="text-sm text-slate-500">Manage users, assign roles, and control access for your school.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input w-auto min-w-[150px]"
        >
          <option value="">All Roles</option>
          {assignableRoles.map((r) => (
            <option key={r.name} value={r.name}>{r.label || r.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as '' | 'active' | 'inactive')}
          className="input w-auto min-w-[130px]"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Stats summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Users</p>
          <p className="text-2xl font-bold text-slate-800">{users.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{users.filter((u) => u.is_active).length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Teachers</p>
          <p className="text-2xl font-bold text-indigo-600">{users.filter((u) => u.roles.some((r) => r.name === 'teacher')).length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Parents</p>
          <p className="text-2xl font-bold text-amber-600">{users.filter((u) => u.roles.some((r) => r.name === 'parent')).length}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          {isLoading ? (
            <p className="p-8 text-center text-slate-500">{t('loading')}</p>
          ) : users.length === 0 ? (
            <p className="p-8 text-center text-slate-500">{t('noData')}</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">User</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">Email</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">Phone</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">Roles</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">Status</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">Last Login</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{u.name}</p>
                          {u.name_bn && <p className="text-xs text-slate-500">{u.name_bn}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">{u.email}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{u.phone || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span
                            key={r.name}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[r.name] ?? 'bg-slate-100 text-slate-700'}`}
                          >
                            {r.label || r.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
                      >
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openRoleModal(u)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                          title="Manage Roles"
                        >
                          <Shield className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                          title={t('edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleMutation.mutate(u.id)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                          title={u.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {u.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDelete(u)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          title={t('delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ══════════ ADD USER MODAL ══════════ */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => { setShowAdd(false); setNewForm(emptyNew); }}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="mb-1 text-xl font-bold text-slate-800">Add New User</h3>
            <p className="mb-5 text-sm text-slate-500">Create a user account and assign roles.</p>

            {/* Basic Info */}
            <div className="mb-5">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Basic Information</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Name <span className="text-red-500">*</span></label>
                  <input type="text" className="input mt-1" placeholder="Full name"
                    value={newForm.name} onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Name (Bangla)</label>
                  <input type="text" className="input mt-1" placeholder="নাম (বাংলা)"
                    value={newForm.name_bn} onChange={(e) => setNewForm((f) => ({ ...f, name_bn: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Email <span className="text-red-500">*</span></label>
                  <input type="email" className="input mt-1" placeholder="user@school.edu.bd"
                    value={newForm.email} onChange={(e) => setNewForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Password <span className="text-red-500">*</span></label>
                  <div className="relative mt-1">
                    <input type={showPassword ? 'text' : 'password'} className="input pr-10" placeholder="Min 6 characters"
                      value={newForm.password} onChange={(e) => setNewForm((f) => ({ ...f, password: e.target.value }))} />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      onClick={() => setShowPassword((v) => !v)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Phone</label>
                  <input type="text" className="input mt-1" placeholder="+880 1XXX-XXXXXX"
                    value={newForm.phone} onChange={(e) => setNewForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <input type="checkbox" id="new-active" checked={newForm.is_active}
                    onChange={(e) => setNewForm((f) => ({ ...f, is_active: e.target.checked }))} />
                  <label htmlFor="new-active" className="text-sm text-slate-700">Active account</label>
                </div>
              </div>
            </div>

            {/* Roles */}
            <div className="mb-5">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Roles <span className="text-red-500">*</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {assignableRoles.map((r) => {
                  const selected = newForm.roles.includes(r.name);
                  return (
                    <button
                      key={r.name}
                      type="button"
                      onClick={() =>
                        setNewForm((f) => ({
                          ...f,
                          roles: selected ? f.roles.filter((x) => x !== r.name) : [...f.roles, r.name],
                        }))
                      }
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                        selected
                          ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {r.label || r.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Employee fields (if teacher or admin) */}
            {needsEmployeeFields && (
              <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">Employee Details</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Employee ID</label>
                    <input type="text" className="input mt-1" placeholder="e.g. EMP-0012"
                      value={newForm.employee_id_num} onChange={(e) => setNewForm((f) => ({ ...f, employee_id_num: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Designation</label>
                    <input type="text" className="input mt-1" placeholder="e.g. Senior Teacher"
                      value={newForm.designation} onChange={(e) => setNewForm((f) => ({ ...f, designation: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Department</label>
                    <select className="input mt-1" value={newForm.department}
                      onChange={(e) => setNewForm((f) => ({ ...f, department: e.target.value }))}>
                      <option value="Academic">Academic</option>
                      <option value="Accounts">Accounts</option>
                      <option value="Office">Office</option>
                      <option value="Library">Library</option>
                      <option value="IT">IT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Join Date</label>
                    <input type="date" className="input mt-1"
                      value={newForm.join_date} onChange={(e) => setNewForm((f) => ({ ...f, join_date: e.target.value }))} />
                  </div>
                </div>
              </div>
            )}

            {/* Guardian fields (if parent) */}
            {needsGuardianFields && (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-700">Guardian Details</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Relation</label>
                    <select className="input mt-1" value={newForm.relation}
                      onChange={(e) => setNewForm((f) => ({ ...f, relation: e.target.value }))}>
                      <option value="father">Father</option>
                      <option value="mother">Mother</option>
                      <option value="guardian">Guardian</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">NID</label>
                    <input type="text" className="input mt-1" placeholder="National ID"
                      value={newForm.nid} onChange={(e) => setNewForm((f) => ({ ...f, nid: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Occupation</label>
                    <input type="text" className="input mt-1" placeholder="e.g. Businessman"
                      value={newForm.occupation} onChange={(e) => setNewForm((f) => ({ ...f, occupation: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Address</label>
                    <input type="text" className="input mt-1" placeholder="Home address"
                      value={newForm.address} onChange={(e) => setNewForm((f) => ({ ...f, address: e.target.value }))} />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button type="button" onClick={() => { setShowAdd(false); setNewForm(emptyNew); }} className="btn">
                {t('cancel')}
              </button>
              <button type="button" onClick={handleCreate} disabled={createMutation.isPending}
                className="btn btn-primary flex items-center gap-2">
                {createMutation.isPending ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Creating...</>
                ) : (
                  <><Plus className="h-4 w-4" /> Create User</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ EDIT USER MODAL ══════════ */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <button type="button" onClick={() => setEditUser(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>

            <h3 className="mb-4 text-xl font-bold text-slate-800">Edit User</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input type="text" className="input mt-1" value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Name (Bangla)</label>
                <input type="text" className="input mt-1" value={editForm.name_bn}
                  onChange={(e) => setEditForm((f) => ({ ...f, name_bn: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input type="email" className="input mt-1" value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">New Password <span className="text-xs text-slate-400">(leave blank to keep current)</span></label>
                <input type="password" className="input mt-1" value={editForm.password} placeholder="••••••••"
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Phone</label>
                <input type="text" className="input mt-1" value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Roles</label>
                <div className="flex flex-wrap gap-2">
                  {assignableRoles.map((r) => {
                    const selected = editForm.roles.includes(r.name);
                    return (
                      <button key={r.name} type="button"
                        onClick={() => setEditForm((f) => ({
                          ...f,
                          roles: selected ? f.roles.filter((x) => x !== r.name) : [...f.roles, r.name],
                        }))}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                          selected
                            ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}>
                        {r.label || r.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="edit-active" checked={editForm.is_active}
                  onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))} />
                <label htmlFor="edit-active" className="text-sm text-slate-700">Active account</label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button type="button" onClick={() => setEditUser(null)} className="btn">{t('cancel')}</button>
              <button type="button" onClick={handleUpdate} disabled={updateMutation.isPending}
                className="btn btn-primary flex items-center gap-2">
                <Save className="h-4 w-4" /> {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ ROLE ASSIGNMENT MODAL ══════════ */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <button type="button" onClick={() => setShowRoleModal(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>

            <h3 className="mb-1 text-lg font-bold text-slate-800">Manage Roles</h3>
            <p className="mb-4 text-sm text-slate-500">
              Assign roles for <strong>{showRoleModal.name}</strong> ({showRoleModal.email})
            </p>

            <div className="space-y-2">
              {assignableRoles.map((r) => {
                const checked = roleForm.includes(r.name);
                const Icon = ROLE_ICONS[r.name] ?? Shield;
                return (
                  <label
                    key={r.name}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                      checked
                        ? 'border-primary-300 bg-primary-50 ring-1 ring-primary-200'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRole(r.name)}
                      className="h-4 w-4 rounded border-slate-300 text-primary-600"
                    />
                    <Icon className={`h-5 w-5 ${checked ? 'text-primary-600' : 'text-slate-400'}`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${checked ? 'text-primary-700' : 'text-slate-700'}`}>
                        {r.label || r.name}
                      </p>
                      {r.description && (
                        <p className="text-xs text-slate-500">{r.description}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {roleForm.length === 0 && (
              <p className="mt-2 text-xs text-red-500">At least one role must be selected.</p>
            )}

            <div className="mt-5 flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button type="button" onClick={() => setShowRoleModal(null)} className="btn">{t('cancel')}</button>
              <button
                type="button"
                onClick={() => rolesMutation.mutate({ id: showRoleModal.id, roles: roleForm })}
                disabled={rolesMutation.isPending || roleForm.length === 0}
                className="btn btn-primary flex items-center gap-2"
              >
                <ShieldCheck className="h-4 w-4" /> Update Roles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
