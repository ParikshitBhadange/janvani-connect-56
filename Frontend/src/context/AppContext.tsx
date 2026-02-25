import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Complaint, ComplaintFeedback, Status, getBadge } from '@/types';

interface AppState {
  users: User[];
  complaints: Complaint[];
  currentUser: User | null;
  login: (email: string, password: string) => User | null;
  logout: () => void;
  register: (user: User) => boolean;
  addComplaint: (c: Complaint) => void;
  updateComplaintStatus: (id: string, status: Status, note?: string, officer?: string) => void;
  resolveComplaint: (id: string, photo: string, note: string, officer: string) => void;
  supportComplaint: (id: string) => void;
  submitFeedback: (complaintId: string, fb: ComplaintFeedback) => void;
  addPoints: (userId: string, pts: number) => void;
  deleteComplaint: (id: string) => void;
}

const AppContext = createContext<AppState>({} as AppState);
export const useApp = () => useContext(AppContext);

const SEED_USERS: User[] = [
  { id: 'c1', role: 'citizen', name: 'Rahul Sharma', email: 'citizen1@janvani.in', phone: '9876543210', age: 28, address: '45 MG Road, Nashik', ward: 7, pincode: '422001', aadharLast4: '4532', password: 'pass123', language: 'Hindi', points: 850, badge: 'Silver', complaintsSubmitted: 4, complaintsResolved: 2, createdAt: '2025-01-15' },
  { id: 'c2', role: 'citizen', name: 'Priya Patel', email: 'citizen2@janvani.in', phone: '9876543211', age: 34, address: '12 Station Road, Nashik', ward: 3, pincode: '422003', aadharLast4: '7891', password: 'pass123', language: 'English', points: 1100, badge: 'Gold', complaintsSubmitted: 3, complaintsResolved: 1, createdAt: '2024-11-20' },
  { id: 'c3', role: 'citizen', name: 'Amit Kumar', email: 'citizen3@janvani.in', phone: '9876543212', age: 22, address: '78 College Lane, Nashik', ward: 12, pincode: '422012', aadharLast4: '2345', password: 'pass123', language: 'Hindi', points: 320, badge: 'Bronze', complaintsSubmitted: 2, complaintsResolved: 0, createdAt: '2025-03-01' },
  { id: 'a1', role: 'admin', name: 'Officer Verma', email: 'admin@janvani.in', phone: '9876543200', password: 'admin123', department: 'Roads & Infrastructure', post: 'Junior Engineer', employeeId: 'MUN-2026-0001', joinedDate: '2023-06-15', createdAt: '2023-06-15' },
];

const makeTL = (done: number[], dates: (string | null)[]) => [
  { label: 'Submitted', done: done.includes(0), date: dates[0] },
  { label: 'Under Review', done: done.includes(1), date: dates[1] },
  { label: 'In Progress', done: done.includes(2), date: dates[2] },
  { label: 'Resolved', done: done.includes(3), date: dates[3] },
];

