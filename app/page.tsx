'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, Users, Shield, Flag, Code2, Cpu, Lock, Terminal, ArrowRight, ChevronDown, CheckCircle2, LogIn, UserPlus, Droplets } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';
import ActivityFeed from '@/components/ActivityFeed';

export default function HomePage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const categories = [
    { name: 'Forensics', icon: Shield, desc: 'Disk images, network PCAP traces, corrupted headers, and steganography.' },
    { name: 'Web Exploitation', icon: Code2, desc: 'SQL injections, authentication bypasses, SSRF, and web vulnerabilities.' },
    { name: 'Reverse Engineering', icon: Cpu, desc: 'Stripped x86/ARM binaries, custom key validation algorithms, and assembly.' },
    { name: 'Cryptography', icon: Lock, desc: 'Mathematical ciphers, weak RSA keys, block ciphers, and cryptanalysis.' },
    { name: 'Binary Exploitation (Pwn)', icon: Terminal, desc: 'Buffer overflows, control flow hijacking, ROP chains, and memory corruption.' },
  ];

  return (
    <div className="animate-fade-in space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <Badge variant="success">BL4CKOUT CTF Platform</Badge>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-zinc-100 leading-tight">
            Capture The Flag <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Cybersecurity Competition
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Test your cybersecurity skills in forensics, web exploitation, reverse engineering, and cryptography. Form a team, solve challenges, and compete on our live scoreboard.
          </p>

          {user ? (
            /* Signed in User Action Buttons */
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <Link href="/challenges">
                <Button size="lg">
                  <Flag className="h-4 w-4" /> Go to Challenges
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button variant="secondary" size="lg">
                  <Trophy className="h-4 w-4" /> Scoreboard
                </Button>
              </Link>
            </div>
          ) : (
            /* Public Guest Action Buttons */
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <Link href="/login">
                <Button size="lg">
                  <LogIn className="h-4 w-4" /> Sign in to Participate
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="secondary" size="lg">
                  <UserPlus className="h-4 w-4" /> Create Account
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Signed-in Dashboard: Activity Feed */}
      {user && (
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick Actions */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Quick Access</h2>
              {[
                { href: '/challenges', icon: Flag, label: 'Challenges', desc: 'Solve and submit flags', color: 'text-emerald-400' },
                { href: '/leaderboard', icon: Trophy, label: 'Scoreboard', desc: 'Live team rankings', color: 'text-amber-400' },
                { href: '/team', icon: Users, label: 'My Team', desc: 'Manage your squad', color: 'text-blue-400' },
              ].map(({ href, icon: Icon, label, desc, color }) => (
                <Link key={href} href={href}>
                  <Card padding="sm" interactive className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">{label}</p>
                      <p className="text-xs text-zinc-500">{desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-zinc-700 ml-auto" />
                  </Card>
                </Link>
              ))}
            </div>

            {/* Activity Feed */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Latest Activity</h2>
              <ActivityFeed />
            </div>
          </div>
        </section>
      )}

      {/* Domain Categories Section */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-zinc-100">Competition Domains</h2>
          <p className="text-sm text-zinc-500 mt-1">Multi-level challenges across five core cybersecurity disciplines</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Card key={cat.name} padding="md" className="flex flex-col justify-between">
                <div>
                  <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-400 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-100 mb-2">{cat.name}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">{cat.desc}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Platform Features & Rules */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-zinc-100">Platform Features</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              BL4CKOUT provides a clean, secure environment for CTF events with server-side flag validation, team invite system, and hints tracking.
            </p>

            <ul className="space-y-2.5 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Practice mode — solo solving without a team</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Team squads (max 4 members) with invite codes</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Server-tracked hint reveals with point deduction</span>
              </li>
              <li className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-red-400 shrink-0" />
                <span>First Blood tracking — fastest solver wins glory</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Post-solve write-up sharing (solver-only visibility)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Live dynamic scoreboard with freeze control</span>
              </li>
            </ul>
          </div>

          <Card padding="lg" className="space-y-4 bg-zinc-950 border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-200">Competition Guidelines</h3>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li className="flex gap-2">
                <span className="text-emerald-400 font-mono">01.</span>
                <span>Do not attack competition infrastructure or other teams.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400 font-mono">02.</span>
                <span>Sharing flags or solutions between teams is strictly prohibited.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400 font-mono">03.</span>
                <span>Brute-forcing flag submissions will result in disqualification.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400 font-mono">04.</span>
                <span>Have fun and learn something new!</span>
              </li>
            </ul>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-zinc-100 text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-2">
          <FaqItem
            question="What is BL4CKOUT CTF?"
            answer="BL4CKOUT is a Capture The Flag competition platform where participants solve cybersecurity challenges to find hidden strings called 'flags' and submit them for points."
          />
          <FaqItem
            question="Where do I find flags?"
            answer="Flags are hidden inside challenge files, binary payloads, or web applications. Submit them in the format specified by the challenge (e.g. BL4CKOUT{...})."
          />
          <FaqItem
            question="Where can I see the live scoreboard?"
            answer="Sign in to your account and click the Scoreboard tab to view live team rankings and scores."
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
