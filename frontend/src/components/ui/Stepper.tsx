import { useEffect, useRef, useState, type ReactNode } from "react";
import { MinusIcon, PlusIcon } from "../icons";
import { cn } from "../../lib/cn";

interface StepperProps {
  label: string;
  value: number;
  step?: number;
  min?: number;
  /** Formats the displayed value (e.g. drop trailing zeros for weight). */
  format?: (v: number) => string;
  onChange: (next: number) => void;
  className?: string;
}

/**
 * Big numeric stepper for the log widget (weight / reps). Large central value
 * in monospace, editable by tapping it; −/+ are full 44px touch targets either side.
 */
export function Stepper({
  label,
  value,
  step = 1,
  min = 0,
  format = (v) => String(v),
  onChange,
  className,
}: StepperProps) {
  const [draft, setDraft] = useState(format(value));
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) setDraft(format(value));
  }, [value, format]);

  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => onChange(+(value + step).toFixed(2));

  const commit = () => {
    const parsed = Number(draft.replace(",", "."));
    onChange(Number.isFinite(parsed) ? Math.max(min, parsed) : value);
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-faint text-center font-mono text-[11px] tracking-wide uppercase">
        {label}
      </span>
      <div className="border-border bg-surface-2 flex items-center justify-between rounded-xl border p-1">
        <StepBtn label={`decrease ${label}`} onClick={dec}>
          <MinusIcon size={18} />
        </StepBtn>
        <input
          inputMode="decimal"
          value={draft}
          aria-label={label}
          onFocus={(e) => {
            isFocused.current = true;
            e.target.select();
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            isFocused.current = false;
            commit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="tabular text-fg min-w-0 flex-1 overflow-hidden bg-transparent text-center font-mono text-lg font-semibold focus:outline-none sm:text-2xl"
        />
        <StepBtn label={`increase ${label}`} onClick={inc}>
          <PlusIcon size={18} />
        </StepBtn>
      </div>
    </div>
  );
}

function StepBtn({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="text-muted hover:bg-surface-3 hover:text-fg focus-visible:ring-primary/70 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none active:scale-95 sm:h-11 sm:w-11"
    >
      {children}
    </button>
  );
}
