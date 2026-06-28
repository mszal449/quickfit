import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { NAV_ITEMS } from "./navItems";
import { cn } from "../../lib/cn";
import { useCurrentUser } from "../../auth/useCurrentUser";
import { useAuth } from "../../auth/useAuth";
import { Skeleton } from "../ui/Skeleton";
import { Logo } from "../Logo";
import { Menu } from "../ui/Menu";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { LogoutIcon, MoreIcon, UserIcon } from "../icons";

export function Sidebar() {
  const { data: user, isLoading } = useCurrentUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <aside className="border-border bg-surface/40 hidden w-60 shrink-0 flex-col border-r lg:flex">
      <div className="flex items-center px-5 py-5">
        <Logo withWordmark />
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          if (item.soon) {
            return (
              <span
                key={item.to}
                aria-disabled
                title="Coming in a later phase"
                className="text-faint/70 flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5"
              >
                <Icon size={20} />
                <span className="text-[15px] font-medium">{item.label}</span>
                <span className="bg-surface-2 text-faint ml-auto rounded-md px-1.5 py-0.5 font-mono text-[10px] tracking-wide uppercase">
                  Soon
                </span>
              </span>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors duration-150",
                  isActive
                    ? "bg-primary-soft text-primary"
                    : "text-muted hover:bg-surface-2 hover:text-fg",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="bg-primary ml-auto h-1.5 w-1.5 rounded-full" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-border mt-auto border-t p-3">
        <Menu
          side="top"
          align="left"
          className="w-full"
          triggerClassName="w-full justify-start gap-3 rounded-xl px-2 py-2 h-auto"
          label="Account menu"
          trigger={
            <>
              {isLoading ? (
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              ) : (
                <div className="bg-surface-3 text-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold uppercase">
                  {user?.email?.[0] ?? "?"}
                </div>
              )}
              <div className="min-w-0 flex-1 text-left">
                {isLoading ? (
                  <div className="flex flex-col gap-1.5 py-0.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                ) : (
                  <>
                    <div className="text-fg truncate text-sm font-semibold">
                      {user?.email}
                    </div>
                    <div className="text-faint truncate text-xs">Free plan</div>
                  </>
                )}
              </div>
              <MoreIcon size={18} className="text-faint shrink-0" />
            </>
          }
          items={[
            {
              label: "Account",
              icon: <UserIcon size={16} />,
              onSelect: () => navigate("/account"),
            },
            {
              label: "Sign out",
              icon: <LogoutIcon size={16} />,
              onSelect: () => setConfirmLogout(true),
              destructive: true,
            },
          ]}
        />
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
    </aside>
  );
}
