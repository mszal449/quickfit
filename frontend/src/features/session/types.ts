import type { WorkoutLogStatus } from "../../api/generated/quickfitApi.schemas";

export interface LivePrevious {
  weight: number | null;
  reps: number | null;
}

export interface LiveSetRow {
  exercise_id: string;
  set_index: number;
  set_log_id: string | null;
  target_min_reps: number;
  target_max_reps: number | null;
  previous: LivePrevious | null;
  weight: number | null;
  reps: number | null;
  completed: boolean;
}

export interface LiveExercise {
  exercise_id: string;
  name: string;
  target_sets: number;
  target_min_reps: number;
  target_max_reps: number | null;
  rest_seconds: number;
  sets: LiveSetRow[];
}

export interface LiveSessionModel {
  workout_log_id: string;
  status: WorkoutLogStatus;
  plan_name: string;
  session_name: string;
  performed_at: string;
  exercises: LiveExercise[];
}
