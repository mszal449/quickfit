import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Menu } from "../../../components/ui/Menu";
import {
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  MoreIcon,
} from "../../../components/icons";
import { formatClock } from "../../../lib/format";
import type { ActiveSession } from "../types";
import { cn } from "../../../lib/cn";

interface ResumeSessionCardProps {
  session: ActiveSession;
  onResume: () => void;
  onFinish: () => void;
  onDiscard: () => void;
}

function useElapsed(startedAtIso: string, fallback: number) {
  const started = new Date(startedAtIso).getTime();
  const compute = () =>
    Math.max(fallback, Math.floor((Date.now() - started) / 1000));
  const [secs, setSecs] = useState(compute);
  useEffect(() => {
    const id = setInterval(() => setSecs(compute()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAtIso]);
  return secs;
}

const MAX_PIPS = 24;

function SetPips({ done, total }: { done: number; total: number }) {
  if (total > MAX_PIPS) {
    const pct = total ? Math.round((done / total) * 100) : 0;
    return (
      <div className="bg-fg/10 h-2.5 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-5 min-w-1.5 flex-1 rounded-[3px] transition-colors",
            i < done ? "bg-primary" : "bg-fg/10",
          )}
        />
      ))}
    </div>
  );
}

export function ResumeSessionCard({
  session,
  onResume,
  onFinish,
  onDiscard,
}: ResumeSessionCardProps) {
  const elapsed = useElapsed(session.started_at, session.elapsed_seconds);

  return (
    <div className="border-primary/40 bg-surface relative overflow-hidden rounded-2xl border">
      <div
        aria-hidden
        className="bg-primary/20 pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full blur-3xl"
      />
      <div className="bg-primary pointer-events-none absolute inset-x-0 top-0 h-1" />

      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" />
              <span className="bg-primary relative inline-flex h-2 w-2 rounded-full" />
            </span>
            <span className="text-primary font-mono text-[11px] font-semibold tracking-[0.18em] uppercase">
              In progress
            </span>
          </div>

          <Menu
            label="Session options"
            trigger={<MoreIcon size={20} />}
            items={[
              {
                label: "Finish & save",
                icon: <CheckIcon size={16} />,
                onSelect: onFinish,
              },
              {
                label: "Discard session",
                icon: <CloseIcon size={16} />,
                onSelect: onDiscard,
                destructive: true,
              },
            ]}
          />
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-faint font-mono text-[11px] tracking-wide uppercase">
              {session.plan_name}
            </p>
            <h2 className="num text-fg mt-0.5 truncate text-4xl">
              {session.session_name}
            </h2>
          </div>
          <div className="shrink-0 text-right">
            <div className="num tabular text-primary text-4xl">
              {formatClock(elapsed)}
            </div>
            <div className="text-faint font-mono text-[10px] tracking-wide uppercase">
              elapsed
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="text-faint mb-1.5 flex items-center justify-between font-mono text-[11px] tracking-wide uppercase">
            <span>
              Exercise {session.current_exercise_index + 1} /{" "}
              {session.exercise_count}
            </span>
            <span className="tabular">
              <span className="text-fg">{session.completed_sets}</span>/
              {session.total_sets} sets
            </span>
          </div>
          <SetPips done={session.completed_sets} total={session.total_sets} />
        </div>

        <Button
          className="mt-5"
          size="lg"
          fullWidth
          onClick={onResume}
          iconRight={<ArrowRightIcon size={20} />}
        >
          Resume workout
        </Button>
      </div>
    </div>
  );
}
