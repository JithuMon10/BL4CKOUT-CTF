'use client';

import { useState, useEffect } from 'react';
import { Loader2, Download, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { FileText } from 'lucide-react';

export default function AdminSubmissionsPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResult, setFilterResult] = useState<'all' | 'correct' | 'wrong'>('all');

  useEffect(() => { loadSubmissions(); }, []);

  const loadSubmissions = async () => {
    setLoading(true);

    // Clean separate queries to avoid PostgREST relationship ambiguity
    const [logsRes, profilesRes, teamsRes, challengesRes] = await Promise.all([
      supabase.from('submission_logs').select('*').order('created_at', { ascending: false }).limit(300),
      supabase.from('profiles').select('id, username'),
      supabase.from('teams').select('id, name'),
      supabase.from('challenges').select('id, title'),
    ]);

    const logsData = logsRes.data || [];
    const profilesData = profilesRes.data || [];
    const teamsData = teamsRes.data || [];
    const challengesData = challengesRes.data || [];

    const parsed = logsData.map((log) => {
      const user = profilesData.find((p) => p.id === log.user_id);
      const team = teamsData.find((t) => t.id === log.team_id);
      const challenge = challengesData.find((c) => c.id === log.challenge_id);

      return {
        ...log,
        username: user ? user.username : 'Unknown',
        team_name: team ? team.name : 'No Team',
        challenge_title: challenge ? challenge.title : 'Deleted Challenge',
      };
    });

    setLogs(parsed);
    setLoading(false);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesFilter =
      filterResult === 'all' ||
      (filterResult === 'correct' && log.is_correct) ||
      (filterResult === 'wrong' && !log.is_correct);

    const matchesSearch =
      (log.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.team_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.challenge_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.submitted_flag || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const exportCSV = () => {
    const header = 'Timestamp,User,Team,Challenge,Submitted Flag,Result\n';
    const rows = filteredLogs.map((l) =>
      `"${new Date(l.created_at).toISOString()}","${l.username}","${l.team_name}","${l.challenge_title}","${l.submitted_flag}","${l.is_correct ? 'CORRECT' : 'WRONG'}"`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flag_submissions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-600" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Submission Logs</h1>
          <p className="text-sm text-zinc-500 mt-1">{filteredLogs.length} flag submission attempts</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Result Filter Pills */}
          <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800 text-xs font-medium">
            <button
              onClick={() => setFilterResult('all')}
              className={`px-3 py-1 rounded-md transition-colors ${filterResult === 'all' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterResult('correct')}
              className={`px-3 py-1 rounded-md transition-colors ${filterResult === 'correct' ? 'bg-emerald-500/15 text-emerald-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Correct Only
            </button>
            <button
              onClick={() => setFilterResult('wrong')}
              className={`px-3 py-1 rounded-md transition-colors ${filterResult === 'wrong' ? 'bg-red-500/15 text-red-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Wrong Only
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search flag or user..."
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 pl-9 pr-3 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 outline-none transition-colors"
            />
          </div>

          {logs.length > 0 && (
            <Button variant="secondary" size="sm" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          )}
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="No submission logs found"
          description={searchQuery || filterResult !== 'all' ? 'Try adjusting your search or result filters.' : 'Flag submission attempts will appear here.'}
        />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/50 border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4 font-medium text-zinc-500">Timestamp</th>
                  <th className="py-3 px-4 font-medium text-zinc-500">User</th>
                  <th className="py-3 px-4 font-medium text-zinc-500">Team</th>
                  <th className="py-3 px-4 font-medium text-zinc-500">Challenge</th>
                  <th className="py-3 px-4 font-medium text-zinc-500">Submitted Flag</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4 text-xs text-zinc-500 whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-zinc-300 font-medium">{l.username}</td>
                    <td className="py-3 px-4 text-zinc-400">{l.team_name}</td>
                    <td className="py-3 px-4 text-zinc-300 max-w-[150px] truncate">{l.challenge_title}</td>
                    <td className="py-3 px-4 font-[family-name:var(--font-mono)] text-xs text-zinc-400 max-w-[200px] truncate">
                      {l.submitted_flag}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={l.is_correct ? 'success' : 'danger'}>
                        {l.is_correct ? 'Correct' : 'Wrong'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
