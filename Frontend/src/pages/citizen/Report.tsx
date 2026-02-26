import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import CitizenLayout from '@/components/CitizenLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Camera, MapPin, Mic, Sparkles, CheckCircle, Loader2 } from 'lucide-react';
import { CATEGORIES, type Category, type Priority } from '@/types';

export default function CitizenReport() {
  const { currentUser, addComplaint } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState('');
  const [location, setLocation] = useState('');
  const [gps, setGps] = useState({ lat: 20.0059, lng: 73.7897 });
  const [locating, setLocating] = useState(false);
  const [category, setCategory] = useState<Category>('Road');
  const [analyzing, setAnalyzing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [estimated, setEstimated] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [listening, setListening] = useState(false);

  // ── Photo upload ──
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ── GPS location ──
  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: '❌ Geolocation not supported' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setGps({ lat, lng });
        const ward = currentUser?.ward || 1;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const area = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city || 'Nashik';
          setLocation(`Ward ${ward}, ${area} — ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } catch {
          setLocation(`Ward ${ward}, Nashik — ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
        setLocating(false);
        toast({ title: '📍 Live location detected' });
      },
      (error) => {
        setLocating(false);
        const ward = currentUser?.ward || 1;
        setLocation(`Ward ${ward}, Nashik — ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}`);
        toast({ title: '⚠️ Using default location', description: error.message });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ── Voice typing ──
  const startVoiceTyping = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: '❌ Speech Recognition not supported' });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.start();
    setListening(true);
    recognition.onresult = (event: any) => {
      setDescription(prev => prev + ' ' + event.results[0][0].transcript);
    };
    recognition.onend  = () => setListening(false);
    recognition.onerror = () => { setListening(false); toast({ title: '❌ Voice error' }); };
  };

  // ── Step 1 → Step 2 with AI mock ──
  const goStep2 = () => {
    setStep(2);
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      const descs: Record<Category, string> = {
        Road:        'Significant road surface damage detected. The pothole/crack poses safety risks to vehicles and pedestrians. Immediate attention recommended.',
        Water:       'Water supply disruption reported. Multiple households may be affected. Pipeline inspection and repair needed urgently.',
        Sanitation:  'Waste management issue identified. Garbage accumulation posing hygiene risks. Sanitation team dispatch recommended.',
        Electricity: 'Electrical infrastructure issue reported. Potential safety hazard. Immediate inspection by qualified electrician required.',
        Other:       'Civic issue reported requiring municipal attention. Detailed assessment needed for appropriate departmental action.',
      };
      setDescription(descs[category]);
      setTitle(`${category} Issue — Ward ${currentUser?.ward || 1}`);
      setPriority(category === 'Electricity' ? 'High' : 'Medium');
      const d = new Date();
      d.setDate(d.getDate() + 14);
      setEstimated(d.toISOString().split('T')[0]);
    }, 2000);
  };

  // ── SUBMIT — calls backend via AppContext.addComplaint ──
  const handleSubmit = async () => {
    if (!currentUser) return;
    setSubmitting(true);
    try {
      const complaint = await addComplaint({
        citizenId    : currentUser._id || currentUser.id,
        citizenName  : currentUser.name,
        citizenPhone : currentUser.phone,
        title,
        description,
        category,
        priority,
        status       : 'Submitted',
        ward         : currentUser.ward || 1,
        location     : location || `Ward ${currentUser.ward}, Nashik`,
        gpsCoords    : gps,
        photo,
        estimatedResolution: estimated,
        isSOS        : false,
        department   : category === 'Road' ? 'Roads & Infrastructure'
                     : category === 'Water' ? 'Water Supply'
                     : category === 'Sanitation' ? 'Sanitation'
                     : category === 'Electricity' ? 'Electricity'
                     : 'General Administration',
      });

      const displayId = complaint?.complaintId || complaint?.id || complaint?._id || 'submitted';
      toast({ title: '🎉 Complaint submitted!', description: `ID: ${displayId} • +50 points earned` });
      navigate(`/citizen/track?id=${displayId}`);
    } catch (err: any) {
      toast({ title: '❌ Submission failed', description: err.message || 'Please try again', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CitizenLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-heading font-bold mb-6">Report an Issue</h1>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8">
          {['Capture', 'AI Description', 'Review'].map((s, i) => (
            <div key={i} className="flex-1 flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step > i + 1 ? 'bg-success text-success-foreground'
                : step === i + 1 ? 'bg-accent text-accent-foreground'
                : 'bg-muted text-muted-foreground'
              }`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${step === i + 1 ? 'font-semibold' : 'text-muted-foreground'}`}>
                {s}
              </span>
              {i < 2 && <div className={`flex-1 h-0.5 ${step > i + 1 ? 'bg-success' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Capture ── */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <Label>Photo Evidence</Label>
              <label className="mt-2 border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center cursor-pointer hover:border-accent transition-colors">
                {photo ? (
                  <img src={photo} className="max-h-48 rounded-lg object-cover" alt="Upload" />
                ) : (
                  <>
                    <Camera className="h-10 w-10 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Click or drag to upload</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
            </div>

            <div className="space-y-2">
              <Button type="button" variant="outline" onClick={detectLocation} disabled={locating}>
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                {locating ? 'Detecting…' : 'Detect Location'}
              </Button>
              {location && (
                <p className="text-sm text-success bg-success/10 rounded-lg px-3 py-2">📍 {location}</p>
              )}
            </div>

            <div>
              <Label>Category</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                      category === c ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/50'
                    }`}
                  >
                    {c === 'Road' ? '🛣️' : c === 'Water' ? '💧' : c === 'Sanitation' ? '🗑️' : c === 'Electricity' ? '⚡' : '📋'} {c}
                  </button>
                ))}
              </div>
            </div>

            <Button variant="hero" className="w-full" onClick={goStep2}>
              Continue to AI Analysis →
            </Button>
          </div>
        )}

        {/* ── STEP 2: AI Description ── */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            {analyzing ? (
              <div className="text-center py-16">
                <div className="animate-pulse inline-block h-4 w-4 rounded-full bg-accent mb-4" />
                <p className="text-lg font-heading font-semibold">🤖 AI Analyzing...</p>
                <p className="text-sm text-muted-foreground mt-2">Processing image and generating description</p>
                <div className="mt-4 space-y-2 max-w-sm mx-auto">
                  {[1, 2, 3].map(i => <div key={i} className="h-3 bg-muted rounded animate-pulse" />)}
                </div>
              </div>
            ) : (
              <>
                <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span className="font-medium">✨ AI Generated</span>
                  <span className="text-muted-foreground">— you can edit below</span>
                </div>

                <div>
                  <Label>Title</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} />
                </div>

                <div>
                  <Label>Description</Label>
                  <div className="flex gap-2 mt-1">
                    <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="flex-1" />
                    <Button type="button" variant="outline" onClick={startVoiceTyping} className="self-start px-3">
                      <Mic className={`h-4 w-4 ${listening ? 'text-destructive animate-pulse' : ''}`} />
                    </Button>
                  </div>
                  {listening && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-destructive animate-pulse" /> Listening…
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Priority</Label>
                    <select
                      value={priority}
                      onChange={e => setPriority(e.target.value as Priority)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Est. Resolution</Label>
                    <Input type="date" value={estimated} onChange={e => setEstimated(e.target.value)} />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
                  <Button variant="hero" className="flex-1" onClick={() => setStep(3)}>Review →</Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── STEP 3: Review & Submit ── */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="card-elevated p-6 space-y-3">
              <h3 className="font-heading font-semibold text-lg">{title}</h3>
              {photo && <img src={photo} className="rounded-lg max-h-48 object-cover w-full" alt="Issue" />}
              <p className="text-sm text-muted-foreground">{description}</p>
              <div className="flex flex-wrap gap-2">
                <span className="badge-pill bg-muted text-muted-foreground">{category}</span>
                <span className={`badge-pill ${priority === 'High' || priority === 'Critical' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                  {priority}
                </span>
                {location && <span className="badge-pill bg-success/10 text-success">📍 {location}</span>}
              </div>
              <p className="text-xs text-muted-foreground">Est. resolution: {estimated}</p>
            </div>

            {/* Notice that it will appear on admin board */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-2 items-start">
              <span className="text-blue-500 text-sm">ℹ️</span>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Once submitted, your complaint will immediately appear on the <strong>Admin Dashboard</strong> for processing. You can track its status in real-time from the Track page.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" defaultChecked />
              <span>I confirm all details are correct</span>
            </label>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
              <Button variant="hero" className="flex-1" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {submitting ? 'Submitting to Admin...' : 'Submit Complaint'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </CitizenLayout>
  );
}