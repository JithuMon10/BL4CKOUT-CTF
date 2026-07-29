'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Terminal, Trophy, Flag, Users, LogIn, UserPlus, LogOut, ShieldAlert, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function getUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*, teams(*)')
          .eq('id', user.id)
          .single();
        setProfile(profileData);
      }
    }
    getUserData();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*, teams(*)')
          .eq('id', session.user.id)
          .single();
        setProfile(profileData);
      } else {
        setProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push('/');
  };

  const navLinks = [
    { name: 'CHALLENGES', href: '/challenges', icon: Flag },
    { name: 'SCOREBOARD', href: '/leaderboard', icon: Trophy },
    { name: 'TEAM', href: '/team', icon: Users },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-950/40 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 group-hover:border-emerald-400 group-hover:shadow-[0_0_15px_rgba(0,255,102,0.4)] transition-all">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-black tracking-widest text-white group-hover:text-emerald-400 transition-colors">
                BL4CKOUT
              </span>
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                CTF v2.4
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-500 tracking-wider">CYBERSECURITY PLATFORM</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-mono text-xs font-bold tracking-wider transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(0,255,102,0.2)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* User Auth Section */}
        <div className="flex items-center gap-3">
          
          {/* Live Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-semibold">ONLINE</span>
          </div>

          {user || profile ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end font-mono">
                <span className="text-xs font-bold text-slate-200">
                  {profile?.username || user?.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">
                  {profile?.teams?.name ? `[Team: ${profile.teams.name}]` : '[No Team]'}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-950/40 border border-red-800/40 text-red-400 font-mono text-xs font-semibold hover:bg-red-900/50 hover:border-red-600 transition-all"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">EXIT</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 font-mono text-xs">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-emerald-500/40 text-emerald-400 font-bold hover:bg-emerald-500/10 hover:border-emerald-400 transition-all"
              >
                <LogIn className="h-3.5 w-3.5" />
                LOGIN
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-emerald-500 text-slate-950 font-extrabold hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(0,255,102,0.5)] transition-all"
              >
                <UserPlus className="h-3.5 w-3.5" />
                JOIN
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
