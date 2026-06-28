import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateWorkoutLogPost,
  useDeleteWorkoutLogDelete,
  useUpdateWorkoutLogPatch,
} from "../../api/generated/workout-log/workout-log";
import { WorkoutLogStatus } from "../../api/generated/quickfitApi.schemas";
import { useToast } from "../../components/ui/Toast";

const WORKOUT_LOG_LIST_KEY = ["/api/workout-log"];

export function useWorkoutLogActions() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: WORKOUT_LOG_LIST_KEY });

  const finishMut = useUpdateWorkoutLogPatch({
    mutation: {
      onError: () => toast.error("Couldn't finish workout"),
      onSettled: invalidate,
    },
  });
  const discardMut = useDeleteWorkoutLogDelete({
    mutation: {
      onError: () => toast.error("Couldn't discard workout"),
      onSettled: invalidate,
    },
  });

  return {
    finish: (workoutLogId: string) =>
      finishMut.mutateAsync({
        workoutLogId,
        data: { status: WorkoutLogStatus.completed },
      }),
    discard: (workoutLogId: string) => discardMut.mutateAsync({ workoutLogId }),
    isFinishing: finishMut.isPending,
    isDiscarding: discardMut.isPending,
  };
}

export function useStartWorkout() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const createMut = useCreateWorkoutLogPost({
    mutation: {
      onError: () => toast.error("Couldn't start workout"),
      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: WORKOUT_LOG_LIST_KEY }),
    },
  });

  return {
    start: (planSessionId: string) =>
      createMut.mutateAsync({ data: { plan_session_id: planSessionId } }),
    isStarting: createMut.isPending,
  };
}
