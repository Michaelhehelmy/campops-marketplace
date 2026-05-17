'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Mail, Lock, ArrowRight, Shield } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

export default function LoginPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = searchParams.get('next');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { data, error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) {
      setError(error.message || 'Login failed');
      setLoading(false);
      return;
    }

    if (data) {
      if (next) {
        window.location.href = next;
        return;
      }

      const user = data.user as any;
      const role = user.role;

      if (role === 'master' || role === 'marketplace_master') {
        window.location.href = `/${params.locale}/admin`;
      } else if (role === 'manager' || role === 'staff') {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const res = await fetch('/api/owner/me', { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            const ownerData = await res.json();
            window.location.href = `/${params.locale}/manage/${ownerData.property.id}`;
          } else {
            window.location.href = `/${params.locale}/owner/dashboard`;
          }
        } catch {
          window.location.href = `/${params.locale}/owner/dashboard`;
        }
      } else {
        window.location.href = `/${params.locale}/guest`;
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 text-white relative overflow-hidden">
      {/* Luxury Ambient Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-amber-500/5 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[130px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
        <div className="text-center">
          {/* Logo Icon */}
          <div className="mx-auto w-14 h-14 bg-gradient-to-tr from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/10 mb-6">
            <Shield className="w-7 h-7 text-slate-950 stroke-[2.5]" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Welcome Back</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Sign in to manage your premium bookings or listing property.
          </p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {error && (
            <div className="mb-6 p-4 bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-bold rounded-2xl animate-in fade-in zoom-in duration-300">
              ⚠️ {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit} aria-label="Login form">
            <div className="space-y-4">
              {/* Email field */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-bold tracking-wider text-zinc-400 uppercase ml-1">
                  Email Address
                </label>
                <div className="relative">
                  <div
                    className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400/80"
                    aria-hidden="true"
                  >
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    data-testid="email-input"
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-950/60 border border-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-transparent rounded-2xl text-white placeholder-zinc-500 transition-all duration-300"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-bold tracking-wider text-zinc-400 uppercase ml-1">
                  Password
                </label>
                <div className="relative">
                  <div
                    className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400/80"
                    aria-hidden="true"
                  >
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    data-testid="password-input"
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-950/60 border border-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-transparent rounded-2xl text-white placeholder-zinc-500 transition-all duration-300"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <a
                href="#"
                className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
                aria-label="Reset password"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="login-button"
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-black rounded-2xl text-slate-950 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-950" aria-hidden="true" />
              ) : (
                <div className="flex items-center gap-2">
                  Sign In{' '}
                  <ArrowRight
                    className="h-4 w-4 stroke-[2.5] group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </div>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-xs text-zinc-500">
              New to SinaiCamps?{' '}
              <a
                href={`/${params.locale}/list-your-camp`}
                className="font-bold text-amber-400 hover:text-amber-300 transition-colors"
              >
                Register your property
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
