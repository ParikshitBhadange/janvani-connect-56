import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Download, Trash2, Eye, UserPlus, X, Users, Link2 } from 'lucide-react';
import { getPriorityClass, getStatusClass, CATEGORIES, STATUSES, PRIORITIES, WARDS, type Status } from '@/types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminComplaints() {
  const { complaints, updateComplaintStatus, deleteComplaint } = useApp();
  const { toast } = useToast();

  const [catFilter, setCatFilter] = useState('');
  const [priFilter, setPriFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [wardFilter, setWardFilter] = useState(0);
  const [search, setSearch] = useState('');
  const [viewId, setViewId] = useState<string | null>(null);

  const filtered = complaints.filter(c => {
    if (catFilter && c.category !== catFilter) return false;
    if (priFilter && c.priority !== priFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    if (wardFilter && c.ward !== wardFilter) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const viewComp = complaints.find(c => c.id === viewId);

  const exportExcel = () => {
    const data = filtered.map(c => ({
      ID: c.id, Title: c.title, Category: c.category, Priority: c.priority,
      Status: c.status, Ward: c.ward, Citizen: c.citizenName, Date: c.createdAt,
      'Resolution Date': c.status === 'Resolved' ? c.updatedAt : '', 'Admin Note': c.adminNote,
      Rating: c.feedback?.rating || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Complaints');
    XLSX.writeFile(wb, 'janvani_complaints.xlsx');
    toast({ title: '📥 Excel exported' });
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('JANVANI Complaints Report', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    autoTable(doc, {
      startY: 35,
      head: [['ID', 'Title', 'Category', 'Priority', 'Status', 'Ward', 'Date']],
      body: filtered.map(c => [c.id, c.title.slice(0, 30), c.category, c.priority, c.status, `W${c.ward}`, c.createdAt]),
      styles: { fontSize: 8 },
    });
    doc.save('janvani_complaints.pdf');
    toast({ title: '📥 PDF exported' });
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-heading font-bold">Complaints Management</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportExcel}><Download className="h-4 w-4" /> Excel</Button>
            <Button size="sm" variant="outline" onClick={exportPDF}><Download className="h-4 w-4" /> PDF</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Search ID or title..." className="w-48" value={search} onChange={e => setSearch(e.target.value)} />
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={priFilter} onChange={e => setPriFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={wardFilter} onChange={e => setWardFilter(Number(e.target.value))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value={0}>All Wards</option>
            {WARDS.map(w => <option key={w} value={w}>Ward {w}</option>)}
          </select>
        </div>

        <p className="text-sm text-muted-foreground">{filtered.length} complaints</p>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(c => (
            <div key={c.id} className={`card-elevated p-4 space-y-3 ${c.isSOS ? 'border-l-4 border-l-destructive' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="mono-id">{c.id}</span>
                  {c.isSOS && <span className="badge-pill bg-destructive text-destructive-foreground">🚨 SOS</span>}
                </div>
                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Users className="h-3 w-3" /> {c.supportCount}
                  {c.mergedCount > 0 && <><Link2 className="h-3 w-3 ml-2" /> {c.mergedCount}</>}
                </div>
              </div>

              <h3 className="font-medium text-sm">{c.title}</h3>

              <div className="flex flex-wrap gap-1.5">
                <span className="badge-pill bg-muted text-muted-foreground">{c.category}</span>
                <span className={getPriorityClass(c.priority)}>{c.priority}</span>
                <span className="badge-pill bg-muted text-muted-foreground">W{c.ward}</span>
                <span className="text-xs text-muted-foreground">{c.createdAt}</span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={c.status}
                  onChange={e => { updateComplaintStatus(c.id, e.target.value as Status); toast({ title: `Status → ${e.target.value}` }); }}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs flex-1"
                >
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <Button size="sm" variant="ghost" onClick={() => setViewId(c.id)}><Eye className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => { deleteComplaint(c.id); toast({ title: 'Complaint deleted' }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>

        {/* View modal */}
        {viewComp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4">
            <div className="bg-card rounded-lg p-6 w-full max-w-lg shadow-xl animate-fade-in max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between mb-4">
                <h3 className="font-heading font-semibold">{viewComp.title}</h3>
                <button onClick={() => setViewId(null)}><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-3 text-sm">
                <p className="mono-id">{viewComp.id}</p>
                <p>{viewComp.description}</p>
                <div className="flex flex-wrap gap-2">
                  <span className={getPriorityClass(viewComp.priority)}>{viewComp.priority}</span>
                  <span className={getStatusClass(viewComp.status)}>{viewComp.status}</span>
                </div>
                <p><strong>Citizen:</strong> {viewComp.citizenName} ({viewComp.citizenPhone})</p>
                <p><strong>Ward:</strong> {viewComp.ward} | <strong>Location:</strong> {viewComp.location}</p>
                <p><strong>GPS:</strong> {viewComp.gpsCoords.lat}, {viewComp.gpsCoords.lng}</p>
                {viewComp.assignedOfficer && <p><strong>Officer:</strong> {viewComp.assignedOfficer}</p>}
                {viewComp.adminNote && <p><strong>Note:</strong> {viewComp.adminNote}</p>}
                {viewComp.photo && <img src={viewComp.photo} className="rounded-lg max-h-40 object-cover" alt="Issue" />}
                {viewComp.resolvePhoto && <><p className="font-semibold">Resolution Photo:</p><img src={viewComp.resolvePhoto} className="rounded-lg max-h-40 object-cover" alt="Resolved" /></>}
                {viewComp.feedback && <p><strong>Feedback:</strong> {'⭐'.repeat(viewComp.feedback.rating)} — {viewComp.feedback.comment}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
