import { Button } from "../../../components/ui/Button";
import { ArrowRightIcon, BoltIcon } from "../../../components/icons";
import { relativeTime } from "../../../lib/format";
import type { SessionStartOption } from "../startOptions";

interface NextWorkoutCardProps {
  option: SessionStartOption;
  onStart: () => void;
}

export function NextWorkoutCard({ option, onStart }: NextWorkoutCardProps) {
  return (
    <div className="border-primary/40 bg-surface relative overflow-hidden rounded-2xl border">
      <div
        aria-hidden
        className="bg-primary/20 pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full blur-3xl"
      />
      <div className="bg-primary pointer-events-none absolute inset-x-0 top-0 h-1" />

      <div className="relative p-5">
        <div className="flex items-center gap-2">
          <BoltIcon size={15} className="text-primary" />
          <span className="text-primary font-mono text-[11px] font-semibold tracking-[0.18em] uppercase">
            Up next
          </span>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-faint font-mono text-[11px] tracking-wide uppercase">
              {option.plan_name}
            </p>
            <h2 className="num text-fg mt-0.5 truncate text-4xl">
              {option.session_name}
            </h2>
          </div>
          <div className="shrink-0 text-right">
            <div className="num tabular text-primary text-4xl">
              ~{option.est_minutes}
            </div>
            <div className="text-faint font-mono text-[10px] tracking-wide uppercase">
              min
            </div>
          </div>
        </div>

        <div className="tabular text-faint mt-4 flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-muted">{option.exercise_count}</span> exercises
          <span className="text-border-strong">/</span>
          <span className="text-muted">{option.set_count}</span> sets
          <span className="text-border-strong">/</span>
          {option.last_performed_at
            ? `last ${relativeTime(option.last_performed_at)}`
            : "new"}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
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

        <Button
          className="mt-5"
          size="lg"
          fullWidth
          onClick={onStart}
          iconRight={<ArrowRightIcon size={20} />}
        >
          Start workout
        </Button>
      </div>
    </div>
  );
}
