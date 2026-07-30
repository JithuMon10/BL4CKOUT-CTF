'use client';

import { useState, useEffect } from 'react';
import { Users, Users2, Flag, CheckCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';

export default function AdminDashboard() {
  const supabase = createClient();
  const [stats, setStats] = useState({ users: 0, teams: 0, challenges: 0, solves: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const [usersRes, teamsRes, challengesRes, solvesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('challenges').select('id', { count: 'exact', head: true }),
        supabase.from('solves').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        users: usersRes.count || 0,
        teams: teamsRes.count || 0,
        challenges: challengesRes.count || 0,
        solves: solvesRes.count || 0,
      });
      setLoading(false);
    }
    loadStats();
  }, []);

  const statCards = [
    { label: 'Users', value: stats.users, icon: Users, color: 'text-blue-400' },
    { label: 'Teams', value: stats.teams, icon: Users2, color: 'text-purple-400' },
    { label: 'Challenges', value: stats.challenges, icon: Flag, color: 'text-amber-400' },
    { label: 'Solves', value: stats.solves, icon: CheckCircle, color: 'text-emerald-400' },
  ];

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Overview of the competition</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} padding="md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500 font-medium">{s.label}</span>
                <Icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-semibold text-zinc-100">{s.value}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
