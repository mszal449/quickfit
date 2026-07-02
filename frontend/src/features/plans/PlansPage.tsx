import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { PlusIcon } from "../../components/icons";
import { useToast } from "../../components/ui/useToast";
import { getErrorMessage } from "../../api/client";
import {
  useCreatePlanPost,
  useDeletePlanDelete,
  getGetPlansGetQueryKey,
} from "../../api/generated/plan/plan";
import { PlanVisibility } from "../../api/generated/quickfitApi.schemas";
import { usePlansWithSessions, type PlanWithSessions } from "./usePlansWithSessions";
import { PlanCard } from "./components/PlanCard";
import { PlanFormModal, type PlanFormValues } from "./PlanFormModal";

type SortOrder = "newest" | "oldest";

export function PlansPage() {
  const { data: plans, isLoading } = usePlansWithSessions();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<PlanWithSessions | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const sortedPlans = useMemo(() => {
    const sign = sortOrder === "newest" ? -1 : 1;
    return [...plans].sort(
      (a, b) => sign * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    );
  }, [plans, sortOrder]);

  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const createPlan = useCreatePlanPost({
    mutation: {
      onSuccess: (plan) => {
        queryClient.invalidateQueries({ queryKey: getGetPlansGetQueryKey() });
        setCreating(false);
        navigate(`/plans/${plan.id}`);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  });

  const deletePlan = useDeletePlanDelete({
    mutation: {
      onSuccess: () => {
        toast.success("Plan deleted");
        queryClient.invalidateQueries({ queryKey: getGetPlansGetQueryKey() });
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  });

  const handleCreate = (values: PlanFormValues) => {
    createPlan.mutate({
      data: {
        name: values.name,
        description: values.description,
        visibility: PlanVisibility.private,
      },
    });
  };

  return (
    <div>
      <PageHeader
        title="Plans"
        actions={
          <Button iconLeft={<PlusIcon size={18} />} onClick={() => setCreating(true)}>
            <span className="hidden sm:inline">New plan</span>
            <span className="sm:hidden">New</span>
          </Button>
        }
      />

      {!isLoading && plans.length > 0 && (
        <SegmentedTabs
          className="mb-5"
          tabs={[
            { id: "newest", label: "Newest first" },
            { id: "oldest", label: "Oldest first" },
          ]}
          active={sortOrder}
          onChange={(id) => setSortOrder(id as SortOrder)}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-muted">You don't have any plans yet.</p>
          <Button iconLeft={<PlusIcon size={18} />} onClick={() => setCreating(true)}>
            Create your first plan
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sortedPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onDelete={() => setDeleting(plan)} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete "${deleting?.name}"?`}
        description="This permanently removes the plan and its sessions. Past workout logs are kept."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleting && deletePlan.mutate({ planId: deleting.id })}
        onClose={() => setDeleting(null)}
      />

      <PlanFormModal
        key={creating ? "create-open" : "create-closed"}
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={handleCreate}
        isSubmitting={createPlan.isPending}
      />
    </div>
  );
}