const SEED_COMPLAINTS: Complaint[] = [
  { id: 'JV-2026-001', citizenId: 'c1', citizenName: 'Rahul Sharma', citizenPhone: '9876543210', title: 'Large Pothole on MG Road', description: 'Dangerous pothole near MG Road junction causing accidents. Approx 2ft wide and 1ft deep.', category: 'Road', priority: 'High', status: 'Submitted', ward: 7, location: 'MG Road Junction, Nashik', gpsCoords: { lat: 20.0059, lng: 73.7897 }, photo: '', resolvePhoto: '', adminNote: '', assignedOfficer: '', department: 'Roads & Infrastructure', mergedCount: 2, supportCount: 15, createdAt: '2026-02-20', updatedAt: '2026-02-20', timeline: makeTL([0], ['2026-02-20', null, null, null]), estimatedResolution: '2026-03-05', feedback: null, isSOS: false },
  { id: 'JV-2026-002', citizenId: 'c2', citizenName: 'Priya Patel', citizenPhone: '9876543211', title: 'Water Supply Disruption', description: 'No water supply in Ward 3 area for past 3 days. Multiple households affected.', category: 'Water', priority: 'Critical', status: 'Under Review', ward: 3, location: 'Station Road Area, Nashik', gpsCoords: { lat: 19.9975, lng: 73.7898 }, photo: '', resolvePhoto: '', adminNote: 'Checking with water department', assignedOfficer: 'Eng. Deshmukh', department: 'Water Supply', mergedCount: 5, supportCount: 42, createdAt: '2026-02-18', updatedAt: '2026-02-19', timeline: makeTL([0, 1], ['2026-02-18', '2026-02-19', null, null]), estimatedResolution: '2026-02-25', feedback: null, isSOS: false },
  { id: 'JV-2026-003', citizenId: 'c3', citizenName: 'Amit Kumar', citizenPhone: '9876543212', title: 'Garbage Not Collected for a Week', description: 'Municipal garbage collection has stopped in Ward 12, Colony Lane. Waste piling up.', category: 'Sanitation', priority: 'Medium', status: 'In Progress', ward: 12, location: 'Colony Lane, Ward 12, Nashik', gpsCoords: { lat: 20.0111, lng: 73.7650 }, photo: '', resolvePhoto: '', adminNote: 'Sanitation team dispatched', assignedOfficer: 'Supervisor Jadhav', department: 'Sanitation', mergedCount: 0, supportCount: 8, createdAt: '2026-02-15', updatedAt: '2026-02-21', timeline: makeTL([0, 1, 2], ['2026-02-15', '2026-02-17', '2026-02-21', null]), estimatedResolution: '2026-02-28', feedback: null, isSOS: false },
  { id: 'JV-2026-004', citizenId: 'c1', citizenName: 'Rahul Sharma', citizenPhone: '9876543210', title: 'Street Light Not Working', description: 'Street light at Savarkar Chowk has been non-functional for 2 weeks.', category: 'Electricity', priority: 'Low', status: 'Resolved', ward: 7, location: 'Savarkar Chowk, Nashik', gpsCoords: { lat: 20.0032, lng: 73.7910 }, photo: '', resolvePhoto: '', adminNote: 'Bulb replaced and wiring fixed', assignedOfficer: 'Electrician Patil', department: 'Electricity', mergedCount: 0, supportCount: 5, createdAt: '2026-01-28', updatedAt: '2026-02-10', timeline: makeTL([0, 1, 2, 3], ['2026-01-28', '2026-01-30', '2026-02-05', '2026-02-10']), estimatedResolution: '2026-02-10', feedback: { rating: 4, comment: 'Quick resolution, thank you!', resolved: 'yes' }, isSOS: false },
  { id: 'JV-2026-005', citizenId: 'c2', citizenName: 'Priya Patel', citizenPhone: '9876543211', title: 'Illegal Construction on Footpath', description: 'Unauthorized construction blocking pedestrian footpath near market area.', category: 'Other', priority: 'Medium', status: 'Rejected', ward: 3, location: 'Market Road, Nashik', gpsCoords: { lat: 19.9980, lng: 73.7905 }, photo: '', resolvePhoto: '', adminNote: 'Not under municipal jurisdiction. Forwarded to planning authority.', assignedOfficer: '', department: '', mergedCount: 0, supportCount: 3, createdAt: '2026-02-10', updatedAt: '2026-02-12', timeline: makeTL([0, 1], ['2026-02-10', '2026-02-12', null, null]), estimatedResolution: '', feedback: null, isSOS: false },
  { id: 'JV-2026-006', citizenId: 'c1', citizenName: 'Rahul Sharma', citizenPhone: '9876543210', title: 'Electrical Fire Hazard — Exposed Wires', description: 'Exposed high-voltage wires near school. Extremely dangerous for children.', category: 'Electricity', priority: 'Critical', status: 'Submitted', ward: 7, location: 'Near DPS School, Nashik', gpsCoords: { lat: 20.0045, lng: 73.7888 }, photo: '', resolvePhoto: '', adminNote: '', assignedOfficer: '', department: 'Electricity', mergedCount: 0, supportCount: 28, createdAt: '2026-02-24', updatedAt: '2026-02-24', timeline: makeTL([0], ['2026-02-24', null, null, null]), estimatedResolution: '2026-02-25', feedback: null, isSOS: true, sosType: 'Electric' },
];

