'use client';

import { useState, useEffect } from 'react';
import { Loader2, Search, Trash2, Eye, RefreshCw, Crown, Users, Trophy, AlertCircle, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';

export default function AdminTeamsPage() {
  const supabase = createClient();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => { loadTeams(); }, []);

  const loadTeams = async () => {
    setLoading(true);
    const [teamsRes, profilesRes, solvesRes] = await Promise.all([
      supabase.from('teams').select('id, name, invite_code, created_by, created_at').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, team_id, username, email'),
      supabase.from('solves').select('id, team_id, points, created_at, challenges(title, category)'),
    ]);

    const teamsData = teamsRes.data || [];
    const profilesData = profilesRes.data || [];
    const solvesData = solvesRes.data || [];

    const parsed = teamsData.map((t) => {
      const members = profilesData.filter((p) => p.team_id === t.id);
      const solves = solvesData.filter((s) => s.team_id === t.id);
      const captain = members.find((m) => m.id === t.created_by);
      return {
        ...t,
        members,
        solves,
        captain,
        members_count: members.length,
        total_points: solves.reduce((acc, s) => acc + ((s as any).points || 0), 0),
      };
    });

    // Sort by points descending
    parsed.sort((a, b) => b.total_points - a.total_points);
    setTeams(parsed);
    setLoading(false);
  };

  const handleDeleteTeam = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Unlink all team dependencies to avoid FK constraints
      await Promise.all([
        supabase.from('profiles').update({ team_id: null }).eq('team_id', deleteTarget.id),
        supabase.from('solves').update({ team_id: null }).eq('team_id', deleteTarget.id),
        supabase.from('hint_reveals').update({ team_id: null }).eq('team_id', deleteTarget.id),
        supabase.from('submission_logs').update({ team_id: null }).eq('team_id', deleteTarget.id),
        supabase.from('challenges').update({ first_blood_team_id: null }).eq('first_blood_team_id', deleteTarget.id),
      ]);

      const { error } = await supabase.from('teams').delete().eq('id', deleteTarget.id);
      if (error) throw error;

      showToast('success', `Team "${deleteTarget.name}" deleted.`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete team.');
    } finally {
      setDeleteTarget(null);
      setDeleting(false);
      await loadTeams();
    }
  };

  const handleRegenerateCode = async (teamId: string, teamName: string) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newCode = 'BLK-';
    for (let i = 0; i < 6; i++) newCode += chars.charAt(Math.floor(Math.random() * chars.length));
    await supabase.from('teams').update({ invite_code: newCode }).eq('id', teamId);
    await loadTeams();
    showToast('success', `Invite code for "${teamName}" regenerated.`);
  };

  const handleTransferCaptain = async (teamId: string, newCaptainId: string, newCaptainName: string) => {
    await supabase.from('teams').update({ created_by: newCaptainId }).eq('id', teamId);
    await loadTeams();
    // Refresh selected team too
    if (selectedTeam?.id === teamId) {
      setSelectedTeam(teams.find((t) => t.id === teamId) || null);
    }
    showToast('success', `${newCaptainName} is now the team captain.`);
  };

  const handleKickMember = async (memberId: string, username: string) => {
    await supabase.from('profiles').update({ team_id: null }).eq('id', memberId);
    await loadTeams();
    if (selectedTeam) {
      setSelectedTeam((prev: any) => ({
        ...prev,
        members: prev.members.filter((m: any) => m.id !== memberId),
        members_count: prev.members_count - 1,
      }));
    }
    showToast('success', `${username} removed from team.`);
  };

  const filteredTeams = teams.filter((t) =>
    (t.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-600" /></div>;
  }

  const stats = {
    total: teams.length,
    full: teams.filter((t) => t.members_count >= 4).length,
    withSolves: teams.filter((t) => t.solves.length > 0).length,
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-lg border text-sm flex items-center gap-2 shadow-xl animate-fade-in ${
          toast.type === 'success' ? 'bg-zinc-900 border-emerald-500/40 text-emerald-400' : 'bg-zinc-900 border-red-500/40 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* Header + Stats */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Team Management</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {stats.total} teams ·{' '}
            <span className="text-amber-400">{stats.full} full</span> ·{' '}
            <span className="text-emerald-400">{stats.withSolves} with solves</span>
          </p>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teams..."
            className="w-full rounded-lg bg-zinc-900 border border-zinc-800 pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 outline-none transition-colors" />
        </div>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900/50 border-b border-zinc-800">
              <tr>
                <th scope="col" className="py-3 px-4 font-medium text-zinc-500 w-8">#</th>
                <th scope="col" className="py-3 px-4 font-medium text-zinc-500">Team Name</th>
                <th scope="col" className="py-3 px-4 font-medium text-zinc-500">Captain</th>
                <th scope="col" className="py-3 px-4 font-medium text-zinc-500">Invite Code</th>
                <th scope="col" className="py-3 px-4 font-medium text-zinc-500 text-center">Members</th>
                <th scope="col" className="py-3 px-4 font-medium text-zinc-500 text-center">Solves</th>
                <th scope="col" className="py-3 px-4 font-medium text-zinc-500 text-right">Score</th>
                <th scope="col" className="py-3 px-4 font-medium text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredTeams.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-zinc-500">No teams found</td></tr>
              ) : filteredTeams.map((t, idx) => (
                <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors cursor-pointer" onClick={() => setSelectedTeam(t)}>
                  <td className="py-3 px-4 text-xs text-zinc-600">#{idx + 1}</td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-zinc-200">{t.name}</span>
                  </td>
                  <td className="py-3 px-4 text-xs text-zinc-400">
                    {t.captain ? (
                      <span className="flex items-center gap-1">
                        <Crown className="h-3 w-3 text-amber-400" />{t.captain.username}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-[family-name:var(--font-mono)] text-xs text-emerald-400">{t.invite_code}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRegenerateCode(t.id, t.name); }}
                        className="text-zinc-600 hover:text-zinc-300 transition-colors"
                        aria-label="Regenerate invite code"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-xs font-medium ${t.members_count >= 4 ? 'text-amber-400' : 'text-zinc-400'}`}>
                      {t.members_count}/4
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-emerald-400 text-xs font-medium">{t.solves.length}</td>
                  <td className="py-3 px-4 text-right font-bold text-amber-400">{t.total_points} pts</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedTeam(t); }}
                        className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        aria-label="View team details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: t.id, name: t.name }); }}
                        className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label="Delete team"
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

      {/* ── Team Detail Modal ── */}
      <Modal open={!!selectedTeam} onClose={() => setSelectedTeam(null)} title={selectedTeam?.name}>
        {selectedTeam && (
          <div className="space-y-5">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
                <p className="text-lg font-bold text-amber-400">{selectedTeam.total_points}</p>
                <p className="text-xs text-zinc-500 mt-0.5">Points</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
                <p className="text-lg font-bold text-emerald-400">{selectedTeam.solves.length}</p>
                <p className="text-xs text-zinc-500 mt-0.5">Solves</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
                <p className="text-lg font-bold text-blue-400">{selectedTeam.members_count}/4</p>
                <p className="text-xs text-zinc-500 mt-0.5">Members</p>
              </div>
            </div>

            {/* Invite Code */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800">
              <div>
                <p className="text-xs text-zinc-500 mb-0.5">Invite Code</p>
                <p className="font-[family-name:var(--font-mono)] text-sm font-semibold text-emerald-400">{selectedTeam.invite_code}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => handleRegenerateCode(selectedTeam.id, selectedTeam.name)}>
                <RefreshCw className="h-3.5 w-3.5" /> Regenerate
              </Button>
            </div>

            {/* Members with admin controls */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Members</h4>
              <div className="space-y-2">
                {(selectedTeam.members || []).map((m: any) => {
                  const isCaptain = m.id === selectedTeam.created_by;
                  return (
                    <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-7 w-7 rounded flex items-center justify-center font-bold text-xs ${isCaptain ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-800 text-zinc-400'}`}>
                          {m.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-zinc-200">{m.username}</span>
                            {isCaptain && <Crown className="h-3 w-3 text-amber-400" aria-label="Captain" />}
                          </div>
                          <span className="text-zinc-500">{m.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {!isCaptain && (
                          <button
                            onClick={() => handleTransferCaptain(selectedTeam.id, m.id, m.username)}
                            className="px-2 py-1 rounded text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-1"
                            aria-label={`Make ${m.username} captain`}
                          >
                            <Crown className="h-3 w-3" /> Make Captain
                          </button>
                        )}
                        <button
                          onClick={() => handleKickMember(m.id, m.username)}
                          className="px-2 py-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1"
                          aria-label={`Remove ${m.username}`}
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Solved Challenges */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Solved Challenges</h4>
              {selectedTeam.solves.length === 0 ? (
                <p className="text-xs text-zinc-500">No solves yet.</p>
              ) : (
                <div className="divide-y divide-zinc-800/60 max-h-[200px] overflow-y-auto">
                  {selectedTeam.solves.map((s: any) => (
                    <div key={s.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-zinc-300">{(s as any).challenges?.title || 'Challenge'}</span>
                        <span className="text-zinc-600 ml-2">{(s as any).challenges?.category}</span>
                      </div>
                      <span className="font-semibold text-emerald-400">+{s.points} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Danger zone */}
            <div className="pt-3 border-t border-zinc-800">
              <Button
                onClick={() => { setSelectedTeam(null); setDeleteTarget({ id: selectedTeam.id, name: selectedTeam.name }); }}
                className="!bg-red-500/10 !border-red-500/30 !text-red-400 hover:!bg-red-500/20 w-full justify-center"
              >
                <Trash2 className="h-4 w-4" /> Delete Team
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Team">
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
            <p className="font-semibold mb-1">⚠️ This action cannot be undone.</p>
            <p>Deleting <strong>"{deleteTarget?.name}"</strong> will unlink all members and remove all team-level data. Member accounts and individual solve records are preserved.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button onClick={handleDeleteTeam} loading={deleting}
              className="!bg-red-500/20 !border-red-500/40 !text-red-400 hover:!bg-red-500/30">
              <Trash2 className="h-4 w-4" /> Delete Team
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
