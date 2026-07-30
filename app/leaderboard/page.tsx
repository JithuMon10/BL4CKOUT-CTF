'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Loader2, RefreshCw, Search, Eye, Snowflake } from 'lucide-react';
import { LeaderboardEntry } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { SkeletonRow } from '@/components/ui/Skeleton';

export default function LeaderboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFrozen, setIsFrozen] = useState(false);

  // Selected team modal
  const [selectedTeamModal, setSelectedTeamModal] = useState<any | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamSolvesList, setTeamSolvesList] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

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

      // Check settings for scoreboard_frozen
      const { data: freezeSetting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'scoreboard_frozen')
        .maybeSingle();

      setIsFrozen(freezeSetting?.value === 'true');

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .maybeSingle();

      setCurrentTeamId(profile?.team_id || null);

      // Clean separate queries to avoid PostgREST relationship ambiguity
      const [teamsRes, profilesRes, solvesRes] = await Promise.all([
        supabase.from('teams').select('id, name, created_at'),
        supabase.from('profiles').select('id, team_id, username'),
        supabase.from('solves').select('id, team_id, points, created_at'),
      ]);

      const teams = teamsRes.data || [];
      const profiles = profilesRes.data || [];
      const solves = solvesRes.data || [];

      const parsed: LeaderboardEntry[] = teams.map((team: any) => {
        const teamSolves = solves.filter((s) => s.team_id === team.id);
        const teamMembers = profiles.filter((p) => p.team_id === team.id);

        const totalPts = teamSolves.reduce((acc: number, s: any) => acc + (s.points || 0), 0);

        let lastTime: string | null = null;
        if (teamSolves.length > 0) {
          const sortedTimes = teamSolves
            .map((s: any) => new Date(s.created_at).getTime())
            .sort((a: number, b: number) => b - a);
          lastTime = new Date(sortedTimes[0]).toISOString();
        }

        return {
          rank: 0,
          team_id: team.id,
          team_name: team.name,
          total_points: totalPts,
          solves_count: teamSolves.length,
          last_solve_time: lastTime,
          members_count: teamMembers.length,
        };
      });

      // Sort by total points desc, then earliest last_solve_time asc
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
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTeamModal = async (entry: LeaderboardEntry) => {
    setSelectedTeamModal(entry);
    setModalLoading(true);

    const [membersRes, solvesRes] = await Promise.all([
      supabase.from('profiles').select('id, username, email').eq('team_id', entry.team_id),
      supabase.from('solves').select('id, points, created_at, challenges(title, category)').eq('team_id', entry.team_id).order('created_at', { ascending: false }),
    ]);

    setTeamMembers(membersRes.data || []);
    setTeamSolvesList(solvesRes.data || []);
    setModalLoading(false);
  };

  const filteredLeaderboard = leaderboard.filter((entry) =>
    entry.team_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Live Scoreboard</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {leaderboard.length > 0
              ? `${leaderboard.length} teams competing`
              : 'No teams registered yet'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team..."
              className="w-48 rounded-lg bg-zinc-900 border border-zinc-800 pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 outline-none transition-colors"
            />
          </div>

          <Button variant="secondary" size="sm" onClick={loadLeaderboard} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Freeze Banner */}
      {isFrozen && (
        <div className="p-3.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs flex items-center gap-3 text-cyan-400">
          <Snowflake className="h-4 w-4 shrink-0" />
          <span>The scoreboard is currently frozen by the competition organizers. Solve points will be revealed at the end of the event.</span>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="card overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : filteredLeaderboard.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-10 w-10" />}
          title="No teams found"
          description={searchQuery ? 'No team matches your search query.' : 'The scoreboard will populate as teams join and solve challenges.'}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/50 border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4 font-medium text-zinc-500 w-16">Rank</th>
                  <th className="py-3 px-4 font-medium text-zinc-500">Team Name</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 text-center">Members</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 text-center">Solves</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 text-right">Score</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 text-right hidden sm:table-cell">Last Solve</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredLeaderboard.map((entry) => {
                  const isCurrentTeam = entry.team_id === currentTeamId;
                  return (
                    <tr
                      key={entry.team_id}
                      className={`transition-colors cursor-pointer ${
                        isCurrentTeam
                          ? 'bg-emerald-500/5 border-l-2 border-l-emerald-500'
                          : 'hover:bg-zinc-800/30'
                      }`}
                      onClick={() => handleOpenTeamModal(entry)}
                    >
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-semibold ${
                            entry.rank === 1
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : entry.rank === 2
                              ? 'bg-zinc-500/15 text-zinc-300 border border-zinc-500/30'
                              : entry.rank === 3
                              ? 'bg-amber-700/15 text-amber-600 border border-amber-700/30'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isCurrentTeam ? 'text-emerald-400' : 'text-zinc-200'}`}>
                            {entry.team_name}
                          </span>
                          {isCurrentTeam && (
                            <span className="text-[10px] text-emerald-500 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              Your Team
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center text-zinc-400 text-xs">
                        {entry.members_count}
                      </td>

                      <td className="py-3 px-4 text-center font-medium text-zinc-300">
                        {entry.solves_count}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-emerald-400 text-sm">{entry.total_points}</span>
                        <span className="text-zinc-500 ml-1 text-xs">pts</span>
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

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTeamModal(entry);
                          }}
                          className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                          title="View Team Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Team Details Modal */}
      <Modal open={!!selectedTeamModal} onClose={() => setSelectedTeamModal(null)} title={selectedTeamModal?.team_name}>
        {selectedTeamModal && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <p className="text-xs text-zinc-500">Rank & Score</p>
                <p className="text-lg font-bold text-amber-400">
                  #{selectedTeamModal.rank} · {selectedTeamModal.total_points} pts
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Team Stats</p>
                <p className="text-sm font-semibold text-zinc-200">
                  {selectedTeamModal.members_count} members · {selectedTeamModal.solves_count} solves
                </p>
              </div>
            </div>

            {modalLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
              </div>
            ) : (
              <>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Members</h4>
                  <div className="flex flex-wrap gap-2">
                    {teamMembers.map((m) => (
                      <span key={m.id} className="px-2.5 py-1 rounded-md bg-zinc-800 text-xs font-medium text-zinc-300">
                        {m.username}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Solved Challenges ({teamSolvesList.length})</h4>
                  {teamSolvesList.length === 0 ? (
                    <p className="text-xs text-zinc-500">No solves yet.</p>
                  ) : (
                    <div className="divide-y divide-zinc-800/60 max-h-[220px] overflow-y-auto">
                      {teamSolvesList.map((s) => (
                        <div key={s.id} className="py-2 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-zinc-200 font-medium">{s.challenges?.title || 'Challenge'}</span>
                            <span className="text-zinc-500 ml-2">({s.challenges?.category})</span>
                          </div>
                          <span className="font-semibold text-emerald-400">+{s.points} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
