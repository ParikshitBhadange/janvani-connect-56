import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Brain, MapPin, Trophy, FileText, Search, CheckCircle, Star, ArrowRight } from 'lucide-react';
import heroBg from '@/assets/hero-bg.jpg';
import { usePageMeta } from '@/hooks/usePageMeta';
import { pageMeta } from '@/lib/pageData';

const stats = [
  { value: '12,000+', label: 'Issues Resolved' },
  { value: '98%', label: 'Response Rate' },
  { value: '340', label: 'Wards Covered' },
  { value: '4.8★', label: 'Citizen Rating' },
];

const steps = [
  { icon: FileText, title: 'Report', desc: 'Submit your grievance with photo & location' },
  { icon: Search, title: 'Review', desc: 'AI categorizes and prioritizes automatically' },
  { icon: CheckCircle, title: 'Resolve', desc: 'Municipal team takes action on ground' },
  { icon: Star, title: 'Reward', desc: 'Earn points and climb the leaderboard' },
];

export default function Landing() {
  usePageMeta(pageMeta.Landing);
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-heading font-bold text-primary">जनवाणी</span>
            <span className="text-xs font-heading text-muted-foreground tracking-widest">JANVANI</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-body text-muted-foreground">
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
            <a href="#how" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#portals" className="hover:text-foreground transition-colors">Portals</a>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="hero" size="sm" asChild><Link to="/citizen/login">Citizen Login</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/admin/login">Admin Portal</Link></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroBg})` }} />
        <div className="absolute inset-0 bg-primary/70" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-heading font-extrabold text-primary-foreground leading-tight mb-6 animate-fade-in">
            जनवाणी — Your Voice,<br />Our Action
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10 font-body" style={{ animationDelay: '0.1s' }}>
            AI-powered urban grievance platform connecting citizens directly with municipal authorities. Report, track, and resolve civic issues in real-time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Button variant="sky" size="lg" asChild><Link to="/citizen/report"><FileText className="h-5 w-5 mr-2" />Report a Problem</Link></Button>
            <Button variant="hero-outline" size="lg" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/citizen/track"><Search className="h-5 w-5 mr-2" />Track Complaint</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="about" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-heading font-bold text-center mb-12">Why JANVANI?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: 'AI-Powered Reporting', desc: 'Smart categorization, priority detection, and auto-description from photos.' },
              { icon: MapPin, title: 'Real-Time Tracking', desc: 'GPS-tagged complaints with live status timeline and admin updates.' },
              { icon: Trophy, title: 'Citizen Rewards', desc: 'Earn points, badges, and recognition for active civic participation.' },
            ].map((f, i) => (
              <div key={i} className="card-elevated p-6 text-center group">
                <div className="h-14 w-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-accent/20 transition-colors">
                  <f.icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground font-body">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-heading font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="h-16 w-16 rounded-full bg-accent text-accent-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold shadow-lg shadow-accent/20">{i + 1}</div>
                <h3 className="font-heading font-semibold mb-1">{s.title}</h3>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-primary">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-heading font-extrabold text-primary-foreground">{s.value}</div>
              <div className="text-sm text-primary-foreground/70 font-body">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Portal Choice */}
      <section id="portals" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-heading font-bold text-center mb-12">Choose Your Portal</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Link to="/citizen/login" className="card-elevated p-8 text-center border-l-4 border-l-accent group">
              <div className="text-5xl mb-4">🏠</div>
              <h3 className="text-xl font-heading font-bold mb-2">Citizen Portal</h3>
              <p className="text-sm text-muted-foreground mb-4">Report issues, track progress, earn rewards as an active citizen.</p>
              <span className="text-accent font-semibold text-sm inline-flex items-center gap-1 group-hover:gap-2 transition-all">Enter Portal <ArrowRight className="h-4 w-4" /></span>
            </Link>
            <Link to="/admin/login" className="card-elevated p-8 text-center border-l-4 border-l-warning group">
              <div className="text-5xl mb-4">🏛️</div>
              <h3 className="text-xl font-heading font-bold mb-2">Admin Portal</h3>
              <p className="text-sm text-muted-foreground mb-4">Manage complaints, resolve issues, monitor ward performance.</p>
              <span className="text-warning font-semibold text-sm inline-flex items-center gap-1 group-hover:gap-2 transition-all">Enter Portal <ArrowRight className="h-4 w-4" /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary py-10">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-xl font-heading font-bold text-primary-foreground">जनवाणी</span>
            <span className="text-xs text-primary-foreground/50">JANVANI</span>
          </div>
          <p className="text-sm text-primary-foreground/60 font-body">Your Voice, Our Action — AI-Powered Urban Governance</p>
          <p className="text-xs text-primary-foreground/40 mt-4">© 2026 JANVANI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
