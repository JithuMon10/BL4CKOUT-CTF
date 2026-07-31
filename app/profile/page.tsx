'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Mail, Shield, Key, Trophy, Users, CheckCircle, AlertCircle,
  Loader2, Copy, Check, Droplets, Award, ExternalLink, Flag, Flame
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';

interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: any;
  color: string;
  unlocked: boolean;
  progress?: string;
}

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [userSolves, setUserSolves] = useState<any[]>([]);
  const [firstBloodsCount, setFirstBloodsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  useEffect(() => {
    if (authed === false) {
      router.push('/login');
    }
  }, [authed, router]);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setAuthed(false);
        setLoading(false);
        return;
      }

      setAuthed(true);
      setUser(user);

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      setProfile(profileData);

      // Fetch team if attached
      if (profileData?.team_id) {
        const { data: teamData } = await supabase
          .from('teams')
          .select('*')
          .eq('id', profileData.team_id)
          .maybeSingle();
        setTeam(teamData);
      }

      // Fetch solves submitted by this user
      const { data: solvesData } = await supabase
        .from('solves')
        .select('*, challenges(id, title, category, points)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setUserSolves(solvesData || []);

      // Fetch first bloods claimed by user
      const { count: fbCount } = await supabase
        .from('challenges')
        .select('id', { count: 'exact', head: true })
        .eq('first_blood_user_id', user.id);

      setFirstBloodsCount(fbCount || 0);

    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);

    if (newPassword.length < 6) {
      setPwMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPwMessage({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwMessage({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setPwLoading(false);
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

  const username = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
  const totalUserPoints = userSolves.reduce((acc, s) => acc + (s.points || 0), 0);

  // Compute Achievements
  const categoriesSolved = new Set(userSolves.map((s) => s.challenges?.category).filter(Boolean));

  const achievements: Achievement[] = [
    {
      id: 'first_solve',
      title: 'First Blood Trigger',
      desc: 'Submit your first correct flag',
      icon: Flag,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      unlocked: userSolves.length >= 1,
      progress: `${Math.min(userSolves.length, 1)}/1`,
    },
    {
      id: 'first_blood_champ',
      title: 'First Blood Hunter',
      desc: 'Claim at least 1 First Blood in competition',
      icon: Droplets,
      color: 'text-red-400 bg-red-500/10 border-red-500/20',
      unlocked: firstBloodsCount >= 1,
      progress: `${firstBloodsCount}/1`,
    },
    {
      id: 'five_solves',
      title: 'Cyber Specialist',
      desc: 'Solve 5 challenges across any domain',
      icon: Flame,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      unlocked: userSolves.length >= 5,
      progress: `${Math.min(userSolves.length, 5)}/5`,
    },
    {
      id: 'polymath',
      title: 'Domain Polymath',
      desc: 'Solve challenges in at least 3 distinct categories',
      icon: Award,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      unlocked: categoriesSolved.size >= 3,
      progress: `${Math.min(categoriesSolved.size, 3)}/3`,
    },
  ];

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">User Profile & Achievements</h1>
        <p className="text-sm text-zinc-500 mt-1">Track your progress, unlocked achievements, credentials, and team status.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg shrink-0">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-100 truncate">{username}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">Active Team</p>
              <p className="text-sm font-semibold text-zinc-100 truncate">{team ? team.name : 'No Team'}</p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">Solves & Points</p>
              <p className="text-sm font-semibold text-zinc-100">
                {userSolves.length} Solves <span className="text-zinc-500 text-xs">({totalUserPoints} pts)</span>
              </p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold shrink-0">
              <Droplets className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">First Bloods</p>
              <p className="text-sm font-semibold text-zinc-100">{firstBloodsCount} Claimed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Achievements Section */}
      <Card padding="lg">
        <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-400" /> Platform Achievements
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {achievements.map((ach) => {
            const Icon = ach.icon;
            return (
              <div
                key={ach.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                  ach.unlocked
                    ? 'bg-zinc-900/80 border-zinc-800'
                    : 'bg-zinc-950/40 border-zinc-900 opacity-50 grayscale'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`h-8 w-8 rounded-lg border flex items-center justify-center ${ach.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      ach.unlocked ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                    }`}>
                      {ach.unlocked ? 'Unlocked' : ach.progress}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-zinc-100">{ach.title}</h3>
                  <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{ach.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Account Details & Password Change */}
        <div className="space-y-6">
          <Card padding="lg">
            <h2 className="text-base font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-400" /> Account Information
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-zinc-800/60">
                <span className="text-zinc-500">Username</span>
                <span className="font-medium text-zinc-200">{username}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-800/60">
                <span className="text-zinc-500">Email Address</span>
                <span className="font-medium text-zinc-200">{user?.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-800/60">
                <span className="text-zinc-500">Role</span>
                <Badge variant={profile?.role === 'admin' ? 'warning' : 'default'}>
                  {profile?.role || 'player'}
                </Badge>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-500">Member Since</span>
                <span className="text-zinc-400 text-xs">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </Card>

          {/* Change Password Card */}
          <Card padding="lg">
            <h2 className="text-base font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-400" /> Change Password
            </h2>

            {pwMessage && (
              <div
                className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                  pwMessage.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {pwMessage.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <Input
                label="New Password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
              <Input
                label="Confirm New Password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
              <Button type="submit" loading={pwLoading} size="sm" className="w-full">
                Update Password
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Team Info & User Solves */}
        <div className="space-y-6">
          {/* Team Info */}
          <Card padding="lg">
            <h2 className="text-base font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" /> Team Details
            </h2>

            {team ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500">Team Name</p>
                    <p className="text-lg font-semibold text-zinc-100">{team.name}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                    <span className="font-[family-name:var(--font-mono)] text-xs text-zinc-300 tracking-wider">
                      {team.invite_code}
                    </span>
                    <button
                      onClick={copyInviteCode}
                      className="text-zinc-500 hover:text-zinc-200 transition-colors"
                      title="Copy Invite Code"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <Button variant="secondary" size="sm" className="w-full" onClick={() => router.push('/team')}>
                  View Team Dashboard & Roster
                </Button>
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <p className="text-sm text-zinc-500">You are not currently part of any team.</p>
                <Button size="sm" onClick={() => router.push('/team')}>
                  Create or Join Team
                </Button>
              </div>
            )}
          </Card>

          {/* Solved Challenges */}
          <Card padding="lg">
            <h2 className="text-base font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" /> Your Solves ({userSolves.length})
            </h2>

            {userSolves.length === 0 ? (
              <p className="text-sm text-zinc-500 py-2">You haven&apos;t solved any challenges yet.</p>
            ) : (
              <div className="divide-y divide-zinc-800/60 max-h-[300px] overflow-y-auto">
                {userSolves.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => s.challenges?.id && router.push(`/challenges/${s.challenges.id}`)}
                    className="py-2.5 flex items-center justify-between text-sm hover:bg-zinc-900/50 rounded px-1.5 cursor-pointer transition-colors group"
                  >
                    <div>
                      <p className="font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                        {s.challenges?.title || 'Challenge'}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </p>
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
    </div>
  );
}
