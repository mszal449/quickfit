import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Slightly raised surface vs. flat panel. */
  inset?: boolean;
}

/** Base elevated surface. Consistent radius + border + padding across the app. */
export function Card({
  inset = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "border-border rounded-2xl border",
        inset ? "bg-surface-2" : "bg-surface",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Small uppercase eyebrow label used across cards (e.g. "TODAY · LOWER A"). */
export function Eyebrow({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "text-faint font-mono text-[11px] font-medium tracking-[0.14em] uppercase",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
