// Display-only date/time formatting in India time: "05 Oct 2026", "04:30 PM".
// Stored/API values stay ISO instants, "YYYY-MM-DD" dates and "HH:MM" 24-hour times.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const IST_OFFSET_MS = 330 * 60_000;

export function formatTime(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || "");
  if (!m) return hhmm;
  const h = Number(m[1]);
  return `${pad(h % 12 || 12)}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

export function formatDate(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || "");
  return m ? `${m[3]} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : ymd;
}

// ISO instant -> { date: "05 Oct 2026", time: "04:30 PM" } in Asia/Kolkata.
export function istParts(value: string | number | Date): { date: string; time: string } | null {
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return null;
  const d = new Date(t + IST_OFFSET_MS);
  return {
    date: `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
    time: formatTime(`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`),
  };
}

export function formatDateTime(value: string | number | Date | null | undefined, fallback = "Not recorded"): string {
  const p = value == null || value === "" ? null : istParts(value);
  return p ? `${p.date} · ${p.time}` : fallback;
}
