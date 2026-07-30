'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, Users, Shield, Flag, Megaphone, BarChart3, ChevronDown, ArrowRight, Code2, Cpu, Lock, Terminal, Sparkles, CheckCircle2, Zap } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';

export default function HomePage() {
  const supabase = createClient();
  const [stats, setStats] = useState({ challenges: 0, teams: 0, solves: 0 });
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    async function loadStats() {
      const [cRes, tRes, sRes, aRes] = await Promise.all([
        supabase.from('challenges').select('id', { count: 'exact', head: true }).eq('is_visible', true),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('solves').select('id', { count: 'exact', head: true }),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(2),
      ]);

      setStats({
        challenges: cRes.count || 0,
        teams: tRes.count || 0,
        solves: sRes.count || 0,
      });

      setAnnouncements(aRes.data || []);
    }
    loadStats();
  }, []);

  const categories = [
    { name: 'Forensics', icon: Shield, desc: 'Analyze disk dumps, PCAP network captures, corrupted file headers, and steganography.' },
    { name: 'Web Exploitation', icon: Code2, desc: 'Exploit SQL injections, SSRF, authentication bypasses, and XSS vulnerabilities.' },
    { name: 'Reverse Engineering', icon: Cpu, desc: 'Decompile stripped binaries, reverse custom key checks, and analyze assembly logic.' },
    { name: 'Cryptography', icon: Lock, desc: 'Break weak RSA keys, lattice ciphers, custom block ciphers, and mathematical attacks.' },
    { name: 'Binary Exploitation (Pwn)', icon: Terminal, desc: 'Hijack control flow via stack buffer overflows, ROP chains, and heap exploitation.' },
  ];

  return (
    <div className="animate-fade-in space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>BL4CKOUT CTF Platform Active</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-zinc-100 leading-tight">
            Capture The Flag <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Cybersecurity Platform
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Solve hard forensics, web exploitation, reverse engineering, and cryptography challenges. Compete with your team on our live dynamic scoreboard.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/challenges">
              <Button size="lg" className="shadow-lg shadow-emerald-500/10">
                Explore Challenges
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="secondary" size="lg">
                <Trophy className="h-4 w-4" />
                Live Scoreboard
              </Button>
            </Link>
          </div>

          {/* Metrics Counter Bar */}
          <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto pt-8 border-t border-zinc-900/80">
            <div>
              <p className="text-2xl font-bold text-zinc-100">{stats.challenges}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Challenges Published</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">{stats.teams}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Competing Teams</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">{stats.solves}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Total Solves</p>
            </div>
          </div>
        </div>
      </section>

      {/* Announcements Highlight Banner */}
      {announcements.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-400">
              <Megaphone className="h-4 w-4" />
              <span>Latest Competition Announcement</span>
            </div>
            {announcements.map((a) => (
              <div key={a.id} className="text-zinc-300">
                <span className="font-semibold text-zinc-200">{a.title}: </span>
                <span>{a.content}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Challenge Categories Section */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-zinc-100">Competition Domains</h2>
          <p className="text-sm text-zinc-500 mt-1">Multi-stage challenges tailored for cybersecurity enthusiasts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Card key={cat.name} padding="md" interactive className="flex flex-col justify-between">
                <div>
                  <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-400 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-100 mb-2">{cat.name}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">{cat.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-800/60">
                  <Link href="/challenges" className="text-xs font-medium text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1">
                    View Domain <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Features Overview */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <Badge variant="success">Platform Architecture</Badge>
            <h2 className="text-3xl font-bold text-zinc-100">Engineered for Security Competitions</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              BL4CKOUT provides a streamlined, high-performance CTF platform with live score updates, secure server-side flag verification, team squad formation, and complete admin management capabilities.
            </p>

            <ul className="space-y-2.5 text-xs text-zinc-300 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Real-time team scoreboard with solve speed tie-breakers</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Hardened column-level database security protecting flags</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Graduated hints system and downloadable challenge artifacts</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Comprehensive submission audit logging with CSV export</span>
              </li>
            </ul>
          </div>

          <Card padding="lg" className="space-y-4 bg-zinc-950 border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-200">Competition Schedule</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-400">1. Registration</span>
                <span className="font-medium text-emerald-400">Open Now</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-400">2. Challenges Publish</span>
                <span className="font-medium text-zinc-200">Live</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-400">3. Scoreboard Freeze</span>
                <span className="font-medium text-zinc-500">Configurable</span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Rules & FAQ */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-zinc-100 text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-2">
          <FaqItem
            question="What is BL4CKOUT CTF?"
            answer="BL4CKOUT is a Capture The Flag competition platform where teams solve cybersecurity challenges across web, forensics, crypto, reverse engineering, and binary exploitation to earn points."
          />
          <FaqItem
            question="How do teams and invite codes work?"
            answer="One player creates a team and receives a 6-character invite code. Teammates enter the code to join. All member solves automatically aggregate into your team's total score."
          />
          <FaqItem
            question="Where do I find flags?"
            answer="Flags are hidden inside challenge files, binary payloads, or web applications. Submit them in the format specified by the challenge (e.g. TCF{...})."
          />
          <FaqItem
            question="Can I download challenge artifacts?"
            answer="Yes. Whenever a challenge has an attached file, a 'Download Challenge File' button appears in the challenge modal."
          />
        </div>
      </section>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-zinc-200 hover:bg-zinc-800/50 transition-colors"
        aria-expanded={open}
      >
        {question}
        <ChevronDown
          className={`h-4 w-4 text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-4 text-xs sm:text-sm text-zinc-400 leading-relaxed animate-fade-in">
          {answer}
        </div>
      )}
    </div>
  );
}
