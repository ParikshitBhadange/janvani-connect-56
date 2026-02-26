/**
 * AppContext.tsx — ADMIN PERFORMANCE FIX
 *
 * ROOT CAUSE OF ADMIN SLOWNESS:
 * 1. Admin dashboard fetched complaints sequentially, THEN stats separately
 *    — two blocking round trips before anything showed on screen
 * 2. Polling kept firing even when browser tab was hidden (wasted requests)
 * 3. No dedicated `complaintsLoading` state — admin saw stale/empty data
 *    with no spinner until the full request finished
 * 4. getStats() had no caching — every page navigation re-fetched all stats
 *
 * FIXES APPLIED:
 * 1. Admin login: complaints + stats fire in PARALLEL via loadData()
 * 2. Added `complaintsLoading` state — admin pages can show skeleton instantly
 * 3. Polling pauses when tab is hidden (Page Visibility API)
 * 4. Stats cached in context — navigating admin pages is instant
 * 5. resolveComplaint() auto-refreshes stats after resolution
 */

import {
  createContext, useContext, useState,
  useEffect, useCallback, useRef, useMemo,
} from 'react';
import {
  authAPI, complaintAPI, userAPI, emailAPI,
  getToken, setToken, removeToken, clearCache,
} from '@/lib/api';

interface AppContextType {
  currentUser           : any | null;
  complaints            : any[];
  users                 : any[];
  loading               : boolean;
  complaintsLoading     : boolean;
  stats                 : any | null;
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
  refreshStats          : () => Promise<void>;
  leaderboard           : any[];
  refreshLeaderboard    : (ward?: number) => Promise<void>;
  myComplaints          : any[];
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
};

const USER_KEY = 'jv_user';
const saveUser = (u: any) =>
  u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY);
const loadUser = (): any | null => {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
};

const normaliseComplaint = (raw: any): any => {
  if (!raw) return raw;
  return {
    ...raw,
    id          : raw.complaintId || raw.id || raw._id || '',
    _id         : raw._id || raw.id || '',
    complaintId : raw.complaintId || raw.id || raw._id || '',
  };
};

const normaliseUser = (raw: any): any => {
  if (!raw) return raw;
  return { ...raw, id: raw._id || raw.id || '' };
};

const matchId = (c: any, id: string) =>
  !!(id && (c.id === id || c.complaintId === id || c._id === id));

