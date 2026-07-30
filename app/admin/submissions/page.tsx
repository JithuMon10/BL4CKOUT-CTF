'use client';

import { useState, useEffect } from 'react';
import { Loader2, Download } from 'lucide-react';
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

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('submission_logs')
      .select('*, profiles(username), teams(name), challenges(title)')
      .order('created_at', { ascending: false })
      .limit(200);
    setLogs(data || []);
    setLoading(false);
  };

  const exportCSV = () => {
    const header = 'Timestamp,User,Team,Challenge,Submitted Flag,Correct\n';
    const rows = logs.map((l) =>
      `"${new Date(l.created_at).toISOString()}","${l.profiles?.username || ''}","${l.teams?.name || ''}","${l.challenges?.title || ''}","${l.submitted_flag}","${l.is_correct}"`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submissions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-600" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Submission Logs</h1>
          <p className="text-sm text-zinc-500 mt-1">{logs.length} submissions (latest 200)</p>
        </div>
        {logs.length > 0 && (
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        )}
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="No submissions yet"
          description="Flag submission attempts will appear here."
        />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/50 border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4 font-medium text-zinc-500">Time</th>
                  <th className="py-3 px-4 font-medium text-zinc-500">User</th>
                  <th className="py-3 px-4 font-medium text-zinc-500">Team</th>
                  <th className="py-3 px-4 font-medium text-zinc-500">Challenge</th>
                  <th className="py-3 px-4 font-medium text-zinc-500">Submitted Flag</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4 text-xs text-zinc-500 whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-zinc-300">{l.profiles?.username || '—'}</td>
                    <td className="py-3 px-4 text-zinc-400">{l.teams?.name || '—'}</td>
                    <td className="py-3 px-4 text-zinc-300 max-w-[150px] truncate">{l.challenges?.title || '—'}</td>
                    <td className="py-3 px-4 font-[family-name:var(--font-mono)] text-xs text-zinc-400 max-w-[200px] truncate">{l.submitted_flag}</td>
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
