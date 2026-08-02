'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Download, Send, AlertCircle, CheckCircle, Loader2,
  Lightbulb, Lock, ChevronDown, Droplets, Flag, Share2, Check,
  ExternalLink, BookOpen
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CategoryBadge, DifficultyBadge } from '@/components/ui/Badge';
import { RuntimeInstanceCard } from '@/components/RuntimeInstanceCard';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function ChallengePage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const challengeId = params?.id as string;

  const [challenge, setChallenge] = useState<any>(null);
  const [hints, setHints] = useState<any[]>([]);
  const [revealedHints, setRevealedHints] = useState<Map<string, string>>(new Map());
  const [revealingHintId, setRevealingHintId] = useState<string | null>(null);
  const [firstBloodUsername, setFirstBloodUsername] = useState<string | null>(null);
  const [firstBloodTeamName, setFirstBloodTeamName] = useState<string | null>(null);

  const [isSolved, setIsSolved] = useState(false);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [platformMode, setPlatformMode] = useState<'practice' | 'competition'>('practice');
  const [allowSolo, setAllowSolo] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);

  const [flagInput, setFlagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const [writeupUrl, setWriteupUrl] = useState('');
  const [submittingWriteup, setSubmittingWriteup] = useState(false);
  const [writeupSubmitted, setWriteupSubmitted] = useState(false);
  const [existingWriteups, setExistingWriteups] = useState<any[]>([]);

  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (challengeId) loadData();
  }, [challengeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthed(false); setLoading(false); return; }
      setAuthed(true);

      const [challengeRes, profileRes, hintsRes, settingsRes] = await Promise.all([
        supabase.from('challenges').select('id, title, category, difficulty, description, points, author, file_url, is_visible, created_at, first_blood_user_id, first_blood_team_id, first_blood_at').eq('id', challengeId).maybeSingle(),
        supabase.from('profiles').select('team_id').eq('id', user.id).maybeSingle(),
        supabase.from('hints').select('id, cost').eq('challenge_id', challengeId).order('cost', { ascending: true }),
        supabase.from('settings').select('key, value').in('key', ['platform_mode', 'allow_solo_submissions']),
      ]);

      if (!challengeRes.data) { router.push('/challenges'); return; }
      setChallenge(challengeRes.data);

      // Settings
      const settingsMap: Record<string, string> = {};
      (settingsRes.data || []).forEach((s: any) => { settingsMap[s.key] = s.value; });
      setPlatformMode((settingsMap.platform_mode as 'practice' | 'competition') || 'practice');
      setAllowSolo(settingsMap.allow_solo_submissions !== 'false');

      const teamId = profileRes.data?.team_id ?? null;
      setUserTeamId(teamId);
      setHints(hintsRes.data || []);

      // Check solve
      if (teamId) {
        const { data: teamSolve } = await supabase.from('solves').select('id').eq('team_id', teamId).eq('challenge_id', challengeId).maybeSingle();
        setIsSolved(!!teamSolve);
      } else {
        const { data: userSolve } = await supabase.from('solves').select('id').eq('user_id', user.id).eq('challenge_id', challengeId).is('team_id', null).maybeSingle();
        setIsSolved(!!userSolve);
      }

      // Load previously revealed hints
      if (hintsRes.data?.length) {
        try {
          const res = await fetch(`/api/hints/reveal?challengeId=${challengeId}`);
          const data = await res.json();
          if (data.success && data.revealedHintIds.length > 0) {
            // Fetch hint texts for revealed hints
            const { data: revealedHintData } = await supabase.from('hints').select('id, hint_text').in('id', data.revealedHintIds);
            const map = new Map<string, string>();
            (revealedHintData || []).forEach((h: any) => map.set(h.id, h.hint_text));
            setRevealedHints(map);
          }
        } catch { /* non-critical */ }
      }

      // First blood names
      if (challengeRes.data.first_blood_user_id) {
        const [userRes, teamRes] = await Promise.all([
          supabase.from('profiles').select('username').eq('id', challengeRes.data.first_blood_user_id).maybeSingle(),
          challengeRes.data.first_blood_team_id
            ? supabase.from('teams').select('name').eq('id', challengeRes.data.first_blood_team_id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        setFirstBloodUsername(userRes.data?.username || null);
        setFirstBloodTeamName((teamRes as any).data?.name || null);
      }

      // Load write-ups if solved
      if (isSolved || teamId) {
        const { data: writeups } = await supabase.from('writeups').select('id, url, created_at, profiles(username)').eq('challenge_id', challengeId).order('created_at', { ascending: false });
        setExistingWriteups(writeups || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevealHint = async (hintId: string, cost: number) => {
    if (revealingHintId || revealedHints.has(hintId)) return;
    if (cost > 0 && !confirm(`This hint costs ${cost} points. Reveal it?`)) return;

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
    } catch { /* silent */ } finally {
      setRevealingHintId(null);
    }
  };

  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge || !flagInput.trim()) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/challenges/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: challenge.id, flag: flagInput.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setIsSolved(true);
        setFeedback({
          type: 'success',
          message: data.isFirstBlood
            ? `🩸 First Blood! You were the first to solve this! +${data.points} points!`
            : data.message,
        });
        // Reload to get writeup section
        await loadData();
      } else {
        setFeedback({ type: data.alreadySolved ? 'info' : 'error', message: data.message });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWriteupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeupUrl.trim() || !isSolved) return;
    setSubmittingWriteup(true);
    try {
      const { error } = await supabase.from('writeups').upsert({
        challenge_id: challengeId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        url: writeupUrl.trim(),
      }, { onConflict: 'user_id,challenge_id' });
      if (!error) {
        setWriteupSubmitted(true);
        setWriteupUrl('');
        await loadData();
      }
    } catch { /* silent */ } finally {
      setSubmittingWriteup(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => { if (authed === false) router.push('/login'); }, [authed, router]);

  if (authed === null || loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-600" /></div>;
  }

  if (!challenge) return null;

  const teamRequired = platformMode === 'competition' && !userTeamId;
  const canSubmit = !teamRequired;

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => router.push('/challenges')}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-6 group"
      >
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back to Challenges
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Main Challenge Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <CategoryBadge category={challenge.category} />
              {challenge.difficulty && <DifficultyBadge difficulty={challenge.difficulty} />}
              <Badge>{challenge.points} pts</Badge>
              {isSolved && <Badge variant="success"><CheckCircle className="h-3 w-3" /> Solved</Badge>}
              {challenge.first_blood_at && (
                <Badge variant="danger"><Droplets className="h-3 w-3" /> First Blood</Badge>
              )}
            </div>

            <h1 className="text-2xl font-bold text-zinc-100 mb-1">{challenge.title}</h1>
            {challenge.author && (
              <p className="text-xs text-zinc-500">Challenge by <span className="text-zinc-400">{challenge.author}</span></p>
            )}
          </div>

          {/* Description */}
          <Card padding="lg">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Description</h2>
            <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {challenge.description}
            </div>
          </Card>

          {/* Interactive Container Runtime Section */}
          {(challenge.has_runtime || challenge.runtime_template || challenge.id === 'hello-nc' || ['Web', 'Pwn', 'Crypto', 'Misc'].includes(challenge.category)) && (
            <div className="my-4">
              <RuntimeInstanceCard challengeId={challenge.runtime_challenge_id || challenge.id} />
            </div>
          )}

          {/* Attachments */}
          {challenge.file_url && (
            <Card padding="md">
              {(() => {
                const files = challenge.file_url.split(',').map((s: string) => s.trim()).filter(Boolean);
                return (
                  <div>
                    <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                      Challenge Attachment{files.length > 1 ? `s (${files.length})` : ''}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {files.map((fileUrl: string, idx: number) => {
                        const filename = fileUrl.split('/').pop()?.split('_').slice(1).join('_') || fileUrl.split('/').pop() || `artifact_${idx + 1}`;
                        return (
                          <a
                            key={idx}
                            href={fileUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-semibold text-emerald-400 hover:bg-zinc-700 hover:border-emerald-500/40 transition-all"
                          >
                            <Download className="h-4 w-4 shrink-0" />
                            <span>Download {filename}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </Card>
          )}

          {/* Write-ups section — only visible to solvers */}
          {isSolved && (
            <Card padding="lg">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-4 w-4 text-purple-400" />
                <h2 className="text-sm font-semibold text-zinc-200">Write-ups</h2>
                <span className="text-xs text-zinc-600">(visible to solvers only)</span>
              </div>

              {existingWriteups.length > 0 && (
                <div className="space-y-2 mb-4">
                  {existingWriteups.map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between py-2 border-b border-zinc-800/60 text-xs">
                      <span className="text-zinc-400">{w.profiles?.username || 'Anonymous'}</span>
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-emerald-400 hover:underline"
                      >
                        View Write-up <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {writeupSubmitted ? (
                <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Write-up submitted!</p>
              ) : (
                <form onSubmit={handleWriteupSubmit} className="flex gap-2">
                  <input
                    type="url"
                    value={writeupUrl}
                    onChange={(e) => setWriteupUrl(e.target.value)}
                    placeholder="https://your-writeup-url.com"
                    className="flex-1 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-colors"
                  />
                  <Button type="submit" size="sm" loading={submittingWriteup} disabled={!writeupUrl.trim()}>
                    Submit
                  </Button>
                </form>
              )}
            </Card>
          )}
        </div>

        {/* RIGHT: Metadata + Hints + Flag Submit */}
        <div className="space-y-4">
          {/* Stats Card */}
          <Card padding="md">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Points</span>
                <span className="font-bold text-emerald-400">{challenge.points}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Category</span>
                <CategoryBadge category={challenge.category} />
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Difficulty</span>
                {challenge.difficulty ? <DifficultyBadge difficulty={challenge.difficulty} /> : <span className="text-zinc-400">—</span>}
              </div>
              {challenge.first_blood_at && (
                <>
                  <div className="border-t border-zinc-800/60 pt-3">
                    <div className="flex items-center gap-1.5 text-red-400 mb-2">
                      <Droplets className="h-3.5 w-3.5" />
                      <span className="font-semibold">First Blood</span>
                    </div>
                    {firstBloodUsername && (
                      <p className="text-zinc-300">{firstBloodUsername}</p>
                    )}
                    {firstBloodTeamName && (
                      <p className="text-zinc-500">Team: {firstBloodTeamName}</p>
                    )}
                    <p className="text-zinc-600 mt-1">{new Date(challenge.first_blood_at).toLocaleString()}</p>
                  </div>
                </>
              )}
            </div>

            {/* Share */}
            <button
              onClick={handleShare}
              className="mt-4 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
            >
              {copied ? <><Check className="h-3.5 w-3.5 text-emerald-400" /> Copied!</> : <><Share2 className="h-3.5 w-3.5" /> Copy Challenge Link</>}
            </button>
          </Card>

          {/* Hints */}
          {hints.length > 0 && (
            <Card padding="md">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Hints ({hints.length})
              </h2>
              <div className="space-y-2">
                {hints.map((hint, idx) => {
                  const isRevealed = revealedHints.has(hint.id);
                  const hintText = revealedHints.get(hint.id);
                  const isLoading = revealingHintId === hint.id;

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
                          {hint.cost > 0 && <span className="text-zinc-500 font-normal">(-{hint.cost} pts)</span>}
                        </span>
                        <span className="text-zinc-500 flex items-center gap-1">
                          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : isRevealed ? <ChevronDown className="h-3.5 w-3.5" />
                            : <><Lock className="h-3 w-3" /> Reveal</>}
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
            </Card>
          )}

          {/* Flag Submit */}
          <Card padding="md">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Submit Flag</h2>

            {teamRequired && (
              <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Competition mode requires a team to submit flags.
              </div>
            )}

            {!teamRequired && !userTeamId && platformMode === 'practice' && (
              <div className="mb-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Solving solo (practice mode).
              </div>
            )}

            {feedback && (
              <div className={`mb-3 p-3 rounded-lg text-xs flex items-start gap-2 ${
                feedback.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : feedback.type === 'info' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {feedback.message}
              </div>
            )}

            {isSolved ? (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Already solved! Great work.
              </div>
            ) : (
              <form onSubmit={handleFlagSubmit} className="space-y-2">
                <input
                  type="text"
                  value={flagInput}
                  onChange={(e) => setFlagInput(e.target.value)}
                  placeholder="BL4CKOUT{...}"
                  disabled={submitting || teamRequired}
                  className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 font-[family-name:var(--font-mono)] placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-colors disabled:opacity-50"
                />
                <Button type="submit" loading={submitting} disabled={!flagInput.trim() || teamRequired} className="w-full justify-center">
                  <Send className="h-4 w-4" /> Submit Flag
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
