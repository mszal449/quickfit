import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Tag } from "../../components/ui/Tag";
import { TrophyIcon, CheckIcon, ChevronDownIcon } from "../../components/icons";
import {
  formatClock,
  formatReps,
  formatTonnes,
  formatWeight,
} from "../../lib/format";
import { cn } from "../../lib/cn";
import { useGetWorkoutLogsGet } from "../../api/generated/workout-log/workout-log";
import { useGetExercisesGet } from "../../api/generated/exercise/exercise";
import {
  ExerciseCategory,
  WorkoutLogStatus,
} from "../../api/generated/quickfitApi.schemas";
import { buildExerciseProgressSeries } from "../dashboard/aggregateStats";
import { ExerciseProgressChart } from "../../components/charts/ExerciseProgressChart";
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

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: completedPage } = useGetWorkoutLogsGet({
    status: WorkoutLogStatus.completed,
  });
  const { data: exercisesPage } = useGetExercisesGet();
  const categoryById = useMemo(() => {
    const map = new Map<string, ExerciseCategory>();
    for (const e of exercisesPage?.items ?? []) map.set(e.id, e.category);
    return map;
  }, [exercisesPage]);

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
          {summary.exercises.map((ex) => {
            const category =
              categoryById.get(ex.exercise_id) ?? ExerciseCategory.strength;
            const progressSeries = buildExerciseProgressSeries(
              completedPage?.items ?? [],
              ex.exercise_id,
              category,
            );
            const isExpanded = expandedId === ex.exercise_id;
            const hasChart = progressSeries.length >= 2;

            return (
              <div
                key={ex.exercise_id}
                className={cn(
                  "rounded-2xl border px-4 py-3",
                  ex.isPr
                    ? "border-warning/40 bg-warning-soft"
                    : "border-border bg-surface",
                )}
              >
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 text-left",
                    hasChart && "cursor-pointer",
                  )}
                  onClick={() =>
                    hasChart &&
                    setExpandedId(isExpanded ? null : ex.exercise_id)
                  }
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
                        <>
                          {" "}
                          · last time {formatWeight(ex.previousTopWeight)} kg
                        </>
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
                  {hasChart && (
                    <ChevronDownIcon
                      size={16}
                      className={cn(
                        "text-faint shrink-0 transition-transform",
                        isExpanded && "rotate-180",
                      )}
                    />
                  )}
                </button>

                {hasChart && isExpanded && (
                  <div className="mt-3">
                    <ExerciseProgressChart
                      data={progressSeries}
                      unit={category === ExerciseCategory.cardio ? "" : "kg"}
                      formatValue={
                        category === ExerciseCategory.cardio
                          ? formatClock
                          : formatWeight
                      }
                      title={
                        category === ExerciseCategory.cardio
                          ? "Duration progress"
                          : "Top weight progress"
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
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
