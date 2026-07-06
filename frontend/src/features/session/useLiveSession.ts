import { useMemo } from "react";
import {
  useGetWorkoutLogsGet,
  useGetWorkoutLogGet,
} from "../../api/generated/workout-log/workout-log";
import { useGetSessionGet } from "../../api/generated/plan-session/plan-session";
import { useGetPlanGet } from "../../api/generated/plan/plan";
import { WorkoutLogStatus } from "../../api/generated/quickfitApi.schemas";
import { useExerciseNames } from "../exercises/useEcerciseName";
import { buildLiveModel } from "./buildLiveModel";
import type { LiveSessionModel } from "./types";

const RECENT_LOGS_COUNT = 3;

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
  const recentLogsQuery = useGetWorkoutLogsGet(
    { plan_session_id: sessionId, status: WorkoutLogStatus.completed },
    { query: { enabled: !!sessionId } },
  );
  const { namesById } = useExerciseNames();

  const recentLogs = useMemo(
    () => (recentLogsQuery.data?.items ?? []).slice(0, RECENT_LOGS_COUNT),
    [recentLogsQuery.data],
  );

  const model: LiveSessionModel | null = useMemo(() => {
    if (!log || !sessionQuery.data || !planQuery.data) return null;
    return buildLiveModel(
      log,
      sessionQuery.data,
      planQuery.data.name,
      recentLogs,
      namesById,
    );
  }, [log, sessionQuery.data, planQuery.data, recentLogs, namesById]);

  const isLoading =
    logQuery.isLoading ||
    sessionQuery.isLoading ||
    planQuery.isLoading ||
    (!!sessionId && recentLogsQuery.isLoading);

  return { model, isLoading, isError: logQuery.isError };
}
