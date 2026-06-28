import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/**
 * Tappable pill for quick actions ("+2.5 kg", "Same as last") and toggles.
 * Distinct from <Tag> which is read-only. 36px tall → comfortable touch.
 */
export function Chip({
  active = false,
  className,
  children,
  ...props
}: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 font-mono text-sm font-medium",
        "cursor-pointer transition-colors duration-150 active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-40",
        "focus-visible:ring-primary/70 focus-visible:ring-2 focus-visible:outline-none",
        active
          ? "border-primary/40 bg-primary-soft text-primary"
          : "border-border bg-surface-2 text-muted hover:border-border-strong hover:text-fg",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
