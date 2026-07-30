'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, Search, Download, CheckCircle, Send, AlertCircle, Loader2, Megaphone, Lightbulb, ChevronDown } from 'lucide-react';
import { Challenge, Category } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { CategoryBadge, DifficultyBadge } from '@/components/ui/Badge';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';

export default function ChallengesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  // Hints state for selected challenge
  const [challengeHints, setChallengeHints] = useState<any[]>([]);
  const [revealedHintIds, setRevealedHintIds] = useState<Set<string>>(new Set());

  const [flagInput, setFlagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setAuthed(false);
        setLoading(false);
        return;
      }

      setAuthed(true);

      // Clean separate queries
      const [profileRes, announcementsRes, dbChallengesRes] = await Promise.all([
        supabase.from('profiles').select('team_id').eq('id', user.id).maybeSingle(),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3),
        supabase.from('challenges').select('id, title, category, difficulty, description, points, author, file_url, is_visible, created_at').eq('is_visible', true).order('points', { ascending: true }),
      ]);

      const profile = profileRes.data;
      setAnnouncements(announcementsRes.data || []);

      if (profile?.team_id) {
        setUserTeamId(profile.team_id);
        const { data: solves } = await supabase
          .from('solves')
          .select('challenge_id')
          .eq('team_id', profile.team_id);

        if (solves) {
          setSolvedIds(new Set(solves.map((s) => s.challenge_id)));
        }
      }

      if (dbChallengesRes.data) {
        setChallenges(dbChallengesRes.data as Challenge[]);
      }
    } catch (err) {
      console.error('Error loading challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChallenge = async (chal: Challenge) => {
    setSelectedChallenge(chal);
    setFlagInput('');
    setFeedback(null);
    setRevealedHintIds(new Set());

    // Fetch hints for this challenge
    const { data: hints } = await supabase
      .from('hints')
      .select('*')
      .eq('challenge_id', chal.id)
      .order('created_at', { ascending: true });

    setChallengeHints(hints || []);
  };

  const toggleRevealHint = (hintId: string) => {
    setRevealedHintIds((prev) => {
      const next = new Set(prev);
      if (next.has(hintId)) next.delete(hintId);
      else next.add(hintId);
      return next;
    });
  };

  useEffect(() => {
    if (authed === false) {
      router.push('/login');
    }
  }, [authed, router]);

  const categories = ['All', 'Web', 'Forensics', 'Pwn', 'Crypto', 'Reverse', 'Misc'];

  const filteredChallenges = challenges.filter((c) => {
    const matchesCat = selectedCategory === 'All' || c.category === selectedCategory;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallenge || !flagInput.trim()) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/challenges/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: selectedChallenge.id,
          flag: flagInput.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        setSolvedIds((prev) => new Set([...prev, selectedChallenge.id]));
      } else {
        setFeedback({ type: data.alreadySolved ? 'info' : 'error', message: data.message });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (authed === null || authed === false) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Challenges</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {challenges.length > 0
            ? `${challenges.length} challenges available · ${solvedIds.size} solved`
            : 'No challenges published yet'}
        </p>
      </div>

      {/* Announcements Banner */}
      {announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map((a) => (
            <div key={a.id} className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs flex items-start gap-3">
              <Megaphone className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-300 block">{a.title}</span>
                <span className="text-zinc-300 block mt-0.5">{a.content}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search challenges..."
            className="w-full rounded-lg bg-zinc-900 border border-zinc-800 pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredChallenges.length === 0 ? (
        <EmptyState
          icon={<Flag className="h-10 w-10" />}
          title="No challenges found"
          description={
            searchQuery || selectedCategory !== 'All'
              ? 'Try adjusting your search or filters.'
              : 'Challenges will appear here once the organizers publish them.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {filteredChallenges.map((chal) => {
            const isSolved = solvedIds.has(chal.id);
            return (
              <Card
                key={chal.id}
                interactive
                padding="md"
                className={isSolved ? '!border-emerald-500/20' : ''}
              >
                <div onClick={() => handleOpenChallenge(chal)}>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <CategoryBadge category={chal.category} />
                      {chal.difficulty && <DifficultyBadge difficulty={chal.difficulty} />}
                    </div>
                    <div className="flex items-center gap-2">
                      {isSolved && (
                        <Badge variant="success">
                          <CheckCircle className="h-3 w-3" /> Solved
                        </Badge>
                      )}
                      <span className="text-xs font-medium text-zinc-400">{chal.points} pts</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-zinc-200 mb-1 line-clamp-1">{chal.title}</h3>
                  <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{chal.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Challenge Modal */}
      <Modal
        open={!!selectedChallenge}
        onClose={() => setSelectedChallenge(null)}
        title={selectedChallenge?.title}
      >
        {selectedChallenge && (
          <div className="space-y-5">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={selectedChallenge.category} />
              {selectedChallenge.difficulty && (
                <DifficultyBadge difficulty={selectedChallenge.difficulty} />
              )}
              <Badge>{selectedChallenge.points} pts</Badge>
              {solvedIds.has(selectedChallenge.id) && (
                <Badge variant="success">
                  <CheckCircle className="h-3 w-3" /> Solved
                </Badge>
              )}
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Description</h4>
              <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap bg-zinc-950 rounded-lg p-4 border border-zinc-800">
                {selectedChallenge.description}
              </div>
            </div>

            {/* Attachment Download */}
            {selectedChallenge.file_url && (
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Attachment Artifact</h4>
                <a
                  href={selectedChallenge.file_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-semibold text-emerald-400 hover:bg-zinc-700 hover:border-emerald-500/40 transition-all"
                >
                  <Download className="h-4 w-4" />
                  Download Challenge File ({selectedChallenge.file_url.split('/').pop()?.split('_').pop() || 'artifact'})
                </a>
              </div>
            )}

            {/* Hints Section */}
            {challengeHints.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Hints ({challengeHints.length})</h4>
                <div className="space-y-2">
                  {challengeHints.map((hint, idx) => {
                    const isRevealed = revealedHintIds.has(hint.id);
                    return (
                      <div key={hint.id} className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden text-xs">
                        <button
                          onClick={() => toggleRevealHint(hint.id)}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-zinc-900 transition-colors"
                        >
                          <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                            <Lightbulb className="h-3.5 w-3.5" /> Hint #{idx + 1}
                            {hint.cost > 0 && <span className="text-zinc-500 font-normal">(-{hint.cost} pts)</span>}
                          </span>
                          <span className="text-zinc-500 flex items-center gap-1">
                            {isRevealed ? 'Hide Hint' : 'Click to Reveal'}
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isRevealed ? 'rotate-180' : ''}`} />
                          </span>
                        </button>

                        {isRevealed && (
                          <div className="px-3 pb-3 pt-1 text-zinc-300 border-t border-zinc-900 whitespace-pre-wrap leading-relaxed">
                            {hint.hint_text}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Flag Submit */}
            <div>
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Submit Flag</h4>

              {!userTeamId && (
                <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  You need to join a team before submitting flags.
                </div>
              )}

              {feedback && (
                <div
                  className={`mb-3 p-3 rounded-lg text-sm flex items-center gap-2 ${
                    feedback.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : feedback.type === 'info'
                      ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                      : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  }`}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {feedback.message}
                </div>
              )}

              <form onSubmit={handleFlagSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={flagInput}
                  onChange={(e) => setFlagInput(e.target.value)}
                  placeholder="TCF{...}"
                  disabled={submitting || !userTeamId}
                  className="flex-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 font-[family-name:var(--font-mono)] placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-colors disabled:opacity-50"
                />
                <Button type="submit" loading={submitting} disabled={!flagInput.trim() || !userTeamId}>
                  <Send className="h-4 w-4" />
                  Submit
                </Button>
              </form>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
