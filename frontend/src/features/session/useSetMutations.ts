import { useQueryClient } from "@tanstack/react-query";
import {
  getGetWorkoutLogGetQueryKey,
  useAddSetPost,
  useDeleteSetDelete,
  useUpdateSetPatch,
} from "../../api/generated/workout-log/workout-log";
import type {
  HTTPValidationError,
  SetLogOut,
  SetLogUpdate,
  WorkoutLogOut,
} from "../../api/generated/quickfitApi.schemas";
import { useToast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../api/client";

interface OptimisticCtx {
  prev?: WorkoutLogOut;
}

function applySetPatch(set: SetLogOut, patch: SetLogUpdate): SetLogOut {
  return {
    ...set,
    ...(patch.reps !== undefined ? { reps: patch.reps } : {}),
    ...(patch.weight !== undefined ? { weight: patch.weight } : {}),
    ...(patch.duration_seconds !== undefined
      ? { duration_seconds: patch.duration_seconds }
      : {}),
    ...(patch.distance_m !== undefined ? { distance_m: patch.distance_m } : {}),
    ...(patch.completed != null ? { completed: patch.completed } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
  };
}

export function useSetMutations(workoutLogId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const queryKey = getGetWorkoutLogGetQueryKey(workoutLogId);

  const rollback = (
    _e: HTTPValidationError,
    _v: unknown,
    ctx?: OptimisticCtx,
  ) => {
    if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
  };
  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const addSet = useAddSetPost<HTTPValidationError, OptimisticCtx>({
    mutation: {
      onMutate: async (vars) => {
        await queryClient.cancelQueries({ queryKey });
        const prev = queryClient.getQueryData<WorkoutLogOut>(queryKey);
        if (prev) {
          const existing = prev.sets.filter(
            (s) => s.exercise_id === vars.data.exercise_id,
          );
          const optimistic: SetLogOut = {
            id: `temp-${Date.now()}`,
            exercise_id: vars.data.exercise_id,
            set_index: existing.length,
            reps: vars.data.reps ?? null,
            weight: vars.data.weight ?? null,
            duration_seconds: vars.data.duration_seconds ?? null,
            distance_m: vars.data.distance_m ?? null,
            completed: vars.data.completed ?? true,
            notes: vars.data.notes ?? null,
          };
          queryClient.setQueryData<WorkoutLogOut>(queryKey, {
            ...prev,
            sets: [...prev.sets, optimistic],
          });
        }
        return { prev };
      },
      onError: (e, v, ctx) => {
        rollback(e, v, ctx);
        toast.error(getErrorMessage(e));
      },
      onSettled: invalidate,
    },
  });

  const updateSet = useUpdateSetPatch<HTTPValidationError, OptimisticCtx>({
    mutation: {
      onMutate: async (vars) => {
        await queryClient.cancelQueries({ queryKey });
        const prev = queryClient.getQueryData<WorkoutLogOut>(queryKey);
        if (prev) {
          queryClient.setQueryData<WorkoutLogOut>(queryKey, {
            ...prev,
            sets: prev.sets.map((s) =>
              s.id === vars.setId ? applySetPatch(s, vars.data) : s,
            ),
          });
        }
        return { prev };
      },
      onError: (e, v, ctx) => {
        rollback(e, v, ctx);
        toast.error(getErrorMessage(e));
      },
      onSettled: invalidate,
    },
  });

  const deleteSet = useDeleteSetDelete<HTTPValidationError>({
    mutation: {
      onError: (e) => toast.error(getErrorMessage(e)),
      onSettled: invalidate,
    },
  });

  return { addSet, updateSet, deleteSet };
}
