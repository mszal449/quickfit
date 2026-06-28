import { formatReps } from "../../../lib/format";
import type { LiveExercise } from "../types";

interface UpNextBarProps {
  next: LiveExercise | null;
}

/** Sticky preview of the next exercise so the user always knows what's coming. */
export function UpNextBar({ next }: UpNextBarProps) {
  if (!next) {
    return (
      <div className="border-success/30 bg-success-soft text-success rounded-2xl border px-4 py-3 text-center text-sm font-semibold">
        Last exercise — finish strong 💪 then tap Finish
      </div>
    );
  }

  return (
    <div className="border-border bg-surface flex items-center gap-3 rounded-2xl border px-4 py-3">
      <span className="text-faint font-mono text-[10px] tracking-wide uppercase">
        Up next
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-fg truncate text-sm font-semibold">
          {next.name}
        </div>
      </div>
      <span className="tabular text-muted shrink-0 font-mono text-xs">
        {next.target_sets} ×{" "}
        {formatReps(next.target_min_reps, next.target_max_reps)}
      </span>
    </div>
  );
}
