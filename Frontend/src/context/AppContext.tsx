/**
 * AppContext.tsx  ─  src/context/AppContext.tsx
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  BUGS FIXED IN THIS VERSION                                 ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║ 1. DELETE FAILED                                             ║
 * ║    The API was called with the human-readable complaintId   ║
 * ║    (e.g. "JV-2026-001") but the backend expects MongoDB     ║
 * ║    _id. Fix: normaliseComplaint() now preserves _id AND     ║
 * ║    sets .id = complaintId. deleteComplaint() extracts the   ║
 * ║    MongoDB _id via getMongoId() and uses it for the API     ║
 * ║    call, while the UI still refers to c.id everywhere.      ║
 * ║                                                             ║
 * ║ 2. STATUS CHANGE NOT REFLECTING ON CITIZEN/ADMIN SIDE       ║
 * ║    updateComplaintStatus() now applies an OPTIMISTIC UPDATE  ║
 * ║    to React state BEFORE the API call, so the UI updates     ║
 * ║    instantly. If the API call fails the old state is        ║
 * ║    restored and an error is thrown to the caller.           ║
 * ║                                                             ║
 * ║ 3. RESOLVE FAILED                                           ║
 * ║    Same _id issue as delete. resolveComplaint() now uses    ║
 * ║    the MongoDB _id for the API call.                        ║
 * ║                                                             ║
 * ║ 4. EMAIL ON RESOLVE                                         ║
 * ║    resolveComplaint() now calls emailAPI.sendResolutionEmail ║
 * ║    after a successful resolve so the citizen gets a         ║
 * ║    confirmation email/mailto with resolution details.       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import {
  createContext, useContext, useState,
  useEffect, useCallback, useRef,
} from 'react';
import {
  authAPI, complaintAPI, userAPI, emailAPI,
  getToken, setToken, removeToken,
} from '@/lib/api';

// ─── Context type ─────────────────────────────────────────────
interface AppContextType {
  currentUser           : any | null;
  complaints            : any[];
  users                 : any[];
  loading               : boolean;
  login                 : (email: string, password: string, role?: 'citizen' | 'admin') => Promise<any>;
  register              : (data: any) => Promise<any>;
  logout                : () => void;
  updateUser            : (updates: Record<string, any>) => Promise<void>;
  addComplaint          : (data: object) => Promise<any>;
  updateComplaintStatus : (id: string, status: string, note?: string, officer?: string) => Promise<void>;
  resolveComplaint      : (id: string, photo: string, note: string, officer: string) => Promise<void>;
  deleteComplaint       : (id: string) => Promise<void>;
  supportComplaint      : (id: string) => Promise<void>;
  submitFeedback        : (id: string, feedback: { rating: number; comment: string; resolved: any }) => Promise<void>;
  refreshComplaints     : () => Promise<void>;
  leaderboard           : any[];
  refreshLeaderboard    : (ward?: number) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
};

// ─── localStorage helpers ─────────────────────────────────────
const USER_KEY = 'jv_user';
const saveUser = (u: any) =>
  u ? localStorage.setItem(USER_KEY, JSON.stringify(u))
    : localStorage.removeItem(USER_KEY);
const loadUser = (): any | null => {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
  catch { return null; }
};

// ─── normaliseComplaint ───────────────────────────────────────
// KEY FIX: We preserve BOTH _id (for API calls) and set .id to the
// human-readable complaintId string (for UI display and React keys).
// Never lose _id — it's needed to build correct API URLs.
const normaliseComplaint = (raw: any): any => {
  if (!raw) return raw;
  return {
    ...raw,
    // Human-readable ID used in the UI (e.g. "JV-2026-00001")
    id: raw.complaintId || raw.id || raw._id || '',
    // MongoDB _id preserved for API calls
    _id: raw._id || raw.id || '',
    // complaintId always present
    complaintId: raw.complaintId || raw.id || raw._id || '',
  };
};

const normaliseUser = (raw: any): any => {
  if (!raw) return raw;
  return { ...raw, id: raw._id || raw.id || '' };
};

// ─── matchId ─────────────────────────────────────────────────
// Match a complaint in local state by any possible ID field.
const matchId = (c: any, id: string): boolean =>
  !!(id && (c.id === id || c.complaintId === id || c._id === id));

// ─── getMongoId ──────────────────────────────────────────────
// Given the human-readable complaint ID (c.id / complaintId),
// look it up in the complaints array and return the MongoDB _id.
// Falls back to the passed id itself if not found (handles cases
// where _id === complaintId, e.g. in local/seeded data).
const getMongoId = (complaints: any[], humanId: string): string => {
  const found = complaints.find(c => matchId(c, humanId));
  if (!found) return humanId;
  // Prefer genuine MongoDB ObjectId (_id) for API routing
  return found._id || found.complaintId || found.id || humanId;
};

// ─── Provider ─────────────────────────────────────────────────
export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<any | null>(loadUser);
  const [complaints,  setComplaints]  = useState<any[]>([]);
  const [users,       setUsers]       = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading,     setLoading]     = useState<boolean>(() => !!getToken());

  const didInit = useRef(false);

  // ── Keep cache in sync ─────────────────────────────────────
  useEffect(() => { saveUser(currentUser); }, [currentUser]);

  // ── On mount: verify token in background ──────────────────
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const init = async () => {
      const token = getToken();
      if (!token) { setLoading(false); return; }

      try {
        const res = await authAPI.getMe();
        if (res?.user) {
          const fresh = normaliseUser(res.user);
          setCurrentUser(fresh);
          loadComplaints().catch(() => {});
        }
      } catch (err: any) {
        const msg = String(err?.message || '').toLowerCase();
        const isRealAuthError =
          msg.includes('401') ||
          msg.includes('token invalid') ||
          msg.includes('token expired') ||
          msg.includes('not authorized') ||
          msg.includes('unauthorized');

        if (isRealAuthError) {
          removeToken();
          saveUser(null);
          setCurrentUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // ── loadComplaints ─────────────────────────────────────────
  const loadComplaints = useCallback(async () => {
    try {
      const res = await complaintAPI.getAll({ limit: 200 });
      if (res?.complaints) {
        setComplaints(res.complaints.map(normaliseComplaint));
      }
    } catch (err) {
      console.warn('[JANVANI] loadComplaints failed — using cached data', err);
    }
  }, []);

  const refreshComplaints = useCallback(() => loadComplaints(), [loadComplaints]);

  // ── login ──────────────────────────────────────────────────
  const login = async (email: string, password: string, role?: 'citizen' | 'admin'): Promise<any> => {
    let result: any;
    if (role === 'admin') {
      result = await authAPI.adminLogin(email, password);
    } else if (role === 'citizen') {
      result = await authAPI.citizenLogin(email, password);
    } else {
      try { result = await authAPI.citizenLogin(email, password); }
      catch { result = await authAPI.adminLogin(email, password); }
    }
    if (!result?.token) throw new Error('Login failed');
    setToken(result.token);
    const user = normaliseUser(result.user);
    setCurrentUser(user);
    saveUser(user);
    await loadComplaints();
    return user;
  };

  // ── register ───────────────────────────────────────────────
  const register = async (data: any): Promise<any> => {
    const result = await (data.role === 'admin'
      ? authAPI.adminRegister(data)
      : authAPI.citizenRegister(data));
    if (!result?.token) throw new Error('Registration failed');
    setToken(result.token);
    const user = normaliseUser(result.user);
    setCurrentUser(user);
    saveUser(user);
    await loadComplaints();
    return user;
  };

  // ── logout ─────────────────────────────────────────────────
  const logout = () => {
    removeToken();
    saveUser(null);
    setCurrentUser(null);
    setComplaints([]);
  };

  // ── updateUser ─────────────────────────────────────────────
  const updateUser = async (updates: Record<string, any>) => {
    try {
      const res = await userAPI.updateProfile(updates);
      const updated = res?.user ? normaliseUser(res.user) : { ...currentUser, ...updates };
      setCurrentUser(updated);
      saveUser(updated);
    } catch {
      const updated = { ...currentUser, ...updates };
      setCurrentUser(updated);
      saveUser(updated);
    }
  };

  // ── addComplaint ───────────────────────────────────────────
  const addComplaint = async (data: object) => {
    const res = await complaintAPI.create(data);
    if (res?.complaint) {
      const c = normaliseComplaint(res.complaint);
      setComplaints(prev => [c, ...prev]);
      setCurrentUser((u: any) => u ? { ...u, points: (u.points || 0) + 50 } : u);
      return c;
    }
    return null;
  };

  // ── updateComplaintStatus ──────────────────────────────────
  // FIXED: Optimistic update so BOTH citizen and admin see the
  // new status immediately. If the API fails, we roll back.
  const updateComplaintStatus = async (
    id: string, status: string, note?: string, officer?: string
  ) => {
    // Snapshot for rollback
    const snapshot = complaints.slice();

    // 1. Optimistic update — update state NOW before API call
    setComplaints(prev => prev.map(x =>
      matchId(x, id)
        ? { ...x, status, ...(note    ? { adminNote: note }              : {}),
                          ...(officer ? { assignedOfficer: officer }      : {}),
                          updatedAt: new Date().toISOString().split('T')[0] }
        : x
    ));

    try {
      // 2. Get the correct MongoDB _id for the API URL
      const apiId = getMongoId(snapshot, id);
      const res = await complaintAPI.updateStatus(apiId, status, note, officer);

      // 3. If backend returned the updated document, use it (authoritative)
      if (res?.complaint) {
        const c = normaliseComplaint(res.complaint);
        setComplaints(prev => prev.map(x => matchId(x, id) ? c : x));
      }
    } catch (err) {
      // 4. Roll back optimistic update on failure
      setComplaints(snapshot);
      throw err; // re-throw so the UI can show the error toast
    }
  };

  // ── resolveComplaint ───────────────────────────────────────
  // FIXED: Uses MongoDB _id for the API call, then sends email.
  const resolveComplaint = async (
    id: string, photo: string, note: string, officer: string
  ) => {
    // Snapshot for rollback
    const snapshot = complaints.slice();

    // Optimistic update
    setComplaints(prev => prev.map(x =>
      matchId(x, id)
        ? { ...x, status: 'Resolved', resolvePhoto: photo,
            adminNote: note, assignedOfficer: officer,
            updatedAt: new Date().toISOString().split('T')[0] }
        : x
    ));

    try {
      const apiId = getMongoId(snapshot, id);
      const res = await complaintAPI.resolve(apiId, photo, note, officer);

      let resolvedComplaint: any;
      if (res?.complaint) {
        resolvedComplaint = normaliseComplaint(res.complaint);
        setComplaints(prev => prev.map(x => matchId(x, id) ? resolvedComplaint : x));
      } else {
        // Use the optimistically updated version
        resolvedComplaint = snapshot.find(x => matchId(x, id));
        if (resolvedComplaint) {
          resolvedComplaint = {
            ...resolvedComplaint,
            status: 'Resolved', resolvePhoto: photo,
            adminNote: note, assignedOfficer: officer,
            updatedAt: new Date().toISOString().split('T')[0],
          };
        }
      }

      // ── Send resolution email to citizen ──────────────────
      if (resolvedComplaint) {
        try {
          await emailAPI.sendResolutionEmail(resolvedComplaint);
        } catch {
          // Email failure should not block the resolve flow
          console.warn('[JANVANI] Resolution email failed — continuing');
        }
      }
    } catch (err) {
      // Roll back on API failure
      setComplaints(snapshot);
      throw err;
    }
  };

  // ── deleteComplaint ────────────────────────────────────────
  // FIXED: Extracts MongoDB _id from the complaints array so the
  // DELETE request hits the right backend route.
  const deleteComplaint = async (id: string) => {
    // Snapshot for rollback
    const snapshot = complaints.slice();

    // Optimistic removal from UI
    setComplaints(prev => prev.filter(x => !matchId(x, id)));

    try {
      const apiId = getMongoId(snapshot, id);
      await complaintAPI.delete(apiId);
    } catch (err) {
      // Roll back if the API call failed
      setComplaints(snapshot);
      throw err;
    }
  };

  // ── supportComplaint ───────────────────────────────────────
  const supportComplaint = async (id: string) => {
    const apiId = getMongoId(complaints, id);
    const res = await complaintAPI.support(apiId);
    if (res?.supportCount !== undefined) {
      setComplaints(prev => prev.map(x =>
        matchId(x, id) ? { ...x, supportCount: res.supportCount } : x
      ));
    } else {
      // Optimistic increment if backend doesn't return count
      setComplaints(prev => prev.map(x =>
        matchId(x, id) ? { ...x, supportCount: (x.supportCount || 0) + 1 } : x
      ));
    }
  };

  // ── submitFeedback ─────────────────────────────────────────
  const submitFeedback = async (
    id: string,
    feedback: { rating: number; comment: string; resolved: any }
  ) => {
    const apiId = getMongoId(complaints, id);
    const res = await complaintAPI.feedback(apiId, feedback);
    if (res?.complaint) {
      const c = normaliseComplaint(res.complaint);
      setComplaints(prev => prev.map(x => matchId(x, id) ? c : x));
      setCurrentUser((u: any) => u ? { ...u, points: (u.points || 0) + 25 } : u);
    } else {
      // Optimistic update
      setComplaints(prev => prev.map(x =>
        matchId(x, id) ? { ...x, feedback } : x
      ));
      setCurrentUser((u: any) => u ? { ...u, points: (u.points || 0) + 25 } : u);
    }
  };

  // ── refreshLeaderboard ─────────────────────────────────────
  const refreshLeaderboard = async (ward?: number) => {
    try {
      const res = await userAPI.getLeaderboard(ward);
      if (res?.leaderboard) {
        const list = res.leaderboard.map(normaliseUser);
        setLeaderboard(list);
        setUsers(list);
      }
    } catch (err) {
      console.warn('[JANVANI] refreshLeaderboard failed', err);
    }
  };

  return (
    <AppContext.Provider value={{
      currentUser, complaints, users, loading,
      login, register, logout, updateUser,
      addComplaint, updateComplaintStatus, resolveComplaint,
      deleteComplaint, supportComplaint, submitFeedback, refreshComplaints,
      leaderboard, refreshLeaderboard,
    }}>
      {children}
    </AppContext.Provider>
  );
};