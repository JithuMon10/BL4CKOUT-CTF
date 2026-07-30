'use client';

import { useState, useEffect } from 'react';
import { Loader2, Search, Shield, UserX, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';

export default function AdminUsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    // Clean separate queries to avoid PostgREST relationship ambiguity
    const [profilesRes, teamsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('teams').select('id, name'),
    ]);

    const profilesData = profilesRes.data || [];
    const teamsData = teamsRes.data || [];

    const parsed = profilesData.map((p) => {
      const userTeam = teamsData.find((t) => t.id === p.team_id);
      return {
        ...p,
        team_name: userTeam ? userTeam.name : null,
      };
    });

    setUsers(parsed);
    setLoading(false);
  };

  const toggleAdminRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'player' : 'admin';
    if (!confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`)) return;

    setUpdatingId(userId);
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    await loadUsers();
    setUpdatingId(null);
  };

  const removeFromTeam = async (userId: string) => {
    if (!confirm('Remove this user from their current team?')) return;
    setUpdatingId(userId);
    await supabase.from('profiles').update({ team_id: null }).eq('id', userId);
    await loadUsers();
    setUpdatingId(null);
  };

  const filteredUsers = users.filter((u) =>
    (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.team_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-600" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">User Management</h1>
          <p className="text-sm text-zinc-500 mt-1">{users.length} registered users</p>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users or teams..."
            className="w-full rounded-lg bg-zinc-900 border border-zinc-800 pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 outline-none transition-colors"
          />
        </div>
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
                <th className="py-3 px-4 font-medium text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-zinc-200">{u.username}</td>
                  <td className="py-3 px-4 text-zinc-400 text-xs">{u.email}</td>
                  <td className="py-3 px-4">
                    <Badge variant={u.role === 'admin' ? 'warning' : 'default'}>
                      {u.role || 'player'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {u.team_name ? (
                      <span className="flex items-center gap-1.5">
                        {u.team_name}
                        <button
                          onClick={() => removeFromTeam(u.id)}
                          className="text-zinc-600 hover:text-red-400 transition-colors p-0.5"
                          title="Remove from team"
                        >
                          <UserX className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ) : (
                      <span className="text-zinc-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant={u.role === 'admin' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => toggleAdminRole(u.id, u.role)}
                      loading={updatingId === u.id}
                    >
                      <Shield className="h-3.5 w-3.5" />
                      {u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                    </Button>
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
