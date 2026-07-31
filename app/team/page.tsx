'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Plus, Copy, Check, UserPlus, AlertCircle, Loader2,
  Crown, UserMinus, LogOut, Trash2, Eye, Flag, Trophy, ArrowRight
} from 'lucide-react';
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

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    body: string;
    variant: 'danger' | 'warning';
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (authed === false) router.push('/login'); }, [authed, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { setAuthed(false); setLoading(false); return; }
      setAuthed(true);
      setUser(currentUser);

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
      setProfile(profileData);

      if (profileData?.team_id) {
        const { data: teamData } = await supabase.from('teams').select('*').eq('id', profileData.team_id).maybeSingle();
        setTeam(teamData);

        if (teamData) {
          const [membersRes, solvesRes] = await Promise.all([
            supabase.from('profiles').select('id, username, email, created_at').eq('team_id', teamData.id),
            supabase.from('solves').select('*, challenges(id, title, category, points)').eq('team_id', teamData.id).order('created_at', { ascending: false }),
          ]);
          setMembers(membersRes.data || []);
          setTeamSolves(solvesRes.data || []);
          setTotalPoints((solvesRes.data || []).reduce((acc, s) => acc + (s.points || 0), 0));
        }
      } else {
        setTeam(null);
        setMembers([]);
        setTeamSolves([]);
        setTotalPoints(0);
        setTab('create');
      }

      await fetchAllTeamsDirectory();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTeamsDirectory = async () => {
    const [teamsRes, profilesRes, solvesRes] = await Promise.all([
      supabase.from('teams').select('id, name, created_by, created_at').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, team_id, username'),
      supabase.from('solves').select('id, team_id, points, challenges(title)'),
    ]);

    if (teamsRes.data) {
      const parsed = teamsRes.data.map((t: any) => {
        const tMembers = (profilesRes.data || []).filter((p) => p.team_id === t.id);
        const tSolves = (solvesRes.data || []).filter((s) => s.team_id === t.id);
        return {
          ...t,
          members: tMembers,
          solves: tSolves,
          members_count: tMembers.length,
          total_points: tSolves.reduce((acc, s) => acc + ((s as any).points || 0), 0),
        };
      });
      parsed.sort((a, b) => b.total_points - a.total_points);
      setAllTeams(parsed);
    }
  };

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'BLK-';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const showConfirm = (title: string, body: string, variant: 'danger' | 'warning', onConfirm: () => void) => {
    setConfirmModal({ title, body, variant, onConfirm });
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !user) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const code = generateInviteCode();
      const { data: newTeam, error: teamErr } = await supabase.from('teams')
        .insert({ name: teamName.trim(), invite_code: code, created_by: user.id })
        .select().single();
      if (teamErr) throw teamErr;

      const { error: profileErr } = await supabase.from('profiles').update({ team_id: newTeam.id }).eq('id', user.id);
      if (profileErr) throw profileErr;

      setMessage({ type: 'success', text: `Team "${newTeam.name}" created! Invite code: ${newTeam.invite_code}` });
      setTeamName('');
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
      const { data: targetTeam, error: searchErr } = await supabase.from('teams')
        .select('id, name')
        .eq('invite_code', inviteCodeInput.trim().toUpperCase())
        .maybeSingle();

      if (searchErr || !targetTeam) throw new Error('Invalid invite code. Team not found.');

      // DB trigger will enforce 4-member cap — but also check client-side for a better error
      const { count: memberCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('team_id', targetTeam.id);
      if ((memberCount || 0) >= 4) throw new Error('This team is full (max 4 members).');

      const { error: profileErr } = await supabase.from('profiles').update({ team_id: targetTeam.id }).eq('id', user.id);
      if (profileErr) throw profileErr;

      setMessage({ type: 'success', text: `Successfully joined team "${targetTeam.name}"!` });
      setInviteCodeInput('');
      setTab('my-team');
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to join team.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleKickMember = (memberId: string, username: string) => {
    showConfirm(
      'Remove Member',
      `Remove ${username} from the team? They will lose team access but keep their account.`,
      'danger',
      async () => {
        setConfirmModal(null);
        setActionLoading(true);
        try {
          await supabase.from('profiles').update({ team_id: null }).eq('id', memberId);
          setMessage({ type: 'success', text: `Removed ${username} from the team.` });
          await loadData();
        } catch (err: any) {
          setMessage({ type: 'error', text: err.message || 'Failed to remove member.' });
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const handleTransferLeadership = (newCaptainId: string, username: string) => {
    showConfirm(
      'Transfer Team Leadership',
      `Make ${username} the new Team Captain? You will become a regular member and lose captain privileges.`,
      'warning',
      async () => {
        setConfirmModal(null);
        setActionLoading(true);
        try {
          await supabase.from('teams').update({ created_by: newCaptainId }).eq('id', team.id);
          setMessage({ type: 'success', text: `${username} is now the Team Captain!` });
          await loadData();
        } catch (err: any) {
          setMessage({ type: 'error', text: err.message || 'Failed to transfer leadership.' });
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const handleLeaveTeam = () => {
    showConfirm(
      'Leave Team',
      `Leave team "${team?.name}"? You can rejoin later with the invite code or create a new team.`,
      'warning',
      async () => {
        setConfirmModal(null);
        setActionLoading(true);
        try {
          await supabase.from('profiles').update({ team_id: null }).eq('id', user.id);
          setMessage({ type: 'success', text: `You left team ${team.name}.` });
          setTeam(null);
          setTab('create');
          await loadData();
        } catch (err: any) {
          setMessage({ type: 'error', text: err.message || 'Failed to leave team.' });
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const handleDisbandTeam = () => {
    showConfirm(
      'Disband Team',
      `Permanently disband "${team?.name}"? All members will be unlinked. This action cannot be undone.`,
      'danger',
      async () => {
        setConfirmModal(null);
        setActionLoading(true);
        try {
          await supabase.from('profiles').update({ team_id: null }).eq('team_id', team.id);
          await supabase.from('teams').delete().eq('id', team.id);
          setMessage({ type: 'success', text: `Team "${team.name}" has been disbanded.` });
          setTeam(null);
          setTab('create');
          await loadData();
        } catch (err: any) {
          setMessage({ type: 'error', text: err.message || 'Failed to disband team.' });
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const copyInviteCode = () => {
    if (!team?.invite_code) return;
    navigator.clipboard.writeText(team.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authed === null || authed === false || loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-600" /></div>;
  }

  const isCaptain = team?.created_by === user?.id;
  const memberSlotsFilled = members.length;
  const memberSlotsTotal = 4;
  const teamIsFull = memberSlotsFilled >= memberSlotsTotal;

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Team Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {team ? `Member of ${team.name}` : 'Create or join a team (max 4 members)'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800 self-start sm:self-auto text-xs font-medium">
          {team && (
            <button onClick={() => { setTab('my-team'); setMessage(null); }}
              className={`px-3 py-1.5 rounded-md transition-colors ${tab === 'my-team' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
              My Team
            </button>
          )}
          {!team && (
            <>
              <button onClick={() => { setTab('create'); setMessage(null); }}
                className={`px-3 py-1.5 rounded-md transition-colors ${tab === 'create' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                Create
              </button>
              <button onClick={() => { setTab('join'); setMessage(null); }}
                className={`px-3 py-1.5 rounded-md transition-colors ${tab === 'join' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                Join
              </button>
            </>
          )}
          <button onClick={() => { setTab('all-teams'); setMessage(null); }}
            className={`px-3 py-1.5 rounded-md transition-colors ${tab === 'all-teams' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
            All Teams ({allTeams.length})
          </button>
        </div>
      </div>

      {/* Feedback Message */}
      {message && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 animate-fade-in ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          {message.text}
        </div>
      )}

      {/* ── Tab: My Team ── */}
      {tab === 'my-team' && team && (
        <div className="space-y-6">
          {/* Team Banner */}
          <Card padding="lg">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {isCaptain && <Badge variant="warning"><Crown className="h-3 w-3" /> Captain</Badge>}
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Active Team</span>
                </div>
                <h2 className="text-2xl font-bold text-zinc-100">{team.name}</h2>
                <p className="text-xs text-zinc-500 mt-1">Created {new Date(team.created_at).toLocaleDateString()}</p>

                {/* Member capacity bar */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    {Array.from({ length: memberSlotsTotal }).map((_, i) => (
                      <div key={i} className={`h-2 w-8 rounded-full transition-colors ${i < memberSlotsFilled ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-zinc-500">
                    {memberSlotsFilled}/{memberSlotsTotal} members
                    {teamIsFull && <span className="text-amber-400 ml-1">· Full</span>}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Invite Code — only visible to captain */}
                {isCaptain && (
                  <div className="flex items-center gap-3 bg-zinc-950 px-3.5 py-2 rounded-lg border border-zinc-800">
                    <div>
                      <span className="block text-[10px] text-zinc-500 font-medium uppercase">Invite Code</span>
                      <span className="font-[family-name:var(--font-mono)] text-sm font-semibold text-emerald-400 tracking-wider">
                        {team.invite_code}
                      </span>
                    </div>
                    <button onClick={copyInviteCode}
                      className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                      aria-label="Copy invite code">
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                )}

                {/* Score */}
                <div className="bg-zinc-950 px-4 py-2 rounded-lg border border-zinc-800 text-right">
                  <span className="block text-[10px] text-zinc-500 font-medium uppercase">Team Score</span>
                  <span className="text-lg font-bold text-amber-400">{totalPoints} <span className="text-xs text-zinc-500">pts</span></span>
                </div>
              </div>
            </div>
          </Card>

          {/* Roster & Solves */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Roster Card */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-200">Roster</h3>
                <span className="text-xs text-zinc-500">
                  {teamIsFull
                    ? <span className="text-amber-400">Team Full</span>
                    : `${memberSlotsTotal - memberSlotsFilled} spot${memberSlotsTotal - memberSlotsFilled > 1 ? 's' : ''} remaining`}
                </span>
              </div>

              <div className="space-y-2">
                {members.map((m) => {
                  const mIsCaptain = m.id === team.created_by;
                  const mIsUser = m.id === user.id;
                  return (
                    <div key={m.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${mIsUser ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900/50 border-zinc-800/50'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-8 w-8 rounded-md flex items-center justify-center font-bold text-sm shrink-0 ${mIsCaptain ? 'bg-amber-500/15 border border-amber-500/25 text-amber-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
                          {m.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium text-zinc-200 truncate">{m.username}</p>
                            {mIsCaptain && <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-label="Captain" />}
                            {mIsUser && <Badge variant="success">You</Badge>}
                          </div>
                          <p className="text-xs text-zinc-500 truncate">{m.email}</p>
                        </div>
                      </div>

                      {/* Captain controls */}
                      {isCaptain && !mIsCaptain && (
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            onClick={() => handleTransferLeadership(m.id, m.username)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all"
                            aria-label={`Make ${m.username} captain`}
                          >
                            <Crown className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Promote</span>
                          </button>
                          <button
                            onClick={() => handleKickMember(m.id, m.username)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                            aria-label={`Remove ${m.username}`}
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Remove</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Actions footer */}
              <div className="pt-4 border-t border-zinc-800/60 mt-4 flex items-center justify-between">
                {!isCaptain && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleLeaveTeam}
                    loading={actionLoading}
                    className="!text-red-400 !border-red-500/20 hover:!bg-red-500/10"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Leave Team
                  </Button>
                )}
                {isCaptain && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600">Captain Actions</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleDisbandTeam}
                      loading={actionLoading}
                      className="!text-red-400 !border-red-500/20 hover:!bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Disband Team
                    </Button>
                  </div>
                )}
                {isCaptain && !teamIsFull && (
                  <span className="text-xs text-zinc-500">Share code to invite</span>
                )}
              </div>
            </Card>

            {/* Solves Card */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-200">Solved Challenges ({teamSolves.length})</h3>
                <Button variant="secondary" size="sm" onClick={() => router.push('/challenges')}>
                  <Flag className="h-3.5 w-3.5" /> Challenges
                </Button>
              </div>

              {teamSolves.length === 0 ? (
                <div className="py-8 text-center">
                  <Flag className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500">No team solves yet.</p>
                  <p className="text-xs text-zinc-600 mt-1">Solve challenges to earn points for your team!</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/60 max-h-[320px] overflow-y-auto">
                  {teamSolves.map((s) => (
                    <div key={s.id}
                      className="py-2.5 flex items-center justify-between text-sm cursor-pointer hover:bg-zinc-900/50 rounded px-1 transition-colors"
                      onClick={() => s.challenges?.id && router.push(`/challenges/${s.challenges.id}`)}>
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

      {/* ── Tab: Create Team ── */}
      {tab === 'create' && (
        <div className="max-w-md mx-auto">
          <Card padding="lg">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-emerald-400" />
              <h2 className="text-base font-semibold text-zinc-100">Create New Team</h2>
            </div>
            <p className="text-xs text-zinc-500 mb-5">Choose a team name. An invite code will be generated automatically. Teams are capped at 4 members.</p>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <Input label="Team Name" type="text" required value={teamName}
                onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Cyber_Defenders" />
              <Button type="submit" loading={actionLoading} className="w-full">
                <Plus className="h-4 w-4" /> Create Team & Generate Invite Code
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* ── Tab: Join Team ── */}
      {tab === 'join' && (
        <div className="max-w-md mx-auto">
          <Card padding="lg">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="h-4 w-4 text-blue-400" />
              <h2 className="text-base font-semibold text-zinc-100">Join an Existing Team</h2>
            </div>
            <p className="text-xs text-zinc-500 mb-5">Enter the invite code from your team captain. Teams are limited to 4 members.</p>

            <form onSubmit={handleJoinTeam} className="space-y-4">
              <Input label="Invite Code" type="text" required value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                placeholder="BLK-XXXXXX"
                className="font-[family-name:var(--font-mono)] uppercase tracking-wider" />
              <Button type="submit" loading={actionLoading} className="w-full">
                <UserPlus className="h-4 w-4" /> Join Team
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* ── Tab: All Teams Directory ── */}
      {tab === 'all-teams' && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/50 border-b border-zinc-800">
                <tr>
                  <th scope="col" className="py-3 px-4 font-medium text-zinc-500 w-12">Rank</th>
                  <th scope="col" className="py-3 px-4 font-medium text-zinc-500">Team Name</th>
                  <th scope="col" className="py-3 px-4 font-medium text-zinc-500 text-center">Members</th>
                  <th scope="col" className="py-3 px-4 font-medium text-zinc-500 text-right">Score</th>
                  <th scope="col" className="py-3 px-4 font-medium text-zinc-500 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {allTeams.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-sm text-zinc-500">No teams yet.</td></tr>
                ) : allTeams.map((t, idx) => {
                  const isMyTeam = t.id === profile?.team_id;
                  return (
                    <tr key={t.id} className={`transition-colors ${isMyTeam ? 'bg-emerald-500/5 border-l-2 border-l-emerald-500' : 'hover:bg-zinc-800/30'}`}>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-semibold ${idx === 0 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : idx === 1 ? 'bg-zinc-400/15 text-zinc-300 border border-zinc-400/30' : idx === 2 ? 'bg-amber-700/15 text-amber-600 border border-amber-700/30' : 'bg-zinc-800 text-zinc-500'}`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isMyTeam ? 'text-emerald-400' : 'text-zinc-200'}`}>{t.name}</span>
                          {isMyTeam && <span className="text-[10px] text-emerald-500 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">Your Team</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-zinc-400 text-xs">{t.members_count}/4</span>
                          {t.members_count >= 4 && <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1 rounded">Full</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">{t.total_points} pts</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => setSelectedTeamModal(t)}
                          className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                          aria-label={`View ${t.name} details`}>
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Confirmation Modal ── */}
      <Modal open={!!confirmModal} onClose={() => setConfirmModal(null)} title={confirmModal?.title || ''}>
        {confirmModal && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg text-sm ${
              confirmModal.variant === 'danger'
                ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
            }`}>
              {confirmModal.body}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmModal(null)}>Cancel</Button>
              <Button
                onClick={confirmModal.onConfirm}
                loading={actionLoading}
                className={confirmModal.variant === 'danger'
                  ? '!bg-red-500/20 !border-red-500/40 !text-red-400 hover:!bg-red-500/30'
                  : '!bg-amber-500/20 !border-amber-500/40 !text-amber-400 hover:!bg-amber-500/30'}
              >
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Team Detail Modal (All Teams tab) ── */}
      <Modal open={!!selectedTeamModal} onClose={() => setSelectedTeamModal(null)} title={selectedTeamModal?.name}>
        {selectedTeamModal && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <p className="text-xs text-zinc-500">Total Score</p>
                <p className="text-xl font-bold text-amber-400">{selectedTeamModal.total_points} pts</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Members</p>
                <p className="text-sm font-semibold text-zinc-200">{selectedTeamModal.members_count}/4</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Members</h4>
              <div className="flex flex-wrap gap-2">
                {selectedTeamModal.members?.map((m: any) => (
                  <span key={m.id} className="px-2.5 py-1 rounded-md bg-zinc-800 text-xs font-medium text-zinc-300">{m.username}</span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Solved Challenges ({selectedTeamModal.solves?.length || 0})</h4>
              {!selectedTeamModal.solves?.length ? (
                <p className="text-xs text-zinc-500">No solves yet.</p>
              ) : (
                <div className="divide-y divide-zinc-800/60 max-h-[200px] overflow-y-auto">
                  {selectedTeamModal.solves.map((s: any) => (
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
