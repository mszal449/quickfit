import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { ChevronLeftIcon } from "../../components/icons";
import { useToast } from "../../components/ui/useToast";
import { getErrorMessage } from "../../api/client";
import {
  useUpdateWorkoutLogPatch,
  getGetWorkoutLogGetQueryKey,
} from "../../api/generated/workout-log/workout-log";
import { formatClock, relativeTime } from "../../lib/format";
import { useWorkoutHistoryDetail } from "./useWorkoutHistoryDetail";
import { HistorySetsTable } from "./components/HistorySetsTable";

export function HistoryDetailPage() {
  const { id: workoutLogId = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { log, groups, planName, sessionName, durationSeconds, isLoading } =
    useWorkoutHistoryDetail(workoutLogId);

  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const updateWorkoutLog = useUpdateWorkoutLogPatch({
    mutation: {
      onSuccess: () => {
        toast.success("Notes saved");
        setNotesDraft(null);
        queryClient.invalidateQueries({
          queryKey: getGetWorkoutLogGetQueryKey(workoutLogId),
        });
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <Skeleton className="mb-5 h-9 w-40" />
        <Skeleton className="mb-3 h-16 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!log) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="text-muted p-10 text-center">
          Workout not found.
          <div className="mt-3">
            <Button variant="secondary" onClick={() => navigate("/history")}>
              Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const notes = notesDraft ?? log.notes ?? "";
  const notesChanged = notesDraft !== null && notesDraft !== (log.notes ?? "");

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate("/history")}
        className="text-muted hover:text-fg mb-3 flex cursor-pointer items-center gap-1 text-sm font-medium"
      >
        <ChevronLeftIcon size={18} /> History
      </button>

      <PageHeader
        eyebrow={planName ?? undefined}
        title={sessionName ?? "Freestyle session"}
      />
      <div className="text-faint -mt-4 mb-4 font-mono text-xs">
        {relativeTime(log.started_at)}
      </div>

      <div className="border-border bg-surface mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border">
        <div className="bg-surface flex flex-col items-center gap-0.5 px-2 py-4">
          <span className="text-faint font-mono text-[10px] tracking-wide uppercase">
            Time
          </span>
          <span className="num text-fg text-xl">
            {durationSeconds != null ? formatClock(durationSeconds) : "—"}
          </span>
        </div>
        <div className="bg-surface flex flex-col items-center gap-0.5 px-2 py-4">
          <span className="text-faint font-mono text-[10px] tracking-wide uppercase">
            Sets
          </span>
          <span className="num text-fg text-xl">{log.sets.length}</span>
        </div>
      </div>

      <Card className="mb-4 p-4">
        <div className="text-faint mb-2 font-mono text-[11px] tracking-wide uppercase">
          Notes
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotesDraft(e.target.value)}
          placeholder="Add notes about this workout..."
          rows={3}
          className="border-border bg-surface-2 text-fg placeholder:text-faint focus:border-primary/50 focus-visible:ring-primary/40 w-full resize-none rounded-xl border p-3 text-sm focus:outline-none focus-visible:ring-2"
        />
        {notesChanged && (
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              loading={updateWorkoutLog.isPending}
              onClick={() =>
                updateWorkoutLog.mutate({
                  workoutLogId,
                  data: { notes: notesDraft || null },
                })
              }
            >
              Save notes
            </Button>
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.exercise_id}>
            <h2 className="text-fg mb-2 font-semibold">{group.name}</h2>
            <HistorySetsTable sets={group.sets} />
          </div>
        ))}
      </div>
    </div>
  );
}
