import Link from 'next/link';
import { Terminal, Shield, Trophy, Flag, Users, ArrowRight, Zap, Cpu, Code2, Lock } from 'lucide-react';

export default function LandingPage() {
  const categories = [
    { name: 'Forensics', count: '450 pts', icon: Shield, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    { name: 'Web Exploitation', count: '250 pts', icon: Code2, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
    { name: 'Reverse Engineering', count: '300 pts', icon: Cpu, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
    { name: 'Cryptography', count: '350 pts', icon: Lock, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
    { name: 'Binary Exploitation (Pwn)', count: '400 pts', icon: Terminal, color: 'text-red-400 border-red-500/30 bg-red-500/10' },
  ];

  return (
    <div className="relative overflow-hidden py-12 sm:py-20">
      
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-semibold shadow-[0_0_15px_rgba(0,255,102,0.2)]">
            <Zap className="h-3.5 w-3.5 animate-pulse" />
            <span>LIVE CTF COMPETITION IS ACTIVE</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-white leading-none">
            WELCOME TO <span className="neon-text-green">BL4CKOUT</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-sans">
            The ultimate cybersecurity arena. Solve hard forensics, web exploitation, reverse engineering, and cryptography challenges. Compete with top hacker teams on our live dynamic scoreboard.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 font-mono text-sm font-bold">
            <Link
              href="/challenges"
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-500 text-slate-950 font-black hover:bg-emerald-400 hover:shadow-[0_0_25px_rgba(0,255,102,0.6)] transition-all group"
            >
              <Flag className="h-4 w-4" />
              ENTER CHALLENGES
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/leaderboard"
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-900 border border-emerald-500/30 text-emerald-400 hover:bg-slate-800 hover:border-emerald-400 transition-all"
            >
              <Trophy className="h-4 w-4" />
              LIVE SCOREBOARD
            </Link>
          </div>
        </div>

        {/* Categories Showcase */}
        <div className="mt-20">
          <div className="text-center mb-10 font-mono">
            <h2 className="text-xs uppercase tracking-widest text-emerald-400 font-bold">ACTIVE DOMAINS</h2>
            <p className="text-2xl font-black text-white mt-1">CHALLENGE CATEGORIES</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.name} className="cyber-card rounded-xl p-6 relative overflow-hidden group">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg border ${cat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      {cat.count}
                    </span>
                  </div>
                  <h3 className="font-mono text-lg font-bold text-white mt-4 group-hover:text-emerald-400 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2">
                    Multi-stage binary analysis, payload injection, and cryptographic matrix decryption.
                  </p>
                  <Link
                    href="/challenges"
                    className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-400 hover:text-emerald-300"
                  >
                    <span>Inspect Target</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Featured Challenge Highlight */}
        <div className="mt-20 cyber-card rounded-2xl p-8 border border-emerald-500/30 bg-emerald-950/20 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono text-xs font-bold">
                🔥 FEATURED HARD FORENSICS CHALLENGE
              </div>
              <h2 className="text-3xl font-black font-mono text-white">The Real GOAT Debate</h2>
              <p className="text-sm text-slate-300 leading-relaxed font-sans">
                "My friends are locked in a civil war over Messi vs Ronaldo. I rendered the ultimate video evidence, but a toxic Reddit debate corrupted my MP4 container headers! Fix the corrupted file, play the video, and witness the true legend!"
              </p>
              <div className="flex items-center gap-4 font-mono text-xs text-slate-400">
                <span className="text-emerald-400 font-bold">Points: 450 PTS</span>
                <span>•</span>
                <span>Category: Forensics</span>
                <span>•</span>
                <span>Author: CyberGOAT</span>
              </div>
            </div>

            <Link
              href="/challenges"
              className="px-6 py-3.5 rounded-lg bg-emerald-500 text-slate-950 font-mono font-black hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(0,255,102,0.6)] transition-all whitespace-nowrap"
            >
              SOLVE CHALLENGE
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
