import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Tag } from "../../components/ui/Tag";
import { Menu } from "../../components/ui/Menu";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Skeleton } from "../../components/ui/Skeleton";
import { CalendarIcon, CloseIcon, MoreIcon } from "../../components/icons";
import { useToast } from "../../components/ui/useToast";
import { getErrorMessage } from "../../api/client";
import {
  useDeleteWorkoutLogDelete,
  getGetWorkoutLogsGetQueryKey,
} from "../../api/generated/workout-log/workout-log";
import { WorkoutLogStatus } from "../../api/generated/quickfitApi.schemas";
import { formatClock, formatTonnes, relativeTime } from "../../lib/format";
import {
  useWorkoutHistory,
  type WorkoutHistoryItem,
} from "./useWorkoutHistory";

export function HistoryPage() {
  const { data: history, isLoading } = useWorkoutHistory();
  const [deleting, setDeleting] = useState<WorkoutHistoryItem | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const deleteWorkoutLog = useDeleteWorkoutLogDelete({
    mutation: {
      onSuccess: () => {
        toast.success("Workout deleted");
        queryClient.invalidateQueries({
          queryKey: getGetWorkoutLogsGetQueryKey({
            status: WorkoutLogStatus.completed,
          }),
        });
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  });

  return (
    <div>
      <PageHeader title="History" />

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : history.length === 0 ? (
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
                <Link
                  to={`/history/${w.id}`}
                  className="group min-w-0 flex-1 focus:outline-none"
                >
                  <h2 className="text-fg group-hover:text-primary truncate font-semibold transition-colors">
                    {w.plan_name ? `${w.plan_name} · ` : ""}
                    {w.session_name ?? "Freestyle session"}
                  </h2>
                  <div className="text-faint mt-0.5 font-mono text-xs">
                    {relativeTime(w.started_at)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {w.top_exercises.map((name, i) => (
                      <Tag key={i} tone="muted">
                        {name}
                      </Tag>
                    ))}
                  </div>
                </Link>

                <div className="border-border flex shrink-0 items-center gap-5 border-t pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
                  <Metric
                    value={
                      w.duration_seconds != null
                        ? formatClock(w.duration_seconds)
                        : "—"
                    }
                    label="time"
                  />
                  <Metric value={String(w.total_sets)} label="sets" />
                  <Metric
                    value={`${formatTonnes(w.total_volume_kg)}t`}
                    label="volume"
                    accent
                  />
                  <Menu
                    className="-mr-1 shrink-0"
                    label={`Actions for ${w.session_name ?? "workout"}`}
                    trigger={<MoreIcon size={18} />}
                    items={[
                      {
                        label: "Delete workout",
                        icon: <CloseIcon size={16} />,
                        destructive: true,
                        onSelect: () => setDeleting(w),
                      },
                    ]}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete workout?"
        description="This permanently removes this logged workout from your history."
        confirmLabel="Delete"
        destructive
        onConfirm={() =>
          deleting && deleteWorkoutLog.mutate({ workoutLogId: deleting.id })
        }
        onClose={() => setDeleting(null)}
      />
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
