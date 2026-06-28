import type { PrescribedExercise } from "../../mocks/types";

export type RenderUnit =
  | { kind: "single"; exercise: PrescribedExercise }
  | {
      kind: "superset";
      superset_id: string;
      label: string;
      exercises: PrescribedExercise[];
    };

/**
 * Collapse consecutive exercises sharing a `superset_id` into superset groups,
 * leaving the rest as singles. Preserves order. Labels groups A, B, C…
 */
export function groupExercises(exercises: PrescribedExercise[]): RenderUnit[] {
  const units: RenderUnit[] = [];
  let groupLetter = 0;

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const ssId = ex.superset_id;
    if (ssId) {
      const last = units[units.length - 1];
      if (last && last.kind === "superset" && last.superset_id === ssId) {
        last.exercises.push(ex);
        continue;
      }
      units.push({
        kind: "superset",
        superset_id: ssId,
        label: String.fromCharCode(65 + groupLetter++),
        exercises: [ex],
      });
    } else {
      units.push({ kind: "single", exercise: ex });
    }
  }

  return units;
}
