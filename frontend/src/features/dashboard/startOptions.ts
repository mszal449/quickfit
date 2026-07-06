import type { WorkoutLogOut } from "../../api/generated/quickfitApi.schemas";
import type { PlanWithSessions } from "../plans/usePlansWithSessions";

export interface SessionStartOption {
  plan_id: string;
  plan_name: string;
  session_id: string;
  session_name: string;
  exercise_count: number;
  set_count: number;
  est_minutes: number;
  last_started_at: string | null;
  exercise_preview: string[];
  is_suggested: boolean;
}

export interface PlanStartGroup {
  plan_id: string;
  plan_name: string;
  is_shared: boolean;
  sessions: SessionStartOption[];
}

function estimateMinutes(setCount: number): number {
  return Math.round(setCount * 2.7) + 6;
}

function lastPerformed(
  sessionId: string,
  completedLogs: WorkoutLogOut[],
): string | null {
  const matches = completedLogs
    .filter((log) => log.plan_session_id === sessionId)
    .map((log) => log.started_at)
    .sort()
    .reverse();
  return matches[0] ?? null;
}

export function buildStartOptions(
  plans: PlanWithSessions[],
  namesById: Map<string, string>,
  completedLogs: WorkoutLogOut[],
  isShared = false,
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
        last_started_at: lastPerformed(session.id, completedLogs),
        exercise_preview: exercises
          .slice(0, 3)
          .map((e) => namesById.get(e.exercise_id) ?? "Exercise"),
        is_suggested: false,
      };
    });

    const mostRecentIdx = sessions.reduce<{ idx: number; at: string } | null>(
      (acc, s, idx) => {
        if (!s.last_started_at) return acc;
        if (!acc || s.last_started_at > acc.at)
          return { idx, at: s.last_started_at };
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
      is_shared: isShared,
      sessions,
    };
  });
}

export function orderStartGroups(
  ownedGroups: PlanStartGroup[],
  sharedGroups: PlanStartGroup[],
  defaultPlanId: string | null,
): PlanStartGroup[] {
  const defaultGroup =
    ownedGroups.find((g) => g.plan_id === defaultPlanId) ??
    sharedGroups.find((g) => g.plan_id === defaultPlanId);
  const restOwned = ownedGroups
    .filter((g) => g.plan_id !== defaultPlanId)
    .sort((a, b) => a.plan_name.localeCompare(b.plan_name));
  const sortedShared = sharedGroups
    .filter((g) => g.plan_id !== defaultPlanId)
    .sort((a, b) => a.plan_name.localeCompare(b.plan_name));

  return [
    ...(defaultGroup ? [defaultGroup] : []),
    ...restOwned,
    ...sortedShared,
  ];
}
