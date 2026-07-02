import { useMemo } from "react";
import {
  useGetLastWorkoutLogGet,
  useGetWorkoutLogGet,
} from "../../api/generated/workout-log/workout-log";
import { useGetSessionGet } from "../../api/generated/plan-session/plan-session";
import { useGetPlanGet } from "../../api/generated/plan/plan";
import { useExerciseNames } from "../exercises/useEcerciseName";
import { buildLiveModel } from "./buildLiveModel";
import type { LiveSessionModel } from "./types";

export function useLiveSession(workoutLogId: string) {
  const logQuery = useGetWorkoutLogGet(workoutLogId, {
    query: { enabled: !!workoutLogId },
  });
  const log = logQuery.data ?? null;
  const planId = log?.plan_id ?? "";
  const sessionId = log?.plan_session_id ?? "";

  const sessionQuery = useGetSessionGet(planId, sessionId, {
    query: { enabled: !!planId && !!sessionId },
  });
  const planQuery = useGetPlanGet(planId, {
    query: { enabled: !!planId },
  });
  const lastQuery = useGetLastWorkoutLogGet(
    { plan_session_id: sessionId },
    { query: { enabled: !!sessionId, retry: false } },
  );
  const { namesById } = useExerciseNames();

  const model: LiveSessionModel | null = useMemo(() => {
    if (!log || !sessionQuery.data || !planQuery.data) return null;
    return buildLiveModel(
      log,
      sessionQuery.data,
      planQuery.data.name,
      lastQuery.data ?? null,
      namesById,
    );
  }, [log, sessionQuery.data, planQuery.data, lastQuery.data, namesById]);

  const isLoading =
    logQuery.isLoading ||
    sessionQuery.isLoading ||
    planQuery.isLoading ||
    (!!sessionId && lastQuery.isLoading);

  return { model, isLoading, isError: logQuery.isError };
}
