const API_HOST = import.meta.env.VITE_API_URL || '';
const BASE_URL = `${API_HOST}/api/v1`;

// メモリ内トークン保持（XSS対策: リクエスト処理はメモリ優先）
let _memoryToken: string | null = null;
// 複数の401が同時発生した場合のリダイレクト多重実行防止フラグ
let _isRedirectingToLogin = false;

export function getToken(): string | null {
  // メモリ優先、なければlocalStorageにフォールバック（ページリロード後の復元）
  if (_memoryToken !== null) return _memoryToken;
  return localStorage.getItem('cloudtask_session');
}

export function setToken(token: string) {
  _memoryToken = token;
  localStorage.setItem('cloudtask_session', token);
  // ログイン成功時にリダイレクトフラグをリセット
  _isRedirectingToLogin = false;
}

export function clearToken() {
  _memoryToken = null;
  localStorage.removeItem('cloudtask_session');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    if (!_isRedirectingToLogin) {
      _isRedirectingToLogin = true;
      clearToken();
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: 'Request failed' } }));
    throw new Error(body.error?.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(path: string, data: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  put: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  del: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),

  /** Download a CSV (or other blob) and trigger browser save dialog */
  download: async (path: string, filename: string): Promise<void> => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, { headers });

    if (res.status === 401) {
      if (!_isRedirectingToLogin) {
        _isRedirectingToLogin = true;
        clearToken();
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { message: 'Download failed' } }));
      throw new Error((body as any).error?.message || `HTTP ${res.status}`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (res.status === 401) {
      if (!_isRedirectingToLogin) {
        _isRedirectingToLogin = true;
        clearToken();
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { message: 'Upload failed' } }));
      throw new Error(body.error?.message || `HTTP ${res.status}`);
    }
    return res.json();
  },
};
