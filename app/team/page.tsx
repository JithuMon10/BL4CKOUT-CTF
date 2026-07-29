'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Key, Copy, Check, ShieldCheck, Trophy, UserPlus, AlertCircle, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function TeamPage() {
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [teamSolves, setTeamSolves] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);

  // Form states
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [teamName, setTeamName] = useState<string>('');
  const [inviteCodeInput, setInviteCodeInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    loadUserTeamData();
  }, []);

  const loadUserTeamData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*, teams(*)')
        .eq('id', user.id)
        .single();

      setProfile(profileData);

      if (profileData?.teams) {
        setTeam(profileData.teams);

        // Fetch team members
        const { data: teamMembers } = await supabase
          .from('profiles')
          .select('id, username, email, created_at')
          .eq('team_id', profileData.teams.id);
        
        setMembers(teamMembers || []);

        // Fetch team solves
        const { data: solves } = await supabase
          .from('solves')
          .select('*, challenges(*)')
          .eq('team_id', profileData.teams.id);

        setTeamSolves(solves || []);
        const total = (solves || []).reduce((acc, s) => acc + (s.points || 0), 0);
        setTotalPoints(total);
      }
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

    setLoading(true);
    setMessage(null);

    try {
      const code = generateInviteCode();

      // 1. Create team
      const { data: newTeam, error: teamErr } = await supabase
        .from('teams')
        .insert({
          name: teamName.trim(),
          invite_code: code,
          created_by: user.id,
        })
        .select()
        .single();

      if (teamErr) throw teamErr;

      // 2. Link profile to new team
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ team_id: newTeam.id })
        .eq('id', user.id);

      if (profileErr) throw profileErr;

      setMessage({ type: 'success', text: `Team '${newTeam.name}' created! Invite Code: ${newTeam.invite_code}` });
      await loadUserTeamData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create team. Name may already be taken.' });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim() || !user) return;

    setLoading(true);
    setMessage(null);

    try {
      // Find team by invite code
      const { data: targetTeam, error: searchErr } = await supabase
        .from('teams')
        .select('*')
        .eq('invite_code', inviteCodeInput.trim().toUpperCase())
        .single();

      if (searchErr || !targetTeam) {
        throw new Error('Invalid invite code. Team not found.');
      }

      // Update profile
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ team_id: targetTeam.id })
        .eq('id', user.id);

      if (profileErr) throw profileErr;

      setMessage({ type: 'success', text: `Successfully joined team '${targetTeam.name}'!` });
      await loadUserTeamData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to join team.' });
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (!team?.invite_code) return;
    navigator.clipboard.writeText(team.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user && !loading) {
    return (
      <div className="py-20 text-center font-mono space-y-4">
        <div className="inline-flex p-4 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 mb-2">
          <Users className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black text-white">AUTHENTICATION REQUIRED</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">You must log in to create or join a CTF team.</p>
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-6 font-mono">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          TEAM OPERATIONS TERMINAL
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">SQUAD MANAGEMENT</h1>
        <p className="text-xs text-slate-400 mt-1">Form a team or enter an invite code to combine your solve scores.</p>
      </div>

      {team ? (
        /* Team Active Dashboard */
        <div className="space-y-8">
          
          {/* Team Banner */}
          <div className="cyber-card rounded-2xl p-6 sm:p-8 border border-emerald-500/40 bg-emerald-950/20 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="font-mono text-xs font-bold text-emerald-400 tracking-wider">ACTIVE TEAM</span>
              <h2 className="text-3xl font-black font-mono text-white">{team.name}</h2>
              <p className="text-xs font-mono text-slate-400">Created: {new Date(team.created_at).toLocaleDateString()}</p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Invite Code Widget */}
              <div className="cyber-card rounded-xl p-3 border border-slate-800 bg-slate-950 flex items-center gap-3">
                <div>
                  <span className="block text-[10px] font-mono text-slate-500">INVITE CODE</span>
                  <span className="font-mono text-sm font-black text-emerald-400 tracking-widest">{team.invite_code}</span>
                </div>
                <button
                  onClick={copyInviteCode}
                  className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 transition-colors"
                  title="Copy Invite Code"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              {/* Total Points Badge */}
              <div className="cyber-card rounded-xl p-3 border border-slate-800 bg-slate-950 flex items-center gap-3">
                <Trophy className="h-6 w-6 text-amber-400" />
                <div>
                  <span className="block text-[10px] font-mono text-slate-500">COMBINED SCORE</span>
                  <span className="font-mono text-lg font-black text-amber-400">{totalPoints} PTS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Members Roster */}
          <div className="cyber-card rounded-xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between font-mono">
              <h3 className="text-sm font-bold text-slate-200">TEAM ROSTER ({members.length} MEMBERS)</h3>
              <span className="text-xs text-emerald-400">STATUS: READY</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
              {members.map((m) => (
                <div key={m.id} className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center">
                    {m.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-bold text-white block">{m.username}</span>
                    <span className="text-[10px] text-slate-500">{m.email}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Solves History */}
          <div className="cyber-card rounded-xl p-6 border border-slate-800 space-y-4">
            <h3 className="font-mono text-sm font-bold text-slate-200">COMPROMISED TARGETS ({teamSolves.length})</h3>

            {teamSolves.length === 0 ? (
              <p className="font-mono text-xs text-slate-500 py-4 text-center">No challenges solved yet. Go to the challenges tab to begin!</p>
            ) : (
              <div className="divide-y divide-slate-800 font-mono text-xs">
                {teamSolves.map((s) => (
                  <div key={s.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200">{s.challenges?.title || 'Challenge'}</span>
                      <span className="text-[10px] text-slate-500 block">Solved on {new Date(s.created_at).toLocaleTimeString()}</span>
                    </div>
                    <span className="font-bold text-emerald-400">+{s.points} PTS</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Team Creation / Joining Form */
        <div className="max-w-xl mx-auto space-y-6 font-mono">
          
          {/* Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setTab('create')}
              className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                tab === 'create'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(0,255,102,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              CREATE TEAM
            </button>
            <button
              onClick={() => setTab('join')}
              className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                tab === 'join'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(0,255,102,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              JOIN TEAM
            </button>
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-950 border border-emerald-500 text-emerald-400'
                  : 'bg-red-950 border border-red-800 text-red-400'
              }`}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{message.text}</span>
            </div>
          )}

          {tab === 'create' ? (
            <form onSubmit={handleCreateTeam} className="cyber-card rounded-xl p-6 border border-slate-800 space-y-5">
              <div>
                <label className="block text-slate-300 font-bold mb-2 text-xs">TEAM NAME</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="RedBull_Paddock_Hacks"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(0,255,102,0.5)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {loading ? 'CREATING SQUAD...' : 'GENERATE SQUAD & INVITE CODE'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinTeam} className="cyber-card rounded-xl p-6 border border-slate-800 space-y-5">
              <div>
                <label className="block text-slate-300 font-bold mb-2 text-xs">ENTER INVITE CODE</label>
                <input
                  type="text"
                  required
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  placeholder="BLK-9X42"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none uppercase tracking-widest transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(0,255,102,0.5)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                {loading ? 'JOINING SQUAD...' : 'JOIN SQUAD'}
              </button>
            </form>
          )}

        </div>
      )}

    </div>
  );
}
