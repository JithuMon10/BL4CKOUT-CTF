'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';

export default function AdminTeamsPage() {
  const supabase = createClient();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('teams')
        .select('id, name, invite_code, created_at, profiles(id), solves(points)')
        .order('created_at', { ascending: false });

      const parsed = (data || []).map((t: any) => ({
        ...t,
        members_count: (t.profiles || []).length,
        total_points: (t.solves || []).reduce((acc: number, s: any) => acc + (s.points || 0), 0),
      }));

      setTeams(parsed);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-600" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Teams</h1>
        <p className="text-sm text-zinc-500 mt-1">{teams.length} teams registered</p>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {teams.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-zinc-200">{t.name}</td>
                  <td className="py-3 px-4 font-[family-name:var(--font-mono)] text-zinc-400 text-xs tracking-wider">{t.invite_code}</td>
                  <td className="py-3 px-4 text-center text-zinc-400">{t.members_count}</td>
                  <td className="py-3 px-4 text-right font-medium text-zinc-200">{t.total_points} pts</td>
                  <td className="py-3 px-4 text-right text-zinc-500 text-xs">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
