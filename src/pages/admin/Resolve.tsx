import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Camera, CheckCircle, MapPin } from 'lucide-react';
import { getPriorityClass, getStatusClass } from '@/types';

export default function AdminResolve() {
  const { complaints, resolveComplaint } = useApp();
  const { toast } = useToast();

  const inProgress = complaints.filter(c => c.status === 'In Progress' || c.status === 'Under Review' || c.status === 'Submitted');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [resolvePhoto, setResolvePhoto] = useState('');
  const [note, setNote] = useState('');
  const [officer, setOfficer] = useState('');
  const [confirming, setConfirming] = useState(false);

  const selected = complaints.find(c => c.id === selectedId);

  const filtered = inProgress.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase())
  );

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setResolvePhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleResolve = () => {
    if (!selectedId) return;
    resolveComplaint(selectedId, resolvePhoto, note, officer);
    toast({ title: '✅ Complaint resolved!', description: `${selectedId} marked as Resolved. +100 pts to citizen.` });
    setSelectedId(null);
    setResolvePhoto('');
    setNote('');
    setOfficer('');
    setConfirming(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-heading font-bold">Resolve & Upload Proof</h1>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: complaint list */}
          <div className="lg:col-span-2 space-y-3">
            <Input placeholder="Search complaints..." value={search} onChange={e => setSearch(e.target.value)} />
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {filtered.map(c => (
                <button key={c.id} onClick={() => { setSelectedId(c.id); setConfirming(false); }}
                  className={`w-full text-left card-elevated p-3 transition-all ${selectedId === c.id ? 'ring-2 ring-accent' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="mono-id">{c.id}</span>
                    <span className={getStatusClass(c.status)}>{c.status}</span>
                    {c.isSOS && <span className="text-xs">🚨</span>}
                  </div>
                  <p className="text-sm font-medium truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground">Ward {c.ward} • {c.category}</p>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No pending complaints</p>}
            </div>
          </div>

          {/* Right: resolve form */}
          <div className="lg:col-span-3">
            {selected ? (
              <div className="card-elevated p-6 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="mono-id">{selected.id}</span>
                    <span className={getPriorityClass(selected.priority)}>{selected.priority}</span>
                    <span className={getStatusClass(selected.status)}>{selected.status}</span>
                  </div>
                  <h2 className="text-lg font-heading font-semibold">{selected.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <p><strong>Citizen:</strong> {selected.citizenName}</p>
                  <p><strong>Phone:</strong> {selected.citizenPhone}</p>
                  <p><strong>Ward:</strong> {selected.ward}</p>
                  <p><strong>Category:</strong> {selected.category}</p>
                </div>

                {selected.photo && <img src={selected.photo} className="rounded-lg max-h-40 object-cover" alt="Issue" />}

                <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-2">
                  <MapPin className="h-4 w-4 text-accent" />
                  <span>{selected.location} ({selected.gpsCoords.lat}, {selected.gpsCoords.lng})</span>
                </div>

                {/* Timeline */}
                <div className="flex items-center gap-2">
                  {selected.timeline.map((t, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <div className={`h-3 w-3 rounded-full ${t.done ? 'bg-accent' : 'bg-muted'}`} />
                      <span className="text-[10px] text-muted-foreground">{t.label}</span>
                      {i < 3 && <div className={`w-6 h-0.5 ${t.done ? 'bg-accent' : 'bg-muted'}`} />}
                    </div>
                  ))}
                </div>

                <hr className="border-border" />

                {/* Resolution form */}
                <h3 className="font-heading font-semibold">Resolution</h3>

                <div>
                  <Label>Upload Resolution Photo</Label>
                  <label className="mt-2 border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center cursor-pointer hover:border-accent transition-colors">
                    {resolvePhoto ? <img src={resolvePhoto} className="max-h-32 rounded-lg object-cover" alt="Resolve" /> : (
                      <><Camera className="h-8 w-8 text-muted-foreground mb-2" /><span className="text-sm text-muted-foreground">Upload photo proof</span></>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                  </label>
                </div>

                <div><Label>Resolution Notes</Label><Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Describe the resolution..." rows={3} /></div>
                <div><Label>Assigned Officer</Label><Input value={officer} onChange={e => setOfficer(e.target.value)} placeholder="Officer name" /></div>

                {!confirming ? (
                  <Button variant="success" className="w-full" onClick={() => setConfirming(true)}>
                    <CheckCircle className="h-4 w-4" /> Mark as Resolved
                  </Button>
                ) : (
                  <div className="bg-success/5 border border-success/20 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-medium">Confirm resolution of {selected.id}?</p>
                    <p className="text-xs text-muted-foreground">This will mark the complaint as resolved and award 100 points to the citizen.</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
                      <Button variant="success" size="sm" onClick={handleResolve}>✅ Confirm Resolve</Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card-elevated p-12 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Select a complaint from the list to resolve</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
