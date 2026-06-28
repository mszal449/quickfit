import type { WorkoutHistoryItem } from "../../mocks/types";
import type { PlanWithSessions } from "../plans/usePlansWithSessions";

export interface SessionStartOption {
  plan_id: string;
  plan_name: string;
  session_id: string;
  session_name: string;
  exercise_count: number;
  set_count: number;
  est_minutes: number;
  last_performed_at: string | null;
  exercise_preview: string[];
  /** Next session in the plan's rotation after the most recently performed one. */
  is_suggested: boolean;
}

export interface PlanStartGroup {
  plan_id: string;
  plan_name: string;
  sessions: SessionStartOption[];
}

/** Rough time estimate: ~2.7 min per working set (work + rest), + warm-up. */
function estimateMinutes(setCount: number): number {
  return Math.round(setCount * 2.7) + 6;
}

function lastPerformed(
  plan: PlanWithSessions,
  sessionName: string,
  history: WorkoutHistoryItem[],
): string | null {
  const matches = history
    .filter((h) => h.plan_name === plan.name && h.session_name === sessionName)
    .map((h) => h.performed_at)
    .sort()
    .reverse();
  return matches[0] ?? null;
}

export function buildStartOptions(
  plans: PlanWithSessions[],
  namesById: Map<string, string>,
  history: WorkoutHistoryItem[],
): PlanStartGroup[] {
  return plans.map((plan) => {
    const sessions: SessionStartOption[] = plan.sessions.map((session) => {
      const exercises = session.prescription.exercises;
      const setCount = exercises.reduce((sum, e) => sum + e.sets.length, 0);
      return {
        plan_id: plan.id,
        plan_name: plan.name,
        session_id: session.id,
        session_name: session.name,
        exercise_count: exercises.length,
        set_count: setCount,
        est_minutes: estimateMinutes(setCount),
        last_performed_at: lastPerformed(plan, session.name, history),
        exercise_preview: exercises
          .slice(0, 3)
          .map((e) => namesById.get(e.exercise_id) ?? "Exercise"),
        is_suggested: false,
      };
    });

    // Suggested = the session after the most recently performed one (rotation).
    const mostRecentIdx = sessions.reduce<{ idx: number; at: string } | null>(
      (acc, s, idx) => {
        if (!s.last_performed_at) return acc;
        if (!acc || s.last_performed_at > acc.at)
          return { idx, at: s.last_performed_at };
        return acc;
      },
      null,
    );

    const suggestedIdx =
      mostRecentIdx != null ? (mostRecentIdx.idx + 1) % sessions.length : 0;
    if (sessions[suggestedIdx]) sessions[suggestedIdx].is_suggested = true;

    return {
      plan_id: plan.id,
      plan_name: plan.name,
      sessions,
    };
  });
}
