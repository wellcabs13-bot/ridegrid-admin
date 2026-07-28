import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">RideGrid</h1>

          <p className="mt-2 text-sm text-slate-500">
            Unified Ground Transportation Platform
          </p>
        </div>

        <LoginForm />

        <div className="mt-8 text-center text-sm text-gray-500">
          © 2026 RideGrid Technologies
        </div>
      </div>
    </div>
  );
}
