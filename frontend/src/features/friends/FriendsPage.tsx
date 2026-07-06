import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Tag } from "../../components/ui/Tag";
import { Skeleton } from "../../components/ui/Skeleton";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Menu } from "../../components/ui/Menu";
import {
  UserPlusIcon,
  UsersIcon,
  CheckIcon,
  CloseIcon,
  MoreIcon,
} from "../../components/icons";
import { useToast } from "../../components/ui/useToast";
import { getErrorMessage } from "../../api/client";
import { useCurrentUser } from "../../auth/useCurrentUser";
import {
  useGetFriendshipsGet,
  useSendFriendRequestPost,
  useAcceptFriendRequestPost,
  useRemoveFriendshipDelete,
  getGetFriendshipsGetQueryKey,
} from "../../api/generated/friend/friend";
import {
  FriendshipStatus,
  type FriendshipOut,
  type FriendUserOut,
} from "../../api/generated/quickfitApi.schemas";
import { AddFriendModal } from "./AddFriendModal";

function displayName(user: FriendUserOut): string {
  return user.name || user.email;
}

type TabId = "friends" | "requests";

export function FriendsPage() {
  const [tab, setTab] = useState<TabId>("friends");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<FriendshipOut | null>(null);

  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { data, isLoading } = useGetFriendshipsGet();
  const friendships = useMemo(() => data?.items ?? [], [data]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetFriendshipsGetQueryKey() });

  const sendRequest = useSendFriendRequestPost({
    mutation: {
      onSuccess: (result) => {
        toast.success(
          result.status === FriendshipStatus.accepted
            ? `You and ${displayName(result.user)} are now friends`
            : "Friend request sent",
        );
        invalidate();
        setAdding(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  });

  const acceptRequest = useAcceptFriendRequestPost({
    mutation: {
      onSuccess: () => {
        toast.success("Friend request accepted");
        invalidate();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  });

  const removeFriendship = useRemoveFriendshipDelete({
    mutation: {
      onSuccess: () => {
        toast.success("Removed");
        invalidate();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  });

  const friends = useMemo(
    () => friendships.filter((f) => f.status === FriendshipStatus.accepted),
    [friendships],
  );
  const incoming = useMemo(
    () =>
      friendships.filter(
        (f) =>
          f.status === FriendshipStatus.pending &&
          f.addressee_id === currentUser?.id,
      ),
    [friendships, currentUser],
  );
  const outgoing = useMemo(
    () =>
      friendships.filter(
        (f) =>
          f.status === FriendshipStatus.pending &&
          f.requester_id === currentUser?.id,
      ),
    [friendships, currentUser],
  );

  const removeConfirmTitle = removing
    ? removing.status === FriendshipStatus.accepted
      ? `Remove ${displayName(removing.user)}?`
      : removing.requester_id === currentUser?.id
        ? `Cancel request to ${displayName(removing.user)}?`
        : `Decline ${displayName(removing.user)}'s request?`
    : "";

  return (
    <div>
      <PageHeader
        title="Friends"
        actions={
          <Button
            iconLeft={<UserPlusIcon size={18} />}
            onClick={() => setAdding(true)}
          >
            <span className="hidden sm:inline">Add friend</span>
            <span className="sm:hidden">Add</span>
          </Button>
        }
      />

      <SegmentedTabs
        className="mb-5"
        tabs={[
          {
            id: "friends",
            label: `Friends${friends.length ? ` (${friends.length})` : ""}`,
          },
          {
            id: "requests",
            label: `Requests${incoming.length ? ` (${incoming.length})` : ""}`,
          },
        ]}
        active={tab}
        onChange={(id) => setTab(id as TabId)}
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : tab === "friends" ? (
        friends.length === 0 ? (
          <Card className="text-muted flex flex-col items-center gap-2 p-10 text-center">
            <UsersIcon size={28} className="text-faint" />
            No friends yet — add one to start sharing plans.
          </Card>
        ) : (
          <Card className="divide-border divide-y overflow-hidden p-0">
            {friends.map((f) => (
              <FriendRow
                key={f.id}
                friendship={f}
                onRemove={() => setRemoving(f)}
              />
            ))}
          </Card>
        )
      ) : incoming.length === 0 && outgoing.length === 0 ? (
        <Card className="text-muted p-10 text-center">
          No pending requests.
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {incoming.length > 0 && (
            <div>
              <div className="text-faint mb-2 font-mono text-[11px] tracking-wide uppercase">
                Incoming
              </div>
              <Card className="divide-border divide-y overflow-hidden p-0">
                {incoming.map((f) => (
                  <div
                    key={f.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar user={f.user} />
                      <div className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {displayName(f.user)}
                      </div>
                    </div>
                    <div className="flex gap-2 sm:shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 sm:flex-initial"
                        iconLeft={<CheckIcon size={15} />}
                        loading={
                          acceptRequest.isPending &&
                          acceptRequest.variables?.friendshipId === f.id
                        }
                        onClick={() =>
                          acceptRequest.mutate({ friendshipId: f.id })
                        }
                      >
                        Accept
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 sm:flex-initial"
                        iconLeft={<CloseIcon size={15} />}
                        onClick={() => setRemoving(f)}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {outgoing.length > 0 && (
            <div>
              <div className="text-faint mb-2 font-mono text-[11px] tracking-wide uppercase">
                Sent
              </div>
              <Card className="divide-border divide-y overflow-hidden p-0">
                {outgoing.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar user={f.user} />
                    <div className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {displayName(f.user)}
                    </div>
                    <Tag className="hidden sm:inline-flex">Pending</Tag>
                    <Menu
                      trigger={<MoreIcon size={18} />}
                      label={`Actions for request to ${displayName(f.user)}`}
                      items={[
                        {
                          label: "Cancel request",
                          icon: <CloseIcon size={16} />,
                          destructive: true,
                          onSelect: () => setRemoving(f),
                        },
                      ]}
                    />
                  </div>
                ))}
              </Card>
            </div>
          )}
        </div>
      )}

      <AddFriendModal
        open={adding}
        onClose={() => setAdding(false)}
        onSubmit={(email) => sendRequest.mutate({ data: { email } })}
        isSubmitting={sendRequest.isPending}
      />

      <ConfirmDialog
        open={!!removing}
        title={removeConfirmTitle}
        destructive
        confirmLabel={
          removing?.status === FriendshipStatus.accepted ? "Remove" : "Confirm"
        }
        onConfirm={() =>
          removing && removeFriendship.mutate({ friendshipId: removing.id })
        }
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}

function Avatar({ user }: { user: FriendUserOut }) {
  return (
    <div className="bg-surface-3 text-primary num flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm uppercase">
      {displayName(user)[0] ?? "?"}
    </div>
  );
}

function FriendRow({
  friendship,
  onRemove,
}: {
  friendship: FriendshipOut;
  onRemove: () => void;
}) {
  return (
    <div className="hover:bg-surface-2 flex items-center gap-3 px-4 py-3 transition-colors">
      <Avatar user={friendship.user} />
      <div className="min-w-0 flex-1 truncate text-sm font-semibold">
        {displayName(friendship.user)}
      </div>
      <Menu
        trigger={<MoreIcon size={18} />}
        label={`Actions for ${displayName(friendship.user)}`}
        items={[
          {
            label: "Remove friend",
            icon: <CloseIcon size={16} />,
            destructive: true,
            onSelect: onRemove,
          },
        ]}
      />
    </div>
  );
}
