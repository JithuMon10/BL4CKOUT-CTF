'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Users2, Flag, CheckCircle, Loader2, Plus, Megaphone, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function AdminDashboard() {
  const supabase = createClient();
  const [stats, setStats] = useState({ users: 0, teams: 0, challenges: 0, solves: 0 });
  const [recentSolves, setRecentSolves] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const [usersRes, teamsRes, challengesRes, solvesRes, recentSolvesRes, recentUsersRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('challenges').select('id', { count: 'exact', head: true }),
        supabase.from('solves').select('id', { count: 'exact', head: true }),
        supabase.from('solves').select('id, points, created_at, team_id, user_id, challenge_id').order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('id, username, email, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      // Enrich recent solves with names using separate queries
      const solvesRaw = recentSolvesRes.data || [];
      if (solvesRaw.length > 0) {
        const teamIds = [...new Set(solvesRaw.map((s) => s.team_id))];
        const chalIds = [...new Set(solvesRaw.map((s) => s.challenge_id))];

        const [tRes, cRes] = await Promise.all([
          supabase.from('teams').select('id, name').in('id', teamIds),
          supabase.from('challenges').select('id, title').in('id', chalIds),
        ]);

        const tMap = new Map((tRes.data || []).map((t) => [t.id, t.name]));
        const cMap = new Map((cRes.data || []).map((c) => [c.id, c.title]));

        const enriched = solvesRaw.map((s) => ({
          ...s,
          team_name: tMap.get(s.team_id) || 'Team',
          challenge_title: cMap.get(s.challenge_id) || 'Challenge',
        }));

        setRecentSolves(enriched);
      } else {
        setRecentSolves([]);
      }

      setRecentUsers(recentUsersRes.data || []);

      setStats({
        users: usersRes.count || 0,
        teams: teamsRes.count || 0,
        challenges: challengesRes.count || 0,
        solves: solvesRes.count || 0,
      });
      setLoading(false);
    }
    loadDashboard();
  }, []);

  const statCards = [
    { label: 'Registered Users', value: stats.users, icon: Users, color: 'text-blue-400', href: '/admin/users' },
    { label: 'Competing Teams', value: stats.teams, icon: Users2, color: 'text-purple-400', href: '/admin/teams' },
    { label: 'Total Challenges', value: stats.challenges, icon: Flag, color: 'text-amber-400', href: '/admin/challenges' },
    { label: 'Total Solves', value: stats.solves, icon: CheckCircle, color: 'text-emerald-400', href: '/admin/submissions' },
  ];

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-600" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Admin Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Overview of CTF competition status and activity</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/challenges">
            <Button size="sm">
              <Plus className="h-4 w-4" /> New Challenge
            </Button>
          </Link>
          <Link href="/admin/announcements">
            <Button variant="secondary" size="sm">
              <Megaphone className="h-4 w-4" /> Announcement
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card padding="md" interactive>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500 font-medium">{s.label}</span>
                  <Icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold text-zinc-100">{s.value}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Solves */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-200">Recent Solves</h2>
            <Link href="/admin/submissions" className="text-xs text-emerald-400 hover:underline">
              View all submissions &rarr;
            </Link>
          </div>

          {recentSolves.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4 text-center">No solves recorded yet.</p>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {recentSolves.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-zinc-200">{s.team_name}</span>
                    <span className="text-zinc-500"> solved </span>
                    <span className="font-medium text-zinc-300">{s.challenge_title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">+{s.points} pts</Badge>
                    <span className="text-zinc-500 text-[10px]">
                      {new Date(s.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Registrations */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-200">Recent Registrations</h2>
            <Link href="/admin/users" className="text-xs text-emerald-400 hover:underline">
              Manage users &rarr;
            </Link>
          </div>

          {recentUsers.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4 text-center">No users registered yet.</p>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {recentUsers.map((u) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-zinc-200">{u.username}</p>
                    <p className="text-zinc-500">{u.email}</p>
                  </div>
                  <span className="text-zinc-500 text-[10px]">
                    {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
