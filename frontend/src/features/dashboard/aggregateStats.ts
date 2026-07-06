import {
  ExerciseCategory,
  type WorkoutLogOut,
} from "../../api/generated/quickfitApi.schemas";

export interface WeeklyVolumePoint {
  week_label: string;
  volume_kg: number;
  is_current: boolean;
}

export interface PersonalRecord {
  exercise_id: string;
  exercise_name: string;
  rep_label: string;
  weight: number;
  achieved_at: string;
}

export interface DashboardStats {
  volume_week_kg: number;
  sessions_week: number;
  streak_weeks: number;
  prs_this_month: number;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekKey(date: Date): string {
  return startOfWeek(date).toISOString().slice(0, 10);
}

function logVolume(log: WorkoutLogOut): number {
  return log.sets.reduce((sum, s) => {
    if (s.weight != null && s.reps != null) return sum + s.weight * s.reps;
    return sum;
  }, 0);
}

export function buildWeeklyVolume(
  logs: WorkoutLogOut[],
  weeksCount = 8,
): WeeklyVolumePoint[] {
  const now = new Date();
  const currentWeekStart = startOfWeek(now);

  const points: WeeklyVolumePoint[] = Array.from(
    { length: weeksCount },
    (_, i) => {
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(weekStart.getDate() - (weeksCount - 1 - i) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const isCurrent = weekStart.getTime() === currentWeekStart.getTime();
      const weekNum = weeksCount - i;
      return {
        week_label: isCurrent ? "now" : `W${weekNum}`,
        volume_kg: 0,
        is_current: isCurrent,
        _start: weekStart.getTime(),
        _end: weekEnd.getTime(),
      } as WeeklyVolumePoint & { _start: number; _end: number };
    },
  );

  for (const log of logs) {
    const t = new Date(log.started_at).getTime();
    const point = (
      points as Array<WeeklyVolumePoint & { _start: number; _end: number }>
    ).find((p) => t >= p._start && t < p._end);
    if (point) point.volume_kg += logVolume(log);
  }

  return points.map(({ week_label, volume_kg, is_current }) => ({
    week_label,
    volume_kg,
    is_current,
  }));
}

export function computeStats(logs: WorkoutLogOut[]): DashboardStats {
  const now = new Date();
  const currentWeekStart = startOfWeek(now).getTime();
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const logsThisWeek = logs.filter(
    (l) => new Date(l.started_at).getTime() >= currentWeekStart,
  );
  const volume_week_kg = logsThisWeek.reduce((s, l) => s + logVolume(l), 0);
  const sessions_week = logsThisWeek.length;

  const weekKeys = [
    ...new Set(logs.map((l) => weekKey(new Date(l.started_at)))),
  ]
    .sort()
    .reverse();
  let streak_weeks = 0;
  const expectedWeekStart = new Date(currentWeekStart);
  for (const key of weekKeys) {
    if (key === startOfWeek(expectedWeekStart).toISOString().slice(0, 10)) {
      streak_weeks++;
      expectedWeekStart.setDate(expectedWeekStart.getDate() - 7);
    } else {
      break;
    }
  }

  const prs_this_month = computeAllPRs(logs, new Map()).filter(
    (pr) => new Date(pr.achieved_at) >= monthAgo,
  ).length;

  return { volume_week_kg, sessions_week, streak_weeks, prs_this_month };
}

export function computeAllPRs(
  logs: WorkoutLogOut[],
  namesById: Map<string, string>,
): PersonalRecord[] {
  const sorted = [...logs].sort(
    (a, b) =>
      new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
  );

  const bestByExercise = new Map<string, number>();
  const prs: PersonalRecord[] = [];

  for (const log of sorted) {
    const byExercise = new Map<string, typeof log.sets>();
    for (const s of log.sets) {
      if (!byExercise.has(s.exercise_id)) byExercise.set(s.exercise_id, []);
      byExercise.get(s.exercise_id)!.push(s);
    }
    for (const [exId, sets] of byExercise) {
      const topSet = sets.reduce<(typeof sets)[0] | null>((best, s) => {
        if (s.weight == null) return best;
        if (best == null || s.weight > best.weight!) return s;
        return best;
      }, null);
      if (!topSet || topSet.weight == null) continue;
      const prevBest = bestByExercise.get(exId) ?? -Infinity;
      if (topSet.weight > prevBest) {
        bestByExercise.set(exId, topSet.weight);
        prs.push({
          exercise_id: exId,
          exercise_name: namesById.get(exId) ?? "Exercise",
          rep_label: topSet.reps != null ? `${topSet.reps} reps` : "set",
          weight: topSet.weight,
          achieved_at: log.started_at,
        });
      }
    }
  }

  return prs.reverse();
}

export interface ExerciseProgressPoint {
  date: string;
  value: number;
}

export function buildExerciseProgressSeries(
  logs: WorkoutLogOut[],
  exerciseId: string,
  category: ExerciseCategory,
): ExerciseProgressPoint[] {
  const sessions = logs
    .filter((l) => l.sets.some((s) => s.exercise_id === exerciseId))
    .sort(
      (a, b) =>
        new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
    );

  const points: ExerciseProgressPoint[] = [];
  for (const log of sessions) {
    const sets = log.sets.filter((s) => s.exercise_id === exerciseId);
    if (category === ExerciseCategory.cardio) {
      const totalSeconds = sets.reduce(
        (sum, s) => sum + (s.duration_seconds ?? 0),
        0,
      );
      if (totalSeconds > 0)
        points.push({ date: log.started_at, value: totalSeconds });
    } else {
      const topWeight = sets.reduce<number | null>((best, s) => {
        if (s.weight == null) return best;
        return best == null || s.weight > best ? s.weight : best;
      }, null);
      if (topWeight != null)
        points.push({ date: log.started_at, value: topWeight });
    }
  }
  return points;
}

export function exerciseHistory(
  logs: WorkoutLogOut[],
  exerciseId: string,
): Array<{
  started_at: string;
  sets: Array<{ weight: number | null; reps: number | null }>;
}> {
  return logs
    .filter((l) => l.sets.some((s) => s.exercise_id === exerciseId))
    .sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    )
    .map((l) => ({
      started_at: l.started_at,
      sets: l.sets
        .filter((s) => s.exercise_id === exerciseId)
        .sort((a, b) => a.set_index - b.set_index)
        .map((s) => ({ weight: s.weight, reps: s.reps })),
    }));
}
