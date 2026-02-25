import { useApp } from '@/context/AppContext';
import CitizenLayout from '@/components/CitizenLayout';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, Clock, Star, Plus, Search, AlertTriangle } from 'lucide-react';
import { getPriorityClass, getStatusClass } from '@/types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['hsl(217,91%,53%)', 'hsl(199,89%,48%)', 'hsl(142,72%,36%)', 'hsl(38,92%,44%)', 'hsl(0,84%,50%)'];

export default function CitizenDashboard() {
  const { currentUser, complaints } = useApp();
  const my = complaints.filter(c => c.citizenId === currentUser?.id);
  const resolved = my.filter(c => c.status === 'Resolved').length;
  const inProgress = my.filter(c => c.status === 'In Progress' || c.status === 'Under Review').length;

  const catData = Object.entries(my.reduce((acc, c) => { acc[c.category] = (acc[c.category] || 0) + 1; return acc; }, {} as Record<string, number>))
    .map(([name, value]) => ({ name, value }));

  const monthData = ['Jan', 'Feb', 'Mar'].map(m => ({ month: m, count: Math.floor(Math.random() * 5) + 1 }));

  return (
    <CitizenLayout>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: FileText, label: 'My Reports', value: my.length, color: 'text-accent' },
            { icon: CheckCircle, label: 'Resolved', value: resolved, color: 'text-success' },
            { icon: Clock, label: 'In Progress', value: inProgress, color: 'text-warning' },
            { icon: Star, label: 'My Points', value: currentUser?.points || 0, color: 'text-accent' },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${s.color}`}><s.icon className="h-5 w-5" /></div>
                <div>
                  <p className="text-2xl font-heading font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="flex gap-3">
          <Button variant="hero" size="sm" asChild><Link to="/citizen/report"><Plus className="h-4 w-4" /> Report</Link></Button>
          <Button variant="outline" size="sm" asChild><Link to="/citizen/track"><Search className="h-4 w-4" /> Track</Link></Button>
          <Button variant="destructive" size="sm" asChild><Link to="/citizen/sos"><AlertTriangle className="h-4 w-4" /> SOS</Link></Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Complaints list */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-heading font-semibold">My Complaints</h3>
            {my.length === 0 && <p className="text-muted-foreground text-sm">No complaints yet. Start by reporting an issue.</p>}
            {my.map(c => (
              <Link key={c.id} to={`/citizen/track?id=${c.id}`} className="card-elevated p-4 flex items-center gap-4 block">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="mono-id">{c.id}</span>
                    {c.isSOS && <span className="badge-pill bg-destructive text-destructive-foreground">🚨 SOS</span>}
                  </div>
                  <p className="font-medium text-sm truncate">{c.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="badge-pill bg-muted text-muted-foreground">{c.category}</span>
                    <span className={getPriorityClass(c.priority)}>{c.priority}</span>
                    <span className={getStatusClass(c.status)}>{c.status}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{c.createdAt}</span>
              </Link>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Profile card */}
            <div className="card-elevated p-5 text-center">
              <div className="h-16 w-16 rounded-full bg-accent text-accent-foreground flex items-center justify-center mx-auto text-2xl font-bold mb-3">{currentUser?.name?.[0]}</div>
              <h4 className="font-heading font-semibold">{currentUser?.name}</h4>
              <p className="text-xs text-muted-foreground">Ward {currentUser?.ward}</p>
              <div className={`inline-block mt-2 badge-pill ${currentUser?.badge === 'Gold' ? 'bg-warning/20 text-warning' : currentUser?.badge === 'Silver' ? 'bg-muted text-foreground' : 'bg-warning/10 text-warning'}`}>
                {currentUser?.badge === 'Gold' ? '🥇' : currentUser?.badge === 'Silver' ? '🥈' : '🥉'} {currentUser?.badge}
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>{currentUser?.points} pts</span>
                  <span>{currentUser?.badge === 'Gold' ? '1000+' : currentUser?.badge === 'Silver' ? '1000' : '500'}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.min(100, ((currentUser?.points || 0) % 500) / 5)}%` }} />
                </div>
              </div>
            </div>

            {/* Charts */}
            {catData.length > 0 && (
              <div className="card-elevated p-4">
                <h4 className="text-sm font-heading font-semibold mb-3">By Category</h4>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={catData} dataKey="value" cx="50%" cy="50%" outerRadius={60} label={({ name }) => name}>
                      {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="card-elevated p-4">
              <h4 className="text-sm font-heading font-semibold mb-3">Monthly Submissions</h4>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={monthData}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Bar dataKey="count" fill="hsl(217,91%,53%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </CitizenLayout>
  );
}
