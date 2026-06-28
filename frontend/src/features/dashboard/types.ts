export interface ActiveSession {
  workout_log_id: string;
  plan_name: string;
  session_name: string;
  started_at: string;
  elapsed_seconds: number;
  completed_sets: number;
  total_sets: number;
  current_exercise_index: number;
  exercise_count: number;
}
