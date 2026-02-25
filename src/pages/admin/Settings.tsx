import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Shield, Bell, Settings as SettingsIcon } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AdminSettings() {
  const { currentUser, complaints } = useApp();
  const { toast } = useToast();
  const [tab, setTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'system', label: 'System', icon: SettingsIcon },
  ];

  const downloadAll = () => {
    const data = complaints.map(c => ({
      ID: c.id, Title: c.title, Category: c.category, Priority: c.priority,
      Status: c.status, Ward: c.ward, Citizen: c.citizenName, Phone: c.citizenPhone,
      Date: c.createdAt, Updated: c.updatedAt, Officer: c.assignedOfficer,
      Note: c.adminNote, Rating: c.feedback?.rating || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'All Data');
    XLSX.writeFile(wb, 'janvani_all_data.xlsx');
    toast({ title: '📥 All data exported' });
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-heading font-bold">Settings</h1>

        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${tab === t.id ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>
              <t.icon className="h-4 w-4" /><span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <div className="card-elevated p-6 space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-16 w-16 rounded-full bg-warning flex items-center justify-center text-warning-foreground text-2xl font-bold">{currentUser?.name?.[0]}</div>
              <div>
                <h3 className="font-heading font-semibold">{currentUser?.name}</h3>
                <p className="text-sm text-muted-foreground">{currentUser?.employeeId}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name</Label><Input defaultValue={currentUser?.name} /></div>
              <div><Label>Email</Label><Input defaultValue={currentUser?.email} /></div>
              <div><Label>Phone</Label><Input defaultValue={currentUser?.phone} /></div>
              <div><Label>Department</Label><Input defaultValue={currentUser?.department} /></div>
              <div><Label>Post</Label><Input defaultValue={currentUser?.post} /></div>
              <div><Label>Joined</Label><Input defaultValue={currentUser?.joinedDate} disabled /></div>
            </div>
            <Button variant="hero" onClick={() => toast({ title: '✅ Profile updated (demo)' })}>Save Changes</Button>
          </div>
        )}

        {tab === 'security' && (
          <div className="card-elevated p-6 space-y-4">
            <h3 className="font-heading font-semibold">Change Password</h3>
            <div><Label>Current Password</Label><Input type="password" /></div>
            <div><Label>New Password</Label><Input type="password" /></div>
            <div><Label>Confirm New Password</Label><Input type="password" /></div>
            <Button variant="hero" onClick={() => toast({ title: '✅ Password updated (demo)' })}>Update Password</Button>
            <hr className="border-border" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Two-Factor Authentication</p>
                <p className="text-xs text-muted-foreground">Add extra security to your account</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast({ title: '🔜 Coming soon' })}>Enable</Button>
            </div>
          </div>
        )}

        {tab === 'notifications' && (
          <div className="card-elevated p-6 space-y-4">
            {['New complaints', 'SOS alerts', 'Feedback received', 'Weekly reports'].map(n => (
              <div key={n} className="flex items-center justify-between py-2">
                <span className="text-sm">{n}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-accent after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                </label>
              </div>
            ))}
          </div>
        )}

        {tab === 'system' && (
          <div className="card-elevated p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Download All Data</p>
                <p className="text-xs text-muted-foreground">Export complete complaint database</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadAll}>Export Excel</Button>
            </div>
            <hr className="border-border" />
            <div>
              <p className="font-medium text-sm">App Version</p>
              <p className="text-xs text-muted-foreground">JANVANI v1.0.0 — Built with ❤️</p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
