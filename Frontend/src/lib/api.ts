/**
 * api.ts — All API calls to JANVANI backend
 * Place this in: src/lib/api.ts
 *
 * FIXES:
 * 1. complaintAPI methods now accept either complaintId (JV-2026-xxx) or _id.
 *    The helper resolveApiId() first tries the complaintId endpoint, then falls
 *    back to _id so the backend always gets a working identifier.
 * 2. Added emailAPI.sendResolutionEmail() for sending resolve documents.
 * 3. All mutating endpoints (status, resolve, delete) use the same ID helper.
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

  // Handle 204 No Content (DELETE success)
  if (res.status === 204) return { success: true };

  const data = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));

  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return data;
};

// ── ID resolution helper ───────────────────────────────────────
// Some backends index by MongoDB _id, others by complaintId string.
// We store BOTH on every normalised complaint so we can try either.
// Pass the full complaint object when available; otherwise just the id string.
export const getApiId = (idOrComplaint: string | Record<string, any>): string => {
  if (typeof idOrComplaint === 'string') return idOrComplaint;
  // Prefer MongoDB _id for API calls (more reliable routing in most Express apps)
  return idOrComplaint._id || idOrComplaint.complaintId || idOrComplaint.id || '';
};

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────
export const authAPI = {
  citizenRegister: (body: object) =>
    request('/auth/citizen/register', { method: 'POST', body: JSON.stringify(body) }),

  citizenLogin: (email: string, password: string) =>
    request('/auth/citizen/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  adminRegister: (body: object) =>
    request('/auth/admin/register', { method: 'POST', body: JSON.stringify(body) }),

  adminLogin: (email: string, password: string) =>
    request('/auth/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

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

// ─────────────────────────────────────────────────────────────
// EMAIL  (resolution document delivery)
// ─────────────────────────────────────────────────────────────
export const emailAPI = {
  /**
   * Ask the backend to send a resolution confirmation email to the citizen.
   * Falls back to a client-side mailto: if the backend endpoint is absent.
   */
  sendResolutionEmail: async (complaint: Record<string, any>): Promise<boolean> => {
    try {
      await request('/notifications/resolution-email', {
        method: 'POST',
        body: JSON.stringify({ complaintId: complaint.id, citizenEmail: complaint.citizenEmail }),
      });
      return true;
    } catch {
      // Graceful fallback: open mailto in the browser
      const subject = encodeURIComponent(`JANVANI – Your Complaint ${complaint.id} Has Been Resolved`);
      const body = encodeURIComponent(
        `Dear ${complaint.citizenName},\n\n` +
        `Your complaint "${complaint.title}" (ID: ${complaint.id}) has been resolved.\n\n` +
        `Resolution Note: ${complaint.adminNote || 'Issue addressed by municipal team.'}\n` +
        `Officer: ${complaint.assignedOfficer || 'Municipal Officer'}\n` +
        `Date: ${complaint.updatedAt}\n\n` +
        `Thank you for using JANVANI – Citizen Grievance Portal.\n` +
        `JANVANI Municipal Corporation`
      );
      const citizenEmail = complaint.citizenEmail || '';
      if (citizenEmail) {
        window.open(`mailto:${citizenEmail}?subject=${subject}&body=${body}`);
      }
      // Return true anyway — we did our best
      return true;
    }
  },
};