import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import CitizenLayout from '@/components/CitizenLayout';
import { Trophy, Medal, Star, Search, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WARDS } from '@/types';

// ─── Badge helpers ─────────────────────────────────────────────
const badgeIcon  = (b?: string) => b === 'Gold' ? '🥇' : b === 'Silver' ? '🥈' : '🥉';
const badgeStyle = (b?: string): React.CSSProperties =>
  b === 'Gold'
    ? { color: '#92400e', background: '#fef3c7', border: '1px solid #f59e0b' }
    : b === 'Silver'
    ? { color: '#374151', background: '#f3f4f6', border: '1px solid #9ca3af' }
    : { color: '#78350f', background: '#fef9c3', border: '1px solid #d97706' };

// ─── Podium colours & sizes ────────────────────────────────────
const PODIUM = [
  // 2nd place (left)
  {
    rank: 2, barH: 'h-20', barGrad: 'from-slate-300 to-slate-400',
    avatarSize: 'h-14 w-14 text-xl', avatarRing: 'ring-4 ring-slate-400',
    avatarBg: 'bg-slate-100 text-slate-700',
    glow: '0 0 20px rgba(148,163,184,0.6)',
    ptColor: 'text-slate-500',
    crown: false,
  },
  // 1st place (centre)
  {
    rank: 1, barH: 'h-32', barGrad: 'from-yellow-400 to-amber-500',
    avatarSize: 'h-20 w-20 text-2xl', avatarRing: 'ring-4 ring-yellow-400 ring-offset-2',
    avatarBg: 'bg-yellow-100 text-yellow-800',
    glow: '0 0 32px rgba(250,204,21,0.75)',
    ptColor: 'text-yellow-600',
    crown: true,
  },
  // 3rd place (right)
  {
    rank: 3, barH: 'h-14', barGrad: 'from-amber-500 to-amber-600',
    avatarSize: 'h-12 w-12 text-lg', avatarRing: 'ring-2 ring-amber-400',
    avatarBg: 'bg-amber-100 text-amber-800',
    glow: '0 0 14px rgba(217,119,6,0.5)',
    ptColor: 'text-amber-600',
    crown: false,
  },
];

// Display order: 2nd | 1st | 3rd
const PODIUM_ORDER = [1, 0, 2]; // indices into PODIUM array

