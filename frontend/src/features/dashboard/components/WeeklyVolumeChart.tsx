import { Card, Eyebrow } from "../../../components/ui/Card";
import type { WeeklyVolumePoint } from "../../../mocks/types";
import { formatTonnes } from "../../../lib/format";
import { cn } from "../../../lib/cn";

/**
 * Lightweight CSS bar chart — no chart dependency. Each bar is sized by share of
 * the max week; the current week is highlighted in the accent colour. Bars carry
 * an accessible label, and a text summary is provided for screen readers.
 */
export function WeeklyVolumeChart({ data }: { data: WeeklyVolumePoint[] }) {
  const max = Math.max(...data.map((d) => d.volume_kg), 1);
  const current = data.find((d) => d.is_current);

  return (
    <Card className="flex flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-fg text-base font-semibold">Weekly volume</h2>
        <Eyebrow>tonnes · {data.length} weeks</Eyebrow>
      </div>

      <p className="sr-only">
        Weekly training volume over {data.length} weeks. Current week{" "}
        {current ? `${formatTonnes(current.volume_kg)} tonnes` : "n/a"}.
      </p>

      <div
        className="flex h-48 items-end gap-1.5 sm:gap-2.5"
        role="img"
        aria-label={`Weekly volume bar chart, latest week ${current ? formatTonnes(current.volume_kg) : ""} tonnes`}
      >
        {data.map((d) => (
          <div
            key={d.week_label}
            className="flex h-full flex-1 flex-col items-center justify-end gap-2"
          >
            <div className="flex w-full flex-1 items-end">
              <div
                className={cn(
                  "w-full rounded-t-md transition-[height] duration-500",
                  d.is_current ? "bg-primary" : "bg-surface-3",
                )}
                style={{ height: `${Math.max(6, (d.volume_kg / max) * 100)}%` }}
                title={`${d.week_label}: ${formatTonnes(d.volume_kg)} t`}
              />
            </div>
            <span
              className={cn(
                "font-mono text-[10px]",
                d.is_current ? "text-primary font-semibold" : "text-faint",
              )}
            >
              {d.week_label}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
