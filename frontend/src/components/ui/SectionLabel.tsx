import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface SectionLabelProps {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SectionLabel({
  children,
  action,
  className,
}: SectionLabelProps) {
  return (
    <div className={cn("mb-3 flex items-center gap-3", className)}>
      <span className="text-faint shrink-0 font-mono text-[11px] font-semibold tracking-[0.18em] uppercase">
        {children}
      </span>
      <span className="rule-fade h-px flex-1" />
      {action && <span className="shrink-0">{action}</span>}
    </div>
  );
}
