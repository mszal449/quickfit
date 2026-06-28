import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type Tone = "default" | "primary" | "success" | "muted";

const tones: Record<Tone, string> = {
  default: "bg-surface-3 text-fg",
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  muted: "bg-surface-2 text-muted",
};

/**
 * Small read-only pill for prescription facts (sets / reps / rest / %1RM / tempo).
 * Monospace so numeric chips line up; not interactive.
 */
export function Tag({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
