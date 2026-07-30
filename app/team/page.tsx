'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Copy, Check, UserPlus, AlertCircle, Loader2, Trophy, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';

export default function TeamPage() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [teamSolves, setTeamSolves] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  // Directory of all teams
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [selectedTeamModal, setSelectedTeamModal] = useState<any | null>(null);

  const [tab, setTab] = useState<'my-team' | 'create' | 'join' | 'all-teams'>('my-team');
  const [teamName, setTeamName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (authed === false) {
      router.push('/login');
    }
  }, [authed, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        setAuthed(false);
        setLoading(false);
        return;
      }

      setAuthed(true);
      setUser(currentUser);

      // 1. Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      setProfile(profileData);

      // 2. Fetch active team if linked
      if (profileData?.team_id) {
        const { data: teamData } = await supabase
          .from('teams')
          .select('*')
          .eq('id', profileData.team_id)
          .maybeSingle();

        setTeam(teamData);

        if (teamData) {
          // Fetch members of this team
          const { data: teamMembers } = await supabase
            .from('profiles')
            .select('id, username, email, created_at')
            .eq('team_id', teamData.id);

          setMembers(teamMembers || []);

          // Fetch solves of this team
          const { data: solvesData } = await supabase
            .from('solves')
            .select('*, challenges(title, category, points)')
            .eq('team_id', teamData.id)
            .order('created_at', { ascending: false });

          setTeamSolves(solvesData || []);
          setTotalPoints((solvesData || []).reduce((acc, s) => acc + (s.points || 0), 0));
        }
      } else {
        setTeam(null);
        setMembers([]);
        setTeamSolves([]);
        setTotalPoints(0);
        setTab('create'); // Default to create if user has no team
      }

      // 3. Fetch directory of ALL teams (clean separate queries)
      await fetchAllTeamsDirectory();

    } catch (err) {
      console.error('Error loading team data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTeamsDirectory = async () => {
    const { data: teamsData } = await supabase.from('teams').select('*').order('created_at', { ascending: false });
    const { data: profilesData } = await supabase.from('profiles').select('id, team_id, username');
    const { data: solvesData } = await supabase.from('solves').select('id, team_id, points, created_at, challenges(title)');

    if (teamsData) {
      const parsed = teamsData.map((t: any) => {
        const tMembers = (profilesData || []).filter((p) => p.team_id === t.id);
        const tSolves = (solvesData || []).filter((s) => s.team_id === t.id);
        const pts = tSolves.reduce((acc, s) => acc + (s.points || 0), 0);

        return {
          ...t,
          members: tMembers,
          solves: tSolves,
          members_count: tMembers.length,
          total_points: pts,
        };
      });

      // Sort by score
      parsed.sort((a, b) => b.total_points - a.total_points);
      setAllTeams(parsed);
    }
  };

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'BLK-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !user) return;

    setActionLoading(true);
    setMessage(null);

    try {
      const code = generateInviteCode();

      // 1. Create team
      const { data: newTeam, error: teamErr } = await supabase
        .from('teams')
        .insert({ name: teamName.trim(), invite_code: code, created_by: user.id })
        .select()
        .single();

      if (teamErr) throw teamErr;

      // 2. Link current user profile to new team
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ team_id: newTeam.id })
        .eq('id', user.id);

      if (profileErr) throw profileErr;

      setMessage({ type: 'success', text: `Team "${newTeam.name}" created! Your invite code is ${newTeam.invite_code}` });
      setTab('my-team');
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create team. Name might already be in use.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim() || !user) return;

    setActionLoading(true);
    setMessage(null);

    try {
      // Find team by invite code
      const { data: targetTeam, error: searchErr } = await supabase
        .from('teams')
        .select('*')
        .eq('invite_code', inviteCodeInput.trim().toUpperCase())
        .maybeSingle();

      if (searchErr || !targetTeam) {
        throw new Error('Invalid invite code. Team not found.');
      }

      // Update user profile
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ team_id: targetTeam.id })
        .eq('id', user.id);

      if (profileErr) throw profileErr;

      setMessage({ type: 'success', text: `Successfully joined team "${targetTeam.name}"!` });
      setTab('my-team');
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to join team.' });
    } finally {
      setActionLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (!team?.invite_code) return;
    navigator.clipboard.writeText(team.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authed === null || authed === false || loading) {
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
          <h1 className="text-2xl font-semibold text-zinc-100">Team Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {team ? `Member of ${team.name}` : 'Create or join a team to submit flags and compete'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800 self-start sm:self-auto text-xs font-medium">
          {team && (
            <button
              onClick={() => { setTab('my-team'); setMessage(null); }}
              className={`px-3 py-1.5 rounded-md transition-colors ${tab === 'my-team' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              My Team
            </button>
          )}
          <button
            onClick={() => { setTab('create'); setMessage(null); }}
            className={`px-3 py-1.5 rounded-md transition-colors ${tab === 'create' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Create Team
          </button>
          <button
            onClick={() => { setTab('join'); setMessage(null); }}
            className={`px-3 py-1.5 rounded-md transition-colors ${tab === 'join' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Join Team
          </button>
          <button
            onClick={() => { setTab('all-teams'); setMessage(null); }}
            className={`px-3 py-1.5 rounded-md transition-colors ${tab === 'all-teams' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            All Teams ({allTeams.length})
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {message.text}
        </div>
      )}

      {/* Tab: My Team */}
      {tab === 'my-team' && team && (
        <div className="space-y-6">
          {/* Team Banner */}
          <Card padding="lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-zinc-500 uppercase font-medium tracking-wider">Active Team</span>
                <h2 className="text-2xl font-bold text-zinc-100 mt-0.5">{team.name}</h2>
                <p className="text-xs text-zinc-500 mt-1">Created on {new Date(team.created_at).toLocaleDateString()}</p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Invite Code Box */}
                <div className="flex items-center gap-3 bg-zinc-950 px-3.5 py-2 rounded-lg border border-zinc-800">
                  <div>
                    <span className="block text-[10px] text-zinc-500 font-medium uppercase">Invite Code</span>
                    <span className="font-[family-name:var(--font-mono)] text-sm font-semibold text-emerald-400 tracking-wider">
                      {team.invite_code}
                    </span>
                  </div>
                  <button
                    onClick={copyInviteCode}
                    className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Copy Invite Code"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                {/* Score */}
                <div className="bg-zinc-950 px-4 py-2 rounded-lg border border-zinc-800 text-right">
                  <span className="block text-[10px] text-zinc-500 font-medium uppercase">Total Score</span>
                  <span className="text-lg font-bold text-amber-400">{totalPoints} <span className="text-xs text-zinc-500">pts</span></span>
                </div>
              </div>
            </div>
          </Card>

          {/* Roster & Solves Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Roster */}
            <Card padding="md">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center justify-between">
                <span>Team Members ({members.length})</span>
                <span className="text-xs text-zinc-500 font-normal">Invite teammates using code above</span>
              </h3>

              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                        {m.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{m.username}</p>
                        <p className="text-xs text-zinc-500">{m.email}</p>
                      </div>
                    </div>
                    {m.id === user.id && <Badge variant="success">You</Badge>}
                  </div>
                ))}
              </div>
            </Card>

            {/* Solves */}
            <Card padding="md">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">
                Solved Challenges ({teamSolves.length})
              </h3>

              {teamSolves.length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 text-center">No solves recorded yet. Solve challenges to earn team points!</p>
              ) : (
                <div className="divide-y divide-zinc-800/60 max-h-[300px] overflow-y-auto">
                  {teamSolves.map((s) => (
                    <div key={s.id} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-zinc-200">{s.challenges?.title || 'Challenge'}</p>
                        <p className="text-xs text-zinc-500">{s.challenges?.category}</p>
                      </div>
                      <span className="font-semibold text-emerald-400">+{s.points} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Create Team */}
      {tab === 'create' && (
        <div className="max-w-md mx-auto">
          <Card padding="lg">
            <h2 className="text-base font-semibold text-zinc-100 mb-1">Create New Team</h2>
            <p className="text-xs text-zinc-500 mb-4">Choose a team name. A unique invite code will be generated for your team.</p>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <Input
                label="Team Name"
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Cyber_Defenders"
              />
              <Button type="submit" loading={actionLoading} className="w-full">
                <Plus className="h-4 w-4" />
                Create Team & Generate Invite Code
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Tab: Join Team */}
      {tab === 'join' && (
        <div className="max-w-md mx-auto">
          <Card padding="lg">
            <h2 className="text-base font-semibold text-zinc-100 mb-1">Join an Existing Team</h2>
            <p className="text-xs text-zinc-500 mb-4">Enter the 6-character invite code shared by your team captain.</p>

            <form onSubmit={handleJoinTeam} className="space-y-4">
              <Input
                label="Invite Code"
                type="text"
                required
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                placeholder="BLK-XXXXXX"
                className="font-[family-name:var(--font-mono)] uppercase tracking-wider"
              />
              <Button type="submit" loading={actionLoading} className="w-full">
                <UserPlus className="h-4 w-4" />
                Join Team
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Tab: All Teams Directory */}
      {tab === 'all-teams' && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/50 border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4 font-medium text-zinc-500">Rank</th>
                  <th className="py-3 px-4 font-medium text-zinc-500">Team Name</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 text-center">Members</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 text-right">Score</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {allTeams.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-zinc-400">#{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-zinc-100">{t.name}</td>
                    <td className="py-3 px-4 text-center text-zinc-400">{t.members_count}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">{t.total_points} pts</td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTeamModal(t)}>
                        <Eye className="h-3.5 w-3.5" /> Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Team Details Modal */}
      <Modal open={!!selectedTeamModal} onClose={() => setSelectedTeamModal(null)} title={selectedTeamModal?.name}>
        {selectedTeamModal && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <p className="text-xs text-zinc-500">Total Score</p>
                <p className="text-xl font-bold text-amber-400">{selectedTeamModal.total_points} pts</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 text-right">Total Members</p>
                <p className="text-sm font-semibold text-zinc-200 text-right">{selectedTeamModal.members_count} members</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Team Members</h4>
              <div className="flex flex-wrap gap-2">
                {selectedTeamModal.members?.map((m: any) => (
                  <span key={m.id} className="px-2.5 py-1 rounded-md bg-zinc-800 text-xs font-medium text-zinc-300">
                    {m.username}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Solved Challenges ({selectedTeamModal.solves?.length || 0})</h4>
              {selectedTeamModal.solves?.length === 0 ? (
                <p className="text-xs text-zinc-500">No solves yet.</p>
              ) : (
                <div className="divide-y divide-zinc-800/60 max-h-[200px] overflow-y-auto">
                  {selectedTeamModal.solves?.map((s: any) => (
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
