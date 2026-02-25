import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, complaintAPI, userAPI, getToken, setToken, removeToken } from '@/lib/api';

interface AppContextType {
  currentUser       : any | null;
  complaints        : any[];
  users             : any[];
  loading           : boolean;
  login             : (email: string, password: string, role?: 'citizen' | 'admin') => Promise<any>;
  register          : (data: any) => Promise<any>;
  logout            : () => void;
  addComplaint      : (data: object) => Promise<any>;
  updateComplaintStatus : (id: string, status: string, note?: string, officer?: string) => Promise<void>;
  resolveComplaint  : (id: string, photo: string, note: string, officer: string) => Promise<void>;
  deleteComplaint   : (id: string) => Promise<void>;
  supportComplaint  : (id: string) => Promise<void>;
  submitFeedback    : (id: string, feedback: { rating: number; comment: string; resolved: any }) => Promise<void>;
  refreshComplaints : () => Promise<void>;
  leaderboard       : any[];
  refreshLeaderboard: (ward?: number) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser,  setCurrentUser]  = useState<any | null>(null);
  const [complaints,   setComplaints]   = useState<any[]>([]);
  const [users,        setUsers]        = useState<any[]>([]);
  const [leaderboard,  setLeaderboard]  = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const restore = async () => {
      const token = getToken();
      if (token) {
        try {
          const res = await authAPI.getMe();
          if (res?.user) {
            setCurrentUser(res.user);
            await loadComplaints();
          }
        } catch {
          removeToken();
        }
      }
      setLoading(false);
    };
    restore();
  }, []);

  const loadComplaints = useCallback(async () => {
    try {
      const res = await complaintAPI.getAll();
      if (res?.complaints) setComplaints(res.complaints);
    } catch (err) {
      console.error('loadComplaints error:', err);
    }
  }, []);

  const refreshComplaints = useCallback(async () => {
    await loadComplaints();
  }, [loadComplaints]);

  const login = async (email: string, password: string, role?: 'citizen' | 'admin'): Promise<any> => {
    let result: any = null;
    if (role === 'admin') {
      result = await authAPI.adminLogin(email, password);
    } else if (role === 'citizen') {
      result = await authAPI.citizenLogin(email, password);
    } else {
      try {
        result = await authAPI.citizenLogin(email, password);
      } catch {
        result = await authAPI.adminLogin(email, password);
      }
    }
    if (!result?.token) throw new Error('Login failed');
    setToken(result.token);
    setCurrentUser(result.user);
    await loadComplaints();
    return result.user;
  };

  const register = async (data: any): Promise<any> => {
    let result: any;
    if (data.role === 'admin') {
      result = await authAPI.adminRegister(data);
    } else {
      result = await authAPI.citizenRegister(data);
    }
    if (!result?.token) throw new Error('Registration failed');
    setToken(result.token);
    setCurrentUser(result.user);
    await loadComplaints();
    return result.user;
  };

  const logout = () => {
    removeToken();
    setCurrentUser(null);
    setComplaints([]);
  };

  const addComplaint = async (data: object) => {
    const res = await complaintAPI.create(data);
    if (res?.complaint) {
      setComplaints(prev => [res.complaint, ...prev]);
      setCurrentUser((u: any) => u ? { ...u, points: (u.points || 0) + 50 } : u);
    }
    return res?.complaint;
  };

  const updateComplaintStatus = async (id: string, status: string, note?: string, officer?: string) => {
    const res = await complaintAPI.updateStatus(id, status, note, officer);
    if (res?.complaint) {
      setComplaints(prev => prev.map(c =>
        (c.complaintId === id || c._id === id) ? res.complaint : c
      ));
    }
  };

  const resolveComplaint = async (id: string, photo: string, note: string, officer: string) => {
    const res = await complaintAPI.resolve(id, photo, note, officer);
    if (res?.complaint) {
      setComplaints(prev => prev.map(c =>
        (c.complaintId === id || c._id === id) ? res.complaint : c
      ));
    }
  };

  const deleteComplaint = async (id: string) => {
    await complaintAPI.delete(id);
    setComplaints(prev => prev.filter(c => c.complaintId !== id && c._id !== id));
  };

  const supportComplaint = async (id: string) => {
    const res = await complaintAPI.support(id);
    if (res?.supportCount !== undefined) {
      setComplaints(prev => prev.map(c =>
        (c.complaintId === id || c._id === id) ? { ...c, supportCount: res.supportCount } : c
      ));
    }
  };

  const submitFeedback = async (id: string, feedback: any) => {
    const res = await complaintAPI.feedback(id, feedback);
    if (res?.complaint) {
      setComplaints(prev => prev.map(c =>
        (c.complaintId === id || c._id === id) ? res.complaint : c
      ));
      setCurrentUser((u: any) => u ? { ...u, points: (u.points || 0) + 25 } : u);
    }
  };

  const refreshLeaderboard = async (ward?: number) => {
    try {
      const res = await userAPI.getLeaderboard(ward);
      if (res?.leaderboard) {
        setLeaderboard(res.leaderboard);
        setUsers(res.leaderboard);
      }
    } catch (err) {
      console.error('refreshLeaderboard error:', err);
    }
  };

  return (
    <AppContext.Provider value={{
      currentUser, complaints, users, loading,
      login, register, logout,
      addComplaint, updateComplaintStatus, resolveComplaint,
      deleteComplaint, supportComplaint, submitFeedback, refreshComplaints,
      leaderboard, refreshLeaderboard,
    }}>
      {children}
    </AppContext.Provider>
  );
};