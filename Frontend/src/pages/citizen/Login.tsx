import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { WARDS } from '@/types';

export default function CitizenLogin() {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login, register } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register
  const [rName, setRName] = useState('');
  const [rPhone, setRPhone] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rAge, setRAge] = useState('');
  const [rAddress, setRAddress] = useState('');
  const [rWard, setRWard] = useState('1');
  const [rPincode, setRPincode] = useState('');
  const [rAadhar, setRAadhar] = useState('');
  const [rPw, setRPw] = useState('');
  const [rPw2, setRPw2] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const u = await login(email, password, 'citizen');
      if (u && u.role === 'citizen') {
        toast({ title: '✅ Welcome back!', description: `Logged in as ${u.name}` });
        navigate('/citizen/dashboard');
      } else if (u && u.role === 'admin') {
        // Wrong portal — redirect to admin
        toast({ title: '⚠️ Admin account detected', description: 'Redirecting to admin portal' });
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      toast({
        title: '❌ Login failed',
        description: err.message || 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (rPw !== rPw2) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const u = await register({
        role: 'citizen',
        name: rName,
        email: rEmail,
        phone: rPhone,
        age: parseInt(rAge),
        address: rAddress,
        ward: parseInt(rWard),
        pincode: rPincode,
        aadharLast4: rAadhar,
        password: rPw,
        language: 'English',
        points: 0,
        badge: 'Bronze',
        complaintsSubmitted: 0,
        complaintsResolved: 0,
        createdAt: new Date().toISOString().split('T')[0],
      });
      toast({ title: '🎉 Registration successful!', description: `Welcome, ${u.name}!` });
      navigate('/citizen/dashboard');
    } catch (err: any) {
      toast({
        title: '❌ Registration failed',
        description: err.message || 'Email may already be registered',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailInput = (document.getElementById('forgot-email') as HTMLInputElement)?.value;
    if (!emailInput) {
      toast({ title: 'Enter your email first', variant: 'destructive' });
      return;
    }
    try {
      toast({ title: '📧 OTP sent to your email (demo)' });
    } catch {
      toast({ title: 'Failed to send OTP', variant: 'destructive' });
    }
  };

  const pwStrength = rPw.length === 0 ? 0 : rPw.length < 4 ? 1 : rPw.length < 8 ? 2 : 3;
  const pwColors = ['bg-muted', 'bg-destructive', 'bg-warning', 'bg-success'];

  return (
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <span className="text-2xl font-heading font-bold text-primary">जनवाणी</span>
            <span className="text-xs text-muted-foreground">CITIZEN</span>
          </Link>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1">
            {(['login', 'register', 'forgot'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  tab === t ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
                }`}
              >
                {t === 'login' ? 'Login' : t === 'register' ? 'Register' : 'Forgot Password'}
              </button>
            ))}
          </div>

          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="citizen1@janvani.in"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="relative">
                <Label>Password</Label>
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-8 text-muted-foreground"
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Logging in…</> : 'Login'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Demo: citizen1@janvani.in / pass123
              </p>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <Label>Full Name</Label>
                <Input value={rName} onChange={e => setRName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Phone</Label>
                  <Input value={rPhone} onChange={e => setRPhone(e.target.value)} required />
                </div>
                <div>
                  <Label>Age</Label>
                  <Input type="number" value={rAge} onChange={e => setRAge(e.target.value)} required />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={rEmail} onChange={e => setREmail(e.target.value)} required />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={rAddress} onChange={e => setRAddress(e.target.value)} required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Ward</Label>
                  <select
                    value={rWard}
                    onChange={e => setRWard(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {WARDS.map(w => <option key={w} value={w}>Ward {w}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Pincode</Label>
                  <Input value={rPincode} onChange={e => setRPincode(e.target.value)} required />
                </div>
                <div>
                  <Label>Aadhar (last 4)</Label>
                  <Input maxLength={4} value={rAadhar} onChange={e => setRAadhar(e.target.value)} required />
                </div>
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={rPw}
                  onChange={e => setRPw(e.target.value)}
                  required
                />
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full ${i <= pwStrength ? pwColors[pwStrength] : 'bg-muted'}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={rPw2}
                  onChange={e => setRPw2(e.target.value)}
                  required
                />
                {rPw2 && rPw !== rPw2 && (
                  <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                )}
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Registering…</> : 'Register'}
              </Button>
            </form>
          )}

          {tab === 'forgot' && (
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input id="forgot-email" type="email" placeholder="Enter your email" />
              </div>
              <Button variant="hero" className="w-full" onClick={handleForgotPassword}>
                Send OTP
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right decorative panel */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary to-accent items-center justify-center p-12">
        <div className="text-center text-primary-foreground max-w-sm">
          <div className="text-6xl mb-6">🏠</div>
          <h2 className="text-3xl font-heading font-bold mb-4">Citizen Portal</h2>
          <p className="text-primary-foreground/80 font-body">
            Report civic issues, track resolutions in real-time, and earn rewards for active
            participation in urban governance.
          </p>
        </div>
      </div>
    </div>
  );
}