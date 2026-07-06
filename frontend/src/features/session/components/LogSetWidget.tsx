import { useState } from "react";
import { Stepper } from "../../../components/ui/Stepper";
import { Chip } from "../../../components/ui/Chip";
import { Button } from "../../../components/ui/Button";
import { CheckIcon, TimerIcon } from "../../../components/icons";
import { formatRest, formatWeight } from "../../../lib/format";
import type { LivePrevious } from "../types";

interface LogSetWidgetProps {
  title: string;
  submitLabel: string;
  initialWeight: number;
  initialReps: number;
  previous: LivePrevious | null;
  restSeconds: number;
  isLogging: boolean;
  onLog: (weight: number, reps: number) => void;
  onCancel?: () => void;
}

export function LogSetWidget({
  title,
  submitLabel,
  initialWeight,
  initialReps,
  previous,
  restSeconds,
  isLogging,
  onLog,
  onCancel,
}: LogSetWidgetProps) {
  const [weight, setWeight] = useState(initialWeight);
  const [reps, setReps] = useState(initialReps);
  const [syncedWeight, setSyncedWeight] = useState(initialWeight);
  const [syncedReps, setSyncedReps] = useState(initialReps);

  if (initialWeight !== syncedWeight) {
    setSyncedWeight(initialWeight);
    setWeight(initialWeight);
  }
  if (initialReps !== syncedReps) {
    setSyncedReps(initialReps);
    setReps(initialReps);
  }

  const sameAsLast = () => {
    if (previous?.weight != null) setWeight(previous.weight);
    if (previous?.reps != null) setReps(previous.reps);
  };

  return (
    <div className="border-border bg-surface rounded-2xl border p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-faint font-mono text-[11px] tracking-wide uppercase">
          {title}
        </span>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-faint hover:text-fg cursor-pointer font-mono text-[11px] uppercase"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Stepper
          label="Weight · kg"
          value={weight}
          step={2.5}
          min={-999}
          format={formatWeight}
          onChange={setWeight}
        />
        <Stepper
          label="Reps"
          value={reps}
          step={1}
          min={1}
          onChange={setReps}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Chip onClick={sameAsLast} disabled={!previous}>
          Same as last
        </Chip>
        <Chip onClick={() => setWeight(+(weight + 2.5).toFixed(2))}>
          +2.5 kg
        </Chip>
        <Chip onClick={() => setReps(reps + 1)}>+1 rep</Chip>
      </div>

      <div className="mt-4 flex gap-3">
        <Button
          size="lg"
          className="flex-1"
          loading={isLogging}
          disabled={reps < 1}
          onClick={() => onLog(weight, reps)}
          iconLeft={<CheckIcon size={20} />}
        >
          {submitLabel}
        </Button>
        <div className="border-border bg-surface-2 flex h-14 min-w-[5rem] flex-col items-center justify-center rounded-xl border px-3">
          <span className="tabular text-fg flex items-center gap-1 font-mono text-base font-bold">
            <TimerIcon size={15} className="text-faint" />
            {formatRest(restSeconds)}
          </span>
          <span className="text-faint font-mono text-[9px] tracking-wide uppercase">
            Rest
          </span>
        </div>
      </div>
    </div>
  );
}
