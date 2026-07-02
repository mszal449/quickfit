import { useNavigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Tag } from "../../components/ui/Tag";
import { Skeleton } from "../../components/ui/Skeleton";
import { ChevronLeftIcon, TrophyIcon } from "../../components/icons";
import { formatWeight, relativeTime } from "../../lib/format";
import { useGetExerciseGet } from "../../api/generated/exercise/exercise";
import { useGetWorkoutLogsGet } from "../../api/generated/workout-log/workout-log";
import { WorkoutLogStatus } from "../../api/generated/quickfitApi.schemas";
import { exerciseHistory } from "../dashboard/aggregateStats";

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  chest: "Chest", back: "Back", shoulders: "Shoulders", biceps: "Biceps",
  triceps: "Triceps", forearms: "Forearms", core: "Core", quads: "Quads",
  hamstrings: "Hamstrings", glutes: "Glutes", calves: "Calves", full_body: "Full body",
};

export function ExerciseDetailPage() {
  const { exerciseId = "" } = useParams();
  const navigate = useNavigate();

  const { data: exercise, isLoading: exLoading } = useGetExerciseGet(exerciseId, {
    query: { enabled: !!exerciseId },
  });
  const { data: completedPage, isLoading: logsLoading } = useGetWorkoutLogsGet({
    status: WorkoutLogStatus.completed,
  });

  const isLoading = exLoading || logsLoading;
  const history = useMemo(
    () => exerciseHistory(completedPage?.items ?? [], exerciseId),
    [completedPage, exerciseId],
  );

  const bestSet = useMemo(() => {
    let best: { weight: number; reps: number | null } | null = null;
    for (const session of history) {
      for (const s of session.sets) {
        if (s.weight == null) continue;
        if (!best || s.weight > best.weight) best = { weight: s.weight, reps: s.reps };
      }
    }
    return best;
  }, [history]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <Skeleton className="mb-5 h-9 w-40" />
        <Skeleton className="mb-3 h-16 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="text-muted p-10 text-center">
          Exercise not found.
          <div className="mt-3">
            <Button variant="secondary" onClick={() => navigate("/exercises")}>Back</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate("/exercises")}
        className="text-muted hover:text-fg mb-3 flex cursor-pointer items-center gap-1 text-sm font-medium"
      >
        <ChevronLeftIcon size={18} /> Exercises
      </button>

      <div className="mb-5">
        <h1 className="font-display text-fg text-3xl font-bold tracking-tight">{exercise.name}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Tag tone={exercise.category === "cardio" ? "primary" : "muted"}>
            {exercise.category}
          </Tag>
          {exercise.muscle_group && (
            <Tag tone="muted">{MUSCLE_GROUP_LABELS[exercise.muscle_group] ?? exercise.muscle_group}</Tag>
          )}
        </div>
        {exercise.description && (
          <p className="text-muted mt-3 text-sm">{exercise.description}</p>
        )}
      </div>

      {bestSet && (
        <Card className="mb-4 flex items-center gap-3 px-5 py-4">
          <TrophyIcon size={20} className="text-primary shrink-0" />
          <div>
            <div className="text-faint font-mono text-[11px] tracking-wide uppercase">Best set</div>
            <div className="text-fg font-mono text-xl font-bold">
              {formatWeight(bestSet.weight)} kg
              {bestSet.reps != null && (
                <span className="text-muted ml-2 text-sm font-normal">× {bestSet.reps} reps</span>
              )}
            </div>
          </div>
        </Card>
      )}

      {history.length === 0 ? (
        <Card className="text-muted p-10 text-center text-sm">
          No logged sessions yet. Start a workout that includes this exercise to see your history.
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {history.map((session, i) => (
            <Card key={i} className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-faint font-mono text-[11px] tracking-wide uppercase">
                  {relativeTime(session.performed_at)}
                </span>
                <span className="text-faint font-mono text-[11px]">
                  {session.sets.length} set{session.sets.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {session.sets.map((s, j) => (
                  <span
                    key={j}
                    className="border-border bg-surface-2 rounded-lg border px-2.5 py-1 font-mono text-sm"
                  >
                    {s.weight != null ? `${formatWeight(s.weight)} kg` : "—"}
                    {s.reps != null && (
                      <span className="text-faint ml-1">× {s.reps}</span>
                    )}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
