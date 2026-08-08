import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-xl">
        <div className="mb-6 text-6xl">
          🔒
        </div>

        <h1 className="mb-3 text-3xl font-bold text-slate-900">
          Access Denied
        </h1>

        <p className="mb-8 text-slate-500">
          You don&apos;t have permission to
          access this page.
        </p>

        <Link
          href="/dashboard"
          className="inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}