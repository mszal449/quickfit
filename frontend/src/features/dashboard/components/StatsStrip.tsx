import { Card } from "../../../components/ui/Card";
import type { DashboardData } from "../../../mocks/types";
import { formatTonnes } from "../../../lib/format";

type Stats = DashboardData["stats"];

export function StatsStrip({ stats }: { stats: Stats }) {
  const items = [
    {
      value: formatTonnes(stats.volume_week_kg),
      unit: "t",
      label: "Volume / wk",
    },
    {
      value: `${stats.sessions_done}/${stats.sessions_planned}`,
      unit: "",
      label: "Sessions",
    },
    {
      value: String(stats.streak_days),
      unit: "d",
      label: "Streak",
      accent: true,
    },
    { value: String(stats.prs_this_month), unit: "", label: "PRs / mo" },
  ];

  return (
    <Card className="overflow-hidden p-0">
      <div className="bg-border grid grid-cols-2 gap-px">
        {items.map((it) => (
          <div key={it.label} className="bg-surface px-4 py-3.5">
            <div className="flex items-baseline gap-0.5 whitespace-nowrap">
              <span
                className={`tabular font-mono text-xl font-bold ${it.accent ? "text-primary" : "text-fg"}`}
              >
                {it.value}
              </span>
              {it.unit && (
                <span className="text-faint text-xs font-medium">
                  {it.unit}
                </span>
              )}
            </div>
            <div className="text-muted mt-0.5 text-xs">{it.label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
