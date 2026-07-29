'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Lock, ArrowRight, ShieldAlert, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Ensure profile record exists
        await supabase.from('profiles').insert({
          id: data.user.id,
          username,
          email,
        }).select();
      }

      router.push('/challenges');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create user profile.');
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
            <User className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-wider">REGISTER OPERATIVE</h2>
          <p className="text-xs text-slate-400">Join the BL4CKOUT network to access CTF challenges</p>
        </div>

        {/* Signup Form */}
        <div className="cyber-card rounded-xl p-8 border border-slate-800">
          
          {error && (
            <div className="mb-6 flex items-center gap-2 p-3 rounded bg-red-950/60 border border-red-800/60 text-red-400 font-mono text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5 font-mono text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-2">OPERATIVE USERNAME</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ZeroCool_99"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-2">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@bl4ckout.ctf"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-2">SECURITY PASSWORD</label>
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
              {loading ? 'REGISTERING...' : 'CREATE ACCOUNT'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 text-center font-mono text-xs text-slate-400">
            <span>Already registered? </span>
            <Link href="/login" className="text-emerald-400 font-bold hover:underline">
              LOGIN HERE
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
