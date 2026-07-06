import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, Eyebrow } from "../ui/Card";
import { relativeTime } from "../../lib/format";
import type { ExerciseProgressPoint } from "../../features/dashboard/aggregateStats";

interface ExerciseProgressChartProps {
  data: ExerciseProgressPoint[];
  unit: string;
  formatValue?: (value: number) => string;
  title?: string;
}

function formatTick(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ExerciseProgressChart({
  data,
  unit,
  formatValue = (v) => String(Math.round(v * 10) / 10),
  title = "Progress",
}: ExerciseProgressChartProps) {
  if (data.length < 2) return null;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-fg text-sm font-semibold">{title}</h3>
        <Eyebrow>
          {unit ? `${unit} · ` : ""}
          {data.length} sessions
        </Eyebrow>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatTick}
            tick={{
              fill: "var(--color-faint)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={formatValue}
            tick={{
              fill: "var(--color-faint)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-border-strong)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as ExerciseProgressPoint;
              return (
                <div className="border-border bg-surface-2 text-fg rounded-lg border px-2 py-1 font-mono text-xs shadow-sm">
                  {formatValue(point.value)}
                  {unit ? ` ${unit}` : ""}
                  <span className="text-faint ml-1.5">
                    {relativeTime(point.date)}
                  </span>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={{
              r: 3,
              fill: "var(--color-surface)",
              stroke: "var(--color-primary)",
              strokeWidth: 1.5,
            }}
            activeDot={{ r: 4, fill: "var(--color-primary)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
