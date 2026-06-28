import { Tag } from "../../../components/ui/Tag";
import { GripIcon, MoreIcon } from "../../../components/icons";
import type { PrescribedExercise } from "../../../mocks/types";
import { formatReps, formatRest } from "../../../lib/format";

/**
 * One prescribed exercise row in the plan builder. Shows the prescription as a
 * compact set of chips (sets / reps / intensity / rest / tempo) — the layout the
 * mobile edit-plan screen used. Drag handle + overflow menu are visual affordances.
 */
export function ExerciseCard({ exercise }: { exercise: PrescribedExercise }) {
  return (
    <div className="border-border bg-surface-2 rounded-xl border p-3.5">
      <div className="flex items-start gap-2.5">
        <button
          aria-label="Reorder exercise"
          className="text-faint hover:text-muted mt-0.5 cursor-grab active:cursor-grabbing"
        >
          <GripIcon size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-fg truncate font-semibold">{exercise.name}</h3>
            <button
              aria-label="Exercise options"
              className="text-faint hover:text-fg cursor-pointer"
            >
              <MoreIcon size={18} />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <Tag>{exercise.sets} sets</Tag>
            <Tag>{formatReps(exercise.min_reps, exercise.max_reps)} reps</Tag>
            {exercise.intensity_pct != null && (
              <Tag tone="primary">{exercise.intensity_pct}%</Tag>
            )}
            <Tag tone="muted">rest {formatRest(exercise.rest_seconds)}</Tag>
            {exercise.tempo && <Tag tone="muted">{exercise.tempo}</Tag>}
          </div>
        </div>
      </div>
    </div>
  );
}
