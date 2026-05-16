'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
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
        router.push(next);
      } else {
        const user = data.user as any;
        const role = user.role;

        if (role === 'master' || role === 'marketplace_master') {
          router.push(`/${params.locale}/admin`);
        } else if (role === 'manager' || role === 'staff') {
          // Fetch property to redirect to specific management page
          try {
            const res = await fetch('/api/owner/me');
            if (res.ok) {
              const ownerData = await res.json();
              router.push(`/${params.locale}/manage/${ownerData.property.id}`);
            } else {
              router.push(`/${params.locale}/owner/dashboard`);
            }
          } catch {
            router.push(`/${params.locale}/owner/dashboard`);
          }
        } else {
          router.push(`/${params.locale}/guest`);
        }
      }
      router.refresh();
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage your bookings or your property
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-2xl animate-in fade-in zoom-in duration-300">
              {error}
            </div>
          )}
          <form className="space-y-6" onSubmit={handleSubmit} aria-label="Login form">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-bold text-gray-700 ml-1">
                  Email Address
                </label>
                <div className="relative">
                  <div
                    className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"
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
                    className="block w-full pl-10 pr-3 py-3 bg-gray-50 border-0 rounded-2xl ring-1 ring-gray-200 focus:ring-2 focus:ring-brand-600 transition-all text-gray-900 placeholder-gray-400"
                    placeholder="name@example.com"
                    defaultValue="admin@sinaicamps.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-bold text-gray-700 ml-1">
                  Password
                </label>
                <div className="relative">
                  <div
                    className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"
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
                    className="block w-full pl-10 pr-3 py-3 bg-gray-50 border-0 rounded-2xl ring-1 ring-gray-200 focus:ring-2 focus:ring-brand-600 transition-all text-gray-900 placeholder-gray-400"
                    placeholder="••••••••"
                    defaultValue="password123"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <a
                href="#"
                className="text-sm font-bold text-brand-600 hover:underline"
                aria-label="Reset password"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="login-button"
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-black rounded-2xl text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all shadow-lg shadow-brand-200"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <div className="flex items-center gap-2">
                  Sign In{' '}
                  <ArrowRight
                    className="h-4 w-4 group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </div>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              New to SinaiCamps?{' '}
              <a
                href={`/${params.locale}/list-your-camp`}
                className="font-bold text-brand-600 hover:underline"
              >
                Register your property
              </a>
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
            Demo Credentials: admin@sinaicamps.com / password123
          </p>
        </div>
      </div>
    </div>
  );
}
