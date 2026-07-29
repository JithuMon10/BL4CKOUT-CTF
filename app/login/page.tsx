'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Terminal, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push('/challenges');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header */}
        <div className="text-center font-mono space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(0,255,102,0.3)] mb-2">
            <Terminal className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-wider">AUTHENTICATE ACCESS</h2>
          <p className="text-xs text-slate-400">Enter your BL4CKOUT credentials to access the terminal</p>
        </div>

        {/* Login Form */}
        <div className="cyber-card rounded-xl p-8 border border-slate-800">
          
          {error && (
            <div className="mb-6 flex items-center gap-2 p-3 rounded bg-red-950/60 border border-red-800/60 text-red-400 font-mono text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6 font-mono text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-2">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hacker@bl4ckout.ctf"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-2">ACCESS PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-emerald-500 text-slate-950 font-black hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(0,255,102,0.5)] transition-all disabled:opacity-50"
            >
              {loading ? 'AUTHENTICATING...' : 'INITIALIZE SESSION'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 text-center font-mono text-xs text-slate-400">
            <span>Need an agent profile? </span>
            <Link href="/signup" className="text-emerald-400 font-bold hover:underline">
              REGISTER HERE
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
