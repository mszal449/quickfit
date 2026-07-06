import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Tag } from "../../components/ui/Tag";
import { TrophyIcon, CheckIcon } from "../../components/icons";
import {
  formatClock,
  formatReps,
  formatTonnes,
  formatWeight,
} from "../../lib/format";
import { cn } from "../../lib/cn";
import type { WorkoutSummary } from "./buildSummary";

interface SummaryLocationState {
  summary: WorkoutSummary;
}

export function WorkoutSummaryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId: workoutLogId = "" } = useParams();
  const summary =
    (location.state as SummaryLocationState | null)?.summary ?? null;

  if (!summary) {
    return (
      <div className="bg-bg flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-muted">
          This workout's summary is only available right after finishing it.
        </p>
        <Button variant="secondary" onClick={() => navigate("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  const completion =
    summary.setsPlanned > 0
      ? Math.round((summary.setsLogged / summary.setsPlanned) * 100)
      : 0;

  return (
    <div className="bg-bg flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="flex flex-col items-center text-center">
          <div className="bg-primary-soft text-primary flex h-14 w-14 items-center justify-center rounded-full">
            <CheckIcon size={28} />
          </div>
          <h1 className="num text-fg mt-4 text-2xl">Session complete</h1>
          <p className="text-faint mt-1 font-mono text-xs tracking-wide uppercase">
            {summary.planName} · {summary.sessionName}
          </p>
        </div>

        <div className="border-border bg-surface mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border">
          <Stat label="Time" value={formatClock(summary.elapsedSeconds)} />
          <Stat
            label="Volume"
            value={`${formatTonnes(summary.totalVolumeKg)} t`}
          />
          <Stat
            label="Sets"
            value={`${summary.setsLogged}/${summary.setsPlanned}`}
            sub={`${completion}%`}
          />
        </div>

        {summary.prCount > 0 && (
          <div className="border-warning/30 bg-warning-soft mt-4 flex items-center gap-2.5 rounded-2xl border px-4 py-3">
            <TrophyIcon size={18} className="text-warning shrink-0" />
            <p className="text-warning text-sm font-semibold">
              {summary.prCount === 1
                ? "New personal best on 1 exercise!"
                : `New personal bests on ${summary.prCount} exercises!`}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {summary.exercises.map((ex) => (
            <div
              key={ex.exercise_id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3",
                ex.isPr
                  ? "border-warning/40 bg-warning-soft"
                  : "border-border bg-surface",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-fg truncate text-sm font-semibold">
                    {ex.name}
                  </span>
                  {ex.isPr && (
                    <span className="bg-warning text-primary-fg inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide uppercase">
                      <TrophyIcon size={11} />
                      PR
                    </span>
                  )}
                </div>
                <div className="text-faint mt-0.5 font-mono text-xs">
                  {ex.setsLogged}/{ex.setsPlanned} sets
                  {ex.previousTopWeight != null && (
                    <> · last time {formatWeight(ex.previousTopWeight)} kg</>
                  )}
                </div>
              </div>
              <div className="tabular text-right">
                <div
                  className={cn(
                    "font-mono text-sm font-semibold",
                    ex.isPr ? "text-warning" : "text-fg",
                  )}
                >
                  {ex.topWeight != null
                    ? `${formatWeight(ex.topWeight)} kg`
                    : "—"}
                </div>
                {ex.topReps != null && (
                  <div className="text-faint font-mono text-xs">
                    {formatReps(ex.topReps)} reps
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button
          size="lg"
          fullWidth
          className="mt-6"
          onClick={() => navigate("/dashboard")}
        >
          Done
        </Button>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          className="mt-3"
          onClick={() => navigate(`/history/${workoutLogId}`)}
        >
          View full workout
        </Button>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-surface flex flex-col items-center gap-0.5 px-2 py-4">
      <span className="text-faint font-mono text-[10px] tracking-wide uppercase">
        {label}
      </span>
      <span className="num text-fg text-xl">{value}</span>
      {sub && <Tag tone="muted">{sub}</Tag>}
    </div>
  );
}
