import { cn } from "../../lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("bg-surface-3 block animate-pulse rounded-md", className)}
    />
  );
}
