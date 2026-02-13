const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const AUTH_COOKIE = 'sb_auth';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/** Set auth cookie for middleware route protection (7 days). Optionally stores roles. */
export function setAuthCookie(roles?: string[]): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=604800; SameSite=Lax`;
  if (roles && roles.length > 0) {
    document.cookie = `sb_roles=${roles.join(',')}; path=/; max-age=604800; SameSite=Lax`;
  }
}

/** Clear auth cookie on logout */
export function clearAuthCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
  document.cookie = `sb_roles=; path=/; max-age=0`;
}

export async function api<T>(
  path: string,
  options: RequestInit & { isFormData?: boolean } = {}
): Promise<{ success: boolean; data?: T; message?: string; errors?: Record<string, string[]> }> {
  const token = getToken();
  const { isFormData, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };
  // Don't set Content-Type for FormData — browser sets it with boundary
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });
  } catch (err) {
    const message =
      typeof window !== 'undefined'
        ? 'Unable to connect to server. Please ensure the backend is running (e.g. php artisan serve on port 8000).'
        : 'Network error';
    return { success: false, message };
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        clearAuthCookie();
        // Only redirect once: skip if already redirecting, on login page, or a background /user check
        const locale = window.location.pathname.split('/')[1] || 'bn';
        const isOnLoginPage = window.location.pathname.includes('/login');
        const isUserCheck = path === '/user';
        if (!isOnLoginPage && !isUserCheck && !(window as unknown as Record<string, unknown>).__authRedirecting) {
          (window as unknown as Record<string, unknown>).__authRedirecting = true;
          window.location.href = `/${locale}/login`;
        }
      }
    }
    return { success: false, ...json };
  }
  return json;
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const h: HeadersInit = { Accept: 'application/json' };
  if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return h;
}

/** Upload landing page image. Returns { success, data: { url } }. */
export async function uploadLandingImage(
  type: 'logo' | 'banner' | 'hero' | 'about',
  file: File
): Promise<{ success: boolean; data?: { url: string }; message?: string }> {
  const form = new FormData();
  form.append('type', type);
  form.append('file', file);
  const res = await fetch(`${API_BASE}/landing-page/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, ...json };
  return json;
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ user: unknown; token: string }>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => api('/logout', { method: 'POST' }),
  user: () => api<{ id: number; name: string; email: string; roles: { name: string }[] }>('/user'),
};
