'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, Search, Download, CheckCircle, Send, AlertCircle, Loader2, Megaphone, Lightbulb, ChevronDown, Droplets, Lock } from 'lucide-react';
import { Challenge, Category } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import { RuntimeInstanceCard } from '@/components/RuntimeInstanceCard';
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
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [hideSolved, setHideSolved] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  // Hints
  const [challengeHints, setChallengeHints] = useState<any[]>([]);
  const [revealedHints, setRevealedHints] = useState<Map<string, string>>(new Map()); // hintId → hintText
  const [revealingHintId, setRevealingHintId] = useState<string | null>(null);

  const [flagInput, setFlagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [platformMode, setPlatformMode] = useState<'practice' | 'competition'>('practice');
  const [allowSolo, setAllowSolo] = useState(true);
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

      const [profileRes, announcementsRes, dbChallengesRes, settingsRes] = await Promise.all([
        supabase.from('profiles').select('team_id').eq('id', user.id).maybeSingle(),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3),
        supabase.from('challenges').select('*').order('points', { ascending: true }),
        supabase.from('settings').select('key, value').in('key', ['platform_mode', 'allow_solo_submissions']),
      ]);

      const profile = profileRes.data;
      setAnnouncements(announcementsRes.data || []);

      // Parse settings
      const settingsMap: Record<string, string> = {};
      (settingsRes.data || []).forEach((s: any) => { settingsMap[s.key] = s.value; });
      setPlatformMode((settingsMap.platform_mode as 'practice' | 'competition') || 'practice');
      setAllowSolo(settingsMap.allow_solo_submissions !== 'false');

      if (profile?.team_id) {
        setUserTeamId(profile.team_id);
        const { data: teamSolves } = await supabase
          .from('solves')
          .select('challenge_id')
          .eq('team_id', profile.team_id);
        if (teamSolves) setSolvedIds(new Set(teamSolves.map((s) => s.challenge_id)));
      } else {
        // Solo mode: fetch individual solves
        const { data: userSolves } = await supabase
          .from('solves')
          .select('challenge_id')
          .eq('user_id', user.id)
          .is('team_id', null);
        if (userSolves) setSolvedIds(new Set(userSolves.map((s) => s.challenge_id)));
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
    setRevealedHints(new Map());
    setChallengeHints([]);

    // Fetch hints
    const { data: hints } = await supabase
      .from('hints')
      .select('id, hint_text, cost')
      .eq('challenge_id', chal.id)
      .order('cost', { ascending: true });

    setChallengeHints(hints || []);

    // Load previously revealed hints from server
    try {
      const res = await fetch(`/api/hints/reveal?challengeId=${chal.id}`);
      const data = await res.json();
      if (data.success && data.revealedHintIds.length > 0) {
        // Re-fetch hint text for already-revealed hints
        const revealedMap = new Map<string, string>();
        for (const hintId of data.revealedHintIds) {
          const hint = (hints || []).find((h: any) => h.id === hintId);
          if (hint) revealedMap.set(hintId, hint.hint_text);
        }
        setRevealedHints(revealedMap);
      }
    } catch {
      // Non-critical — hints will just show as locked
    }
  };

  const handleRevealHint = async (hintId: string, cost: number) => {
    if (revealingHintId) return;

    const alreadyRevealed = revealedHints.has(hintId);
    if (alreadyRevealed) return;

    if (cost > 0) {
      const confirmed = confirm(`This hint costs ${cost} points. Reveal it?`);
      if (!confirmed) return;
    }

    setRevealingHintId(hintId);
    try {
      const res = await fetch('/api/hints/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hintId }),
      });
      const data = await res.json();

      if (data.success) {
        setRevealedHints((prev) => new Map(prev).set(hintId, data.hintText));
      }
    } catch {
      // silent
    } finally {
      setRevealingHintId(null);
    }
  };

  useEffect(() => {
    if (authed === false) router.push('/login');
  }, [authed, router]);

  const categories = ['All', 'Web', 'Forensics', 'Pwn', 'Crypto', 'Reverse', 'Misc'];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

  // Per-category solve counts for progress display
  const categoryProgress = categories.slice(1).map((cat) => {
    const total = challenges.filter((c) => c.category === cat).length;
    const solved = challenges.filter((c) => c.category === cat && solvedIds.has(c.id)).length;
    return { cat, total, solved };
  });

  const filteredChallenges = challenges.filter((c) => {
    if (hideSolved && solvedIds.has(c.id)) return false;
    if (selectedCategory !== 'All' && c.category !== selectedCategory) return false;
    if (selectedDifficulty !== 'All' && c.difficulty !== selectedDifficulty) return false;
    const q = searchQuery.toLowerCase();
    if (q && !c.title.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false;
    return true;
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
        body: JSON.stringify({ challengeId: selectedChallenge.id, flag: flagInput.trim() }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setFeedback({ type: 'error', message: data.message });
        return;
      }

      if (data.success) {
        setFeedback({
          type: 'success',
          message: data.isFirstBlood
            ? `🩸 First Blood! You were the first to solve this! +${data.points} points!`
            : data.message,
        });
        setSolvedIds((prev) => new Set([...prev, selectedChallenge.id]));
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('runtime-instance-updated'));
      } else {
        setFeedback({ type: data.alreadySolved ? 'info' : 'error', message: data.message });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = platformMode === 'practice' ? allowSolo || !!userTeamId : !!userTeamId;
  const teamRequired = platformMode === 'competition' && !userTeamId;

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold text-zinc-100">Challenges</h1>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${platformMode === 'practice' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'}`}>
              {platformMode} mode
            </span>
          </div>
          <p className="text-sm text-zinc-500">
            {challenges.length > 0
              ? `${challenges.length} challenges · ${solvedIds.size} solved`
              : 'No challenges published yet'}
          </p>
        </div>

        {/* Category Progress */}
        <div className="hidden sm:flex items-center gap-3 flex-wrap">
          {categoryProgress.filter(cp => cp.total > 0).map(({ cat, total, solved }) => (
            <div key={cat} className="flex items-center gap-1.5 text-xs">
              <span className="text-zinc-500">{cat}</span>
              <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${total > 0 ? (solved / total) * 100 : 0}%` }}
                />
              </div>
              <span className="text-zinc-600">{solved}/{total}</span>
            </div>
          ))}
        </div>
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
          <div className="w-px h-4 bg-zinc-800 mx-1 hidden sm:block" />
          {difficulties.slice(1).map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(selectedDifficulty === diff ? 'All' : diff)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedDifficulty === diff
                  ? diff === 'Easy' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : diff === 'Medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideSolved}
              onChange={(e) => setHideSolved(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
            />
            Hide Solved
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search challenges..."
              className="w-48 rounded-lg bg-zinc-900 border border-zinc-800 pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredChallenges.length === 0 ? (
        <EmptyState
          icon={<Flag className="h-10 w-10" />}
          title="No challenges found"
          description={
            searchQuery || selectedCategory !== 'All' || selectedDifficulty !== 'All' || hideSolved
              ? 'Try adjusting your filters.'
              : 'Challenges will appear here once the organizers publish them.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {filteredChallenges.map((chal) => {
            const isSolved = solvedIds.has(chal.id);
            const hasFirstBlood = !!(chal as any).first_blood_at;
            return (
              <Card
                key={chal.id}
                interactive
                padding="md"
                className={isSolved ? '!border-emerald-500/20' : ''}
                onClick={() => handleOpenChallenge(chal)}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <CategoryBadge category={chal.category} />
                    {chal.difficulty && <DifficultyBadge difficulty={chal.difficulty} />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {hasFirstBlood && (
                      <span title="First Blood claimed" className="text-red-400">
                        <Droplets className="h-3.5 w-3.5" />
                      </span>
                    )}
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
              {selectedChallenge.difficulty && <DifficultyBadge difficulty={selectedChallenge.difficulty} />}
              <Badge>{selectedChallenge.points} pts</Badge>
              {(selectedChallenge as any).author && (
                <span className="text-xs text-zinc-500">by {(selectedChallenge as any).author}</span>
              )}
              {solvedIds.has(selectedChallenge.id) && (
                <Badge variant="success"><CheckCircle className="h-3 w-3" /> Solved</Badge>
              )}
              {(selectedChallenge as any).first_blood_at && (
                <Badge variant="danger"><Droplets className="h-3 w-3" /> First Blood Taken</Badge>
              )}
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Description</h4>
              <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap bg-zinc-950 rounded-lg p-4 border border-zinc-800">
                {selectedChallenge.description}
              </div>
            </div>

            {/* Interactive Container Runtime Section */}
            {(selectedChallenge.has_runtime === true || (selectedChallenge as any).has_runtime === 'true' || Boolean((selectedChallenge as any).runtime_template) || Boolean((selectedChallenge as any).runtime_folder) || selectedChallenge.id === 'hello-nc') && (
              <div>
                              </div>
            )}

            {/* Attachment */}
            {selectedChallenge.file_url && (
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Attachment</h4>
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

            {/* Hints */}
            {challengeHints.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Hints ({challengeHints.length})
                </h4>
                <div className="space-y-2">
                  {challengeHints.map((hint, idx) => {
                    const isRevealed = revealedHints.has(hint.id);
                    const isLoading = revealingHintId === hint.id;
                    const hintText = revealedHints.get(hint.id);

                    return (
                      <div key={hint.id} className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden text-xs">
                        <button
                          onClick={() => !isRevealed && handleRevealHint(hint.id, hint.cost)}
                          disabled={isLoading || isRevealed}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-zinc-900 transition-colors disabled:cursor-default"
                        >
                          <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                            <Lightbulb className="h-3.5 w-3.5" />
                            Hint #{idx + 1}
                            {hint.cost > 0 && (
                              <span className="text-zinc-500 font-normal">(-{hint.cost} pts)</span>
                            )}
                          </span>
                          <span className="text-zinc-500 flex items-center gap-1">
                            {isLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : isRevealed ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <><Lock className="h-3 w-3 mr-0.5" /> Reveal</>
                            )}
                          </span>
                        </button>

                        {isRevealed && hintText && (
                          <div className="px-3 pb-3 pt-1 text-zinc-300 border-t border-zinc-900 whitespace-pre-wrap leading-relaxed">
                            {hintText}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

                        {/* Runtime Interactive Instance */}
            {selectedChallenge.has_runtime && (
              <div className="pt-1">
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Runtime Instance</h4>
                <RuntimeInstanceCard challengeId={selectedChallenge.id} />
              </div>
            )}

            {/* Flag Submit */}
            <div>
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Submit Flag</h4>

              {teamRequired && (
                <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Competition mode requires a team. Join a team to submit flags.
                </div>
              )}

              {!teamRequired && !userTeamId && platformMode === 'practice' && (
                <div className="mb-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  You are solving solo. Join a team to compete on the scoreboard.
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
                  placeholder="BL4CKOUT{...}"
                  disabled={submitting || teamRequired}
                  className="flex-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 font-[family-name:var(--font-mono)] placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-colors disabled:opacity-50"
                />
                <Button type="submit" loading={submitting} disabled={!flagInput.trim() || teamRequired}>
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
