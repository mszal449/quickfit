import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboard, useHistory } from "../../mocks/hooks";
import { Eyebrow } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { PlusIcon } from "../../components/icons";
import { formatDateLabel } from "../../lib/format";
import { buildStartOptions } from "./startOptions";
import { ResumeSessionCard } from "./components/ResumeSessionCard";
import { NextWorkoutCard } from "./components/NextWorkoutCard";
import { StartWorkoutSection } from "./components/StartWorkoutSection";
import { StatsStrip } from "./components/StatsStrip";
import { WeeklyVolumeChart } from "./components/WeeklyVolumeChart";
import { RecentPRs } from "./components/RecentPRs";
import { usePlansWithSessions } from "../plans/usePlansWithSessions";
import { useExerciseNames } from "../exercises/useEcerciseName";
import { useGetWorkoutLogsGet } from "../../api/generated/workout-log/workout-log";
import { WorkoutLogStatus } from "../../api/generated/quickfitApi.schemas";
import { toActiveSession } from "./toActiveSession";
import {
  useStartWorkout,
  useWorkoutLogActions,
} from "../session/useWorkoutLogActions";

export function DashboardPage() {
  const { data } = useDashboard(); // TODO: REMOVE
  const { data: plans } = usePlansWithSessions();
  const { data: workout } = useGetWorkoutLogsGet({
    status: WorkoutLogStatus.in_progress,
  });
  const { namesById } = useExerciseNames();
  const { data: history } = useHistory();
  const navigate = useNavigate();
  const { start } = useStartWorkout();
  const { finish, discard } = useWorkoutLogActions();

  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const activeLog = workout?.items[0] ?? null;
  const active = activeLog ? toActiveSession(activeLog, plans) : null;

  const startGroups = buildStartOptions(plans, namesById, history);
  const suggested =
    startGroups[0]?.sessions.find((s) => s.is_suggested) ??
    startGroups[0]?.sessions[0] ??
    null;

  const resume = () => {
    if (active) navigate(`/session/${active.workout_log_id}`);
  };
  const startSession = (_planId: string, sessionId: string) => {
    start(sessionId)
      .then((log) => navigate(`/session/${log.id}`))
      .catch(() => {});
  };
  const finishActive = () => {
    if (active) finish(active.workout_log_id).catch(() => {});
  };
  const discardActive = () => {
    if (active) discard(active.workout_log_id).catch(() => {});
  };

  return (
    <div>
      <div className="mb-4 sm:mb-5">
        <Eyebrow className="mb-1 block">
          {formatDateLabel(new Date().toISOString())}
        </Eyebrow>
        <h1 className="num text-fg text-2xl sm:text-4xl">
          {active
            ? "Pick up where you left off"
            : `Let's train, ${data.greeting_name}`}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          {active ? (
            <>
              <ResumeSessionCard
                session={active}
                onResume={resume}
                onFinish={finishActive}
                onDiscard={() => setConfirmDiscard(true)}
              />
              <StartWorkoutSection
                groups={startGroups}
                onStart={startSession}
              />
            </>
          ) : suggested ? (
            <>
              <NextWorkoutCard
                option={suggested}
                onStart={() =>
                  startSession(suggested.plan_id, suggested.session_id)
                }
              />
              <StartWorkoutSection
                groups={startGroups}
                onStart={startSession}
                heading="Or start another"
                excludeSessionId={suggested.session_id}
              />
            </>
          ) : (
            <NoPlanCard onCreate={() => navigate("/plans")} />
          )}
        </div>

        <div className="flex flex-col gap-5 lg:col-span-1">
          <StatsStrip stats={data.stats} />
          <WeeklyVolumeChart data={data.weekly_volume} />
          <RecentPRs prs={data.recent_prs} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard this session?"
        description="Your logged sets for this in-progress workout will be deleted. This can't be undone."
        confirmLabel="Discard"
        destructive
        onConfirm={discardActive}
        onClose={() => setConfirmDiscard(false)}
      />
    </div>
  );
}

function NoPlanCard({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="border-primary/40 bg-surface relative overflow-hidden rounded-2xl border p-6 text-center">
      <div className="bg-primary pointer-events-none absolute inset-x-0 top-0 h-1" />
      <h2 className="num text-fg text-3xl">No plans yet</h2>
      <p className="text-muted mx-auto mt-2 max-w-sm text-sm">
        Build a training plan with your exercises, then start a session straight
        from here.
      </p>
      <Button
        className="mt-5"
        size="lg"
        onClick={onCreate}
        iconLeft={<PlusIcon size={18} />}
      >
        Create a plan
      </Button>
    </div>
  );
}
