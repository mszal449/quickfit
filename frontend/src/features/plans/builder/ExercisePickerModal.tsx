import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Tag } from "../../../components/ui/Tag";
import { PlusIcon, SearchIcon } from "../../../components/icons";
import { useToast } from "../../../components/ui/useToast";
import { getErrorMessage } from "../../../api/client";
import {
  useGetExercisesGet,
  useCreateExercisePost,
  getGetExercisesGetQueryKey,
} from "../../../api/generated/exercise/exercise";
import {
  ExerciseFormModal,
  type ExerciseFormValues,
} from "../../exercises/ExerciseFormModal";

interface ExercisePickerModalProps {
  open: boolean;
  onClose: () => void;
  onPick: (exerciseId: string) => void;
  usedIds: string[];
}

export function ExercisePickerModal({
  open,
  onClose,
  onPick,
  usedIds,
}: ExercisePickerModalProps) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetExercisesGet();
  const exercises = useMemo(() => data?.items ?? [], [data]);

  const createExercise = useCreateExercisePost({
    mutation: {
      onSuccess: (created) => {
        queryClient.invalidateQueries({
          queryKey: getGetExercisesGetQueryKey(),
        });
        setCreating(false);
        onPick(created.id);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  });

  const used = useMemo(() => new Set(usedIds), [usedIds]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (used.has(ex.id)) return false;
      if (!q) return true;
      return ex.name.toLowerCase().includes(q);
    });
  }, [exercises, search, used]);

  const handleCreate = (values: ExerciseFormValues) => {
    createExercise.mutate({ data: values });
  };

  return (
    <>
      <Modal
        open={open && !creating}
        onClose={onClose}
        labelledBy="picker-title"
      >
        <h2
          id="picker-title"
          className="font-display text-fg text-2xl font-bold tracking-tight"
        >
          Add exercise
        </h2>

        <div className="relative mt-4">
          <SearchIcon
            size={18}
            className="text-faint pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your exercises…"
            aria-label="Search exercises"
            autoFocus
            className="border-border bg-surface-2 text-fg placeholder:text-faint focus:border-primary/50 focus-visible:ring-primary/40 h-11 w-full rounded-xl border pr-4 pl-11 focus:outline-none focus-visible:ring-2"
          />
        </div>

        <Button
          variant="secondary"
          fullWidth
          className="mt-3"
          iconLeft={<PlusIcon size={18} />}
          onClick={() => setCreating(true)}
        >
          Create new exercise
        </Button>

        <div className="mt-3 max-h-72 overflow-y-auto">
          {isLoading ? (
            <p className="text-faint py-6 text-center text-sm">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-faint py-6 text-center text-sm">
              {exercises.length === 0
                ? "No exercises yet — create one above."
                : "No matching exercises left to add."}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {filtered.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => onPick(ex.id)}
                    className="hover:bg-surface-2 flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="text-fg truncate font-medium">
                        {ex.name}
                      </span>
                      <Tag tone="muted">
                        {ex.owner_id === null ? "Global" : "Custom"}
                      </Tag>
                    </span>
                    <PlusIcon size={16} className="text-faint shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <ExerciseFormModal
        key={creating ? "picker-create-open" : "picker-create-closed"}
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={handleCreate}
        isSubmitting={createExercise.isPending}
      />
    </>
  );
}
