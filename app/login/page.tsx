'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] =
    useState(false);

  const handleLogin = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    /**
     * TODO
     * API Login
     */

    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">

      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">

        <h1 className="mb-2 text-3xl font-bold">
          RideGrid Admin
        </h1>

        <p className="mb-8 text-slate-500">
          Sign in to continue
        </p>

        <form
          onSubmit={handleLogin}
          className="space-y-6"
        >

          <div>

            <label className="mb-2 block text-sm font-medium">
              Email
            </label>

            <div className="flex items-center rounded-xl border px-4">

              <Mail
                size={18}
                className="text-slate-400"
              />

              <input
                type="email"
                required
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                className="w-full border-0 bg-transparent p-4 outline-none"
              />

            </div>

          </div>

          <div>

            <label className="mb-2 block text-sm font-medium">
              Password
            </label>

            <div className="flex items-center rounded-xl border px-4">

              <Lock
                size={18}
                className="text-slate-400"
              />

              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                required
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                className="w-full border-0 bg-transparent p-4 outline-none"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>

            </div>

          </div>

          <button
            className="w-full rounded-xl bg-blue-600 py-4 font-semibold text-white hover:bg-blue-700"
          >
            Login
          </button>

        </form>

      </div>

    </div>
  );
}