const STORAGE_KEY = 'janvani_state';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const d = JSON.parse(saved);
      setUsers(d.users || SEED_USERS);
      setComplaints(d.complaints || SEED_COMPLAINTS);
      if (d.currentUserId) {
        const u = (d.users || SEED_USERS).find((u: User) => u.id === d.currentUserId);
        if (u) setCurrentUser(u);
      }
    } else {
      setUsers(SEED_USERS);
      setComplaints(SEED_COMPLAINTS);
    }
  }, []);

  const persist = useCallback((u: User[], c: Complaint[], cu: User | null) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ users: u, complaints: c, currentUserId: cu?.id || null }));
  }, []);

  useEffect(() => {
    if (users.length) persist(users, complaints, currentUser);
  }, [users, complaints, currentUser, persist]);

  const login = (email: string, password: string): User | null => {
    const u = users.find(u => u.email === email && u.password === password);
    if (u) setCurrentUser(u);
    return u || null;
  };

  const logout = () => setCurrentUser(null);

  const register = (user: User): boolean => {
    if (users.find(u => u.email === user.email)) return false;
    const updated = [...users, user];
    setUsers(updated);
    return true;
  };

  const addComplaint = (c: Complaint) => {
    setComplaints(prev => [c, ...prev]);
    addPoints(c.citizenId, 50);
    setUsers(prev => prev.map(u => u.id === c.citizenId ? { ...u, complaintsSubmitted: (u.complaintsSubmitted || 0) + 1 } : u));
  };

  const updateComplaintStatus = (id: string, status: Status, note?: string, officer?: string) => {
    setComplaints(prev => prev.map(c => {
      if (c.id !== id) return c;
      const tl = c.timeline.map((t, i) => {
        const idx = { 'Submitted': 0, 'Under Review': 1, 'In Progress': 2, 'Resolved': 3 }[status] ?? 0;
        return i <= idx ? { ...t, done: true, date: t.date || new Date().toISOString().split('T')[0] } : t;
      });
      return { ...c, status, timeline: tl, adminNote: note || c.adminNote, assignedOfficer: officer || c.assignedOfficer, updatedAt: new Date().toISOString().split('T')[0] };
    }));
  };

  const resolveComplaint = (id: string, photo: string, note: string, officer: string) => {
    setComplaints(prev => prev.map(c => {
      if (c.id !== id) return c;
      const tl = c.timeline.map(t => ({ ...t, done: true, date: t.date || new Date().toISOString().split('T')[0] }));
      return { ...c, status: 'Resolved' as const, resolvePhoto: photo, adminNote: note, assignedOfficer: officer, timeline: tl, updatedAt: new Date().toISOString().split('T')[0] };
    }));
    const comp = complaints.find(c => c.id === id);
    if (comp) addPoints(comp.citizenId, 100);
  };

  const supportComplaint = (id: string) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, supportCount: c.supportCount + 1 } : c));
    if (currentUser) addPoints(currentUser.id, 10);
  };

  const submitFeedback = (complaintId: string, fb: ComplaintFeedback) => {
    setComplaints(prev => prev.map(c => c.id === complaintId ? { ...c, feedback: fb } : c));
    const comp = complaints.find(c => c.id === complaintId);
    if (comp) addPoints(comp.citizenId, 25);
  };

  const addPoints = (userId: string, pts: number) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const newPts = (u.points || 0) + pts;
      return { ...u, points: newPts, badge: getBadge(newPts) };
    }));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, points: (prev.points || 0) + pts, badge: getBadge((prev.points || 0) + pts) } : prev);
    }
  };

  const deleteComplaint = (id: string) => {
    setComplaints(prev => prev.filter(c => c.id !== id));
  };

  return (
    <AppContext.Provider value={{ users, complaints, currentUser, login, logout, register, addComplaint, updateComplaintStatus, resolveComplaint, supportComplaint, submitFeedback, addPoints, deleteComplaint }}>
      {children}
    </AppContext.Provider>
  );
}
