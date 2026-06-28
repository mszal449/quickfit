/**
 * View-model types for the design mock.
 *
 * These intentionally mirror the backend schemas (`quickfitApi.schemas.ts`) but
 * add the richer prescription fields the UI shows — `rest_seconds`, `tempo`,
 * `intensity_pct`, superset grouping — which the current `SetPrescription`
 * (min_reps / max_reps only) does not yet carry. When the API grows these
 * fields, swap the mock hooks for the generated TanStack Query hooks and these
 * types collapse back onto the generated ones.
 */

export type ExerciseCategory = "strength" | "cardio";

export interface Exercise {
  id: string;
  name: string;
  description: string | null;
  muscle_group: string;
  category: ExerciseCategory;
}

/** One prescribed set group within an exercise (UI-enriched prescription). */
export interface PrescribedExercise {
  exercise_id: string;
  name: string;
  sets: number;
  min_reps: number;
  max_reps: number | null;
  rest_seconds: number;
  intensity_pct?: number | null; // %1RM
  tempo?: string | null; // e.g. "3-0-1"
  /** Exercises sharing a superset_id are performed back-to-back. */
  superset_id?: string | null;
  note?: string | null;
}

export interface PlanSession {
  id: string;
  plan_id: string;
  name: string;
  exercises: PrescribedExercise[];
}

export interface Plan {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  visibility: "private" | "shared";
  schedule_label: string; // "4-day Upper/Lower · 6 weeks"
  sessions: PlanSession[];
}

/** A completed workout for the history list. */
export interface WorkoutHistoryItem {
  id: string;
  performed_at: string; // ISO
  plan_name: string | null;
  session_name: string | null;
  duration_seconds: number;
  total_sets: number;
  total_volume_kg: number;
  top_exercises: string[];
}

export interface PersonalRecord {
  exercise_name: string;
  rep_label: string; // "1RM", "5RM"
  weight: number;
  achieved_at: string; // ISO
}

export interface WeeklyVolumePoint {
  week_label: string; // "W1"
  volume_kg: number;
  is_current: boolean;
}

export interface DashboardData {
  greeting_name: string;
  /**
   * Kept intentionally — workouts are NOT assigned to calendar days, but the
   * field stays for a possible future "scheduled for today" hint. Not used to
   * drive the dashboard; starting a workout is a free choice of plan session.
   */
  today: {
    session_name: string;
    plan_name: string;
    exercise_count: number;
    set_count: number;
    est_minutes: number;
    exercise_preview: string[];
    plan_session_id: string;
  } | null;
  stats: {
    volume_week_kg: number;
    sessions_done: number;
    sessions_planned: number;
    streak_days: number;
    prs_this_month: number;
  };
  weekly_volume: WeeklyVolumePoint[];
  recent_prs: PersonalRecord[];
}
