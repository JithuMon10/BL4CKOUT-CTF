'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Loader2, RefreshCw } from 'lucide-react';
import { LeaderboardEntry } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { SkeletonRow } from '@/components/ui/Skeleton';

export default function LeaderboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  useEffect(() => {
    if (authed === false) {
      router.push('/login');
    }
  }, [authed, router]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setAuthed(false);
        setLoading(false);
        return;
      }

      setAuthed(true);

      // Get current user's team
      const { data: profile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single();

      setCurrentTeamId(profile?.team_id || null);

      // Fetch teams with solves and profiles
      const { data: teams, error } = await supabase
        .from('teams')
        .select(`id, name, profiles(id), solves(points, created_at)`);

      if (error) {
        console.error('Error fetching leaderboard:', error);
      } else if (teams) {
        const parsed: LeaderboardEntry[] = teams.map((team: any) => {
          const solvesList = team.solves || [];
          const totalPts = solvesList.reduce((acc: number, s: any) => acc + (s.points || 0), 0);

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

        parsed.sort((a, b) => {
          if (b.total_points !== a.total_points) return b.total_points - a.total_points;
          if (a.last_solve_time && b.last_solve_time) {
            return new Date(a.last_solve_time).getTime() - new Date(b.last_solve_time).getTime();
          }
          return 0;
        });

        parsed.forEach((entry, idx) => {
          entry.rank = idx + 1;
        });

        setLeaderboard(parsed);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authed === null || authed === false) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Scoreboard</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {leaderboard.length > 0
              ? `${leaderboard.length} teams competing`
              : 'No teams have scored yet'}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadLeaderboard} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-10 w-10" />}
          title="No teams have scored yet"
          description="The scoreboard will populate as teams solve challenges."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/50 border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4 font-medium text-zinc-500 w-16">Rank</th>
                  <th className="py-3 px-4 font-medium text-zinc-500">Team</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 text-right">Score</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 text-right hidden sm:table-cell">Last Solve</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {leaderboard.map((entry) => {
                  const isCurrentTeam = entry.team_id === currentTeamId;
                  return (
                    <tr
                      key={entry.team_id}
                      className={`transition-colors ${
                        isCurrentTeam
                          ? 'bg-emerald-500/5 border-l-2 border-l-emerald-500'
                          : 'hover:bg-zinc-800/30'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-semibold ${
                            entry.rank === 1
                              ? 'bg-amber-500/15 text-amber-400'
                              : entry.rank === 2
                              ? 'bg-zinc-500/15 text-zinc-400'
                              : entry.rank === 3
                              ? 'bg-amber-700/15 text-amber-600'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isCurrentTeam ? 'text-emerald-400' : 'text-zinc-200'}`}>
                            {entry.team_name}
                          </span>
                          {isCurrentTeam && (
                            <span className="text-[10px] text-emerald-500 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-zinc-200">{entry.total_points}</span>
                        <span className="text-zinc-600 ml-1 text-xs">pts</span>
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-500 text-xs hidden sm:table-cell">
                        {entry.last_solve_time
                          ? new Date(entry.last_solve_time).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
