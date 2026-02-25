import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import CitizenLayout from '@/components/CitizenLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Camera, MapPin, Mic, Sparkles, CheckCircle } from 'lucide-react';
import { CATEGORIES, type Category, type Priority } from '@/types';

export default function CitizenReport() {
  const { currentUser, addComplaint } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState('');
  const [location, setLocation] = useState('');
  const [gps, setGps] = useState({ lat: 20.0059, lng: 73.7897 });
  const [category, setCategory] = useState<Category>('Road');
  const [analyzing, setAnalyzing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [estimated, setEstimated] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const detectLocation = () => {
    setLocation(`Ward ${currentUser?.ward || 7}, Nashik — ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}`);
    toast({ title: '📍 Location detected' });
  };

  const goStep2 = () => {
    setStep(2);
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      const descs: Record<Category, string> = {
        Road: 'Significant road surface damage detected in the reported area. The pothole/crack poses safety risks to vehicles and pedestrians. Immediate attention recommended.',
        Water: 'Water supply disruption reported. Multiple households may be affected. Pipeline inspection and repair needed urgently.',
        Sanitation: 'Waste management issue identified. Garbage accumulation posing hygiene risks. Sanitation team dispatch recommended.',
        Electricity: 'Electrical infrastructure issue reported. Potential safety hazard. Immediate inspection by qualified electrician required.',
        Other: 'Civic issue reported requiring municipal attention. Detailed assessment needed for appropriate departmental action.',
      };
      setDescription(descs[category]);
      setTitle(`${category} Issue — Ward ${currentUser?.ward || 7}`);
      setPriority(category === 'Electricity' ? 'High' : 'Medium');
      const d = new Date(); d.setDate(d.getDate() + 14);
      setEstimated(d.toISOString().split('T')[0]);
    }, 2000);
  };

  const handleSubmit = () => {
    if (!currentUser) return;
    setSubmitting(true);
    setTimeout(() => {
      const id = `JV-2026-${String(Date.now()).slice(-3)}`;
      addComplaint({
        id, citizenId: currentUser.id, citizenName: currentUser.name, citizenPhone: currentUser.phone,
        title, description, category, priority, status: 'Submitted',
        ward: currentUser.ward || 1, location: location || 'Nashik', gpsCoords: gps,
        photo, resolvePhoto: '', adminNote: '', assignedOfficer: '', department: category === 'Road' ? 'Roads & Infrastructure' : category,
        mergedCount: 0, supportCount: 0, createdAt: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString().split('T')[0],
        timeline: [
          { label: 'Submitted', done: true, date: new Date().toISOString().split('T')[0] },
          { label: 'Under Review', done: false, date: null },
          { label: 'In Progress', done: false, date: null },
          { label: 'Resolved', done: false, date: null },
        ],
        estimatedResolution: estimated, feedback: null, isSOS: false,
      });
      toast({ title: '🎉 Complaint submitted!', description: `ID: ${id} • +50 points` });
      setSubmitting(false);
      navigate('/citizen/track?id=' + id);
    }, 1500);
  };

  return (
    <CitizenLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-heading font-bold mb-6">Report an Issue</h1>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {['Capture', 'AI Description', 'Review'].map((s, i) => (
            <div key={i} className="flex-1 flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${step > i + 1 ? 'bg-success text-success-foreground' : step === i + 1 ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>{step > i + 1 ? '✓' : i + 1}</div>
              <span className={`text-xs hidden sm:inline ${step === i + 1 ? 'font-semibold' : 'text-muted-foreground'}`}>{s}</span>
              {i < 2 && <div className={`flex-1 h-0.5 ${step > i + 1 ? 'bg-success' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            {/* Photo upload */}
            <div>
              <Label>Photo Evidence</Label>
              <label className="mt-2 border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center cursor-pointer hover:border-accent transition-colors">
                {photo ? <img src={photo} className="max-h-48 rounded-lg object-cover" alt="Upload" /> : (
                  <><Camera className="h-10 w-10 text-muted-foreground mb-2" /><span className="text-sm text-muted-foreground">Click or drag to upload</span></>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
            </div>

            {/* Location */}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={detectLocation}><MapPin className="h-4 w-4" /> Detect Location</Button>
              <Button type="button" variant="outline" onClick={() => toast({ title: '🎙️ Voice note recorded (demo)' })}><Mic className="h-4 w-4" /> Voice Note</Button>
            </div>
            {location && <p className="text-sm text-success bg-success/10 rounded-lg px-3 py-2">📍 {location}</p>}

            {/* Category */}
            <div>
              <Label>Category</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${category === c ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/50'}`}>
                    {c === 'Road' ? '🛣️' : c === 'Water' ? '💧' : c === 'Sanitation' ? '🗑️' : c === 'Electricity' ? '⚡' : '📋'} {c}
                  </button>
                ))}
              </div>
            </div>

            <Button variant="hero" className="w-full" onClick={goStep2}>Continue to AI Analysis →</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            {analyzing ? (
              <div className="text-center py-16">
                <div className="animate-pulse-dot inline-block h-4 w-4 rounded-full bg-accent mb-4" />
                <p className="text-lg font-heading font-semibold">🤖 AI Analyzing...</p>
                <p className="text-sm text-muted-foreground mt-2">Processing image and generating description</p>
                <div className="mt-4 space-y-2 max-w-sm mx-auto">{[1, 2, 3].map(i => <div key={i} className="h-3 bg-muted rounded animate-pulse" />)}</div>
              </div>
            ) : (
              <>
                <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-accent" /><span className="font-medium">✨ AI Generated</span><span className="text-muted-foreground">— you can edit below</span>
                </div>
                <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
                <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Priority</Label><select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
                  </select></div>
                  <div><Label>Est. Resolution</Label><Input type="date" value={estimated} onChange={e => setEstimated(e.target.value)} /></div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
                  <Button variant="hero" className="flex-1" onClick={() => setStep(3)}>Review →</Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="card-elevated p-6 space-y-3">
              <h3 className="font-heading font-semibold text-lg">{title}</h3>
              {photo && <img src={photo} className="rounded-lg max-h-48 object-cover w-full" alt="Issue" />}
              <p className="text-sm text-muted-foreground">{description}</p>
              <div className="flex flex-wrap gap-2">
                <span className="badge-pill bg-muted text-muted-foreground">{category}</span>
                <span className={`badge-pill ${priority === 'High' || priority === 'Critical' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>{priority}</span>
                {location && <span className="badge-pill bg-success/10 text-success">📍 {location}</span>}
              </div>
              <p className="text-xs text-muted-foreground">Est. resolution: {estimated}</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" defaultChecked /><span>I confirm all details are correct</span>
            </label>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
              <Button variant="hero" className="flex-1" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <span className="animate-spin">⏳</span> : <CheckCircle className="h-4 w-4" />}
                {submitting ? 'Submitting...' : 'Submit Complaint'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </CitizenLayout>
  );
}
