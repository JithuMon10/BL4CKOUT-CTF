'use client';

import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Flag, Search, Download, CheckCircle, X, Shield, Code2, Cpu, Lock, Terminal, Send, AlertCircle, Zap, RefreshCw } from 'lucide-react';
import { Challenge, Category } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

export default function ChallengesPage() {
  const supabase = createClient();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  
  const [flagInput, setFlagInput] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  const [userTeam, setUserTeam] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    loadLiveChallengesData();
  }, []);

  const loadLiveChallengesData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user session & profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, teams(*)')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserProfile(profile);
          if (profile.team_id) {
            setUserTeam(profile.teams);
            const { data: solves } = await supabase
              .from('solves')
              .select('challenge_id')
              .eq('team_id', profile.team_id);

            if (solves) {
              setSolvedIds(new Set(solves.map(s => s.challenge_id)));
            }
          }
        }
      }

      // 2. Fetch live challenges from Supabase
      const { data: dbChallenges, error } = await supabase
        .from('challenges')
        .select('id, title, category, description, points, author, file_url, created_at')
        .order('points', { ascending: true });

      if (error) {
        console.error('Error fetching challenges:', error);
      } else if (dbChallenges) {
        setChallenges(dbChallenges as Challenge[]);
      }
    } catch (err) {
      console.error('Live fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories: string[] = ['All', 'Web', 'Forensics', 'Pwn', 'Crypto', 'Reverse', 'Misc'];

  const filteredChallenges = challenges.filter((chal) => {
    const matchesCategory = selectedCategory === 'All' || chal.category === selectedCategory;
    const matchesSearch = chal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          chal.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryStyle = (category: Category) => {
    switch (category) {
      case 'Forensics': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Web': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'Reverse': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Crypto': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'Pwn': return 'bg-red-500/10 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
    }
  };

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
        setSolvedIds(prev => new Set([...prev, selectedChallenge.id]));
        
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#00ff66', '#00f0ff', '#a855f7'],
        });
      } else {
        setFeedback({ type: data.alreadySolved ? 'info' : 'error', message: data.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Network error submitting flag.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 font-mono">
      
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-2">
            <Zap className="h-3.5 w-3.5" />
            LIVE TARGET MATRIX
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">CHALLENGE TERMINAL</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real competition target portal. Select a challenge, download artifacts, and submit flags.
          </p>
        </div>

        {/* User Progress Stats */}
        <div className="flex items-center gap-4 text-xs">
          <div className="cyber-card rounded-lg px-4 py-2.5 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">SQUAD SOLVES</span>
            <span className="text-emerald-400 font-bold text-sm">
              {solvedIds.size} / {challenges.length} SOLVED
            </span>
          </div>

          <div className="cyber-card rounded-lg px-4 py-2.5 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">ACTIVE SQUAD</span>
            <span className="text-cyan-400 font-bold text-sm">
              {userTeam ? userTeam.name : 'NO SQUAD JOINED'}
            </span>
          </div>

          <button
            onClick={loadLiveChallengesData}
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 hover:border-emerald-500 transition-all"
            title="Refresh Targets"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_15px_rgba(0,255,102,0.4)]'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search targets..."
            className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-10 pr-4 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Challenge Grid / Empty State */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-400" />
          <span>CONNECTING TO TARGET MATRIX...</span>
        </div>
      ) : filteredChallenges.length === 0 ? (
        <div className="cyber-card rounded-xl p-12 text-center border border-slate-800 space-y-3">
          <Shield className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">NO TARGETS PUBLISHED IN THIS CATEGORY</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto font-sans">
            Run <code className="text-emerald-400 font-mono">schema.sql</code> in your Supabase SQL Editor to populate live challenges.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChallenges.map((chal) => {
            const isSolved = solvedIds.has(chal.id);
            const categoryStyle = getCategoryStyle(chal.category);

            return (
              <div
                key={chal.id}
                onClick={() => {
                  setSelectedChallenge(chal);
                  setFlagInput('');
                  setFeedback(null);
                }}
                className={`cyber-card rounded-xl p-6 cursor-pointer relative overflow-hidden flex flex-col justify-between transition-all group ${
                  isSolved ? 'border-emerald-500/40 bg-emerald-950/10' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${categoryStyle}`}>
                      {chal.category}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      {isSolved && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                          <CheckCircle className="h-3 w-3" /> SOLVED
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-300">
                        {chal.points} PTS
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {chal.title}
                  </h3>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed font-sans">
                    {chal.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span>By {chal.author}</span>
                  <span className="text-emerald-400 font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    INSPECT TARGET &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Challenge Detail Modal */}
      {selectedChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="cyber-card rounded-2xl max-w-2xl w-full p-6 sm:p-8 border border-emerald-500/40 bg-[#090b12] relative shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getCategoryStyle(selectedChallenge.category)}`}>
                    {selectedChallenge.category}
                  </span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {selectedChallenge.points} POINTS
                  </span>
                  {solvedIds.has(selectedChallenge.id) && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                      <CheckCircle className="h-3 w-3" /> SOLVED
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-white">{selectedChallenge.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">AUTHOR: {selectedChallenge.author}</p>
              </div>

              <button
                onClick={() => setSelectedChallenge(null)}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">TARGET BRIEFING</h3>
              <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800/80 text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                {selectedChallenge.description}
              </div>
            </div>

            {/* File Download Section */}
            {selectedChallenge.file_url && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">TARGET ARTIFACT</h3>
                <a
                  href={selectedChallenge.file_url}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 border border-emerald-500/40 text-emerald-400 text-xs font-bold hover:bg-emerald-500/10 hover:border-emerald-400 transition-all"
                >
                  <Download className="h-4 w-4" />
                  DOWNLOAD ARTIFACT ({selectedChallenge.file_url.split('/').pop()})
                </a>
              </div>
            )}

            {/* Flag Submission Form */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">SUBMIT FLAG</h3>
              
              {!userProfile?.team_id ? (
                <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>SQUAD REQUIRED: You must create or join a team in the Team tab to submit flags.</span>
                </div>
              ) : null}

              {feedback && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    feedback.type === 'success'
                      ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-400'
                      : feedback.type === 'info'
                      ? 'bg-cyan-950/80 border border-cyan-500/60 text-cyan-400'
                      : 'bg-red-950/80 border border-red-500/60 text-red-400'
                  }`}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{feedback.message}</span>
                </div>
              )}

              <form onSubmit={handleFlagSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={flagInput}
                  onChange={(e) => setFlagInput(e.target.value)}
                  placeholder="TCF{flag_format_here} or BL4CKOUT{...}"
                  disabled={submitting || !userProfile?.team_id}
                  className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={submitting || !flagInput.trim() || !userProfile?.team_id}
                  className="px-6 py-3 rounded-lg bg-emerald-500 text-slate-950 font-black hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(0,255,102,0.4)] transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? 'TRANSMITTING...' : 'SUBMIT'}
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
