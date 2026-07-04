import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Tag } from "../../components/ui/Tag";
import { Menu } from "../../components/ui/Menu";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { CloseIcon, MoreIcon, ProgressIcon } from "../../components/icons";
import { useToast } from "../../components/ui/useToast";
import { getErrorMessage } from "../../api/client";
import { relativeTime } from "../../lib/format";
import { useGetFriendshipsGet } from "../../api/generated/friend/friend";
import {
  useCreatePlanSharePost,
  useRevokePlanSharePost,
  useRemovePlanShareDelete,
  getGetPlanSharesGetQueryKey,
} from "../../api/generated/plan-share/plan-share";
import {
  FriendshipStatus,
  PlanShareStatus,
  type PlanShareOut,
} from "../../api/generated/quickfitApi.schemas";
import { FollowerProgressModal } from "./FollowerProgressModal";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  planId: string;
  existingShares: PlanShareOut[];
}

export function ShareModal({
  open,
  onClose,
  planId,
  existingShares,
}: ShareModalProps) {
  const [revoking, setRevoking] = useState<PlanShareOut | null>(null);
  const [viewingProgress, setViewingProgress] = useState<PlanShareOut | null>(
    null,
  );

  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: friendshipsPage } = useGetFriendshipsGet();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: getGetPlanSharesGetQueryKey({ plan_id: planId }),
    });

  const createShare = useCreatePlanSharePost({
    mutation: {
      onSuccess: () => {
        toast.success("Invite sent");
        invalidate();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  });

  const revokeShare = useRevokePlanSharePost({
    mutation: {
      onSuccess: () => {
        toast.success("Access revoked");
        invalidate();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  });

  const cancelShare = useRemovePlanShareDelete({
    mutation: {
      onSuccess: () => {
        toast.success("Invite cancelled");
        invalidate();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  });

  const invitableFriends = useMemo(() => {
    const activeUserIds = new Set(
      existingShares
        .filter((s) => s.status !== PlanShareStatus.revoked)
        .map((s) => s.user.id),
    );
    return (friendshipsPage?.items ?? [])
      .filter((f) => f.status === FriendshipStatus.accepted)
      .map((f) => f.user)
      .filter((u) => !activeUserIds.has(u.id));
  }, [friendshipsPage, existingShares]);

  const handleRevokeOrCancel = () => {
    if (!revoking) return;
    if (revoking.status === PlanShareStatus.accepted) {
      revokeShare.mutate({ planShareId: revoking.id });
    } else {
      cancelShare.mutate({ planShareId: revoking.id });
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} labelledBy="share-plan-title">
        <h2
          id="share-plan-title"
          className="font-display text-fg text-2xl font-bold tracking-tight"
        >
          Share plan
        </h2>
        <p className="text-muted mt-2 text-sm">
          Share this plan with a friend — they'll need to accept before it shows
          up in their plans.
        </p>

        {invitableFriends.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {invitableFriends.map((friend) => (
              <div
                key={friend.id}
                className="border-border flex items-center gap-3 rounded-xl border px-3 py-2"
              >
                <div className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {friend.email}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={
                    createShare.isPending &&
                    createShare.variables?.data.shared_with_user_id ===
                      friend.id
                  }
                  onClick={() =>
                    createShare.mutate({
                      data: { plan_id: planId, shared_with_user_id: friend.id },
                    })
                  }
                >
                  Invite
                </Button>
              </div>
            ))}
          </div>
        )}

        {existingShares.length > 0 && (
          <div className="mt-5">
            <div className="text-faint mb-2 font-mono text-[11px] tracking-wide uppercase">
              Shared with
            </div>
            <div className="border-border divide-border divide-y overflow-hidden rounded-xl border">
              {existingShares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {share.user.email}
                    </div>
                    <div className="text-faint text-xs">
                      {relativeTime(share.updated_at)}
                    </div>
                  </div>
                  <Tag
                    tone={
                      share.status === PlanShareStatus.accepted
                        ? "success"
                        : share.status === PlanShareStatus.revoked
                          ? "muted"
                          : "default"
                    }
                  >
                    {share.status}
                  </Tag>
                  {share.status !== PlanShareStatus.revoked && (
                    <Menu
                      label={`Actions for ${share.user.email}`}
                      trigger={<MoreIcon size={18} />}
                      items={[
                        ...(share.status === PlanShareStatus.accepted
                          ? [
                              {
                                label: "View progress",
                                icon: <ProgressIcon size={16} />,
                                onSelect: () => setViewingProgress(share),
                              },
                            ]
                          : []),
                        {
                          label:
                            share.status === PlanShareStatus.accepted
                              ? "Revoke access"
                              : "Cancel invite",
                          icon: <CloseIcon size={16} />,
                          destructive: true,
                          onSelect: () => setRevoking(share),
                        },
                      ]}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {invitableFriends.length === 0 && existingShares.length === 0 && (
          <p className="text-faint mt-4 text-sm">
            No friends to invite yet — add friends first.
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={revoking !== null}
        title={
          revoking?.status === PlanShareStatus.accepted
            ? `Revoke access for ${revoking?.user.email}?`
            : `Cancel invite to ${revoking?.user.email}?`
        }
        description={
          revoking?.status === PlanShareStatus.accepted
            ? "They'll immediately lose read access to this plan."
            : undefined
        }
        confirmLabel={
          revoking?.status === PlanShareStatus.accepted
            ? "Revoke"
            : "Cancel invite"
        }
        destructive
        onConfirm={handleRevokeOrCancel}
        onClose={() => setRevoking(null)}
      />

      {viewingProgress && (
        <FollowerProgressModal
          open={viewingProgress !== null}
          onClose={() => setViewingProgress(null)}
          planShareId={viewingProgress.id}
          followerEmail={viewingProgress.user.email}
        />
      )}
    </>
  );
}
