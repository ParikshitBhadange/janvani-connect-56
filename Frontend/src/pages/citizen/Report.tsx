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
import { api } from '@/lib/api';
import { usePageMeta } from '@/hooks/usePageMeta';
import { pageMeta } from '@/lib/pageData';

export default function CitizenReport() {
  usePageMeta(pageMeta.CitizenReport);
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
  const [aiError, setAiError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [estimated, setEstimated] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [listening, setListening] = useState(false);

  /* -------------------- PHOTO UPLOAD -------------------- */
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Resize image before storing to keep base64 payload manageable (~800px max)
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 800;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      setPhoto(dataUrl);
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  };

  /* -------------------- LIVE GPS LOCATION -------------------- */
  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: '❌ Geolocation not supported', description: 'Your browser does not support location detection.' });
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
          const area =
            addr.suburb || addr.neighbourhood || addr.village ||
            addr.town || addr.city_district || addr.county || addr.city || '';
          const city = addr.city || addr.town || addr.county || 'Nashik';
          const areaLabel = area ? `${area}, ${city}` : city;
          setLocation(`Ward ${ward}, ${areaLabel} — ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
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

  /* -------------------- VOICE TYPING -------------------- */
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
      const transcript = event.results[0][0].transcript;
      setDescription((prev) => (prev ? prev + ' ' + transcript : transcript));
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      toast({ title: '❌ Voice recognition error' });
    };
  };

  /* -------------------- AI ANALYSIS -------------------- */
  const goStep2 = async () => {
    setStep(2);
    setAnalyzing(true);
    setAiError('');

    try {
      // Call backend AI endpoint
      const result = await api.post('/ai/analyze', {
        imageBase64: photo || null,
        category,
        location: location || `Ward ${currentUser?.ward || 1}, Nashik`,
      });

      setTitle(result.title || `${category} Issue — Ward ${currentUser?.ward || 1}`);
      setDescription(result.description || '');
      setPriority((result.priority as Priority) || 'Medium');
      setEstimated(result.estimated || (() => {
        const d = new Date(); d.setDate(d.getDate() + 14);
        return d.toISOString().split('T')[0];
      })());
    } catch (err: any) {
      console.error('AI analysis failed:', err);
      setAiError('AI analysis failed. You can fill in the details manually below.');

      // Fallback values
      const fallbackDescs: Record<Category, string> = {
        Road: 'Road surface damage has been reported in the area. The issue poses safety risks to vehicles and pedestrians. Immediate inspection and repair is recommended.',
        Water: 'Water supply disruption has been reported. Multiple households may be affected. Pipeline inspection and repair is needed urgently.',
        Sanitation: 'Waste management issue identified in the area. Garbage accumulation is posing hygiene and health risks. Sanitation team dispatch is recommended.',
        Electricity: 'Electrical infrastructure issue reported. This poses a potential safety hazard to residents. Immediate inspection by a qualified electrician is required.',
        Other: 'A civic issue has been reported requiring municipal attention. A detailed on-site assessment is needed for appropriate departmental action.',
      };
      setTitle(`${category} Issue — Ward ${currentUser?.ward || 1}`);
      setDescription(fallbackDescs[category]);
      setPriority(category === 'Electricity' ? 'High' : 'Medium');
      const d = new Date(); d.setDate(d.getDate() + 14);
      setEstimated(d.toISOString().split('T')[0]);
    } finally {
      setAnalyzing(false);
    }
  };

  /* -------------------- SUBMIT -------------------- */
  const handleSubmit = () => {
    if (!currentUser) return;
    setSubmitting(true);
    setTimeout(() => {
      const id = `JV-2026-${String(Date.now()).slice(-3)}`;
      addComplaint({
        id,
        citizenId: currentUser.id,
        citizenName: currentUser.name,
        citizenPhone: currentUser.phone,
        title,
        description,
        category,
        priority,
        status: 'Submitted',
        ward: currentUser.ward || 1,
        location: location || 'Nashik',
        gpsCoords: gps,
        photo,
        resolvePhoto: '',
        adminNote: '',
        assignedOfficer: '',
        department: category === 'Road' ? 'Roads & Infrastructure' : category,
        mergedCount: 0,
        supportCount: 0,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        timeline: [
          { label: 'Submitted', done: true, date: new Date().toISOString().split('T')[0] },
          { label: 'Under Review', done: false, date: null },
          { label: 'In Progress', done: false, date: null },
          { label: 'Resolved', done: false, date: null },
        ],
        estimatedResolution: estimated,
        feedback: null,
        isSOS: false,
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
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step > i + 1
                    ? 'bg-success text-success-foreground'
                    : step === i + 1
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span
                className={`text-xs hidden sm:inline ${
                  step === i + 1 ? 'font-semibold' : 'text-muted-foreground'
                }`}
              >
                {s}
              </span>
              {i < 2 && <div className={`flex-1 h-0.5 ${step > i + 1 ? 'bg-success' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* ---- STEP 1: Capture ---- */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            {/* Photo upload */}
            <div>
              <Label>Photo Evidence</Label>
              <label className="mt-2 border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center cursor-pointer hover:border-accent transition-colors">
                {photo ? (
                  <img src={photo} className="max-h-48 rounded-lg object-cover" alt="Upload" />
                ) : (
                  <>
                    <Camera className="h-10 w-10 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Click or drag to upload</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Adding a photo improves AI accuracy
                    </span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
            </div>

            {/* Live Location */}
            <div className="space-y-2">
              <Button type="button" variant="outline" onClick={detectLocation} disabled={locating}>
                {locating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
                {locating ? 'Detecting…' : 'Detect Location'}
              </Button>
              {location && (
                <p className="text-sm text-success bg-success/10 rounded-lg px-3 py-2">
                  📍 {location}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <Label>Category</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                      category === c
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    {c === 'Road'
                      ? '🛣️'
                      : c === 'Water'
                      ? '💧'
                      : c === 'Sanitation'
                      ? '🗑️'
                      : c === 'Electricity'
                      ? '⚡'
                      : '📋'}{' '}
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <Button variant="hero" className="w-full" onClick={goStep2}>
              Continue to AI Analysis →
            </Button>
          </div>
        )}

        {/* ---- STEP 2: AI Description ---- */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            {analyzing ? (
              <div className="text-center py-16">
                <div className="animate-pulse-dot inline-block h-4 w-4 rounded-full bg-accent mb-4" />
                <p className="text-lg font-heading font-semibold">🤖 AI Analyzing…</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {photo
                    ? 'Analyzing image and generating description with GPT-4o'
                    : 'Generating description based on category and location'}
                </p>
                <div className="mt-4 space-y-2 max-w-sm mx-auto">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-3 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* AI badge / error banner */}
                {aiError ? (
                  <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-center gap-2 text-sm">
                    <span>⚠️</span>
                    <span className="text-warning">{aiError}</span>
                  </div>
                ) : (
                  <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <span className="font-medium">✨ AI Generated</span>
                    <span className="text-muted-foreground">— you can edit below</span>
                  </div>
                )}

                <div>
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div>
                  <Label>Description</Label>
                  <div className="flex gap-2 mt-1">
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={startVoiceTyping}
                      className="self-start px-3"
                      title={listening ? 'Listening…' : 'Voice type into description'}
                    >
                      <Mic className={`h-4 w-4 ${listening ? 'text-destructive animate-pulse' : ''}`} />
                    </Button>
                  </div>
                  {listening && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-destructive animate-pulse" />
                      Listening…
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Priority</Label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Est. Resolution</Label>
                    <Input
                      type="date"
                      value={estimated}
                      onChange={(e) => setEstimated(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    ← Back
                  </Button>
                  <Button variant="hero" className="flex-1" onClick={() => setStep(3)}>
                    Review →
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ---- STEP 3: Review & Submit ---- */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="card-elevated p-6 space-y-3">
              <h3 className="font-heading font-semibold text-lg">{title}</h3>
              {photo && (
                <img src={photo} className="rounded-lg max-h-48 object-cover w-full" alt="Issue" />
              )}
              <p className="text-sm text-muted-foreground">{description}</p>
              <div className="flex flex-wrap gap-2">
                <span className="badge-pill bg-muted text-muted-foreground">{category}</span>
                <span
                  className={`badge-pill ${
                    priority === 'High' || priority === 'Critical'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-warning/10 text-warning'
                  }`}
                >
                  {priority}
                </span>
                {location && (
                  <span className="badge-pill bg-success/10 text-success">📍 {location}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Est. resolution: {estimated}</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" defaultChecked />
              <span>I confirm all details are correct</span>
            </label>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>
                ← Back
              </Button>
              <Button
                variant="hero"
                className="flex-1"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {submitting ? 'Submitting...' : 'Submit Complaint'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </CitizenLayout>
  );
}