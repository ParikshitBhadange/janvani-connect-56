import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import CitizenLayout from '@/components/CitizenLayout';
import { WARDS } from '@/types';

export default function CitizenLeaderboard() {
  const { users, currentUser } = useApp();
  const [ward, setWard] = useState(0);

  const citizens = users.filter(u => u.role === 'citizen' && (ward === 0 || u.ward === ward))
    .sort((a, b) => (b.points || 0) - (a.points || 0));

  const top3 = citizens.slice(0, 3);
  const myRank = citizens.findIndex(u => u.id === currentUser?.id) + 1;

  const badgeIcon = (b?: string) => b === 'Gold' ? '🥇' : b === 'Silver' ? '🥈' : '🥉';

  return (
    <CitizenLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold">Leaderboard</h1>
          <select value={ward} onChange={e => setWard(Number(e.target.value))} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value={0}>All Wards</option>
            {WARDS.map(w => <option key={w} value={w}>Ward {w}</option>)}
          </select>
        </div>

        {/* Podium */}
        {top3.length >= 3 && (
          <div className="flex items-end justify-center gap-4 py-6">
            {[1, 0, 2].map(idx => {
              const u = top3[idx];
              const heights = ['h-28', 'h-20', 'h-14'];
              const sizes = ['text-3xl', 'text-2xl', 'text-xl'];
              return (
                <div key={idx} className="text-center flex-1 max-w-[120px]">
                  <div className={`h-12 w-12 rounded-full mx-auto mb-2 flex items-center justify-center font-bold ${idx === 0 ? 'bg-warning/20 text-warning ring-2 ring-warning' : 'bg-muted'} ${sizes[idx]}`}>
                    {u.name[0]}
                  </div>
                  <p className="text-sm font-semibold truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.points} pts</p>
                  <div className={`mt-2 rounded-t-lg bg-accent/10 ${heights[idx]} flex items-center justify-center text-2xl`}>
                    {badgeIcon(u.badge)}
                  </div>
                  <div className="bg-accent text-accent-foreground text-sm font-bold py-1 rounded-b-lg">#{idx + 1}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Rank</th>
                <th className="text-left p-3 font-medium">Citizen</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">Ward</th>
                <th className="text-right p-3 font-medium">Points</th>
                <th className="text-center p-3 font-medium">Badge</th>
              </tr>
            </thead>
            <tbody>
              {citizens.map((u, i) => (
                <tr key={u.id} className={`border-t border-border ${u.id === currentUser?.id ? 'bg-accent/5' : ''}`}>
                  <td className="p-3 font-mono font-bold">#{i + 1}</td>
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">Ward {u.ward}</td>
                  <td className="p-3 text-right font-semibold">{u.points}</td>
                  <td className="p-3 text-center">{badgeIcon(u.badge)} {u.badge}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {myRank > 0 && (
          <div className="card-elevated p-4 flex items-center justify-between bg-accent/5">
            <span className="text-sm font-medium">Your Rank</span>
            <span className="text-lg font-heading font-bold text-accent">#{myRank}</span>
          </div>
        )}
      </div>
    </CitizenLayout>
  );
}
