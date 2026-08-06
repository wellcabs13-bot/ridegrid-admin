'use client';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">

      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">

        <h1 className="mb-6 text-2xl font-bold">
          Forgot Password
        </h1>

        <input
          placeholder="Email Address"
          className="mb-4 w-full rounded-xl border p-4"
        />

        <button className="w-full rounded-xl bg-blue-600 p-4 text-white">
          Send Reset Link
        </button>

      </div>

    </div>
  );
}