import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../../auth/useCurrentUser";
import { useAuth } from "../../auth/useAuth";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { SectionLabel } from "../../components/ui/SectionLabel";
import { Skeleton } from "../../components/ui/Skeleton";
import { Tag } from "../../components/ui/Tag";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DownloadIcon, LogoutIcon, ShieldIcon } from "../../components/icons";
import { formatFullDate, relativeTime } from "../../lib/format";
import { getErrorMessage } from "../../api/client";
import { useToast } from "../../components/ui/useToast";
import { useDeleteMeDelete } from "../../api/generated/auth/auth";
import { getUnits, setUnits as persistUnits, type Units } from "../../lib/preferences";

export function AccountPage() {
  const { data: user, isLoading } = useCurrentUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [units, setUnitsState] = useState<Units>(getUnits);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const setUnits = (value: Units) => {
    setUnitsState(value);
    persistUnits(value);
  };

  const deleteAccount = useDeleteMeDelete({
    mutation: {
      onSuccess: () => navigate("/"),
      onError: (e) => toast.error(getErrorMessage(e)),
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Account" />

      <Card className="flex items-center gap-4 p-5">
        {isLoading ? (
          <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
        ) : (
          <div className="bg-surface-3 text-primary num flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl uppercase">
            {user?.email?.[0] ?? "?"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          ) : (
            <>
              <div className="text-fg truncate text-lg font-semibold">
                {user?.email}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <Tag tone="primary">{user?.role}</Tag>
                {user?.is_email_verified && (
                  <Tag tone="success">
                    <ShieldIcon size={11} /> Verified
                  </Tag>
                )}
              </div>
            </>
          )}
        </div>
      </Card>

      {!isLoading && user && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="text-faint font-mono text-[11px] tracking-wide uppercase">
              Member since
            </div>
            <div className="num text-fg mt-1 text-xl">
              {formatFullDate(user.created_at)}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-faint font-mono text-[11px] tracking-wide uppercase">
              Last sign-in
            </div>
            <div className="num text-fg mt-1 text-xl">
              {user.last_login_at ? relativeTime(user.last_login_at) : "—"}
            </div>
          </Card>
        </div>
      )}

      <div className="mt-8">
        <SectionLabel>Preferences</SectionLabel>
        <Card className="divide-border divide-y p-0">
          <SettingRow
            label="Units"
            description="Used for weight across plans and logging"
          >
            <div className="border-border bg-surface-2 flex items-center gap-1 rounded-lg border p-0.5 font-mono text-xs font-semibold">
              {(["kg", "lb"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnits(u)}
                  className={
                    "rounded-md px-2.5 py-1 transition-colors " +
                    (units === u
                      ? "bg-primary text-primary-fg"
                      : "text-muted hover:text-fg")
                  }
                >
                  {u}
                </button>
              ))}
            </div>
          </SettingRow>
        </Card>
      </div>

      <div className="mt-8">
        <SectionLabel>Data</SectionLabel>
        <Card className="p-0">
          <SettingRow
            label="Export workouts"
            description="Download your full history as CSV"
          >
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<DownloadIcon size={15} />}
              disabled
            >
              Soon
            </Button>
          </SettingRow>
        </Card>
      </div>

      <div className="mt-8">
        <SectionLabel>Account actions</SectionLabel>
        <Card className="divide-border divide-y p-0">
          <SettingRow
            label="Sign out"
            description="End your session on this device"
          >
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<LogoutIcon size={15} />}
              onClick={() => setConfirmLogout(true)}
            >
              Sign out
            </Button>
          </SettingRow>
          <SettingRow
            label="Delete account"
            description="Permanently remove your data"
          >
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          </SettingRow>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Sign out?"
        description="You'll need to sign in again to access your plans and workouts."
        confirmLabel="Sign out"
        destructive
        onConfirm={logout}
        onClose={() => setConfirmLogout(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete your account?"
        description="This permanently deletes your plans, exercises and workout history. This can't be undone."
        confirmLabel="Delete account"
        destructive
        onConfirm={() => deleteAccount.mutate()}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <div className="text-fg text-sm font-semibold">{label}</div>
        <div className="text-faint mt-0.5 text-xs">{description}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
