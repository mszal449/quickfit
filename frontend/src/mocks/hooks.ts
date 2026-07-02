import { useMemo } from "react";
import { EXERCISES, HISTORY, PLANS } from "./data";
import type { Exercise, Plan, WorkoutHistoryItem } from "./types";

interface QueryLike<T> {
  data: T;
  isLoading: boolean;
}

const ready = <T>(data: T): QueryLike<T> => ({ data, isLoading: false });

export function usePlans(): QueryLike<Plan[]> {
  return ready(PLANS);
}

export function usePlan(planId: string | undefined): QueryLike<Plan | undefined> {
  const plan = useMemo(() => PLANS.find((p) => p.id === planId), [planId]);
  return ready(plan);
}

export function useExercises(search = ""): QueryLike<Exercise[]> {
  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return EXERCISES;
    return EXERCISES.filter(
      (e) => e.name.toLowerCase().includes(q) || e.muscle_group.toLowerCase().includes(q),
    );
  }, [search]);
  return ready(items);
}

export function useHistory(): QueryLike<WorkoutHistoryItem[]> {
  return ready(HISTORY);
}
