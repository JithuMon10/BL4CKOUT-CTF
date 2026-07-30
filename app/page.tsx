'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trophy, Users, Shield, Flag, Megaphone, BarChart3, ChevronDown, ArrowRight } from 'lucide-react';
import Card from '@/components/ui/Card';

export default function HomePage() {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative">
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-zinc-100 mb-4">
            BL4CKOUT
          </h1>
          <p className="text-lg sm:text-xl text-zinc-500 mb-2">Capture The Flag Competition</p>
          <p className="text-sm text-zinc-600 max-w-lg mx-auto mb-8">
            Test your cybersecurity skills across forensics, web exploitation, cryptography, reverse engineering, and more. Compete with your team and climb the scoreboard.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-colors"
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 transition-colors"
            >
              Create account
            </Link>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-16 border-t border-zinc-900">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-semibold text-zinc-100 mb-4">What is BL4CKOUT?</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            BL4CKOUT is a Capture The Flag competition platform where teams solve cybersecurity challenges to earn points. Challenges span multiple categories including web exploitation, forensics, cryptography, reverse engineering, binary exploitation, and miscellaneous puzzles. Form a team, solve challenges, submit flags, and compete for the top spot on the live scoreboard.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 border-t border-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-zinc-100 text-center mb-10">Platform Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Real-time Scoreboard"
              description="Live leaderboard that updates as teams solve challenges. See rankings, scores, and solve timestamps."
            />
            <FeatureCard
              icon={<Flag className="h-5 w-5" />}
              title="Multiple Categories"
              description="Challenges across Web, Forensics, Crypto, Reverse Engineering, Pwn, and Misc categories."
            />
            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="Team Competition"
              description="Create or join a team with invite codes. Team scores combine all member solves."
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="Secure Flag Submission"
              description="Server-side flag validation with duplicate submission prevention and submission logging."
            />
            <FeatureCard
              icon={<Megaphone className="h-5 w-5" />}
              title="Live Announcements"
              description="Stay updated with competition announcements, hint releases, and rule changes from organizers."
            />
            <FeatureCard
              icon={<Trophy className="h-5 w-5" />}
              title="Admin Dashboard"
              description="Full admin panel for managing challenges, users, teams, submissions, and competition settings."
            />
          </div>
        </div>
      </section>

      {/* Rules */}
      <section className="py-16 border-t border-zinc-900">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-zinc-100 text-center mb-8">Competition Rules</h2>
          <Card padding="lg">
            <ul className="space-y-3 text-sm text-zinc-400">
              <li className="flex gap-3">
                <span className="text-emerald-400 font-mono text-xs mt-0.5">01</span>
                <span>Do not attack the competition infrastructure or other teams.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400 font-mono text-xs mt-0.5">02</span>
                <span>Do not share flags, solutions, or hints with other teams.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400 font-mono text-xs mt-0.5">03</span>
                <span>Each team can only submit a flag once per challenge.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400 font-mono text-xs mt-0.5">04</span>
                <span>Brute-forcing flag submissions is prohibited and will result in disqualification.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400 font-mono text-xs mt-0.5">05</span>
                <span>The organizers reserve the right to modify rules, point values, or disqualify teams at their discretion.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400 font-mono text-xs mt-0.5">06</span>
                <span>Have fun and learn something new.</span>
              </li>
            </ul>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 border-t border-zinc-900">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-zinc-100 text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-2">
            <FaqItem
              question="What is a CTF?"
              answer="CTF stands for Capture The Flag. It's a cybersecurity competition where participants solve challenges to find hidden strings called 'flags' and submit them for points."
            />
            <FaqItem
              question="How do teams work?"
              answer="One person creates a team and receives an invite code. Share the code with teammates so they can join. All challenge solves from team members contribute to the team's total score."
            />
            <FaqItem
              question="What does a flag look like?"
              answer="Flags follow a specific format that will be provided in the challenge description. Common formats include TCF{some_text_here} or BL4CKOUT{some_text_here}."
            />
            <FaqItem
              question="Can I participate alone?"
              answer="Yes. Create a team with just yourself. You'll still need a team to submit flags."
            />
            <FaqItem
              question="What happens if I submit a wrong flag?"
              answer="Wrong submissions are logged but don't penalize your score. You can try again. However, brute-forcing is prohibited."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card padding="md">
      <div className="text-emerald-400 mb-3">{icon}</div>
      <h3 className="text-sm font-semibold text-zinc-200 mb-1">{title}</h3>
      <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
    </Card>
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
        <div className="px-5 pb-4 text-sm text-zinc-400 leading-relaxed animate-fade-in">
          {answer}
        </div>
      )}
    </div>
  );
}
