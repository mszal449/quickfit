import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Tag } from "../../components/ui/Tag";
import { Skeleton } from "../../components/ui/Skeleton";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { Menu } from "../../components/ui/Menu";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { PlusIcon, SearchIcon, MoreIcon, PencilIcon, CloseIcon } from "../../components/icons";
import { useToast } from "../../components/ui/useToast";
import { getErrorMessage } from "../../api/client";
import {
  useGetExercisesGet,
  useCreateExercisePost,
  useUpdateExercisePatch,
  useDeleteExerciseDelete,
  getGetExercisesGetQueryKey,
} from "../../api/generated/exercise/exercise";
import { useQueryClient } from "@tanstack/react-query";
import { ExerciseCategory, type ExerciseOut } from "../../api/generated/quickfitApi.schemas";
import { ExerciseFormModal, type ExerciseFormValues } from "./ExerciseFormModal";

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  core: "Core",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  full_body: "Full body",
};

type CategoryFilter = "all" | ExerciseCategory;

export function ExercisesPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [editing, setEditing] = useState<ExerciseOut | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ExerciseOut | null>(null);

  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetExercisesGet();
  const exercises = useMemo(() => data?.items ?? [], [data]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetExercisesGetQueryKey() });

  const createExercise = useCreateExercisePost({
    mutation: {
      onSuccess: () => {
        toast.success("Exercise created");
        invalidate();
        setCreating(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  });

  const updateExercise = useUpdateExercisePatch({
    mutation: {
      onSuccess: () => {
        toast.success("Exercise updated");
        invalidate();
        setEditing(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  });

  const deleteExercise = useDeleteExerciseDelete({
    mutation: {
      onSuccess: () => {
        toast.success("Exercise archived");
        invalidate();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (categoryFilter !== "all" && ex.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        ex.name.toLowerCase().includes(q) || ex.description?.toLowerCase().includes(q) || false
      );
    });
  }, [exercises, search, categoryFilter]);

  const handleCreate = (values: ExerciseFormValues) => {
    createExercise.mutate({ data: values });
  };

  const handleUpdate = (values: ExerciseFormValues) => {
    if (!editing) return;
    updateExercise.mutate({ exerciseId: editing.id, data: values });
  };

  return (
    <div>
      <PageHeader
        title="Exercises"
        actions={
          <Button iconLeft={<PlusIcon size={18} />} onClick={() => setCreating(true)}>
            <span className="hidden sm:inline">New exercise</span>
            <span className="sm:hidden">New</span>
          </Button>
        }
      />

      <div className="relative mb-4">
        <SearchIcon
          size={18}
          className="text-faint pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises…"
          aria-label="Search exercises"
          className="border-border bg-surface text-fg placeholder:text-faint focus:border-primary/50 focus-visible:ring-primary/40 h-12 w-full rounded-xl border pr-4 pl-11 focus:outline-none focus-visible:ring-2"
        />
      </div>

      <SegmentedTabs
        className="mb-5"
        tabs={[
          { id: "all", label: "All" },
          { id: ExerciseCategory.strength, label: "Strength" },
          { id: ExerciseCategory.cardio, label: "Cardio" },
        ]}
        active={categoryFilter}
        onChange={(id) => setCategoryFilter(id as CategoryFilter)}
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-muted p-10 text-center">
          {exercises.length === 0
            ? "No exercises yet — create your first one."
            : `No exercises match "${search}".`}
        </Card>
      ) : (
        <Card className="divide-border divide-y overflow-hidden p-0">
          {filtered.map((ex) => (
            <div
              key={ex.id}
              className="hover:bg-surface-2 flex items-center gap-3 px-4 py-3 transition-colors"
            >
              <Link
                to={`/exercises/${ex.id}`}
                className="group min-w-0 flex-1 focus:outline-none"
              >
                <div className="text-fg group-hover:text-primary truncate font-semibold transition-colors">
                  {ex.name}
                </div>
                {ex.description && (
                  <div className="text-faint truncate text-sm">{ex.description}</div>
                )}
              </Link>
              <Tag tone={ex.category === ExerciseCategory.cardio ? "primary" : "muted"}>
                {ex.muscle_group ? MUSCLE_GROUP_LABELS[ex.muscle_group] : "Cardio"}
              </Tag>
              <Menu
                trigger={<MoreIcon size={18} />}
                label={`Actions for ${ex.name}`}
                items={[
                  {
                    label: "Edit",
                    icon: <PencilIcon size={16} />,
                    onSelect: () => setEditing(ex),
                  },
                  {
                    label: "Archive",
                    icon: <CloseIcon size={16} />,
                    destructive: true,
                    onSelect: () => setDeleting(ex),
                  },
                ]}
              />
            </div>
          ))}
        </Card>
      )}

      <ExerciseFormModal
        key="create"
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={handleCreate}
        isSubmitting={createExercise.isPending}
      />

      <ExerciseFormModal
        key={editing?.id ?? "edit"}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSubmit={handleUpdate}
        isSubmitting={updateExercise.isPending}
        exercise={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        title={`Archive "${deleting?.name}"?`}
        description="It'll be hidden from your library. Past workouts that used it are unaffected."
        confirmLabel="Archive"
        destructive
        onConfirm={() => deleting && deleteExercise.mutate({ exerciseId: deleting.id })}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
