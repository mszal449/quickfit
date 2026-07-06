import { useMemo } from "react";
import { useGetWorkoutLogsGet } from "../../api/generated/workout-log/workout-log";
import { useGetExercisesGet } from "../../api/generated/exercise/exercise";
import { WorkoutLogStatus } from "../../api/generated/quickfitApi.schemas";
import { usePlansWithSessions } from "../plans/usePlansWithSessions";

export interface WorkoutHistoryExercise {
  id: string;
  name: string;
}

export interface WorkoutHistoryItem {
  id: string;
  started_at: string;
  duration_seconds: number | null;
  plan_name: string | null;
  session_name: string | null;
  total_sets: number;
  total_volume_kg: number;
  top_exercises: WorkoutHistoryExercise[];
}

const MAX_TOP_EXERCISES = 3;

export function useWorkoutHistory() {
  const { data: logsPage, isLoading: logsLoading } = useGetWorkoutLogsGet({
    status: WorkoutLogStatus.completed,
  });
  const { data: exercisesPage, isLoading: exercisesLoading } =
    useGetExercisesGet();
  const { data: plans, isLoading: plansLoading } = usePlansWithSessions();

  const isLoading = logsLoading || exercisesLoading || plansLoading;

  const exerciseNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of exercisesPage?.items ?? []) map.set(e.id, e.name);
    return map;
  }, [exercisesPage]);

  const planNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of plans) map.set(p.id, p.name);
    return map;
  }, [plans]);

  const sessionNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of plans) {
      for (const s of p.sessions) map.set(s.id, s.name);
    }
    return map;
  }, [plans]);

  const history = useMemo<WorkoutHistoryItem[]>(() => {
    const logs = logsPage?.items ?? [];
    return [...logs]
      .sort(
        (a, b) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
      )
      .map((log) => {
        const total_volume_kg = log.sets.reduce((sum, s) => {
          if (s.weight != null && s.reps != null)
            return sum + s.weight * s.reps;
          return sum;
        }, 0);

        const orderedExerciseIds: string[] = [];
        for (const s of log.sets) {
          if (!orderedExerciseIds.includes(s.exercise_id))
            orderedExerciseIds.push(s.exercise_id);
        }

        const duration_seconds = log.completed_at
          ? (new Date(log.completed_at).getTime() -
              new Date(log.started_at).getTime()) /
            1000
          : null;

        return {
          id: log.id,
          started_at: log.started_at,
          duration_seconds,
          plan_name: log.plan_id
            ? (planNameById.get(log.plan_id) ?? null)
            : null,
          session_name: log.plan_session_id
            ? (sessionNameById.get(log.plan_session_id) ?? null)
            : null,
          total_sets: log.sets.length,
          total_volume_kg,
          top_exercises: orderedExerciseIds
            .slice(0, MAX_TOP_EXERCISES)
            .map((id) => ({ id, name: exerciseNameById.get(id) ?? "Exercise" })),
        };
      });
  }, [logsPage, planNameById, sessionNameById, exerciseNameById]);

  return { data: history, isLoading };
}
