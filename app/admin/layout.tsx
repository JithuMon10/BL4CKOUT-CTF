'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, Users2, Flag, Megaphone,
  FileText, Settings, Loader2, ChevronLeft, Menu, X
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const sidebarLinks = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Teams', href: '/admin/teams', icon: Users2 },
  { name: 'Challenges', href: '/admin/challenges', icon: Flag },
  { name: 'Announcements', href: '/admin/announcements', icon: Megaphone },
  { name: 'Submissions', href: '/admin/submissions', icon: FileText },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthorized(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      setAuthorized(profile?.role === 'admin');
    }
    checkAdmin();
  }, []);

  useEffect(() => {
    if (authorized === false) {
      router.push('/');
    }
  }, [authorized, router]);

  if (authorized === null || authorized === false) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 p-3 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 shadow-lg"
        aria-label="Toggle admin sidebar"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-14 z-40 h-[calc(100dvh-3.5rem)] w-56 bg-zinc-950 border-r border-zinc-900 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-zinc-900">
          <Link href="/" className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to site
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-0.5" aria-label="Admin navigation">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}
