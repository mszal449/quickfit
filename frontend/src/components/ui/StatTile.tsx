import type { ReactNode } from "react";
import { Card } from "./Card";
import { cn } from "../../lib/cn";

interface StatTileProps {
  value: ReactNode;
  label: string;
  unit?: string;
  /** Tints the value text — used to highlight one hero stat per group. */
  accent?: boolean;
  icon?: ReactNode;
}

/** Compact KPI tile: big tabular number + small label. */
export function StatTile({ value, label, unit, accent, icon }: StatTileProps) {
  return (
    <Card className="flex flex-col justify-between gap-3 p-4">
      {icon && <div className="text-faint">{icon}</div>}
      <div>
        <div
          className={cn(
            "tabular flex items-baseline gap-1 font-mono text-3xl leading-none font-bold",
            accent ? "text-primary" : "text-fg",
          )}
        >
          {value}
          {unit && (
            <span className="text-faint text-base font-medium">{unit}</span>
          )}
        </div>
        <div className="text-muted mt-1.5 text-sm">{label}</div>
      </div>
    </Card>
  );
}
