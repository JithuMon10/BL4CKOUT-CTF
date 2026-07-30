'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function AdminUsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, email, role, created_at, teams(name)')
        .order('created_at', { ascending: false });
      setUsers(data || []);
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
        <h1 className="text-2xl font-semibold text-zinc-100">Users</h1>
        <p className="text-sm text-zinc-500 mt-1">{users.length} registered users</p>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900/50 border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4 font-medium text-zinc-500">Username</th>
                <th className="py-3 px-4 font-medium text-zinc-500">Email</th>
                <th className="py-3 px-4 font-medium text-zinc-500">Role</th>
                <th className="py-3 px-4 font-medium text-zinc-500">Team</th>
                <th className="py-3 px-4 font-medium text-zinc-500 text-right">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-zinc-200">{u.username}</td>
                  <td className="py-3 px-4 text-zinc-400">{u.email}</td>
                  <td className="py-3 px-4">
                    <Badge variant={u.role === 'admin' ? 'warning' : 'default'}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-zinc-400">{u.teams?.name || '—'}</td>
                  <td className="py-3 px-4 text-right text-zinc-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
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
