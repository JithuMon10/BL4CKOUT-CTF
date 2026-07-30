'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Copy, Check, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';

export default function TeamPage() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [teamSolves, setTeamSolves] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  const [tab, setTab] = useState<'create' | 'join'>('create');
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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setAuthed(false);
      setLoading(false);
      return;
    }

    setAuthed(true);
    setUser(user);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*, teams(*)')
      .eq('id', user.id)
      .single();

    setProfile(profileData);

    if (profileData?.teams) {
      setTeam(profileData.teams);

      const { data: teamMembers } = await supabase
        .from('profiles')
        .select('id, username, email, created_at')
        .eq('team_id', profileData.teams.id);

      setMembers(teamMembers || []);

      const { data: solves } = await supabase
        .from('solves')
        .select('*, challenges(title, category, points)')
        .eq('team_id', profileData.teams.id)
        .order('created_at', { ascending: false });

      setTeamSolves(solves || []);
      setTotalPoints((solves || []).reduce((acc, s) => acc + (s.points || 0), 0));
    }

    setLoading(false);
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
      const { data: newTeam, error: teamErr } = await supabase
        .from('teams')
        .insert({ name: teamName.trim(), invite_code: code, created_by: user.id })
        .select()
        .single();

      if (teamErr) throw teamErr;

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ team_id: newTeam.id })
        .eq('id', user.id);

      if (profileErr) throw profileErr;

      setMessage({ type: 'success', text: `Team "${newTeam.name}" created successfully.` });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create team.' });
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
      const { data: targetTeam, error: searchErr } = await supabase
        .from('teams')
        .select('*')
        .eq('invite_code', inviteCodeInput.trim().toUpperCase())
        .single();

      if (searchErr || !targetTeam) {
        throw new Error('Invalid invite code. Team not found.');
      }

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ team_id: targetTeam.id })
        .eq('id', user.id);

      if (profileErr) throw profileErr;

      setMessage({ type: 'success', text: `Joined team "${targetTeam.name}" successfully.` });
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
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Team</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {team ? `You're a member of ${team.name}` : 'Create or join a team to start competing'}
        </p>
      </div>

      {team ? (
        <div className="space-y-6">
          {/* Team Info */}
          <Card padding="lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">Team Name</p>
                <h2 className="text-xl font-semibold text-zinc-100">{team.name}</h2>
              </div>
              <div className="flex items-center gap-4">
                {/* Invite Code */}
                <div className="flex items-center gap-2 bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-800">
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase">Invite Code</p>
                    <p className="text-sm font-[family-name:var(--font-mono)] font-medium text-zinc-200 tracking-wider">
                      {team.invite_code}
                    </p>
                  </div>
                  <button
                    onClick={copyInviteCode}
                    className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                    aria-label="Copy invite code"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                {/* Score */}
                <div className="text-right">
                  <p className="text-[10px] text-zinc-600 uppercase">Score</p>
                  <p className="text-lg font-semibold text-zinc-200">{totalPoints} <span className="text-xs text-zinc-500">pts</span></p>
                </div>
              </div>
            </div>
          </Card>

          {/* Members */}
          <Card padding="md">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Members ({members.length})</h3>
            {members.length === 0 ? (
              <p className="text-sm text-zinc-600">No members found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                    <div className="h-8 w-8 rounded-md bg-zinc-800 text-zinc-400 flex items-center justify-center text-sm font-medium">
                      {m.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{m.username}</p>
                      <p className="text-xs text-zinc-600">{m.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Solve History */}
          <Card padding="md">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Solve History ({teamSolves.length})</h3>
            {teamSolves.length === 0 ? (
              <p className="text-sm text-zinc-600">No challenges solved yet.</p>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {teamSolves.map((s) => (
                  <div key={s.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{s.challenges?.title || 'Challenge'}</p>
                      <p className="text-xs text-zinc-600">
                        {new Date(s.created_at).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-emerald-400">+{s.points}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* Create / Join Form */
        <div className="max-w-md mx-auto space-y-4">
          {/* Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-zinc-900 border border-zinc-800">
            <button
              onClick={() => { setTab('create'); setMessage(null); }}
              className={`py-2 rounded-md text-sm font-medium transition-colors ${
                tab === 'create' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Create Team
            </button>
            <button
              onClick={() => { setTab('join'); setMessage(null); }}
              className={`py-2 rounded-md text-sm font-medium transition-colors ${
                tab === 'join' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Join Team
            </button>
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

          {tab === 'create' ? (
            <Card padding="lg">
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <Input
                  label="Team Name"
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name"
                />
                <Button type="submit" loading={actionLoading} className="w-full">
                  <Plus className="h-4 w-4" />
                  Create Team
                </Button>
              </form>
            </Card>
          ) : (
            <Card padding="lg">
              <form onSubmit={handleJoinTeam} className="space-y-4">
                <Input
                  label="Invite Code"
                  type="text"
                  required
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  placeholder="BLK-XXXXXX"
                />
                <Button type="submit" loading={actionLoading} className="w-full">
                  <UserPlus className="h-4 w-4" />
                  Join Team
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