export default function CitizenLeaderboard() {
  const { users, currentUser, refreshLeaderboard } = useApp();
  const [ward,       setWard]       = useState(0);
  const [search,     setSearch]     = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortDir,    setSortDir]    = useState<'desc' | 'asc'>('desc');

  // Fetch on mount + whenever ward filter changes
  useEffect(() => {
    refreshLeaderboard(ward || undefined);
  }, [ward]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshLeaderboard(ward || undefined);
    setRefreshing(false);
  };

  // Build sorted + filtered citizen list from real DB data
  const citizens = useMemo(() => {
    let list = users
      .filter(u => u.role === 'citizen')
      .filter(u => ward === 0 || Number(u.ward) === ward);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        String(u.ward).includes(q)
      );
    }

    return [...list].sort((a, b) =>
      sortDir === 'desc'
        ? (b.points || 0) - (a.points || 0)
        : (a.points || 0) - (b.points || 0)
    );
  }, [users, ward, search, sortDir]);

  // Top 3 always from globally sorted descending list (ignoring search for podium)
  const top3 = useMemo(() =>
    [...users]
      .filter(u => u.role === 'citizen' && (ward === 0 || Number(u.ward) === ward))
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 3),
  [users, ward]);

  const uid    = currentUser?.id || currentUser?._id;
  const myRank = citizens.findIndex(u => u.id === uid || u._id === uid) + 1;

  // Aggregated stats
  const totalPts  = citizens.reduce((s, u) => s + (u.points || 0), 0);
  const totalComp = citizens.reduce((s, u) => s + (u.complaintsSubmitted || 0), 0);

  return (
    <CitizenLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-24">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" /> Leaderboard
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real citizens ranked by civic points — fetched live from database
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* ── Filters ── */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9"
              placeholder="Search citizen or ward…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={ward}
            onChange={e => setWard(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value={0}>All Wards</option>
            {WARDS.map(w => <option key={w} value={w}>Ward {w}</option>)}
          </select>
          <button
            onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm flex items-center gap-1 hover:bg-muted"
          >
            {sortDir === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            {sortDir === 'desc' ? 'Highest first' : 'Lowest first'}
          </button>
        </div>

        {/* ── Summary strip ── */}
        {citizens.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Citizens', value: citizens.length, icon: '👥' },
              { label: 'Total Points', value: totalPts.toLocaleString(), icon: '⭐' },
              { label: 'Issues Reported', value: totalComp, icon: '📋' },
            ].map(s => (
              <div key={s.label} className="card-elevated p-3 text-center">
                <p className="text-xl">{s.icon}</p>
                <p className="text-lg font-heading font-bold mt-1">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Podium (only shown when not searching and top3 exist) ── */}
        {!search && top3.length > 0 && (
          <div className="relative rounded-2xl overflow-hidden">
            {/* Ambient glow background */}
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-50/80 via-background/60 to-transparent dark:from-yellow-900/20 pointer-events-none" />
            <div className="relative flex items-end justify-center gap-3 py-8 px-4">
              {PODIUM_ORDER.map((podiumIdx) => {
                const cfg = PODIUM[podiumIdx];
                const u   = top3[cfg.rank - 1];    // rank-1 = array index
                if (!u) return <div key={podiumIdx} className="flex-1 max-w-[120px]" />;

                const isMe    = u.id === uid || u._id === uid;
                const isFirst = cfg.rank === 1;

                return (
                  <div key={podiumIdx} className={`flex flex-col items-center flex-1 max-w-[130px] ${isFirst ? 'z-10' : 'z-0'}`}>
                    {/* Crown */}
                    {cfg.crown && (
                      <div className="text-3xl mb-1 drop-shadow-lg" style={{ animation: 'bounce 2s infinite' }}>👑</div>
                    )}

                    {/* Avatar */}
                    <div
                      className={`${cfg.avatarSize} rounded-full flex items-center justify-center font-bold flex-shrink-0 ${cfg.avatarBg} ${cfg.avatarRing} ${isMe ? 'outline outline-2 outline-accent outline-offset-2' : ''} transition-all`}
                      style={{ boxShadow: cfg.glow }}
                    >
                      {u.name?.[0]?.toUpperCase() || '?'}
                    </div>

                    {/* Name */}
                    <p className={`mt-2 text-center font-semibold truncate max-w-full px-1 ${isFirst ? 'text-sm' : 'text-xs'}`}>
                      {u.name}
                      {isMe && <span className="text-accent ml-1 text-[10px]">(You)</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Ward {u.ward}</p>

                    {/* Points */}
                    <p className={`font-heading font-bold mt-0.5 text-xs ${cfg.ptColor}`}>
                      {(u.points || 0).toLocaleString()} pts
                    </p>

                    {/* Badge pill */}
                    <span className="mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium" style={badgeStyle(u.badge)}>
                      {badgeIcon(u.badge)} {u.badge}
                    </span>

                    {/* Podium base */}
                    <div className={`w-full mt-3 ${cfg.barH} bg-gradient-to-b ${cfg.barGrad} rounded-t-xl flex items-center justify-center shadow-md`}>
                      <span className="text-white font-heading font-black text-xl drop-shadow">
                        #{cfg.rank}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Full Rankings Table ── */}
        <div className="card-elevated overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-accent px-5 py-3 flex items-center gap-2">
            <Medal className="h-4 w-4 text-white" />
            <h3 className="text-white font-heading font-semibold text-sm">
              Full Rankings{ward > 0 ? ` — Ward ${ward}` : ''}
              {search ? ` · "${search}"` : ''}
            </h3>
            <span className="ml-auto text-white/70 text-xs">{citizens.length} citizens</span>
          </div>

          {citizens.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">
                {search ? `No citizens matching "${search}"` : ward > 0 ? `No citizens in Ward ${ward}` : 'No citizens registered yet'}
              </p>
              {(search || ward > 0) && (
                <button className="mt-3 text-xs text-accent hover:underline" onClick={() => { setSearch(''); setWard(0); }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground w-14">RANK</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">CITIZEN</th>
                    <th className="text-center p-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">WARD</th>
                    <th className="text-center p-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">COMPLAINTS</th>
                    <th className="text-right p-3 text-xs font-semibold text-muted-foreground">POINTS</th>
                    <th className="text-center p-3 text-xs font-semibold text-muted-foreground">BADGE</th>
                  </tr>
                </thead>
                <tbody>
                  {citizens.map((u, i) => {
                    const isMe   = u.id === uid || u._id === uid;
                    const rank   = sortDir === 'desc' ? i + 1 : citizens.length - i;
                    const isTop3 = sortDir === 'desc' && rank <= 3;

                    return (
                      <tr
                        key={u.id || u._id}
                        className={`border-t border-border transition-colors ${
                          isMe
                            ? 'bg-accent/5 border-l-2 border-l-accent'
                            : isTop3
                            ? 'bg-yellow-50/40 dark:bg-yellow-900/5 hover:bg-muted/20'
                            : 'hover:bg-muted/20'
                        }`}
                      >
                        {/* Rank */}
                        <td className="p-3">
                          {sortDir === 'desc' && rank === 1 ? <span className="text-xl">🥇</span>
                           : sortDir === 'desc' && rank === 2 ? <span className="text-xl">🥈</span>
                           : sortDir === 'desc' && rank === 3 ? <span className="text-xl">🥉</span>
                           : <span className="font-mono font-bold text-muted-foreground text-sm">#{rank}</span>}
                        </td>

                        {/* Citizen */}
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              isTop3 ? 'bg-yellow-100 text-yellow-800' : 'bg-muted text-muted-foreground'
                            }`}>
                              {u.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="font-medium flex items-center gap-1.5 flex-wrap">
                                {u.name}
                                {isMe && (
                                  <span className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full">You</span>
                                )}
                                {isTop3 && sortDir === 'desc' && (
                                  <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Top 3</span>
                                )}
                              </p>
                              <p className="text-[10px] text-muted-foreground sm:hidden">Ward {u.ward}</p>
                            </div>
                          </div>
                        </td>

                        {/* Ward */}
                        <td className="p-3 text-center hidden sm:table-cell">
                          <span className="badge-pill bg-muted text-muted-foreground text-xs">Ward {u.ward}</span>
                        </td>

                        {/* Complaints */}
                        <td className="p-3 text-center hidden md:table-cell">
                          <div className="text-xs">
                            <p className="font-medium">{u.complaintsSubmitted || 0} filed</p>
                            <p className="text-green-600">{u.complaintsResolved || 0} resolved</p>
                          </div>
                        </td>

                        {/* Points */}
                        <td className="p-3 text-right">
                          <span className={`font-heading font-bold ${isTop3 && sortDir === 'desc' ? 'text-yellow-600 text-base' : 'text-sm'}`}>
                            {(u.points || 0).toLocaleString()}
                          </span>
                          <p className="text-[10px] text-muted-foreground">pts</p>
                        </td>

                        {/* Badge */}
                        <td className="p-3 text-center">
                          <span
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                            style={badgeStyle(u.badge)}
                          >
                            {badgeIcon(u.badge)} {u.badge}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Points guide ── */}
        <div className="card-elevated p-5">
          <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" /> How Points & Badges Work
          </h3>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { action: '📋 Submit a complaint', pts: '+50 pts' },
              { action: '✅ Complaint resolved', pts: '+100 pts' },
              { action: '⭐ Give feedback',       pts: '+25 pts' },
              { action: '👍 Support an issue',    pts: '+10 pts' },
            ].map(r => (
              <div key={r.action} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                <span className="text-xs">{r.action}</span>
                <span className="font-semibold text-green-600 text-xs">{r.pts}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { icon: '🥉', name: 'Bronze', range: '0–499 pts',   color: '#92400e', bg: '#fef9c3' },
              { icon: '🥈', name: 'Silver', range: '500–999 pts', color: '#374151', bg: '#f3f4f6' },
              { icon: '🥇', name: 'Gold',   range: '1000+ pts',   color: '#78350f', bg: '#fef3c7' },
            ].map(b => (
              <div key={b.name} className="rounded-lg p-2 text-center" style={{ background: b.bg }}>
                <p className="font-semibold text-sm" style={{ color: b.color }}>{b.icon} {b.name}</p>
                <p className="text-[10px]" style={{ color: b.color + 'aa' }}>{b.range}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sticky My Rank Footer ── */}
      {myRank > 0 && !search && (
        <div className="fixed bottom-16 lg:bottom-4 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 lg:px-0 z-30">
          <div className="card-elevated p-3 flex items-center justify-between border border-accent/30 bg-card/95 backdrop-blur shadow-xl rounded-xl">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm">
                {currentUser?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm">{currentUser?.name}</p>
                <p className="text-xs text-muted-foreground">
                  Ward {currentUser?.ward} · {currentUser?.points || 0} pts · {currentUser?.badge}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-muted-foreground">Your Rank</p>
              <p className="text-2xl font-heading font-black text-accent">#{myRank}</p>
            </div>
          </div>
        </div>
      )}
    </CitizenLayout>
  );
}