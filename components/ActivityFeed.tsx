'use client';

import { useState, useEffect, useRef } from 'react';
import { Zap, Droplets, Flag, Megaphone } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface FeedItem {
  id: string;
  type: 'solve' | 'first_blood' | 'announcement';
  message: string;
  timestamp: string;
  isNew?: boolean;
}

export default function ActivityFeed() {
  const supabase = createClient();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadFeed();

    // Poll every 30 seconds for new activity
    const interval = setInterval(loadFeed, 30_000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  const loadFeed = async () => {
    try {
      const [solvesRes, announcementsRes] = await Promise.all([
        supabase
          .from('solves')
          .select('id, created_at, points, challenge_id, team_id, user_id')
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('announcements')
          .select('id, title, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const solves = solvesRes.data || [];

      // Enrich with names
      const teamIds = [...new Set(solves.filter((s) => s.team_id).map((s) => s.team_id))];
      const userIds = [...new Set(solves.map((s) => s.user_id))];
      const chalIds = [...new Set(solves.map((s) => s.challenge_id))];

      const [teamsRes, profilesRes, chalsRes, firstBloodsRes] = await Promise.all([
        teamIds.length ? supabase.from('teams').select('id, name').in('id', teamIds) : Promise.resolve({ data: [] }),
        userIds.length ? supabase.from('profiles').select('id, username').in('id', userIds) : Promise.resolve({ data: [] }),
        chalIds.length ? supabase.from('challenges').select('id, title, first_blood_user_id').in('id', chalIds) : Promise.resolve({ data: [] }),
        supabase.from('challenges').select('id, title, first_blood_at, first_blood_user_id, first_blood_team_id').not('first_blood_at', 'is', null).order('first_blood_at', { ascending: false }).limit(5),
      ]);

      const teamMap = new Map((teamsRes.data || []).map((t: any) => [t.id, t.name]));
      const userMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p.username]));
      const chalMap = new Map((chalsRes.data || []).map((c: any) => [c.id, { title: c.title, firstBloodUserId: c.first_blood_user_id }]));

      const solveItems: FeedItem[] = solves.map((s) => {
        const chal = chalMap.get(s.challenge_id);
        const isFirstBlood = chal?.firstBloodUserId === s.user_id;
        const actor = s.team_id ? teamMap.get(s.team_id) : userMap.get(s.user_id);
        return {
          id: s.id,
          type: isFirstBlood ? 'first_blood' : 'solve',
          message: isFirstBlood
            ? `🩸 ${actor || 'Unknown'} got First Blood on "${chal?.title || 'a challenge'}"!`
            : `${actor || 'Unknown'} solved "${chal?.title || 'a challenge'}" (+${s.points} pts)`,
          timestamp: s.created_at,
        };
      });

      const announcementItems: FeedItem[] = (announcementsRes.data || []).map((a: any) => ({
        id: `ann-${a.id}`,
        type: 'announcement',
        message: `📢 ${a.title}`,
        timestamp: a.created_at,
      }));

      const combined = [...solveItems, ...announcementItems]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 15);

      if (mountedRef.current) {
        setFeed(combined);
        setLoading(false);
      }
    } catch {
      if (mountedRef.current) setLoading(false);
    }
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) return null;
  if (!feed.length) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Live Activity</span>
        <span className="ml-auto flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>
      <div className="divide-y divide-zinc-800/40 max-h-[280px] overflow-y-auto">
        {feed.map((item) => (
          <div key={item.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-zinc-800/30 transition-colors">
            <div className={`mt-0.5 shrink-0 ${item.type === 'first_blood' ? 'text-red-400' : item.type === 'announcement' ? 'text-amber-400' : 'text-emerald-400'}`}>
              {item.type === 'first_blood' ? <Droplets className="h-3.5 w-3.5" />
                : item.type === 'announcement' ? <Megaphone className="h-3.5 w-3.5" />
                : <Flag className="h-3.5 w-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-300 leading-relaxed">{item.message}</p>
            </div>
            <span className="text-[10px] text-zinc-600 shrink-0 mt-0.5">{timeAgo(item.timestamp)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
