import { MinusIcon, PlusIcon, CloseIcon } from "../../../components/icons";
import { cn } from "../../../lib/cn";
import { newDraftSet, type DraftSet } from "./prescriptionDraft";

interface SetsEditorProps {
  sets: DraftSet[];
  onChange: (sets: DraftSet[]) => void;
  readOnly?: boolean;
}

export function SetsEditor({
  sets,
  onChange,
  readOnly = false,
}: SetsEditorProps) {
  const update = (index: number, patch: Partial<DraftSet>) => {
    onChange(sets.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const addSet = () => onChange([...sets, newDraftSet(sets[sets.length - 1])]);
  const removeSet = (index: number) =>
    onChange(sets.filter((_, i) => i !== index));

  if (readOnly) {
    return (
      <div className="flex flex-col gap-1.5">
        {sets.map((set, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="text-faint w-10 shrink-0 font-mono text-[11px] tracking-wide uppercase">
              Set {i + 1}
            </span>
            <span className="text-fg font-mono font-semibold">
              {set.max_reps != null && set.max_reps !== set.min_reps
                ? `${set.min_reps}–${set.max_reps}`
                : set.min_reps}
            </span>
            <span className="text-faint font-mono text-[11px] uppercase">
              reps
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {sets.map((set, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-faint w-10 shrink-0 font-mono text-[11px] tracking-wide uppercase">
            Set {i + 1}
          </span>

          <NumberStepper
            value={set.min_reps}
            min={0}
            onChange={(v) =>
              update(i, {
                min_reps: v,
                max_reps:
                  set.max_reps != null && set.max_reps < v ? v : set.max_reps,
              })
            }
          />

          {set.max_reps != null ? (
            <>
              <span className="text-faint text-xs">–</span>
              <NumberStepper
                value={set.max_reps}
                min={set.min_reps}
                onChange={(v) => update(i, { max_reps: v })}
              />
              <button
                type="button"
                aria-label={`Remove rep range on set ${i + 1}`}
                onClick={() => update(i, { max_reps: null })}
                className="text-faint hover:text-fg flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
              >
                <CloseIcon size={14} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => update(i, { max_reps: set.min_reps + 2 })}
              className="text-faint hover:text-primary shrink-0 font-mono text-[11px] whitespace-nowrap"
            >
              + range
            </button>
          )}

          <span className="text-faint ml-auto shrink-0 font-mono text-[11px] uppercase">
            reps
          </span>

          {sets.length > 1 && (
            <button
              type="button"
              aria-label={`Remove set ${i + 1}`}
              onClick={() => removeSet(i)}
              className="text-faint hover:text-danger flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
            >
              <CloseIcon size={15} />
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addSet}
        className="text-muted hover:text-primary mt-0.5 flex items-center gap-1.5 self-start font-mono text-xs"
      >
        <PlusIcon size={14} /> Add set
      </button>
    </div>
  );
}

function NumberStepper({
  value,
  min,
  onChange,
}: {
  value: number;
  min: number;
  onChange: (v: number) => void;
}) {
  const btn =
    "flex h-7 w-7 shrink-0 items-center justify-center text-muted hover:text-fg disabled:opacity-30 disabled:cursor-default cursor-pointer";
  return (
    <div className="border-border bg-surface-2 flex h-8 items-center rounded-lg border">
      <button
        type="button"
        aria-label="Decrease"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={btn}
      >
        <MinusIcon size={14} />
      </button>
      <span
        className={cn(
          "tabular text-fg w-6 text-center font-mono text-sm font-semibold",
        )}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(value + 1)}
        className={btn}
      >
        <PlusIcon size={14} />
      </button>
    </div>
  );
}
