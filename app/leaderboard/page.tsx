'use client';

import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Flame, RefreshCw, Users, CheckCircle, Clock } from 'lucide-react';
import { LeaderboardEntry } from '@/types/database';
import { MOCK_LEADERBOARD } from '@/lib/mockData';
import { createClient } from '@/lib/supabase/client';

export default function LeaderboardPage() {
  const supabase = createClient();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(MOCK_LEADERBOARD);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchLiveLeaderboard();
  }, []);

  const fetchLiveLeaderboard = async () => {
    setLoading(true);
    try {
      // Fetch teams, profiles, and solves from Supabase
      const { data: teams } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          profiles(id),
          solves(points, created_at)
        `);

      if (teams && teams.length > 0) {
        const parsed: LeaderboardEntry[] = teams.map((team: any) => {
          const solvesList = team.solves || [];
          const totalPts = solvesList.reduce((acc: number, s: any) => acc + (s.points || 0), 0);
          
          // Find latest solve time
          let lastTime: string | null = null;
          if (solvesList.length > 0) {
            const sortedTimes = solvesList
              .map((s: any) => new Date(s.created_at).getTime())
              .sort((a: number, b: number) => b - a);
            lastTime = new Date(sortedTimes[0]).toISOString();
          }

          return {
            rank: 0,
            team_id: team.id,
            team_name: team.name,
            total_points: totalPts,
            solves_count: solvesList.length,
            last_solve_time: lastTime,
            members_count: (team.profiles || []).length,
          };
        });

        // Sort by total points (desc) and earliest last_solve_time (asc)
        parsed.sort((a, b) => {
          if (b.total_points !== a.total_points) {
            return b.total_points - a.total_points;
          }
          if (a.last_solve_time && b.last_solve_time) {
            return new Date(a.last_solve_time).getTime() - new Date(b.last_solve_time).getTime();
          }
          return 0;
        });

        // Assign ranks
        parsed.forEach((entry, idx) => {
          entry.rank = idx + 1;
        });

        setLeaderboard(parsed);
      }
    } catch (err) {
      console.error('Error fetching live leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center gap-1 text-amber-400 font-bold bg-amber-500/20 px-2.5 py-1 rounded border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
            <Trophy className="h-4 w-4 text-amber-400" /> #1 GOLD
          </div>
        );
      case 2:
        return (
          <div className="flex items-center gap-1 text-slate-300 font-bold bg-slate-400/20 px-2.5 py-1 rounded border border-slate-400/40">
            <Medal className="h-4 w-4 text-slate-300" /> #2 SILVER
          </div>
        );
      case 3:
        return (
          <div className="flex items-center gap-1 text-amber-600 font-bold bg-amber-700/20 px-2.5 py-1 rounded border border-amber-700/40">
            <Award className="h-4 w-4 text-amber-600" /> #3 BRONZE
          </div>
        );
      default:
        return (
          <span className="font-mono text-sm font-bold text-slate-400 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
            #{rank}
          </span>
        );
    }
  };

  const maxPoints = Math.max(...leaderboard.map(l => l.total_points), 1000);

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 font-mono">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-2">
            <Flame className="h-3.5 w-3.5 text-amber-400 animate-bounce" />
            LIVE LEADERBOARD MATRIX
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">GLOBAL SCOREBOARD</h1>
          <p className="text-xs text-slate-400 mt-1">Teams ranked by total points and solve speed timestamps.</p>
        </div>

        <button
          onClick={fetchLiveLeaderboard}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs font-bold text-emerald-400 hover:bg-slate-800 hover:border-emerald-500/40 transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          REFRESH RANKS
        </button>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
        {leaderboard.slice(0, 3).map((entry) => (
          <div
            key={entry.team_id}
            className={`cyber-card rounded-2xl p-6 border relative overflow-hidden flex flex-col justify-between ${
              entry.rank === 1
                ? 'border-amber-500/50 bg-amber-950/20 shadow-[0_0_30px_rgba(245,158,11,0.15)]'
                : entry.rank === 2
                ? 'border-slate-400/40 bg-slate-900/40'
                : 'border-amber-700/40 bg-amber-950/10'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                {getRankBadge(entry.rank)}
                <span className="text-xs text-slate-400">{entry.members_count} OPERATIVES</span>
              </div>

              <h3 className="text-xl font-black text-white line-clamp-1">{entry.team_name}</h3>
              
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-400">{entry.total_points}</span>
                <span className="text-xs text-slate-400 font-bold">POINTS</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-cyan-400 font-bold">
                <CheckCircle className="h-3.5 w-3.5" /> {entry.solves_count} SOLVES
              </span>
              <span>
                {entry.last_solve_time ? new Date(entry.last_solve_time).toLocaleTimeString() : 'No solves'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Complete Leaderboard Table */}
      <div className="cyber-card rounded-2xl border border-slate-800 overflow-hidden font-mono">
        <div className="p-4 sm:p-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-wider">ALL PARTICIPATING SQUADS ({leaderboard.length})</h2>
          <span className="text-xs text-slate-500">DYNAMIC SCORE RECOVERY</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-6 font-bold">RANK</th>
                <th className="py-3.5 px-6 font-bold">SQUAD NAME</th>
                <th className="py-3.5 px-6 font-bold">PROGRESS</th>
                <th className="py-3.5 px-6 font-bold text-center">SOLVES</th>
                <th className="py-3.5 px-6 font-bold text-right">TOTAL POINTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {leaderboard.map((entry) => {
                const progressWidth = `${Math.min(100, Math.max(8, (entry.total_points / maxPoints) * 100))}%`;

                return (
                  <tr key={entry.team_id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-6 font-bold">
                      {getRankBadge(entry.rank)}
                    </td>
                    
                    <td className="py-4 px-6">
                      <div className="font-bold text-white text-sm">{entry.team_name}</div>
                      <div className="text-[10px] text-slate-500">{entry.members_count} team members</div>
                    </td>

                    <td className="py-4 px-6 w-1/3">
                      <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                          style={{ width: progressWidth }}
                        ></div>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-center font-bold text-cyan-400">
                      {entry.solves_count}
                    </td>

                    <td className="py-4 px-6 text-right font-black text-emerald-400 text-sm">
                      {entry.total_points} PTS
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
