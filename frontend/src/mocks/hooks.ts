import { useMemo } from "react";
import { DASHBOARD, EXERCISES, HISTORY, PLANS, RECENT_PRS } from "./data";
import type {
  DashboardData,
  Exercise,
  PersonalRecord,
  Plan,
  WorkoutHistoryItem,
} from "./types";

/**
 * Mock data hooks shaped like TanStack Query results ({ data, isLoading }).
 * Swapping to the real generated hooks later means changing imports only —
 * call sites already destructure `{ data, isLoading }`.
 */
interface QueryLike<T> {
  data: T;
  isLoading: boolean;
}

const ready = <T>(data: T): QueryLike<T> => ({ data, isLoading: false });

export function useDashboard(): QueryLike<DashboardData> {
  return ready(DASHBOARD);
}

export function usePlans(): QueryLike<Plan[]> {
  return ready(PLANS);
}

export function usePlan(
  planId: string | undefined,
): QueryLike<Plan | undefined> {
  const plan = useMemo(() => PLANS.find((p) => p.id === planId), [planId]);
  return ready(plan);
}

export function useExercises(search = ""): QueryLike<Exercise[]> {
  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return EXERCISES;
    return EXERCISES.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.muscle_group.toLowerCase().includes(q),
    );
  }, [search]);
  return ready(items);
}

export function useHistory(): QueryLike<WorkoutHistoryItem[]> {
  return ready(HISTORY);
}

export function useRecentPRs(): QueryLike<PersonalRecord[]> {
  return ready(RECENT_PRS);
}
