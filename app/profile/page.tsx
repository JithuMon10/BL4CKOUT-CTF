'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Shield, Key, Trophy, Users, CheckCircle, AlertCircle, Loader2, Copy, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [userSolves, setUserSolves] = useState<any[]>([]);
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
        .select('*, challenges(title, category, points)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setUserSolves(solvesData || []);
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

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">User Profile</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your account credentials, team details, and solve statistics.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
              {username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">{username}</p>
              <p className="text-xs text-zinc-500">{user?.email}</p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Active Team</p>
              <p className="text-sm font-semibold text-zinc-100">{team ? team.name : 'No Team'}</p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Your Solves & Points</p>
              <p className="text-sm font-semibold text-zinc-100">
                {userSolves.length} Solves <span className="text-zinc-500">({totalUserPoints} pts)</span>
              </p>
            </div>
          </div>
        </Card>
      </div>

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
    </div>
  );
}
