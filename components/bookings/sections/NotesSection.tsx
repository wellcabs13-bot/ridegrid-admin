'use client';

interface NotesSectionProps {
  notes: string;
  setNotes: (value: string) => void;
}

export default function NotesSection({
  notes,
  setNotes,
}: NotesSectionProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold text-slate-800">
        Additional Notes
      </h2>

      <textarea
        rows={4}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Additional Notes"
        className="w-full rounded-xl border border-slate-300 px-4 py-3"
      />
    </div>
  );
}