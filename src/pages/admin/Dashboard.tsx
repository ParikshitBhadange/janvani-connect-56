import { useApp } from '@/context/AppContext';
import AdminLayout from '@/components/AdminLayout';
import { FileStack, CheckCircle, AlertTriangle, Clock, Users, Star, Brain } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { CATEGORIES } from '@/types';

const COLORS = ['hsl(217,91%,53%)', 'hsl(199,89%,48%)', 'hsl(142,72%,36%)', 'hsl(38,92%,44%)', 'hsl(0,84%,50%)'];

export default function AdminDashboard() {
  const { complaints, users } = useApp();
  const today = new Date().toISOString().split('T')[0];
  const resolvedToday = complaints.filter(c => c.status === 'Resolved' && c.updatedAt === today).length;
  const criticalPending = complaints.filter(c => c.priority === 'Critical' && c.status !== 'Resolved' && c.status !== 'Rejected').length;
  const activeCitizens = users.filter(u => u.role === 'citizen').length;
  const feedbacks = complaints.filter(c => c.feedback);
  const avgSat = feedbacks.length ? (feedbacks.reduce((s, c) => s + (c.feedback?.rating || 0), 0) / feedbacks.length * 20).toFixed(0) : '—';

  const catData = CATEGORIES.map(cat => ({ name: cat, count: complaints.filter(c => c.category === cat).length }));
  const statusData = ['Submitted', 'Under Review', 'In Progress', 'Resolved', 'Rejected'].map(s => ({ name: s, count: complaints.filter(c => c.status === s).length }));
  const dayData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { day: d.toLocaleDateString('en', { weekday: 'short' }), count: Math.floor(Math.random() * 5) + 1 };
  });

  // Ward heatmap
  const wardCounts = Array.from({ length: 20 }, (_, i) => ({ ward: i + 1, count: complaints.filter(c => c.ward === i + 1).length }));
  const maxWard = Math.max(...wardCounts.map(w => w.count), 1);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">Admin Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { icon: FileStack, label: 'Total Complaints', value: complaints.length, color: 'text-accent' },
            { icon: CheckCircle, label: 'Resolved Today', value: resolvedToday, color: 'text-success' },
            { icon: AlertTriangle, label: 'Critical Pending', value: criticalPending, color: 'text-destructive' },
            { icon: Clock, label: 'Avg Resolution', value: '4.2 days', color: 'text-warning' },
            { icon: Users, label: 'Active Citizens', value: activeCitizens, color: 'text-sky' },
            { icon: Star, label: 'Satisfaction', value: `${avgSat}%`, color: 'text-warning' },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
              <p className="text-xl font-heading font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Ward heatmap */}
        <div className="card-elevated p-5">
          <h3 className="font-heading font-semibold mb-4">Ward Heatmap</h3>
          <div className="grid grid-cols-5 gap-2">
            {wardCounts.map(w => {
              const intensity = w.count / maxWard;
              return (
                <div key={w.ward} className="rounded-lg p-3 text-center transition-all hover:scale-105"
                  style={{ backgroundColor: `hsl(217, 91%, ${100 - intensity * 47}%)`, color: intensity > 0.5 ? 'white' : 'inherit' }}>
                  <p className="text-xs font-medium">Ward {w.ward}</p>
                  <p className="text-lg font-bold">{w.count}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card-elevated p-5">
            <h3 className="font-heading font-semibold mb-4">By Category</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={catData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card-elevated p-5">
            <h3 className="font-heading font-semibold mb-4">7-Day Volume</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dayData}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(217,91%,53%)" strokeWidth={2} dot={{ fill: 'hsl(217,91%,53%)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card-elevated p-5">
            <h3 className="font-heading font-semibold mb-4">Status Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} dataKey="count" cx="50%" cy="50%" outerRadius={75} label={({ name, count }) => count > 0 ? name : ''}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* AI Intelligence */}
          <div className="card-elevated p-5">
            <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><Brain className="h-5 w-5 text-accent" /> AI Intelligence</h3>
            <div className="space-y-3">
              {[
                { title: '🎯 Priority Alert', desc: `${criticalPending} critical complaints need immediate attention in Wards 3 and 7.` },
                { title: '🔗 Deduplication', desc: 'Water supply complaints in Ward 3 can be merged (5 similar reports detected).' },
                { title: '📍 Hotspot', desc: 'Ward 7 showing 40% increase in road-related complaints this week.' },
              ].map((insight, i) => (
                <div key={i} className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm font-semibold">{insight.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{insight.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent */}
        <div className="card-elevated p-5">
          <h3 className="font-heading font-semibold mb-4">Recent Complaints</h3>
          <div className="space-y-2">
            {complaints.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="mono-id">{c.id}</span>
                <span className="flex-1 text-sm truncate">{c.title}</span>
                <span className={`badge-pill ${c.priority === 'Critical' ? 'bg-destructive text-destructive-foreground' : c.priority === 'High' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>{c.priority}</span>
                {c.isSOS && <span className="text-xs">🚨</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
