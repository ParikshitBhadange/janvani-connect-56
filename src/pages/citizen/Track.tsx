import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import CitizenLayout from '@/components/CitizenLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, ThumbsUp, CheckCircle, Circle } from 'lucide-react';
import { getPriorityClass, getStatusClass } from '@/types';

export default function CitizenTrack() {
  const { complaints, supportComplaint } = useApp();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const [searchId, setSearchId] = useState(params.get('id') || '');
  const [found, setFound] = useState(complaints.find(c => c.id === params.get('id')) || null);

  useEffect(() => {
    const id = params.get('id');
    if (id) { setSearchId(id); setFound(complaints.find(c => c.id === id) || null); }
  }, [params, complaints]);

  const handleSearch = () => {
    const c = complaints.find(c => c.id === searchId.trim());
    setFound(c || null);
    if (!c) toast({ title: 'Complaint not found', variant: 'destructive' });
  };

  const handleSupport = () => {
    if (found) { supportComplaint(found.id); toast({ title: '👍 Supported! +10 points' }); }
  };

  return (
    <CitizenLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-heading font-bold">Track Complaint</h1>

        <div className="flex gap-2">
          <Input placeholder="Enter Complaint ID (e.g. JV-2026-001)" value={searchId} onChange={e => setSearchId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          <Button variant="hero" onClick={handleSearch}><Search className="h-4 w-4" /> Track</Button>
        </div>

        {found && (
          <div className="card-elevated p-6 space-y-5 animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                <span className="mono-id">{found.id}</span>
                {found.isSOS && <span className="ml-2 badge-pill bg-destructive text-destructive-foreground">🚨 SOS</span>}
                <h2 className="text-lg font-heading font-semibold mt-1">{found.title}</h2>
              </div>
              <Button size="sm" variant="outline" onClick={handleSupport}><ThumbsUp className="h-4 w-4" /> {found.supportCount}</Button>
            </div>

            <p className="text-sm text-muted-foreground">{found.description}</p>

            <div className="flex flex-wrap gap-2">
              <span className="badge-pill bg-muted text-muted-foreground">{found.category}</span>
              <span className={getPriorityClass(found.priority)}>{found.priority}</span>
              <span className={getStatusClass(found.status)}>{found.status}</span>
              <span className="badge-pill bg-muted text-muted-foreground">Ward {found.ward}</span>
            </div>

            {found.photo && <img src={found.photo} className="rounded-lg max-h-48 w-full object-cover" alt="Issue" />}

            {/* Timeline */}
            <div>
              <h3 className="font-heading font-semibold mb-4">Progress Timeline</h3>
              <div className="space-y-0">
                {found.timeline.map((t, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      {t.done ? <CheckCircle className="h-6 w-6 text-accent flex-shrink-0" /> : (
                        i === found.timeline.findIndex(x => !x.done) ? <div className="h-6 w-6 rounded-full border-2 border-accent bg-accent/20 animate-pulse-dot flex-shrink-0" /> : <Circle className="h-6 w-6 text-muted-foreground/30 flex-shrink-0" />
                      )}
                      {i < 3 && <div className={`w-0.5 h-8 ${t.done ? 'bg-accent' : 'bg-border border-dashed'}`} />}
                    </div>
                    <div className="pb-6">
                      <p className={`text-sm font-medium ${t.done ? 'text-foreground' : 'text-muted-foreground'}`}>{t.label}</p>
                      {t.date && <p className="text-xs text-muted-foreground">{t.date}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Extra info */}
            {found.adminNote && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Admin Note</p>
                <p className="text-sm">{found.adminNote}</p>
              </div>
            )}
            {found.assignedOfficer && <p className="text-sm text-muted-foreground">👤 Assigned: {found.assignedOfficer}</p>}
            {found.estimatedResolution && <p className="text-sm text-muted-foreground">📅 Est. resolution: {found.estimatedResolution}</p>}
            {found.resolvePhoto && (
              <div>
                <p className="text-sm font-semibold mb-2">Resolution Photo</p>
                <img src={found.resolvePhoto} className="rounded-lg max-h-48 object-cover" alt="Resolved" />
              </div>
            )}

            {found.feedback && (
              <div className="bg-success/5 border border-success/20 rounded-lg p-3">
                <p className="text-sm font-semibold mb-1">Your Feedback</p>
                <p className="text-sm">{'⭐'.repeat(found.feedback.rating)} — {found.feedback.comment}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </CitizenLayout>
  );
}
