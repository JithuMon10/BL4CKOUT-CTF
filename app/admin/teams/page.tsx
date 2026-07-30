'use client';

import { useState, useEffect } from 'react';
import { Loader2, Search, Trash2, Eye, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

export default function AdminTeamsPage() {
  const supabase = createClient();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Detail Modal
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    setLoading(true);
    // Clean separate queries to avoid PostgREST relationship ambiguity
    const [teamsRes, profilesRes, solvesRes] = await Promise.all([
      supabase.from('teams').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, team_id, username, email'),
      supabase.from('solves').select('id, team_id, points, created_at, challenges(title)'),
    ]);

    const teamsData = teamsRes.data || [];
    const profilesData = profilesRes.data || [];
    const solvesData = solvesRes.data || [];

    const parsed = teamsData.map((t) => {
      const members = profilesData.filter((p) => p.team_id === t.id);
      const solves = solvesData.filter((s) => s.team_id === t.id);
      const totalPts = solves.reduce((acc, s) => acc + (s.points || 0), 0);

      return {
        ...t,
        members,
        solves,
        members_count: members.length,
        total_points: totalPts,
      };
    });

    setTeams(parsed);
    setLoading(false);
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete team "${teamName}"? All member associations will be removed.`)) return;

    setDeletingId(teamId);
    // 1. Unlink profiles
    await supabase.from('profiles').update({ team_id: null }).eq('team_id', teamId);
    // 2. Delete team
    await supabase.from('teams').delete().eq('id', teamId);

    await loadTeams();
    setDeletingId(null);
  };

  const handleRegenerateCode = async (teamId: string) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newCode = 'BLK-';
    for (let i = 0; i < 6; i++) newCode += chars.charAt(Math.floor(Math.random() * chars.length));

    await supabase.from('teams').update({ invite_code: newCode }).eq('id', teamId);
    await loadTeams();
  };

  const filteredTeams = teams.filter((t) =>
    (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.invite_code || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-600" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Team Management</h1>
          <p className="text-sm text-zinc-500 mt-1">{teams.length} teams registered</p>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team name or code..."
            className="w-full rounded-lg bg-zinc-900 border border-zinc-800 pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 outline-none transition-colors"
          />
        </div>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900/50 border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4 font-medium text-zinc-500">Team Name</th>
                <th className="py-3 px-4 font-medium text-zinc-500">Invite Code</th>
                <th className="py-3 px-4 font-medium text-zinc-500 text-center">Members</th>
                <th className="py-3 px-4 font-medium text-zinc-500 text-right">Score</th>
                <th className="py-3 px-4 font-medium text-zinc-500 text-right">Created</th>
                <th className="py-3 px-4 font-medium text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredTeams.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-zinc-200">{t.name}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-xs text-emerald-400">
                      <span>{t.invite_code}</span>
                      <button
                        onClick={() => handleRegenerateCode(t.id)}
                        className="text-zinc-600 hover:text-zinc-300 transition-colors"
                        title="Regenerate invite code"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center text-zinc-400">{t.members_count}</td>
                  <td className="py-3 px-4 text-right font-semibold text-amber-400">{t.total_points} pts</td>
                  <td className="py-3 px-4 text-right text-zinc-500 text-xs">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSelectedTeam(t)}
                        className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        title="View team details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(t.id, t.name)}
                        className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete team"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Team Details Modal */}
      <Modal open={!!selectedTeam} onClose={() => setSelectedTeam(null)} title={selectedTeam?.name}>
        {selectedTeam && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <p className="text-xs text-zinc-500">Invite Code</p>
                <p className="font-[family-name:var(--font-mono)] text-sm font-semibold text-emerald-400">{selectedTeam.invite_code}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Score & Solves</p>
                <p className="text-sm font-bold text-amber-400">{selectedTeam.total_points} pts ({selectedTeam.solves?.length || 0} solves)</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Members ({selectedTeam.members?.length || 0})</h4>
              <div className="space-y-1.5">
                {selectedTeam.members?.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded bg-zinc-900 text-xs">
                    <span className="font-medium text-zinc-200">{m.username}</span>
                    <span className="text-zinc-500">{m.email}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Solved Challenges</h4>
              {selectedTeam.solves?.length === 0 ? (
                <p className="text-xs text-zinc-500">No solves yet.</p>
              ) : (
                <div className="divide-y divide-zinc-800/60 max-h-[200px] overflow-y-auto">
                  {selectedTeam.solves?.map((s: any) => (
                    <div key={s.id} className="py-2 flex items-center justify-between text-xs">
                      <span className="text-zinc-300">{s.challenges?.title || 'Challenge'}</span>
                      <span className="font-semibold text-emerald-400">+{s.points} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
