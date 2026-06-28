import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Tag } from "../../components/ui/Tag";
import { Button } from "../../components/ui/Button";
import { formatReps, formatWeight } from "../../lib/format";
import { useLiveSession } from "./useLiveSession";
import { useSetMutations } from "./useSetMutations";
import { useWorkoutLogActions } from "./useWorkoutLogActions";
import { useRestTimer } from "./useRestTimer";
import { useToast } from "../../components/ui/useToast";
import { SessionTopBar } from "./components/SessionTopBar";
import { SetsTable } from "./components/SetsTable";
import { LogSetWidget } from "./components/LogSetWidget";
import { UpNextBar } from "./components/UpNextBar";
import { RestTimerBar } from "./components/RestTimerBar";
import { buildSummary } from "./buildSummary";
import type { LiveExercise, LiveSetRow } from "./types";

function isExerciseDone(ex: LiveExercise): boolean {
  return ex.sets.every((s) => s.completed);
}

function isExerciseStarted(ex: LiveExercise): boolean {
  return ex.sets.some((s) => s.set_log_id !== null);
}

function useElapsedSeconds(startedAtIso: string | undefined) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!startedAtIso) return;
    const started = new Date(startedAtIso).getTime();
    const tick = () =>
      setSecs(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAtIso]);
  return secs;
}

