import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../components/ui/Button";
import { useToast } from "../../../components/ui/useToast";
import { getErrorMessage } from "../../../api/client";
import {
  useUpdateSessionPatch,
  getGetSessionsGetQueryKey,
  getGetSessionGetQueryKey,
} from "../../../api/generated/plan-session/plan-session";
import type { PlanSessionOut } from "../../../api/generated/quickfitApi.schemas";
import { useExerciseNames } from "../../exercises/useEcerciseName";
import { SessionEditor } from "./SessionEditor";
import { ExercisePickerModal } from "./ExercisePickerModal";
import {
  toDraft,
  toPrescription,
  draftEquals,
  isDraftValid,
  newDraftExercise,
  type DraftExercise,
} from "./prescriptionDraft";

interface SessionDraftEditorProps {
  planId: string;
  session: PlanSessionOut;
  onDirtyChange: (dirty: boolean) => void;
  readOnly?: boolean;
}

export function SessionDraftEditor({
  planId,
  session,
  onDirtyChange,
  readOnly = false,
}: SessionDraftEditorProps) {
  const [draft, setDraft] = useState<DraftExercise[]>(() =>
    toDraft(session.prescription),
  );
  const [insertIndex, setInsertIndex] = useState<number | null>(null);

  const { namesById } = useExerciseNames();
  const toast = useToast();
  const queryClient = useQueryClient();

  const baseline = useMemo(() => toDraft(session.prescription), [session]);
  const dirty = !draftEquals(draft, baseline);
  const valid = isDraftValid(draft);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const save = useUpdateSessionPatch({
    mutation: {
      onSuccess: () => {
        toast.success("Session saved");
        queryClient.invalidateQueries({
          queryKey: getGetSessionsGetQueryKey(planId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetSessionGetQueryKey(planId, session.id),
        });
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  });

  const reorder = (from: number, to: number) => {
    setDraft((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const changeExercise = (exercise: DraftExercise) => {
    setDraft((prev) =>
      prev.map((ex) => (ex.uid === exercise.uid ? exercise : ex)),
    );
  };

  const removeExercise = (uid: string) => {
    setDraft((prev) => prev.filter((ex) => ex.uid !== uid));
  };

  const pickExercise = (exerciseId: string) => {
    const index = insertIndex ?? draft.length;
    setDraft((prev) => {
      const next = [...prev];
      next.splice(index, 0, newDraftExercise(exerciseId));
      return next;
    });
    setInsertIndex(null);
  };

  const handleSave = () => {
    if (!dirty || !valid) return;
    save.mutate({
      planId,
      planSessionId: session.id,
      data: { prescription: toPrescription(draft) },
    });
  };

  return (
    <div>
      {draft.length === 0 ? (
        readOnly ? (
          <p className="text-muted py-10 text-center">No exercises yet.</p>
        ) : (
          <button
            type="button"
            onClick={() => setInsertIndex(0)}
            className="border-border-strong text-muted hover:border-primary/50 hover:text-primary flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed py-10 font-semibold transition-colors"
          >
            Add the first exercise
          </button>
        )
      ) : (
        <SessionEditor
          exercises={draft}
          namesById={namesById}
          onReorder={reorder}
          onChangeExercise={changeExercise}
          onRemove={removeExercise}
          onInsertAt={setInsertIndex}
          readOnly={readOnly}
        />
      )}

      {!readOnly && (
        <div
          className="bg-bg/95 border-border sticky bottom-0 z-20 mt-4 flex items-center justify-between gap-3 border-t py-3 backdrop-blur"
          style={{
            paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
          }}
        >
          <span className="text-faint font-mono text-xs">
            {draft.length} exercise{draft.length === 1 ? "" : "s"}
            {dirty && " · unsaved"}
          </span>
          <Button
            onClick={handleSave}
            disabled={!dirty || !valid}
            loading={save.isPending}
          >
            Save session
          </Button>
        </div>
      )}

      {!readOnly && (
        <ExercisePickerModal
          open={insertIndex !== null}
          onClose={() => setInsertIndex(null)}
          onPick={pickExercise}
          usedIds={draft.map((ex) => ex.exercise_id)}
        />
      )}
    </div>
  );
}
