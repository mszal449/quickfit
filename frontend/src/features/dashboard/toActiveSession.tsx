import type { WorkoutLogOut } from "../../api/generated/quickfitApi.schemas";
import type { ActiveSession } from "./types";
import type { PlanWithSessions } from "../plans/usePlansWithSessions";

export function toActiveSession(
  workout: WorkoutLogOut,
  plans: PlanWithSessions[],
): ActiveSession | null {
  const plan = plans.find((p) => p.id == workout.plan_id);
  const session = plan?.sessions.find((s) => s.id == workout.plan_session_id);
  if (!plan || !session) return null;

  const exercises = session.prescription.exercises;
  const totalSets = exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const completedSets = workout.sets.filter((s) => s.completed).length;

  const currentExerciseIndex = exercises.findIndex((e) => {
    const loggedForExercise = workout.sets.filter(
      (s) => s.exercise_id === e.exercise_id,
    ).length;
    return loggedForExercise < e.sets.length;
  });

  return {
    workout_log_id: workout.id,
    plan_name: plan.name,
    session_name: session.name,
    started_at: workout.performed_at,
    elapsed_seconds: 0,
    completed_sets: completedSets,
    total_sets: totalSets,
    current_exercise_index:
      currentExerciseIndex === -1 ? exercises.length - 1 : currentExerciseIndex,
    exercise_count: exercises.length,
  };
}
