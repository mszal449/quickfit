import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Logo } from "../Logo";
import { LogoutIcon, UserIcon } from "../icons";
import { Menu } from "../ui/Menu";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useAuth } from "../../auth/useAuth";

export function AppLayout() {
  return (
    <div className="bg-bg flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="flex-1 px-4 pt-3 pb-24 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

function MobileTopBar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <header
      className="border-border bg-bg/90 sticky top-0 z-30 flex items-center justify-between border-b px-4 py-2.5 backdrop-blur lg:hidden"
      style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top))" }}
    >
      <Logo size={24} />
      <Menu
        align="right"
        label="Account menu"
        triggerClassName="h-8 w-8 rounded-full"
        trigger={<UserIcon size={18} />}
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

      <ConfirmDialog
        open={confirmLogout}
        title="Sign out?"
        description="You'll need to sign in again to access your plans and workouts."
        confirmLabel="Sign out"
        destructive
        onConfirm={logout}
        onClose={() => setConfirmLogout(false)}
      />
    </header>
  );
}
