import { CheckIcon, CloseIcon } from "../../../components/icons";
import type { SetLogOut } from "../../../api/generated/quickfitApi.schemas";
import { formatWeight } from "../../../lib/format";
import { cn } from "../../../lib/cn";

interface HistorySetsTableProps {
  sets: SetLogOut[];
}

export function HistorySetsTable({ sets }: HistorySetsTableProps) {
  return (
    <div className="border-border bg-surface overflow-hidden rounded-2xl border">
      <div className="border-border text-faint grid grid-cols-[2rem_1fr_3.5rem_2.5rem] items-center gap-2 border-b px-3 py-2.5 font-mono text-[11px] tracking-wide uppercase sm:grid-cols-[2.5rem_1fr_4.5rem_3rem] sm:px-4">
        <span>Set</span>
        <span>Result</span>
        <span className="text-right">kg</span>
        <span className="text-center">✓</span>
      </div>

      <ul>
        {sets.map((set) => (
          <li
            key={set.id}
            className="border-b-border grid grid-cols-[2rem_1fr_3.5rem_2.5rem] items-center gap-2 border-b px-3 py-3 last:border-b-0 sm:grid-cols-[2.5rem_1fr_4.5rem_3rem] sm:px-4"
          >
            <span className="text-muted font-mono text-sm font-semibold">
              {set.set_index + 1}
            </span>

            <span className="tabular text-fg truncate font-mono text-sm">
              {set.duration_seconds != null
                ? `${set.duration_seconds}s`
                : `${set.reps ?? "—"} reps`}
              {set.distance_m != null && ` · ${set.distance_m}m`}
              {set.notes && (
                <span className="text-faint ml-2 text-xs">{set.notes}</span>
              )}
            </span>

            <span className="tabular text-fg text-right font-mono text-sm font-semibold">
              {set.weight != null ? formatWeight(set.weight) : "—"}
            </span>

            <div className="flex justify-center">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md",
                  set.completed
                    ? "bg-success text-primary-fg"
                    : "bg-surface-2 text-faint",
                )}
              >
                {set.completed ? (
                  <CheckIcon size={14} />
                ) : (
                  <CloseIcon size={14} />
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
