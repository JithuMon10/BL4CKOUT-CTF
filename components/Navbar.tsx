'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Trophy, Flag, Users, LogIn, UserPlus, LogOut, Menu, X, Shield, User as UserIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function loadUserData(sessionUser: any) {
      if (!sessionUser) {
        setUser(null);
        setProfile(null);
        setTeamName(null);
        return;
      }

      setUser(sessionUser);

      // Clean single query for profile (no relationship ambiguity)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle();

      setProfile(profileData);

      if (profileData?.team_id) {
        const { data: teamData } = await supabase
          .from('teams')
          .select('name')
          .eq('id', profileData.team_id)
          .maybeSingle();
        setTeamName(teamData?.name || null);
      } else {
        setTeamName(null);
      }
    }

    // Initial check
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      loadUserData(currentUser);
    });

    // Auth listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      loadUserData(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setTeamName(null);
    setMobileOpen(false);
    router.push('/');
  };

  const isAdmin = profile?.role === 'admin';
  const usernameDisplay = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';

  const navLinks = [
    { name: 'Challenges', href: '/challenges', icon: Flag },
    { name: 'Scoreboard', href: '/leaderboard', icon: Trophy },
    { name: 'Team', href: '/team', icon: Users },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-900 bg-[#0a0a0b]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group" onClick={() => setMobileOpen(false)}>
          <span className="text-lg font-bold tracking-tight text-zinc-100 group-hover:text-emerald-400 transition-colors">
            BL4CKOUT
          </span>
        </Link>

        {/* Desktop Nav */}
        {user && (
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.name}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith('/admin')
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
          </nav>
        )}

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/profile"
                className="flex items-center gap-2 text-right hover:opacity-80 transition-opacity"
                title="View Profile"
              >
                <div className="h-7 w-7 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  {usernameDisplay.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-zinc-200 leading-none">{usernameDisplay}</p>
                  {teamName ? (
                    <p className="text-[10px] text-zinc-500 font-medium leading-tight">{teamName}</p>
                  ) : (
                    <p className="text-[10px] text-amber-500/80 font-medium leading-tight">No Team</p>
                  )}
                </div>
              </Link>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Register
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-zinc-900 bg-[#0a0a0b] animate-fade-in">
          <div className="px-4 py-4 space-y-1">
            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-zinc-900/60 border border-zinc-800"
                >
                  <div className="h-7 w-7 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    {usernameDisplay.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{usernameDisplay}</p>
                    <p className="text-xs text-zinc-500">{teamName ? teamName : 'No Team'}</p>
                  </div>
                </Link>

                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive(link.href)
                          ? 'bg-zinc-800 text-zinc-100'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {link.name}
                    </Link>
                  );
                })}
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/profile')
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <UserIcon className="h-4 w-4" />
                  Profile
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname.startsWith('/admin')
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                >
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                >
                  <UserPlus className="h-4 w-4" />
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
