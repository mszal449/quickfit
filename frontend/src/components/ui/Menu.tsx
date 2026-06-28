import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";

interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
}

interface MenuProps {
  trigger: ReactNode;
  items: MenuItem[];
  align?: "left" | "right";
  side?: "top" | "bottom";
  label?: string;
  triggerClassName?: string;
  className?: string;
}

/**
 * Lightweight dropdown menu (no dependency). Closes on outside-click and Escape,
 * exposes role="menu"/"menuitem". Used for contextual actions like the
 * in-progress session's finish/discard overflow.
 */
export function Menu({
  trigger,
  items,
  align = "right",
  side = "bottom",
  label = "Open menu",
  triggerClassName,
  className,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "text-muted hover:bg-surface-3 hover:text-fg focus-visible:ring-primary/70 flex cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none",
          triggerClassName ?? "h-10 w-10",
        )}
      >
        {trigger}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "border-border bg-surface-2 absolute z-50 min-w-44 overflow-hidden rounded-xl border p-1 shadow-xl shadow-black/40",
            side === "top" ? "bottom-full mb-1" : "top-full mt-1",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                item.destructive
                  ? "text-danger hover:bg-danger-soft"
                  : "text-fg hover:bg-surface-3",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
