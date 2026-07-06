import { useMemo } from "react";
import { useGetWorkoutLogGet } from "../../api/generated/workout-log/workout-log";
import { useGetExercisesGet } from "../../api/generated/exercise/exercise";
import type { SetLogOut } from "../../api/generated/quickfitApi.schemas";
import { usePlansWithSessions } from "../plans/usePlansWithSessions";

export interface WorkoutDetailExerciseGroup {
  exercise_id: string;
  name: string;
  sets: SetLogOut[];
}

export function useWorkoutHistoryDetail(workoutLogId: string) {
  const { data: log, isLoading: logLoading } = useGetWorkoutLogGet(
    workoutLogId,
    { query: { enabled: !!workoutLogId } },
  );
  const { data: exercisesPage, isLoading: exercisesLoading } =
    useGetExercisesGet();
  const { data: plans, isLoading: plansLoading } = usePlansWithSessions();

  const isLoading = logLoading || exercisesLoading || plansLoading;

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

  const groups = useMemo<WorkoutDetailExerciseGroup[]>(() => {
    if (!log) return [];
    const orderedIds: string[] = [];
    for (const s of log.sets) {
      if (!orderedIds.includes(s.exercise_id)) orderedIds.push(s.exercise_id);
    }
    return orderedIds.map((exercise_id) => ({
      exercise_id,
      name: exerciseNameById.get(exercise_id) ?? "Exercise",
      sets: log.sets.filter((s) => s.exercise_id === exercise_id),
    }));
  }, [log, exerciseNameById]);

  const planName = log?.plan_id
    ? (planNameById.get(log.plan_id) ?? null)
    : null;
  const sessionName = log?.plan_session_id
    ? (sessionNameById.get(log.plan_session_id) ?? null)
    : null;

  const durationSeconds =
    log?.completed_at && log.started_at
      ? (new Date(log.completed_at).getTime() -
          new Date(log.started_at).getTime()) /
        1000
      : null;

  return { log, groups, planName, sessionName, durationSeconds, isLoading };
}
