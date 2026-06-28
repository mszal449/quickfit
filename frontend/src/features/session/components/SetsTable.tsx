import { CheckIcon } from "../../../components/icons";
import type { LiveSetRow } from "../types";
import { formatWeight } from "../../../lib/format";
import { cn } from "../../../lib/cn";

interface SetsTableProps {
  sets: LiveSetRow[];
  activeIndex: number;
  onToggle: (row: LiveSetRow) => void;
  onEdit: (row: LiveSetRow) => void;
}

export function SetsTable({
  sets,
  activeIndex,
  onToggle,
  onEdit,
}: SetsTableProps) {
  return (
    <div className="border-border bg-surface overflow-hidden rounded-2xl border">
      <div className="border-border text-faint grid grid-cols-[2rem_1fr_3.5rem_3rem_2.5rem] items-center gap-2 border-b px-3 py-2.5 font-mono text-[11px] tracking-wide uppercase sm:grid-cols-[2.5rem_1fr_4.5rem_3.5rem_3rem] sm:px-4">
        <span>Set</span>
        <span>Previous</span>
        <span className="text-right">kg</span>
        <span className="text-right">Reps</span>
        <span className="text-center">✓</span>
      </div>

      <ul>
        {sets.map((set) => {
          const isActive = set.set_index === activeIndex;
          const isLogged = set.set_log_id !== null;
          const isDone = set.completed;
          return (
            <li
              key={set.set_index}
              onClick={isLogged ? () => onEdit(set) : undefined}
              className={cn(
                "grid grid-cols-[2rem_1fr_3.5rem_3rem_2.5rem] items-center gap-2 border-l-2 px-3 py-3 transition-colors sm:grid-cols-[2.5rem_1fr_4.5rem_3.5rem_3rem] sm:px-4",
                "border-b-border border-b last:border-b-0",
                isActive
                  ? "border-l-primary bg-surface-2"
                  : "border-l-transparent",
                isLogged && "hover:bg-surface-2 cursor-pointer",
              )}
            >
              <span
                className={cn(
                  "font-mono text-sm font-semibold",
                  isActive
                    ? "text-primary"
                    : isLogged
                      ? "text-muted"
                      : "text-faint",
                )}
              >
                {set.set_index + 1}
              </span>

              <span className="tabular text-faint truncate font-mono text-xs">
                {set.previous
                  ? `${formatWeight(set.previous.weight)} × ${set.previous.reps ?? "—"}`
                  : "—"}
              </span>

              <span
                className={cn(
                  "tabular text-right font-mono text-sm font-semibold",
                  isLogged || isActive ? "text-fg" : "text-faint",
                )}
              >
                {set.weight != null ? formatWeight(set.weight) : "—"}
              </span>

              <span
                className={cn(
                  "tabular text-right font-mono text-sm font-semibold",
                  isLogged || isActive ? "text-fg" : "text-faint",
                )}
              >
                {set.reps ?? "—"}
              </span>

              <div className="flex justify-center">
                <button
                  type="button"
                  disabled={!isLogged}
                  aria-label={
                    isDone
                      ? `Mark set ${set.set_index + 1} not done`
                      : `Mark set ${set.set_index + 1} done`
                  }
                  aria-pressed={isDone}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(set);
                  }}
                  className={cn(
                    "focus-visible:ring-primary/70 flex h-7 w-7 items-center justify-center rounded-md border transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none active:scale-90",
                    isDone
                      ? "border-success bg-success text-primary-fg"
                      : "border-border-strong bg-surface-2 text-transparent",
                    isLogged
                      ? "hover:border-muted cursor-pointer"
                      : "cursor-default opacity-40",
                  )}
                >
                  <CheckIcon size={16} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
