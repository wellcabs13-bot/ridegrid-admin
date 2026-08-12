import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-bold text-blue-600">
          404
        </div>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">
          Page Not Found
        </h1>

        <p className="mt-3 text-slate-500">
          The page you are looking for does not exist or may have been moved.
        </p>

        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Back to Dashboard
          </Link>

          <Link
            href="/bookings"
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Bookings
          </Link>
        </div>
      </div>
    </main>
  );
}