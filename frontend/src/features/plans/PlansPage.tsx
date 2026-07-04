import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Tag } from "../../components/ui/Tag";
import { Skeleton } from "../../components/ui/Skeleton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { CheckIcon, CloseIcon, PlusIcon } from "../../components/icons";
import { useToast } from "../../components/ui/useToast";
import { getErrorMessage } from "../../api/client";
import { useCurrentUser } from "../../auth/useCurrentUser";
import {
  useCreatePlanPost,
  useDeletePlanDelete,
  useUpdatePlanPatch,
  getGetPlansGetQueryKey,
} from "../../api/generated/plan/plan";
import {
  useGetPlanSharesGet,
  useAcceptPlanSharePost,
  useRemovePlanShareDelete,
  getGetPlanSharesGetQueryKey,
} from "../../api/generated/plan-share/plan-share";
import {
  PlanShareStatus,
  PlanVisibility,
} from "../../api/generated/quickfitApi.schemas";
import {
  usePlansWithSessions,
  type PlanWithSessions,
} from "./usePlansWithSessions";
import { PlanCard } from "./components/PlanCard";
import { PlanFormModal, type PlanFormValues } from "./PlanFormModal";

type SortOrder = "newest" | "oldest";
type View = "mine" | "shared";

export function PlansPage() {
  const [view, setView] = useState<View>("mine");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<PlanWithSessions | null>(null);
  const [leavingShareId, setLeavingShareId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const { data: plans, isLoading } = usePlansWithSessions();
  const sortedPlans = useMemo(() => {
    const sign = sortOrder === "newest" ? -1 : 1;
    const defaultPlan = plans.find((p) => p.is_default);
    const rest = plans
      .filter((p) => !p.is_default)
      .sort(
        (a, b) =>
          sign *
          (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      );
    return defaultPlan ? [defaultPlan, ...rest] : rest;
  }, [plans, sortOrder]);

  const { data: sharedPlans, isLoading: sharedLoading } = usePlansWithSessions({
    shared_with_me: true,
  });

  const { data: allSharesPage, isLoading: sharesLoading } = useGetPlanSharesGet(
    undefined,
    { query: { enabled: view === "shared" } },
  );
  const incomingInvites = (allSharesPage?.items ?? []).filter(
    (s) =>
      s.status === PlanShareStatus.pending && s.owner_id !== currentUser?.id,
  );
  const acceptedShareIdByPlanId = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of allSharesPage?.items ?? []) {
      if (
        s.status === PlanShareStatus.accepted &&
        s.owner_id !== currentUser?.id
      ) {
        map.set(s.plan_id, s.id);
      }
    }
    return map;
  }, [allSharesPage, currentUser]);

  const invalidateShares = () =>
    queryClient.invalidateQueries({ queryKey: getGetPlanSharesGetQueryKey() });

  const acceptShare = useAcceptPlanSharePost({
    mutation: {
      onSuccess: () => {
        toast.success("Plan added to your shared plans");
        invalidateShares();
        queryClient.invalidateQueries({ queryKey: getGetPlansGetQueryKey() });
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  });

  const removeShare = useRemovePlanShareDelete({
    mutation: {
      onSuccess: () => {
        toast.success("Removed");
        invalidateShares();
        queryClient.invalidateQueries({ queryKey: getGetPlansGetQueryKey() });
        setLeavingShareId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  });

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

  const updatePlan = useUpdatePlanPatch({
    mutation: {
      onSuccess: (plan) => {
        toast.success(
          plan.is_default ? "Set as default plan" : "Removed as default plan",
        );
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
          view === "mine" && (
            <Button
              iconLeft={<PlusIcon size={18} />}
              onClick={() => setCreating(true)}
            >
              <span className="hidden sm:inline">New plan</span>
              <span className="sm:hidden">New</span>
            </Button>
          )
        }
      />

      <SegmentedTabs
        className="mb-5"
        tabs={[
          { id: "mine", label: "My plans" },
          {
            id: "shared",
            label: `Shared with me${incomingInvites.length ? ` (${incomingInvites.length})` : ""}`,
          },
        ]}
        active={view}
        onChange={(id) => setView(id as View)}
      />

      {view === "mine" ? (
        <>
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
              <Button
                iconLeft={<PlusIcon size={18} />}
                onClick={() => setCreating(true)}
              >
                Create your first plan
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {sortedPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onDelete={() => setDeleting(plan)}
                  onSetDefault={() =>
                    updatePlan.mutate({
                      planId: plan.id,
                      data: { is_default: !plan.is_default },
                    })
                  }
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {incomingInvites.length > 0 && (
            <div className="mb-6">
              <div className="text-faint mb-2 font-mono text-[11px] tracking-wide uppercase">
                Invites
              </div>
              <Card className="divide-border divide-y overflow-hidden p-0">
                {incomingInvites.map((share) => (
                  <div
                    key={share.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {share.user.email} shared a plan with you
                    </div>
                    <div className="flex gap-2 sm:shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 sm:flex-initial"
                        iconLeft={<CheckIcon size={15} />}
                        loading={
                          acceptShare.isPending &&
                          acceptShare.variables?.planShareId === share.id
                        }
                        onClick={() =>
                          acceptShare.mutate({ planShareId: share.id })
                        }
                      >
                        Accept
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 sm:flex-initial"
                        iconLeft={<CloseIcon size={15} />}
                        onClick={() =>
                          removeShare.mutate({ planShareId: share.id })
                        }
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {sharedLoading || sharesLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-44 w-full rounded-2xl" />
              ))}
            </div>
          ) : sharedPlans.length === 0 ? (
            incomingInvites.length === 0 && (
              <Card className="text-muted flex flex-col items-center gap-2 p-10 text-center">
                <Tag>No shared plans yet</Tag>
                <p>Ask a friend to share one of their plans with you.</p>
              </Card>
            )
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {sharedPlans.map((plan) => {
                const shareId = acceptedShareIdByPlanId.get(plan.id);
                return (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onLeave={
                      shareId ? () => setLeavingShareId(shareId) : undefined
                    }
                  />
                );
              })}
            </div>
          )}
        </>
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

      <ConfirmDialog
        open={leavingShareId !== null}
        title="Remove this shared plan?"
        description="You'll stop seeing it here. The owner can share it with you again later."
        confirmLabel="Remove"
        destructive
        onConfirm={() =>
          leavingShareId && removeShare.mutate({ planShareId: leavingShareId })
        }
        onClose={() => setLeavingShareId(null)}
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
