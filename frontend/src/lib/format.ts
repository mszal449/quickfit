/** Display helpers. Keep formatting in one place so units/locale are consistent. */

/** 102.5 -> "102.5", 100 -> "100" (drop trailing .0). */
export function formatWeight(kg: number | null | undefined): string {
  if (kg == null) return "—";
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(1);
}

/** Rep range: (5) -> "5", (8,12) -> "8–12". */
export function formatReps(min: number, max?: number | null): string {
  if (max != null && max !== min) return `${min}–${max}`;
  return String(min);
}

/** Seconds -> "m:ss" (rest timers, durations). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/** Rest seconds -> "3:00" / "90s" for compact chips. */
export function formatRest(seconds: number): string {
  if (seconds % 60 === 0) return `${seconds / 60}:00`;
  if (seconds < 60) return `${seconds}s`;
  return formatClock(seconds);
}

/** Volume in kg -> tonnes string, e.g. 18400 -> "18.4". */
export function formatTonnes(kg: number): string {
  return (kg / 1000).toFixed(1);
}

/** ISO date -> "3 days ago" / "last week" style relative label. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const day = 86_400_000;
  const days = Math.floor(diffMs / day);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "last week";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return "last month";
  return `${Math.floor(days / 30)} months ago`;
}

/** ISO date -> "22 Jun 2026" for profile/account contexts. */
export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** ISO date -> "TUE · 22 JUN" header label. */
export function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const weekday = d
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase();
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  return `${weekday} · ${day} ${month}`;
}
