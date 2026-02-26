import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { pageMeta } from '@/lib/pageData';

const DEPARTMENTS = ['Roads & Infrastructure', 'Water Supply', 'Sanitation', 'Electricity', 'Planning', 'General Administration'];

export default function AdminLogin() {
  usePageMeta(pageMeta.AdminLogin);
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [showPw, setShowPw] = useState(false);
  const { login, register } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rName, setRName] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rPhone, setRPhone] = useState('');
  const [rDept, setRDept] = useState(DEPARTMENTS[0]);
  const [rPost, setRPost] = useState('');
  const [rJoined, setRJoined] = useState('');
  const [rPw, setRPw] = useState('');

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const u = await login(email, password, 'admin');
    if (u && u.role === 'admin') {
      toast({ title: '✅ Welcome, Officer!', description: `Logged in as ${u.name}` });
      navigate('/admin/dashboard');
    }
  } catch (err: any) {
    toast({ title: '❌ Login failed', description: err.message || 'Invalid credentials', variant: 'destructive' });
  }
};

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const empId = `MUN-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const ok = register({
      id: `a${Date.now()}`, role: 'admin', name: rName, email: rEmail, phone: rPhone,
      password: rPw, department: rDept, post: rPost, employeeId: empId, joinedDate: rJoined,
      createdAt: new Date().toISOString().split('T')[0],
    });
    if (ok) {
      toast({ title: '🎉 Registration successful!', description: `Employee ID: ${empId}` });
      setTab('login');
    } else {
      toast({ title: 'Email already registered', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary via-primary to-warning/30 items-center justify-center p-12">
        <div className="text-center text-primary-foreground max-w-sm">
          <div className="text-6xl mb-6">🏛️</div>
          <h2 className="text-3xl font-heading font-bold mb-4">Municipal Officer Portal</h2>
          <p className="text-primary-foreground/80 font-body">Manage citizen grievances, resolve issues, and monitor ward performance. Official use only.</p>
          <div className="mt-6 inline-block bg-warning/20 rounded-full px-4 py-2 text-sm font-semibold text-warning">⚠️ Official Use Only</div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <span className="text-2xl font-heading font-bold text-primary">जनवाणी</span>
            <span className="text-xs text-muted-foreground">ADMIN</span>
          </Link>

          <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1">
            {(['login', 'register'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === t ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}>
                {t === 'login' ? 'Login' : 'Register'}
              </button>
            ))}
          </div>

          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@janvani.in" required /></div>
              <div className="relative">
                <Label>Password</Label>
                <Input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" className="absolute right-3 top-8 text-muted-foreground" onClick={() => setShowPw(!showPw)}>{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
              <Button type="submit" variant="hero" className="w-full">Login</Button>
              <p className="text-xs text-muted-foreground text-center">Demo: admin@janvani.in / admin123</p>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div><Label>Full Name</Label><Input value={rName} onChange={e => setRName(e.target.value)} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input type="email" value={rEmail} onChange={e => setREmail(e.target.value)} required /></div>
                <div><Label>Phone</Label><Input value={rPhone} onChange={e => setRPhone(e.target.value)} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Department</Label><select value={rDept} onChange={e => setRDept(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select></div>
                <div><Label>Post/Designation</Label><Input value={rPost} onChange={e => setRPost(e.target.value)} required /></div>
              </div>
              <div><Label>Joining Date</Label><Input type="date" value={rJoined} onChange={e => setRJoined(e.target.value)} required /></div>
              <div><Label>Password</Label><Input type="password" value={rPw} onChange={e => setRPw(e.target.value)} required /></div>
              <Button type="submit" variant="hero" className="w-full">Register</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
