/**
 * api.ts — All API calls to JANVANI backend
 * Place this in: src/lib/api.ts
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Token helpers ──────────────────────────────────────────────
export const getToken = (): string | null => localStorage.getItem('jv_token');
export const setToken = (t: string)        => localStorage.setItem('jv_token', t);
export const removeToken = ()              => localStorage.removeItem('jv_token');

// ── Base fetch wrapper ─────────────────────────────────────────
const request = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return data;
};

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────
export const authAPI = {
  // Citizen
  citizenRegister: (body: object) =>
    request('/auth/citizen/register', { method: 'POST', body: JSON.stringify(body) }),

  citizenLogin: (email: string, password: string) =>
    request('/auth/citizen/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // Admin
  adminRegister: (body: object) =>
    request('/auth/admin/register', { method: 'POST', body: JSON.stringify(body) }),

  adminLogin: (email: string, password: string) =>
    request('/auth/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // Shared
  getMe:          () => request('/auth/me'),
  forgotPassword: (email: string) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword:  (email: string, newPassword: string) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, newPassword }) }),
};

// ─────────────────────────────────────────────────────────────
// COMPLAINTS
// ─────────────────────────────────────────────────────────────
export const complaintAPI = {
  create: (body: object) =>
    request('/complaints', { method: 'POST', body: JSON.stringify(body) }),

  getAll: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request(`/complaints${qs}`);
  },

  getById: (id: string) =>
    request(`/complaints/${id}`),

  updateStatus: (id: string, status: string, adminNote?: string, assignedOfficer?: string) =>
    request(`/complaints/${id}/status`, {
      method: 'PATCH',
      body  : JSON.stringify({ status, adminNote, assignedOfficer }),
    }),

  resolve: (id: string, resolvePhoto: string, adminNote: string, assignedOfficer: string) =>
    request(`/complaints/${id}/resolve`, {
      method: 'PATCH',
      body  : JSON.stringify({ resolvePhoto, adminNote, assignedOfficer }),
    }),

  support: (id: string) =>
    request(`/complaints/${id}/support`, { method: 'POST' }),

  feedback: (id: string, body: { rating: number; comment: string; resolved: string }) =>
    request(`/complaints/${id}/feedback`, { method: 'POST', body: JSON.stringify(body) }),

  delete: (id: string) =>
    request(`/complaints/${id}`, { method: 'DELETE' }),

  getStats: () =>
    request('/complaints/stats'),
};

// ─────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────
export const userAPI = {
  getLeaderboard: (ward?: number) =>
    request(`/users/leaderboard${ward ? `?ward=${ward}` : ''}`),

  getProfile: () =>
    request('/users/me'),

  updateProfile: (body: object) =>
    request('/users/me', { method: 'PATCH', body: JSON.stringify(body) }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request('/users/me/password', {
      method: 'PATCH',
      body  : JSON.stringify({ currentPassword, newPassword }),
    }),

  getAllCitizens: () =>
    request('/users'),
};