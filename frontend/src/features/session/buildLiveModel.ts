import type {
  PlanSessionOut,
  WorkoutLogOut,
} from "../../api/generated/quickfitApi.schemas";
import type {
  LivePrevious,
  LiveExercise,
  LiveSessionModel,
  LiveSetRow,
} from "./types";

const DEFAULT_REST_SECONDS = 120;

export function buildLiveModel(
  workoutLog: WorkoutLogOut,
  session: PlanSessionOut,
  planName: string,
  previousLog: WorkoutLogOut | null,
  namesById: Map<string, string>,
): LiveSessionModel {
  const previousByKey = new Map<string, LivePrevious>();
  for (const s of previousLog?.sets ?? []) {
    previousByKey.set(`${s.exercise_id}:${s.set_index}`, {
      weight: s.weight,
      reps: s.reps,
    });
  }

  const exercises: LiveExercise[] = session.prescription.exercises.map(
    (presc) => {
      const logged = workoutLog.sets
        .filter((s) => s.exercise_id === presc.exercise_id)
        .sort((a, b) => a.set_index - b.set_index);

      const rowCount = Math.max(presc.sets.length, logged.length);
      const sets: LiveSetRow[] = [];

      for (let i = 0; i < rowCount; i++) {
        const target = presc.sets[i] ?? presc.sets[presc.sets.length - 1];
        const loggedSet = logged[i] ?? null;
        sets.push({
          exercise_id: presc.exercise_id,
          set_index: i,
          set_log_id: loggedSet?.id ?? null,
          target_min_reps: target.min_reps,
          target_max_reps: target.max_reps ?? null,
          previous: previousByKey.get(`${presc.exercise_id}:${i}`) ?? null,
          weight: loggedSet?.weight ?? null,
          reps: loggedSet?.reps ?? null,
          completed: loggedSet?.completed ?? false,
        });
      }

      return {
        exercise_id: presc.exercise_id,
        name: namesById.get(presc.exercise_id) ?? "Exercise",
        target_sets: presc.sets.length,
        target_min_reps: presc.sets[0]?.min_reps ?? 0,
        target_max_reps: presc.sets[0]?.max_reps ?? null,
        rest_seconds: DEFAULT_REST_SECONDS,
        sets,
      };
    },
  );

  return {
    workout_log_id: workoutLog.id,
    status: workoutLog.status,
    plan_name: planName,
    session_name: session.name,
    performed_at: workoutLog.performed_at,
    exercises,
  };
}
