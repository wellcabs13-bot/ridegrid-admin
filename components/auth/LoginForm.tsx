'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    try {
      setLoading(true);

      const user = await login(form.email, form.password);

      // Company administrators use their own company-scoped portal.
      if (user?.role === 'CORPORATE_ADMIN') router.push('/corporate-admin');
      else router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div>
        <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-gray-700">
          Email Address
        </label>

        <div className="relative">
          <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />

          <input
            name="email"
            id="login-email"
            autoComplete="username"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="admin@ridegrid.com"
            className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 outline-none focus:border-red-600"
          />
        </div>
      </div>

      <div>
        <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-gray-700">
          Password
        </label>

        <div className="relative">
          <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />

          <input
            name="password"
            id="login-password"
            autoComplete="current-password"
            type={showPassword ? 'text' : 'password'}
            required
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-12 outline-none focus:border-red-600"
          />

          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-500" />
            ) : (
              <Eye className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      <button
        disabled={loading}
        className="flex w-full items-center justify-center rounded-xl bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Signing In...
          </>
        ) : (
          'Login'
        )}
      </button>
      <div className="flex justify-between text-sm">
        <Link className="font-medium text-red-700 hover:underline" href="/forgot-password">Forgot password?</Link>
        <Link className="text-slate-600 hover:underline" href="/register">Account access</Link>
      </div>
    </form>
  );
}