export function LiveSessionPage() {
  const { sessionId: workoutLogId = "" } = useParams();
  const navigate = useNavigate();

  const { model, isLoading } = useLiveSession(workoutLogId);
  const { addSet, updateSet } = useSetMutations(workoutLogId);
  const { finish } = useWorkoutLogActions();
  const restTimer = useRestTimer();
  const toast = useToast();
  const notifiedRef = useRef(false);

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const elapsed = useElapsedSeconds(model?.performed_at);

  const exerciseCount = model?.exercises.length ?? 0;
  const lastIndex = exerciseCount - 1;
  const incompleteIndices =
    model?.exercises.reduce<number[]>((acc, ex, i) => {
      if (isExerciseStarted(ex) && !isExerciseDone(ex)) acc.push(i);
      return acc;
    }, []) ?? [];
  const lastExerciseDone = model
    ? isExerciseDone(model.exercises[lastIndex])
    : false;

  useEffect(() => {
    if (
      lastExerciseDone &&
      incompleteIndices.length > 0 &&
      !notifiedRef.current
    ) {
      notifiedRef.current = true;
      toast.show(
        incompleteIndices.length === 1
          ? "1 exercise still has sets left to log"
          : `${incompleteIndices.length} exercises still have sets left to log`,
      );
    }
    if (!lastExerciseDone) notifiedRef.current = false;
  }, [lastExerciseDone, incompleteIndices.length, toast]);

  if (isLoading) {
    return (
      <div className="bg-bg flex min-h-dvh items-center justify-center">
        <span className="border-border-strong border-t-primary h-6 w-6 animate-spin rounded-full border-2" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="bg-bg flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-muted">This workout couldn't be loaded.</p>
        <Button variant="secondary" onClick={() => navigate("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  const isCompleted = model.status === "completed";
  const safeIndex = Math.min(exerciseIndex, exerciseCount - 1);
  const exercise = model.exercises[safeIndex];
  const nextExercise = model.exercises[safeIndex + 1] ?? null;

  const editIndex = editingSetId
    ? exercise.sets.findIndex((s) => s.set_log_id === editingSetId)
    : -1;
  const isEditing = editIndex !== -1;
  const activeIndex = isEditing
    ? editIndex
    : exercise.sets.findIndex((s) => !s.completed);
  const isExerciseComplete = activeIndex === -1;
  const activeSet = isExerciseComplete ? null : exercise.sets[activeIndex];
  const prevRow = activeIndex > 0 ? exercise.sets[activeIndex - 1] : undefined;

  const initialWeight =
    activeSet?.weight ?? activeSet?.previous?.weight ?? prevRow?.weight ?? 0;
  const initialReps =
    activeSet?.reps ??
    activeSet?.previous?.reps ??
    activeSet?.target_min_reps ??
    exercise.target_min_reps;

  const goToExercise = (index: number) => {
    setEditingSetId(null);
    restTimer.skip();
    setExerciseIndex(Math.max(0, Math.min(exerciseCount - 1, index)));
  };

  const handleLog = (weight: number, reps: number) => {
    if (!activeSet) return;
    const isLastSetOfWorkout =
      safeIndex === lastIndex && activeIndex === exercise.sets.length - 1;
    if (activeSet.set_log_id === null) {
      addSet.mutate({
        workoutLogId,
        data: {
          exercise_id: exercise.exercise_id,
          weight,
          reps,
          completed: true,
        },
      });
      if (isLastSetOfWorkout) restTimer.skip();
      else restTimer.start(exercise.rest_seconds);
    } else {
      updateSet.mutate({
        workoutLogId,
        setId: activeSet.set_log_id,
        data: { weight, reps, completed: true },
      });
    }
    setEditingSetId(null);
  };

  const toggleSet = (row: LiveSetRow) => {
    if (isCompleted || !row.set_log_id) return;
    updateSet.mutate({
      workoutLogId,
      setId: row.set_log_id,
      data: { completed: !row.completed },
    });
  };

  const editSet = (row: LiveSetRow) => {
    if (isCompleted || !row.set_log_id) return;
    restTimer.skip();
    setEditingSetId(row.set_log_id);
  };

  const handleFinish = () => {
    const summary = buildSummary(model, elapsed);
    finish(workoutLogId)
      .then(() => navigate(`/session/${workoutLogId}/summary`, { state: { summary } }))
      .catch(() => {});
  };

  return (
    <div className="bg-bg flex min-h-dvh flex-col">
      <SessionTopBar
        sessionName={`${model.plan_name} · ${model.session_name}`}
        elapsedSeconds={elapsed}
        exerciseCount={exerciseCount}
        currentExerciseIndex={safeIndex}
        incompleteIndices={incompleteIndices}
        onBack={() => navigate("/dashboard")}
        onFinish={handleFinish}
        onSelectExercise={goToExercise}
      />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5">
        <div className="mb-4">
          <div className="text-faint font-mono text-[11px] tracking-wide uppercase">
            Exercise {safeIndex + 1} of {exerciseCount}
          </div>
          <h1 className="num text-fg mt-1 text-3xl">{exercise.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Tag tone="muted">
              {exercise.target_sets} ×{" "}
              {formatReps(exercise.target_min_reps, exercise.target_max_reps)}
            </Tag>
            {activeSet?.weight != null && (
              <Tag tone="muted">{formatWeight(activeSet.weight)} kg</Tag>
            )}
          </div>
        </div>

        <SetsTable
          sets={exercise.sets}
          activeIndex={activeIndex}
          onToggle={toggleSet}
          onEdit={editSet}
        />

        {!isCompleted && restTimer.isActive && (
          <div className="mt-4">
            <RestTimerBar
              secondsLeft={restTimer.secondsLeft}
              totalSeconds={restTimer.totalSeconds}
              onSkip={restTimer.skip}
              onAddTime={restTimer.addTime}
            />
          </div>
        )}

        {!isCompleted && (
          <div className="mt-4">
            {!isExerciseComplete && activeSet ? (
              <LogSetWidget
                key={`${exercise.exercise_id}:${activeIndex}:${isEditing ? "edit" : "live"}`}
                title={`${activeSet.set_log_id ? "Edit" : "Log"} set ${activeIndex + 1}`}
                submitLabel={activeSet.set_log_id ? "Update set" : "Log set"}
                initialWeight={initialWeight}
                initialReps={initialReps}
                previous={activeSet.previous}
                restSeconds={exercise.rest_seconds}
                isLogging={addSet.isPending || updateSet.isPending}
                onLog={handleLog}
                onCancel={isEditing ? () => setEditingSetId(null) : undefined}
              />
            ) : (
              <div className="border-success/30 bg-success-soft rounded-2xl border px-4 py-4 text-center">
                <p className="text-success text-sm font-semibold">
                  All sets logged for {exercise.name}
                </p>
                {nextExercise && (
                  <button
                    onClick={() => goToExercise(safeIndex + 1)}
                    className="text-muted mt-2 cursor-pointer font-mono text-xs underline-offset-2 hover:underline"
                  >
                    Continue to {nextExercise.name} →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          <UpNextBar next={nextExercise} />
        </div>

        <div className="text-faint mt-4 flex items-center justify-between font-mono text-xs">
          <button
            disabled={safeIndex === 0}
            onClick={() => goToExercise(safeIndex - 1)}
            className="hover:text-fg cursor-pointer rounded-lg px-3 py-2 disabled:cursor-default disabled:opacity-30"
          >
            ← Previous
          </button>
          <button
            disabled={safeIndex === exerciseCount - 1}
            onClick={() => goToExercise(safeIndex + 1)}
            className="hover:text-fg cursor-pointer rounded-lg px-3 py-2 disabled:cursor-default disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </main>
    </div>
  );
}
