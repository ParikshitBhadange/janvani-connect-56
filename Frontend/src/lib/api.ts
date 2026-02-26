// Simple stubbed API module to satisfy imports during static build.
// In a real deployment this would make HTTP requests to your backend.

const noop = async (..._args: any[]) => ({ success: false });

export const authAPI = {
  getMe: noop,
  adminLogin: noop,
  citizenLogin: noop,
};

export const complaintAPI = {
  getAll: noop,
  create: noop,
  updateStatus: noop,
  resolve: noop,
  delete: noop,
  support: noop,
};

export const userAPI = {
  update: noop,
};

export const emailAPI = {
  sendResolutionEmail: noop,
};

export const api = {
  get: noop,
  post: noop,
  put: noop,
  delete: noop,
  patch: noop,
};

export const getToken = () => {
  try {
    return localStorage.getItem('jv_token');
  } catch {
    return null;
  }
};

export const setToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem('jv_token', t);
    else localStorage.removeItem('jv_token');
  } catch {}
};

export const removeToken = () => setToken(null);
