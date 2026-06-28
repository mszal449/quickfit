import type { LiveSessionModel } from "./types";

export interface ExerciseSummary {
  exercise_id: string;
  name: string;
  setsLogged: number;
  setsPlanned: number;
  topWeight: number | null;
  topReps: number | null;
  previousTopWeight: number | null;
  isPr: boolean;
}

export interface WorkoutSummary {
  planName: string;
  sessionName: string;
  elapsedSeconds: number;
  totalVolumeKg: number;
  setsLogged: number;
  setsPlanned: number;
  exercises: ExerciseSummary[];
  prCount: number;
}

function topSet(weights: { weight: number | null; reps: number | null }[]): {
  weight: number | null;
  reps: number | null;
} {
  let best: { weight: number | null; reps: number | null } = { weight: null, reps: null };
  for (const s of weights) {
    if (s.weight == null) continue;
    if (best.weight == null || s.weight > best.weight) best = { weight: s.weight, reps: s.reps };
  }
  return best;
}

export function buildSummary(model: LiveSessionModel, elapsedSeconds: number): WorkoutSummary {
  let totalVolumeKg = 0;
  let setsLogged = 0;
  let setsPlanned = 0;
  let prCount = 0;

  const exercises: ExerciseSummary[] = model.exercises.map((ex) => {
    const logged = ex.sets.filter((s) => s.set_log_id !== null);
    setsLogged += logged.length;
    setsPlanned += ex.sets.length;

    for (const s of logged) {
      if (s.weight != null && s.reps != null) totalVolumeKg += s.weight * s.reps;
    }

    const top = topSet(logged);
    const previousTop = topSet(ex.sets.filter((s) => s.previous != null).map((s) => s.previous!));
    const isPr =
      top.weight != null && previousTop.weight != null && top.weight > previousTop.weight;
    if (isPr) prCount += 1;

    return {
      exercise_id: ex.exercise_id,
      name: ex.name,
      setsLogged: logged.length,
      setsPlanned: ex.sets.length,
      topWeight: top.weight,
      topReps: top.reps,
      previousTopWeight: previousTop.weight,
      isPr,
    };
  });

  return {
    planName: model.plan_name,
    sessionName: model.session_name,
    elapsedSeconds,
    totalVolumeKg,
    setsLogged,
    setsPlanned,
    exercises,
    prCount,
  };
}
