'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authApi, clearAuthCookie } from './api';

/* ─── Types ─── */
export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'parent' | 'student' | 'accountant' | 'librarian';

export type AuthUser = {
  id: number;
  name: string;
  name_bn?: string | null;
  email: string;
  phone?: string | null;
  is_active: boolean;
  institution_id?: number | null;
  roles: { id: number; name: string; label?: string; permissions?: { id: number; name: string }[] }[];
  institution?: { id: number; name: string } | null;
};

type AuthContextType = {
  user: AuthUser | null;
  roles: string[];
  permissions: string[];
  loading: boolean;
  /** Check if user has at least one of the given roles */
  hasRole: (...roleNames: UserRole[]) => boolean;
  /** Check if user has a specific permission */
  hasPermission: (permission: string) => boolean;
  /** Check if user can access a module (via permission or role fallback) */
  canAccess: (module: string) => boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

/* ─── Provider ─── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'bn';

  const [user, setUser] = useState<AuthUser | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    // Only attempt fetch if there's a token — avoids unnecessary 401 on login page
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
      setUser(null);
      setRoles([]);
      setPermissions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.user();
      if (res.success && res.data) {
        const u = res.data as AuthUser;
        setUser(u);
        // Roles can come from top-level `roles` array or from user.roles
        const rNames = (res as Record<string, unknown>).roles as string[] ??
          u.roles?.map((r) => r.name) ?? [];
        setRoles(rNames);
        const perms = (res as Record<string, unknown>).permissions as string[] ??
          u.roles?.flatMap((r) => r.permissions?.map((p) => p.name) ?? []) ?? [];
        setPermissions(Array.from(new Set(perms)));
      } else {
        setUser(null);
        setRoles([]);
        setPermissions([]);
      }
    } catch {
      setUser(null);
      setRoles([]);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const hasRole = useCallback(
    (...roleNames: UserRole[]) => roleNames.some((r) => roles.includes(r)),
    [roles]
  );

  const hasPermission = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions]
  );

  /**
   * Module access check: first check permission `module.view`, then fall back to role.
   * super_admin and admin always have access to everything.
   */
  const canAccess = useCallback(
    (module: string) => {
      if (roles.includes('super_admin') || roles.includes('admin')) return true;
      if (permissions.includes(`${module}.view`) || permissions.includes(`${module}.manage`)) return true;
      // Module-role mapping fallback — must match backend route middleware
      const moduleRoleMap: Record<string, string[]> = {
        dashboard: ['admin', 'super_admin', 'accountant', 'librarian'],
        users: ['admin', 'super_admin'],
        // Read access: admin, teacher, accountant. Write: admin only.
        classes: ['admin', 'super_admin', 'teacher', 'accountant'],
        sessions: ['admin', 'super_admin', 'teacher', 'accountant'],
        students: ['admin', 'super_admin', 'teacher', 'accountant'],
        exams: ['admin', 'super_admin', 'teacher', 'accountant'],
        subjects: ['admin', 'super_admin', 'teacher', 'accountant'],
        fees: ['admin', 'super_admin', 'accountant'],
        attendance: ['admin', 'super_admin', 'teacher'],
        marks: ['admin', 'super_admin', 'teacher'],
        notices: ['admin', 'super_admin', 'teacher', 'parent', 'student', 'accountant', 'librarian'],
        reports: ['admin', 'super_admin', 'accountant'],
        website: ['admin', 'super_admin'],
        routine: ['admin', 'super_admin'],
      };
      const allowed = moduleRoleMap[module];
      if (allowed) return allowed.some((r) => roles.includes(r));
      return false;
    },
    [roles, permissions]
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    localStorage.removeItem('token');
    clearAuthCookie();
    setUser(null);
    setRoles([]);
    setPermissions([]);
    router.push(`/${locale}/login`);
    router.refresh();
  }, [router, locale]);

  return (
    <AuthContext.Provider
      value={{ user, roles, permissions, loading, hasRole, hasPermission, canAccess, logout, refresh: fetchUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ─── Hook ─── */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

/* ─── Role guard component ─── */
export function RoleGuard({
  children,
  allowed,
  fallback,
}: {
  children: ReactNode;
  allowed: UserRole[];
  fallback?: ReactNode;
}) {
  const { hasRole, loading } = useAuth();
  if (loading) return <div className="flex h-40 items-center justify-center"><p className="text-slate-500">Loading...</p></div>;
  if (!hasRole(...allowed)) {
    return fallback ? <>{fallback}</> : (
      <div className="flex h-40 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">Access Denied</p>
          <p className="text-sm text-slate-500">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
