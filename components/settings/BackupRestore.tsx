'use client';

export default function BackupRestore() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Backup & Restore</h2>

          <p className="mt-1 text-sm text-slate-500">
            Create secure backups and restore platform data.
          </p>
        </div>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900">
            Database Backup
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Download a complete backup of RideGrid database.
          </p>

          <button className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
            Create Backup
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900">
            Restore Backup
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Upload a previously created backup file.
          </p>

          <input
            type="file"
            className="mt-6 w-full rounded-xl border border-slate-300 p-3"
          />

          <button className="mt-5 rounded-xl border border-slate-300 px-5 py-3 hover:bg-slate-100">
            Restore Database
          </button>
        </div>
      </div>
    </div>
  );
}