const getMongoId = (complaints: any[], humanId: string): string => {
  const found = complaints.find(c => matchId(c, humanId));
  if (!found) return humanId;
  return found._id || found.complaintId || found.id || humanId;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser,       setCurrentUser]      = useState<any | null>(null);
  const [complaints,        setComplaints]        = useState<any[]>([]);
  const [users,             setUsers]             = useState<any[]>([]);
  const [leaderboard,       setLeaderboard]       = useState<any[]>([]);
  const [stats,             setStats]             = useState<any | null>(null);
  const [loading,           setLoading]           = useState(true);
  const [complaintsLoading, setComplaintsLoading] = useState(false);

  const didInit             = useRef(false);
  const isLoadingComplaints = useRef(false);
  const pollTimer           = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentUserRef      = useRef<any | null>(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
    if (currentUser) saveUser(currentUser);
  }, [currentUser]);

  // ── INIT ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const init = async () => {
      const token  = getToken();
      const cached = loadUser();

      // No token → go straight to login, no spinner
      if (!token) { setLoading(false); return; }

      // Restore cached user IMMEDIATELY so ProtectedRoute sees role right away
      if (cached) {
        setCurrentUser(cached);
        currentUserRef.current = cached;
      }

      // KEY FIX: If backend is down, don't hang for 15 seconds.
      // Use a 5s race — if getMe doesn't respond, fall back to cached user.
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('getMe timeout')), 5000)
        );

        const res = await Promise.race([authAPI.getMe(), timeoutPromise]) as any;

        if (res?.user) {
          const fresh = normaliseUser(res.user);
          setCurrentUser(fresh);
          currentUserRef.current = fresh;
          saveUser(fresh);
          loadData(fresh);
          startPolling(fresh);
        } else {
          // Server responded but no user — clear auth
          removeToken(); saveUser(null);
          setCurrentUser(null);
          currentUserRef.current = null;
        }
      } catch (err: any) {
        const msg = String(err?.message || '').toLowerCase();
        const isRealAuthError =
          msg.includes('401') || msg.includes('403') ||
          msg.includes('jwt expired') || msg.includes('token invalid') ||
          msg.includes('not authorized') || msg.includes('unauthorized');

        if (isRealAuthError) {
          // Token is invalid — force logout
          removeToken(); saveUser(null);
          setCurrentUser(null);
          currentUserRef.current = null;
        } else {
          // Network error OR timeout — keep cached user, let them use the app
          // They'll see stale data until the server comes back
          console.warn('[JANVANI] Backend unreachable — using cached session');
          if (cached) {
            // Don't try to loadData — backend is down
            // Just let them see the UI with whatever was cached
          }
        }
      } finally {
        // ALWAYS unblock the UI — never leave loading=true forever
        setLoading(false);
      }
    };

    init();
    return () => stopPolling();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── loadData: PARALLEL for admin, sequential for citizen ────────────────
  // This is the key fix — admin no longer waits for complaints before getting stats
  const loadData = useCallback((user: any) => {
    if (user?.role === 'admin') {
      Promise.all([
        loadComplaints(user).catch(() => {}),
        loadStats().catch(() => {}),
      ]);
    } else {
      loadComplaints(user).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── loadComplaints ───────────────────────────────────────────────────────
  const loadComplaints = useCallback(async (user?: any) => {
    if (isLoadingComplaints.current) return;
    isLoadingComplaints.current = true;
    setComplaintsLoading(true);

    try {
      const activeUser = user || currentUserRef.current;
      if (!activeUser) return;

      const params: Record<string, string | number> = { limit: 200 };
      if (activeUser?.role === 'citizen') {
        const uid = activeUser._id || activeUser.id;
        if (uid) params.citizenId = uid;
      }

      const res = await complaintAPI.getAll(params);
      if (res?.complaints) {
        setComplaints(res.complaints.map(normaliseComplaint));
      }
    } catch (err) {
      console.warn('[JANVANI] loadComplaints failed:', err);
    } finally {
      isLoadingComplaints.current = false;
      setComplaintsLoading(false);
    }
  }, []);

  // ── loadStats (admin only) ───────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const res = await complaintAPI.getStats();
      if (res?.stats) setStats(res.stats);
    } catch (err) {
      console.warn('[JANVANI] loadStats failed:', err);
    }
  }, []);

  const refreshComplaints = useCallback(() => loadComplaints(), [loadComplaints]);
  const refreshStats      = useCallback(() => loadStats(),      [loadStats]);

  // ── Polling — pauses when tab is hidden ──────────────────────────────────
  const startPolling = useCallback((user: any) => {
    stopPolling();
    pollTimer.current = setInterval(() => {
      // KEY FIX: Don't poll when browser tab is in the background
      if (document.visibilityState === 'hidden') return;
      const u = currentUserRef.current || user;
      if (!u) return;
      loadComplaints(u).catch(() => {});
      if (u.role === 'admin') loadStats().catch(() => {});
    }, 20_000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopPolling = () => {
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
  };

  const myComplaints = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return complaints;
    const uid = currentUser.id || currentUser._id;
    return complaints.filter(c => {
      const cid = c.citizenId?._id || c.citizenId;
      return cid === uid || cid?.toString() === uid?.toString();
    });
  }, [complaints, currentUser]);

  // ── login ────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string, role?: 'citizen' | 'admin'): Promise<any> => {
    clearCache();
    let result: any;

    if (role === 'admin') {
      result = await authAPI.adminLogin(email, password);
    } else if (role === 'citizen') {
      result = await authAPI.citizenLogin(email, password);
    } else {
      try { result = await authAPI.citizenLogin(email, password); }
      catch { result = await authAPI.adminLogin(email, password); }
    }

    if (!result?.token) throw new Error('Login failed — no token received');

    setToken(result.token);
    const user = normaliseUser(result.user);
    setCurrentUser(user);
    currentUserRef.current = user;
    saveUser(user);

    loadData(user); // parallel for admin
    startPolling(user);

    return user;
  };

  // ── register ─────────────────────────────────────────────────────────────
  const register = async (data: any): Promise<any> => {
    clearCache();
    const result = await (data.role === 'admin'
      ? authAPI.adminRegister(data)
      : authAPI.citizenRegister(data));

    if (!result?.token) throw new Error('Registration failed');

    setToken(result.token);
    const user = normaliseUser(result.user);
    setCurrentUser(user);
    currentUserRef.current = user;
    saveUser(user);
    loadData(user);
    startPolling(user);
    return user;
  };

  // ── logout ───────────────────────────────────────────────────────────────
  const logout = () => {
    stopPolling();
    clearCache();
    removeToken();
    saveUser(null);
    setCurrentUser(null);
    currentUserRef.current = null;
    setComplaints([]);
    setUsers([]);
    setLeaderboard([]);
    setStats(null);
  };

  // ── updateUser ───────────────────────────────────────────────────────────
  const updateUser = async (updates: Record<string, any>) => {
    try {
      const res = await userAPI.updateProfile(updates);
      const updated = res?.user ? normaliseUser(res.user) : { ...currentUser, ...updates };
      setCurrentUser(updated);
      currentUserRef.current = updated;
      saveUser(updated);
    } catch {
      const updated = { ...currentUser, ...updates };
      setCurrentUser(updated);
      currentUserRef.current = updated;
      saveUser(updated);
    }
  };

  // ── addComplaint ─────────────────────────────────────────────────────────
  const addComplaint = async (data: object) => {
    const res = await complaintAPI.create(data);
    if (res?.complaint) {
      const c = normaliseComplaint(res.complaint);
      setComplaints(prev => [c, ...prev]);
      setCurrentUser((u: any) => {
        if (!u) return u;
        const updated = { ...u, points: (u.points || 0) + 50, complaintsSubmitted: (u.complaintsSubmitted || 0) + 1 };
        currentUserRef.current = updated;
        saveUser(updated);
        return updated;
      });
      return c;
    }
    return null;
  };

  // ── updateComplaintStatus — optimistic ───────────────────────────────────
  const updateComplaintStatus = async (id: string, status: string, note?: string, officer?: string) => {
    const snapshot = complaints.slice();
    setComplaints(prev => prev.map(x =>
      matchId(x, id)
        ? { ...x, status, ...(note ? { adminNote: note } : {}), ...(officer ? { assignedOfficer: officer } : {}), updatedAt: new Date().toISOString().split('T')[0] }
        : x
    ));
    try {
      const apiId = getMongoId(snapshot, id);
      const res = await complaintAPI.updateStatus(apiId, status, note, officer);
      if (res?.complaint) {
        const c = normaliseComplaint(res.complaint);
        setComplaints(prev => prev.map(x => matchId(x, id) ? c : x));
      }
    } catch (err) {
      setComplaints(snapshot);
      throw err;
    }
  };

  // ── resolveComplaint ─────────────────────────────────────────────────────
  const resolveComplaint = async (id: string, photo: string, note: string, officer: string) => {
    const snapshot = complaints.slice();
    setComplaints(prev => prev.map(x =>
      matchId(x, id)
        ? { ...x, status: 'Resolved', resolvePhoto: photo, adminNote: note, assignedOfficer: officer, updatedAt: new Date().toISOString().split('T')[0] }
        : x
    ));
    try {
      const apiId = getMongoId(snapshot, id);
      const res = await complaintAPI.resolve(apiId, photo, note, officer);
      let resolved: any;
      if (res?.complaint) {
        resolved = normaliseComplaint(res.complaint);
        setComplaints(prev => prev.map(x => matchId(x, id) ? resolved : x));
      } else {
        resolved = { ...(snapshot.find(x => matchId(x, id)) || {}), status: 'Resolved', resolvePhoto: photo, adminNote: note, assignedOfficer: officer };
      }
      if (resolved) { try { await emailAPI.sendResolutionEmail(resolved); } catch {} }
      // Refresh stats after resolve so dashboard counters update instantly
      loadStats().catch(() => {});
    } catch (err) {
      setComplaints(snapshot);
      throw err;
    }
  };

  // ── deleteComplaint ───────────────────────────────────────────────────────
  const deleteComplaint = async (id: string) => {
    const snapshot = complaints.slice();
    setComplaints(prev => prev.filter(x => !matchId(x, id)));
    try {
      await complaintAPI.delete(getMongoId(snapshot, id));
    } catch (err) {
      setComplaints(snapshot);
      throw err;
    }
  };

  // ── supportComplaint ──────────────────────────────────────────────────────
  const supportComplaint = async (id: string) => {
    const apiId = getMongoId(complaints, id);
    const res = await complaintAPI.support(apiId);
    setComplaints(prev => prev.map(x =>
      matchId(x, id)
        ? { ...x, supportCount: res?.supportCount ?? (x.supportCount || 0) + 1 }
        : x
    ));
  };

  // ── submitFeedback ────────────────────────────────────────────────────────
  const submitFeedback = async (id: string, feedback: { rating: number; comment: string; resolved: any }) => {
    const apiId = getMongoId(complaints, id);
    const res = await complaintAPI.feedback(apiId, feedback);
    if (res?.complaint) {
      setComplaints(prev => prev.map(x => matchId(x, id) ? normaliseComplaint(res.complaint) : x));
    } else {
      setComplaints(prev => prev.map(x => matchId(x, id) ? { ...x, feedback } : x));
    }
    setCurrentUser((u: any) => {
      if (!u) return u;
      const updated = { ...u, points: (u.points || 0) + 25 };
      currentUserRef.current = updated;
      saveUser(updated);
      return updated;
    });
  };

  // ── refreshLeaderboard ────────────────────────────────────────────────────
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
      currentUser, complaints, users, loading, complaintsLoading, stats,
      login, register, logout, updateUser,
      addComplaint, updateComplaintStatus, resolveComplaint,
      deleteComplaint, supportComplaint, submitFeedback, refreshComplaints, refreshStats,
      leaderboard, refreshLeaderboard, myComplaints,
    }}>
      {children}
    </AppContext.Provider>
  );
};