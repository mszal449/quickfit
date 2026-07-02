import type { ReactNode } from "react";
import {
  DashboardIcon,
  DumbbellIcon,
  HistoryIcon,
  PlansIcon,
  ProgressIcon,
  UsersIcon,
} from "../icons";

export interface NavItem {
  to: string;
  label: string;
  icon: (props: { size?: number }) => ReactNode;
  /** Deferred (Phase 1.5) — shown but disabled so the structure reads clearly. */
  soon?: boolean;
  /** Hidden from the compact mobile bottom bar (kept on desktop sidebar). */
  desktopOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { to: "/plans", label: "Plans", icon: PlansIcon },
  { to: "/exercises", label: "Exercises", icon: DumbbellIcon },
  { to: "/history", label: "History", icon: HistoryIcon },
  { to: "/friends", label: "Friends", icon: UsersIcon, desktopOnly: true },
  {
    to: "/progress",
    label: "Progress",
    icon: ProgressIcon,
    soon: true,
    desktopOnly: true,
  },
];
