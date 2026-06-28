import { useHistory } from "../../mocks/hooks";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Tag } from "../../components/ui/Tag";
import { CalendarIcon } from "../../components/icons";
import { formatClock, formatTonnes, relativeTime } from "../../lib/format";

export function HistoryPage() {
  const { data: history } = useHistory();

  return (
    <div>
      <PageHeader title="History" />

      {history.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <CalendarIcon size={28} className="text-faint" />
          <p className="text-muted">No workouts logged yet.</p>
          <p className="text-faint text-sm">
            Completed sessions will appear here.
          </p>
        </Card>
      ) : (
        <ol className="flex flex-col gap-3">
          {history.map((w) => (
            <li key={w.id}>
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-fg truncate font-semibold">
                      {w.plan_name ? `${w.plan_name} · ` : ""}
                      {w.session_name ?? "Freestyle session"}
                    </h2>
                  </div>
                  <div className="text-faint mt-0.5 font-mono text-xs">
                    {relativeTime(w.performed_at)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {w.top_exercises.map((name) => (
                      <Tag key={name} tone="muted">
                        {name}
                      </Tag>
                    ))}
                  </div>
                </div>

                {/* metrics row */}
                <div className="border-border flex shrink-0 gap-5 border-t pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
                  <Metric
                    value={formatClock(w.duration_seconds)}
                    label="time"
                  />
                  <Metric value={String(w.total_sets)} label="sets" />
                  <Metric
                    value={`${formatTonnes(w.total_volume_kg)}t`}
                    label="volume"
                    accent
                  />
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Metric({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={`tabular font-mono text-lg font-bold ${accent ? "text-primary" : "text-fg"}`}
      >
        {value}
      </div>
      <div className="text-faint font-mono text-[10px] tracking-wide uppercase">
        {label}
      </div>
    </div>
  );
}
