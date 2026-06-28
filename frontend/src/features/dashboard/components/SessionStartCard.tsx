import { PlayIcon } from "../../../components/icons";
import { relativeTime } from "../../../lib/format";
import type { SessionStartOption } from "../startOptions";
import { cn } from "../../../lib/cn";

interface SessionStartCardProps {
  option: SessionStartOption;
  onStart: () => void;
}

export function SessionStartCard({ option, onStart }: SessionStartCardProps) {
  const suggested = option.is_suggested;
  return (
    <button
      type="button"
      onClick={onStart}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-xl border pl-4 text-left transition-colors",
        "focus-visible:ring-primary/70 focus-visible:ring-2 focus-visible:outline-none",
        suggested
          ? "border-primary/40 bg-surface hover:border-primary/60"
          : "border-border bg-surface hover:border-border-strong",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          suggested ? "bg-primary" : "bg-border-strong group-hover:bg-muted",
        )}
      />

      <div className="flex items-start justify-between gap-3 p-4 pl-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="num text-fg truncate text-2xl">
              {option.session_name}
            </h3>
            {suggested && (
              <span className="bg-primary text-primary-fg shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase">
                Next
              </span>
            )}
          </div>

          <div className="tabular text-faint mt-1.5 flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-muted">{option.exercise_count}</span> ex
            <span className="text-border-strong">/</span>
            <span className="text-muted">{option.set_count}</span> sets
            <span className="text-border-strong">/</span>
            <span className="text-muted">~{option.est_minutes}</span> min
          </div>
        </div>

        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
            suggested
              ? "bg-primary text-primary-fg"
              : "bg-surface-2 text-muted group-hover:bg-surface-3 group-hover:text-fg",
          )}
        >
          <PlayIcon size={16} />
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 px-0 pr-4 pb-3">
        {option.exercise_preview.map((name) => (
          <span
            key={name}
            className="bg-surface-2 text-muted rounded-md px-2 py-0.5 font-mono text-[10px]"
          >
            {name}
          </span>
        ))}
        {option.exercise_count > option.exercise_preview.length && (
          <span className="text-faint font-mono text-[10px]">
            +{option.exercise_count - option.exercise_preview.length}
          </span>
        )}
      </div>

      <div className="border-border/60 text-faint mt-auto border-t px-0 py-2 pr-4 font-mono text-[10px] tracking-wide">
        {option.last_performed_at
          ? `Last done ${relativeTime(option.last_performed_at)}`
          : "Not done yet"}
      </div>
    </button>
  );
}
